import ChatState from "./ChatState.ts";
import ChannelCode from "./ChannelCode.ts";

export default interface ChannelInfo {
    state: ChatState,
    code: ChannelCode,
}