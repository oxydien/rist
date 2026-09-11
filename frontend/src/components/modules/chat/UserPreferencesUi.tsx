import LabeledInput from "../../common/LabeledInput.tsx";
import {useEffect, useMemo, useState} from "preact/hooks";
import {chatUsernames, colorPrefabs} from "../../../utils/chat/placeholderData.ts";
import {useWritingEffect} from "../../../utils/chat/writingEffect.ts";
import ColorPicker from "./ColorPicker.tsx";
import UserPreferences from "../../../types/chat/UserPreferences.ts";

interface UserPreferencesProps {
    preferences?: UserPreferences | null,
    onChange: (preferences: UserPreferences | null) => void;
}

export default function UserPreferencesUi({ ...props }: UserPreferencesProps) {

    const [username, setUsername] = useState(props.preferences?.username || "");
    const [color, setColor] = useState(props.preferences?.user_color || colorPrefabs[0]);

    const [placeholderUsername, setPlaceholderUsername] = useState("Aormix");
    const animatedPlaceholderUsername = useWritingEffect(placeholderUsername);

    const randomizePlaceholderUsername = () => {
        const random = Math.floor(Math.random() * chatUsernames.length);
        setPlaceholderUsername(chatUsernames[random]);
    }

    useEffect(() => {
        const interval = setInterval(randomizePlaceholderUsername, 5000)
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isUsernameValid) {
            props.onChange({
                username,
                user_color: color,
                pfp_index: 0
            });
            return;
        }
        props.onChange(null);
    }, []);

    const isUsernameValid = useMemo(() => username.length >= 3 && username.length <= 64, [username]);

    return <>
        <div className="chat-user-preferences">
            <div>
                <LabeledInput
                    value={username}
                    onValue={setUsername}
                    placeholder={`Try ${animatedPlaceholderUsername}...`}
                    required
                    isValid={isUsernameValid}
                    invalidMessage="The username must be between 3 and 64 characters long (inclusive)"
                >
                    <strong>What should we call you?</strong>
                    <small>3 - 64 characters</small>
                </LabeledInput>
                <div>
                    <strong>Preferred color?</strong>
                    <ColorPicker value={color} onChange={setColor} />
                </div>
            </div>
            {/* TODO: USER PIC HERE */}
        </div>
    </>
}