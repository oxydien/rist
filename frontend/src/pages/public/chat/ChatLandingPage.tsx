import RistChatIcon from "../../../components/icons/RistChatIcon.tsx"
import ChipsSelect from "../../../components/common/ChipsSelect.tsx";
import {useMemo, useState} from "preact/hooks";
import {Carousel} from "../../../components/common/Carousel.tsx";
import LabeledInput from "../../../components/common/LabeledInput.tsx";
import UserPreferencesUi from "../../../components/modules/chat/UserPreferencesUi.tsx";
import Button from "../../../components/common/Button.tsx";
import UserPreferences from "../../../types/chat/UserPreferences.ts";

const ACTION_PAGE_JOIN = 1;
const ACTION_PAGE_CREATE = 0;

export default function ChatLandingPage() {
    import("../../../assets/styles/public/common.css");
    import("../../../assets/styles/public/chat.css");
    import("../../../assets/styles/public/utils.css");

    const [actionPage, setActionPage] = useState(ACTION_PAGE_JOIN);

    const [roomName, setRoomName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [password, setPassword] = useState("");
    const [profile, setProfile] = useState<UserPreferences | null>(null);

    const isRoomNameValid = useMemo(() => roomName.length >= 3 && roomName.length <= 64, [roomName]);
    const canJoin = useMemo(() => joinCode.length >= 6 && profile != null, [joinCode, profile]);
    const canCreate = useMemo(() => isRoomNameValid && profile != null, [isRoomNameValid, profile]);

    return (
        <main className="chat-landing">
            <div className="chat-landing-decorations">
                <div className="chat-landing-decorations-background" />
                <div className="chat-landing-decorations-lamp" />
            </div>

            <h1>
                <span className="rist-chat-logo">
                    RIST
                    <RistChatIcon width="1.3em" height="1.3em"/>
                    chat
                </span>
            </h1>
            <h3 className="chat-simple-banner">
                Chatting was <em>simpler</em>. Let's <em>rewind</em>!
            </h3>

            <div className="action-select">
                <strong className="center-head">What do you wanna do?</strong>
                <ChipsSelect
                  value={actionPage}
                  options={[
                    { label: "Join a chatroom", value: ACTION_PAGE_JOIN },
                    { label: "Create a new room", value: ACTION_PAGE_CREATE },
                  ]}
                  onChange={(selected) => setActionPage(selected[0])}
                  className="action-select-options"
                />
            </div>


            <Carousel index={actionPage} maxWidth={490} height={500}>


                <div className="chat-create-form">
                    <LabeledInput
                        value={roomName}
                        onValue={setRoomName}
                        placeholder="Your room name..."
                        required
                        isValid={isRoomNameValid}
                        invalidMessage="The room name must be between 3 and 64 characters long (inclusive)"
                    >
                        <strong>How to call your room?</strong>
                        <small>3 - 64 characters</small>
                    </LabeledInput>

                    <LabeledInput value={password} onValue={setPassword} placeholder="Password goes here...">
                        <strong>What should be the password?</strong>
                        <small>leave this empty for no password</small>
                    </LabeledInput>

                    <div className="chat-user-create">
                        <strong>Let's make your profile</strong>
                        <small>This profile will be only for this room.</small>
                        <UserPreferencesUi preferences={profile} onChange={setProfile} />
                    </div>

                    <Button variant="primary" disabled={!canCreate}>
                        Let's start talking!
                    </Button>
                </div>



                <div className="chat-join-form">
                    <LabeledInput value={joinCode} onValue={setJoinCode} placeholder="Room code here..." required minLength={6}>
                        <strong>What room to join?</strong>
                    </LabeledInput>
                    <LabeledInput value={password} onValue={setPassword} placeholder="Password goes here...">
                        <strong>What's the password?</strong>
                        <small>leave this empty if there's no password</small>
                    </LabeledInput>

                    <div className="chat-user-create">
                        <strong>Let's make your profile</strong>
                        <small>This profile will be only for this room.</small>
                        <UserPreferencesUi preferences={profile} onChange={setProfile} />
                    </div>
                    <Button variant="primary" disabled={!canJoin}>
                        Join the jabber!
                    </Button>
                </div>


            </Carousel>
        </main>
    )
}