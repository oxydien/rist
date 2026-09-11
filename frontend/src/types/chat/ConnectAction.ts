import UserAuthRequest from "./UserAuthRequest.ts";
import UserRegisterRequest from "./UserRegisterRequest.ts";
import ChannelCreateRequest from "./ChannelCreateRequest.ts";

export interface LoginAction {
    type: "Login";
    request: UserAuthRequest;
}

export interface RegisterAction {
    type: "Register";
    request: UserRegisterRequest;
}

export interface CreateAction {
    type: "Create";
    request: ChannelCreateRequest;
}

export type ConnectAction = LoginAction | RegisterAction | CreateAction;
