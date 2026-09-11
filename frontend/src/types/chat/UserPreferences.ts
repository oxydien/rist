export default interface UserPreferences {
    username: string,
    pfp_index: number,
    user_color: number,
}

export function colorToHex(number: number): string {
    return "#" + number.toString(16).padStart(6, "0");
}

export function hexToColorInt(hexString: string): number {
    let hex = hexString;
    if (hex.startsWith("#"))
        hex = hex.substring(1)
    return parseInt(hex, 16);
}