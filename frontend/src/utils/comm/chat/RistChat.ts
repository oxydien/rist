// func
import {getRoute} from "../../staticRoutes.ts";
import {decode, encode} from "@msgpack/msgpack";
// interfaces
import Channel from "../../../types/chat/Channel.ts";
import ChannelCode from "../../../types/chat/ChannelCode.ts";
import ChatState from "../../../types/chat/ChatState.ts";
import ChannelInfo from "../../../types/chat/ChannelInfo.ts";
import MessageInfo from "../../../types/chat/MessageInfo.ts";
import MessageRequest from "../../../types/chat/MessageRequest.ts";
import {ConnectAction, CreateAction, LoginAction, RegisterAction} from "../../../types/chat/ConnectAction.ts";
import UserInfo from "../../../types/chat/UserInfo.ts";
import ChannelCreateRequest from "../../../types/chat/ChannelCreateRequest.ts";
import AuthToken from "../../../types/chat/AuthToken.ts";
import ClientError from "../../../types/chat/ClientError.ts";

// consts
const MSG_HEAD = 0x43;

const MSG_CL_REGISTER       = 0x0000;
const MSG_CL_LOGIN          = 0x0001;
const MSG_CL_MSG            = 0x0002;
const MSG_CL_CREATE_CHANNEL = 0x0003;

const MSG_SR_IGNORED                  = 0x0000;
const MSG_SR_OK                       = 0x0001;
const MSG_SR_MSG                      = 0x0002;
const MSG_SR_MSG_FAILED               = 0x0003;
const MSG_SR_CHANNEL_CREATED          = 0x0004;
// skipped 5-9
const MSG_SR_CREDENTIALS              = 0x0010;
const MSG_SR_INVALID_AUTH             = 0x0011;
const MSG_SR_REGISTRATION_NOT_ALLOWED = 0x0012;
const MSG_SR_AUTH_ACCEPTED            = 0x0013;

// Agreed spec: [ HEAD: 1B ][ WHAT: 2B ][ SIZE: 2B ][ DATA: nB ]
// Data is serialized with msgpack WITHOUT NAMES (array format, positional fields)


// impl
/*
* Rist chat communication implementation over Web-Socket
* Only keeps track of one channel and its messages, users
*/
export class RistChat implements Channel {
    info: ChannelInfo;
    cachedMessages: MessageInfo[];
    cachedUsers: UserInfo[];
    localUser?: UserInfo;
    authToken?: AuthToken;
    unsendMessage?: MessageRequest;
    private readonly action: ConnectAction;
    private ws: WebSocket | null;
    private accumBuffer: Uint8Array;
    private stateListeners: (() => void)[];
    private messageListeners: (() => void)[];
    private userListeners: (() => void)[];
    private errorListeners: ((err: ClientError) => void)[];

    constructor(action: ConnectAction) {
        let code = this.getCodeFromAction(action);
        this.info = { code, state: ChatState.NONE }
        this.action = action;
        this.cachedMessages = [];
        this.cachedUsers = [];
        this.ws = null;
        this.accumBuffer = new Uint8Array(0);
        this.stateListeners = [];
        this.messageListeners = [];
        this.userListeners = [];
        this.errorListeners = [];
    }

    connect() {
        // TODO: Properly address this
        if (this.info.state != ChatState.NONE && this.info.state != ChatState.CLOSED) {
            return;
        }

        let url = getRoute("CHAT_WS");
        this.ws = new WebSocket(url);
        this.ws.binaryType = "arraybuffer";
        this.changeState(ChatState.CONNECTING);
        this.ws.addEventListener("open", this.onOpen);
        this.ws.addEventListener("message", this.onData);
        this.ws.addEventListener("close", this.onClose);
        this.ws.addEventListener("error", this.onError);
    }

    close() {
        this.ws?.close(0, "Chat closed");
    }

    // Mark: WebSocket event handlers

    private readonly onOpen = () => {
        if (this.action.type === "Login") {
            this.changeState(ChatState.AUTHORIZING);
            this.loginUser(this.action as LoginAction);
        } else if (this.action.type === "Register") {
            this.changeState(ChatState.AUTHORIZING);
            this.registerUser(this.action as RegisterAction);
        } else if (this.action.type === "Create") {
            this.changeState(ChatState.JOINING);
            this.createChannel(this.action as CreateAction);
        }
    }

    private readonly onData = (msgEvent: MessageEvent) => {
        logDebug("onData", "received data", msgEvent);

        const incoming = new Uint8Array(msgEvent.data as ArrayBuffer);
        const next = new Uint8Array(this.accumBuffer.length + incoming.length);
        next.set(this.accumBuffer);
        next.set(incoming, this.accumBuffer.length);
        this.accumBuffer = next;

        while (this.accumBuffer.length >= 5) {
            if (this.accumBuffer[0] !== MSG_HEAD) {
                logDebug("onData", "invalid packet head -- discarding buffer");
                this.accumBuffer = new Uint8Array(0);
                return;
            }

            // [ HEAD: 1B ][ WHAT: 2B ][ SIZE: 2B ][ DATA: nB ]
            const view = new DataView(
                this.accumBuffer.buffer,
                this.accumBuffer.byteOffset,
                this.accumBuffer.byteLength
            );
            const what = view.getUint16(1, false); // big-endian
            const size = view.getUint16(3, false); // big-endian

            if (this.accumBuffer.length < 5 + size) break; // packet not yet complete

            const data = this.accumBuffer.slice(5, 5 + size);
            this.accumBuffer = this.accumBuffer.slice(5 + size);

            this.handlePacket(what, data);
        }
    }

    private readonly onClose = () => {
        this.changeState(ChatState.CLOSED);
    }

    private readonly onError = (err: Event) => {
        logDebug("onError", "websocket error", err);
        this.changeState(ChatState.ERR_CONNECTION);
        this.pushError("ws", err);
    }

    // Mark: Packet handling

    private handlePacket(what: number, data: Uint8Array) {
        logDebug("handlePacket", `type=0x${what.toString(16).padStart(4, "0")}`, data);
        switch (what) {
            case MSG_SR_IGNORED:
            case MSG_SR_OK:
                break;

            case MSG_SR_MSG: {
                // Decoded as array-of-arrays due to msgpack array format.
                // Each inner array maps positionally to the MessageInfo fields.
                // Adjust the field order below to match the Rust struct definition.
                const raw = decode(data) as unknown[][];
                const messages: MessageInfo[] = raw.map(m => ({
                    id: m[0],
                    author_id: m[1],
                    channel_id: m[2],
                    nonce_id: m[3],
                    content: m[4],
                    sent_at: m[5],
                } as MessageInfo));
                this.mergeMessages(messages);
                logDebug("MSG_SR_MSG", messages);
                if (this.info.state !== ChatState.READY) {
                    this.changeState(ChatState.READY);
                }
                break;
            }

            case MSG_SR_MSG_FAILED:
                logDebug("handlePacket", "message send failed");
                this.pushError("SR_MSG_FAILED", data);
                break;

            case MSG_SR_CHANNEL_CREATED:
                logDebug("handlePacket", "channel created", data);
                // TODO: Channel code is here (msgpack encoded)
                break;

            case MSG_SR_CREDENTIALS: {
                const raw = decode(data) as unknown[];
                this.authToken = raw[0] as AuthToken;
                logDebug("handlePacket", "credentials received", this.authToken);
                break;
            }

            case MSG_SR_INVALID_AUTH: // no data
                this.changeState(ChatState.ERR_AUTH);
                break;

            case MSG_SR_REGISTRATION_NOT_ALLOWED: // no data
                this.changeState(ChatState.ERR_REGISTRATION);
                break;

            case MSG_SR_AUTH_ACCEPTED: // no data
                logDebug("handlePacket", "auth accepted");
                break;

            default:
                logDebug("handlePacket", `unknown packet type 0x${what.toString(16)}`);
        }
    }

    // Mark: Subscribers

    subscribeState(subscriber: () => void) {
        this.stateListeners.push(subscriber);
    }

    unsubscribeState(subscriber: () => void) {
        this.stateListeners = this.stateListeners.filter(l => l !== subscriber);
    }

    subscribeMessages(subscriber: () => void) {
        this.messageListeners.push(subscriber);
    }

    unsubscribeMessages(subscriber: () => void) {
        this.messageListeners = this.messageListeners.filter(l => l !== subscriber);
    }

    subscribeUsers(subscriber: () => void) {
        this.userListeners.push(subscriber);
    }

    unsubscribeUsers(subscriber: () => void) {
        this.userListeners = this.userListeners.filter(l => l !== subscriber);
    }

    subscribeErrors(subscriber: (err: ClientError) => void) {
        this.errorListeners.push(subscriber);
    }

    unsubscribeErrors(subscriber: (err: ClientError) => void) {
        this.errorListeners = this.errorListeners.filter(l => l !== subscriber);
    }

    // Mark: Internal notify helpers

    private changeState(state: ChatState) {
        this.info.state = state;
        this.notify(this.stateListeners);
    }

    private pushError(type: string, error: any) {
        this.errorListeners.forEach(l => l?.({type, error}));
    }

    private notify(listeners: (() => void)[]) {
        listeners.forEach(l => l?.());
    }

    // Mark: Communication methods

    private createChannel(action: CreateAction) {
        this.sendData<ChannelCreateRequest>(MSG_CL_CREATE_CHANNEL, action.request);
    }

    registerUser(action: RegisterAction) {
        this.sendData<RegisterAction>(MSG_CL_REGISTER, action.request);
    }

    private loginUser(action: LoginAction) {
        this.sendData<LoginAction>(MSG_CL_LOGIN, action.request);
    }

    sendMessage(request: MessageRequest) {
        this.sendData<MessageRequest>(MSG_CL_MSG, request);
    }

    // Mark: Helper methods

    private mergeMessages(incoming: MessageInfo[]) {
        const map = new Map(this.cachedMessages.map(m => [m.id, m]));
        for (const msg of incoming) map.set(msg.id, msg);
        this.cachedMessages = Array.from(map.values());
        this.notify(this.messageListeners);
    }

    private sendData<T>(destination: number, data: object) {
        if (this.ws == null || this.ws.readyState !== WebSocket.OPEN) {
            logDebug("sendData", "tried to send before connected", data);
            return;
        }

        logDebug("sendData", "sending data", data);

        const body = encode<T>(data, {
            useBigInt64: true,
        }) as Uint8Array;
        const packet = new Uint8Array(5 + body.byteLength);
        const view = new DataView(packet.buffer);

        packet[0] = MSG_HEAD;
        view.setUint16(1, destination, false);
        view.setUint16(3, body.byteLength, false);
        packet.set(body, 5);

        this.ws.send(packet);
    }

    private getCodeFromAction(action: ConnectAction): ChannelCode {
        if (action.type === "Login")
            return (action as LoginAction).request.channel_id;
        if (action.type === "Register")
            return (action as RegisterAction).request.channel_id;
        return 0n;
    }
}

// helpers
function logDebug(where: string, ...args: any[]) {
    console.log(`%c RC-${where} %c`, "background: #335335; color: white; font-weight: bold; border-radius: 5px;", " ", args);
}