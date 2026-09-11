import { useEffect, useState, useRef } from "preact/hooks";
import { RistChat } from "../../utils/comm/chat/RistChat.ts";
import {ConnectAction, RegisterAction} from "../../types/chat/ConnectAction.ts";
import MessageInfo from "../../types/chat/MessageInfo.ts";
import UserInfo from "../../types/chat/UserInfo.ts";
import ClientError from "../../types/chat/ClientError.ts";
import ChatState from "../../types/chat/ChatState.ts";
import MessageRequest from "../../types/chat/MessageRequest.ts";
import ChannelInfo from "../../types/chat/ChannelInfo.ts";

export const useRistChat = (auth: ConnectAction) => {
    const serverRef = useRef<RistChat | null>(null);
    if (!serverRef.current) {
        serverRef.current = new RistChat(auth);
    }
    const server = serverRef.current;

    const [channelInfo, setChannelInfo] = useState<ChannelInfo>(server.info);
    const [state, setState] = useState<ChatState>(server.info.state);
    const [messages, setMessages] = useState<MessageInfo[]>(server.cachedMessages);
    const [users, setUsers] = useState<UserInfo[]>(server.cachedUsers);
    const [errors, setErrors] = useState<ClientError[]>([]);

    useEffect(() => {
        const handleState = () => {
            setChannelInfo(server.info);
            setState(server.info.state)
        };

        const handleMessages = () => setMessages([...server.cachedMessages]);
        const handleUsers = () => setUsers([...server.cachedUsers]);

        const handleError = (err: ClientError) => setErrors((prev) => [...prev, err]);

        server.subscribeState(handleState);
        server.subscribeMessages(handleMessages);
        server.subscribeUsers(handleUsers);
        server.subscribeErrors(handleError);

        return () => {
            server.unsubscribeState(handleState);
            server.unsubscribeMessages(handleMessages);
            server.unsubscribeUsers(handleUsers);
            server.unsubscribeErrors(handleError);
            server.close();
        };
    }, [server]);

    return {
        channelInfo,
        state,
        messages,
        users,
        errors,
        connect: () => server.connect(),
        sendMessage: (req: MessageRequest) => server.sendMessage(req),
        registerUser: (req: RegisterAction) => server.registerUser(req),
        close: () => server.close()
    };
};