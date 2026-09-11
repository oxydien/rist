import ChannelInfo from "./ChannelInfo.ts";
import UserInfo from "./UserInfo.ts";
import MessageInfo from "./MessageInfo.ts";
import MessageRequest from "./MessageRequest.ts";

export default interface Channel {
    info: ChannelInfo;
    cachedUsers: UserInfo[];
    localUser?: UserInfo;
    cachedMessages: MessageInfo[];
    unsendMessage?: MessageRequest;
}
