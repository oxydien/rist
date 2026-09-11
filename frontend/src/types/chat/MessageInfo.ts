import ChannelCode from "./ChannelCode.ts";
import Timestamp from "./Timestamp.ts";

export default interface MessageInfo {
    id: bigint;
    author_id: bigint;
    channel_id: ChannelCode;
    nonce_id?: bigint;
    content: string;
    sent_at: Timestamp;
}