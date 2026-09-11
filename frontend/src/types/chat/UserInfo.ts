import UserPreferences from "./UserPreferences.ts";
import Timestamp from "./Timestamp.ts";

export default interface UserInfo {
    id: bigint;
    preferences: UserPreferences;
    joined_at: Timestamp;
}