import ChannelCode from "./ChannelCode.ts";
import UserPreferences from "./UserPreferences.ts";

export default interface UserRegisterRequest {
    channel_id: ChannelCode,
    password: string,
    props: UserPreferences
}