import {colorToHex} from "../types/chat/UserPreferences.ts";

export function isColorTooDark(color: string): boolean {
    const hex = color.replace(/^#/, '');
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 90;
}

export function isDecColorTooDark(decColor: number) {
    return isColorTooDark(colorToHex(decColor));
}
