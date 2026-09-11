import Button from "../../common/Button.tsx";
import PickColorIcon from "../../icons/PickColorIcon.tsx";
import {colorPrefabs} from "../../../utils/chat/placeholderData.ts";
import CheckIcon from "../../icons/CheckIcon.tsx";
import {useMemo, useRef} from "preact/hooks";
import {TargetedEvent} from "preact";
import {isDecColorTooDark} from "../../../utils/color.ts";
import {colorToHex} from "../../../types/chat/UserPreferences.ts";

interface ColorPickerProps {
    value: number,
    onChange: (newValue: number) => void,
}

export default function ColorPicker({ ...props }: ColorPickerProps) {
    const inputPickerRef = useRef<HTMLInputElement | null>(null);
    const colors = colorPrefabs;

    const handleClrPress = (decColor: number) => {
        props.onChange(decColor);
    }

    const colorInPrefabs = useMemo(() => colors.includes(props.value), [props.value]);

    const handleOpenPicker = () => {
        const input = inputPickerRef.current;
        if (!input) return;
        input.value = `#${props.value.toString(16).padStart(6, "0")}`;
        input.click();
    }

    const handleInputChange = (e: TargetedEvent<HTMLInputElement>) => {
        const hex = e.currentTarget.value;
        const decColor = parseInt(hex.slice(1), 16);
        props.onChange(decColor);
    }

    const colorButtons = colors.map(decColor =>
        <Button onClick={() => handleClrPress(decColor)} iconOnly>
            <span style={{
                background: colorToHex(decColor),
                color: isDecColorTooDark(decColor) ? "hsl(var(--text-color))" : "hsl(var(--invtext-0-color))"
            }}>
                { props.value === decColor ? <CheckIcon /> : "" }
            </span>
        </Button>
    )

    return <>
        <div className="color-picker">
            { colorButtons }
            <Button onClick={handleOpenPicker} iconOnly>
                <span style={{
                    background: colorToHex(props.value),
                    color: isDecColorTooDark(props.value) ? "hsl(var(--text-color))" : "hsl(var(--invtext-0-color))"
                }}>
                    <PickColorIcon /> { colorInPrefabs ? "" : <CheckIcon /> }
                </span>
            </Button>
        </div>
        <input
            type="color"
            ref={inputPickerRef}
            onInput={handleInputChange}
            aria-hidden
            tabIndex={-1}
            style={{
                position: "absolute",
                width: 0,
                height: 0,
                padding: 0,
                margin: 0,
                border: "none",
                opacity: 0,
            }}
        />
    </>
}
