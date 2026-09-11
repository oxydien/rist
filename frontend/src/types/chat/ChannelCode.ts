
type ChannelCode = bigint;

export default ChannelCode;

const ALPHABET_LEN = 64n;
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
const CODE_LEN = 10;
const MAX_REPRESENTABLE = 1152921504606846975n; // 64^10 - 1


export function codeToRead(code: ChannelCode): string {
    if (code > MAX_REPRESENTABLE) {
        return "";
    }

    let outCode = "";
    let ts = code;
    for (let i = CODE_LEN - 1; i >= 0; i--) {
        outCode += ALPHABET[Number(ts % ALPHABET_LEN)];
        ts = BigInt(ts / ALPHABET_LEN);
    }

    return outCode;
}

export function codeFromRead(read: string): ChannelCode | null {
    if (read.length !== CODE_LEN) {
        return null;
    }

    let output: bigint = 0n;

    for (let i = 0; i < read.length; i++) {
        const charIndex = ALPHABET.indexOf(read.charAt(i));

        if (charIndex === -1) {
            return null;
        }

        output = output * ALPHABET_LEN + BigInt(charIndex);
    }

    return output;
}