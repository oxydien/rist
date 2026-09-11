enum ChatState {
    NONE,
    CONNECTING,
    JOINING,
    AUTHORIZING,
    REQUIRES_AUTH,
    READY,
    ERR_INVALID,
    ERR_CONNECTION,
    ERR_AUTH,
    ERR_REGISTRATION,
    CLOSED,
}

export default ChatState;
