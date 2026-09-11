import {useRistChat} from "../../../stores/chat/ristChatStore.ts";
import {useEffect} from "preact/hooks";

export default function ChatPage() {
    //const register: RegisterAction = {
    //    type: "Register",
    //    request: {
    //        props: {
    //            pfp_index: 0,
    //            user_color: 5474264,
    //            username: "Test user",
    //        },
    //        channel_id: BigInt("1788783849971"),
    //        password: ""
    //    }
    //}

    // LOGIN: 43 00 10 00 82 00 C4 00 80 00 52 00 81 00 CF 00 5C 00 82 00 47 00 BF 00 01 00 BB 00 3E 00 23 00 56 00 41 00 EA 00 48 00 E4 00 02 00 86 00 DA 00 AB 00 D5 00 D8 00 DE 00 93 00 A7 00 76 00 53 00 DE 00 AE 00 EF 00 80 00 03 00 32 00 BA 00 73 00 8D 00 20 00 79 00 96 00 21 00 DC 00 71 00 F1 00 65 00 FD 00 1A 00 7C 00 87 00 41 00 BD 00 6E 00 FF 00 C2 00 7B 00 88 00 1F 00 F5 00 FF 00 D8 00 C7 00 AC 00 A3 00 AF 00 9E 00 49 00 24 00 35 00 2F 00 C7 00 9E 00 C2 00 11 00 B5 00 6B 00 CA 00 EE 00 41 00 19 00 49 00 74 00 4F 00 D7 00 8D 00 AE 00 B9 00 9A 00 39 00 D1 00 0E 00 30 00 18 00 B3 00 69 00 DD 00 5B 00 9B 00 FD 00 70 00 EF 00 4E 00 FA 00 69 00 E5 00 67 00 9E 00 C5 00 E9 00 46 00 2B 00 E4 00 A1 00 3F 00 C0 00 F0 00 4B 00 88 00 39 00 EB 00 82 00 C6 00 D4 00 AD 00 37 00 2D 00 EB 00 50 00 AD 00 9E 00

    const { channelInfo, connect, state, messages, registerUser } = useRistChat(register)


    useEffect(() => {
        connect();
    }, []);

    //useEffect(() => {
    //    if (state == ChatState.READY) {
    //        registerUser(register);
    //    }
    //}, [state]);

    return <main>
        <h1>Imagine here is a chat!</h1>

        <div>
            <strong>
                STATUS: {state}
            </strong>
        </div>

        <ul>
            <li><strong>Messages</strong></li>
            {messages.map(e => <li><strong>{e.author_id}</strong>{e.content}</li>)}
        </ul>
    </main>;
}