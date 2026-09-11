import ChannelCode from "./ChannelCode.ts";
import AuthToken from "./AuthToken.ts";

export default interface UserAuthRequest {
    channel_id: ChannelCode,
    auth_token: AuthToken
}