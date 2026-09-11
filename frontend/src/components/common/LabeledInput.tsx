import {ComponentChildren, TargetedEvent} from "preact";
import {useMemo} from "preact/hooks";
import Input from "./Input.tsx";
import "../../assets/styles/common/input.css";

interface LabeledInputProps {
    children: ComponentChildren,
    value: string,
    onValue: (newValue: string) => void,
    onConfirm?: () => void,
    className?: string,
    isValid?: boolean,
    textarea?: boolean,
    invalidMessage?: string,
    type?: "text" | "number" | "email" | "password",
    required?: boolean,
    requiredMessage?: string | null,
    autoFocus?: boolean,
    placeholder?: string,
    disabled?: boolean,
    minLength?: number,
}

export default function LabeledInput({...props}: LabeledInputProps) {
    const minLen = props.minLength || 1;

    const handleInput = (ev: TargetedEvent<HTMLInputElement>) => {
        props.onValue((ev.target as HTMLInputElement).value)
    }
    const handleInputArea = (ev: TargetedEvent<HTMLTextAreaElement>) => {
        props.onValue((ev.target as HTMLTextAreaElement).value)
    }

    const showInvalidMsg = useMemo(() =>
            (!props.required || (props.value && props.value.length >= minLen)) && props.isValid != null && !props.isValid && props.invalidMessage,
        [props.required, props.value, props.isValid, props.invalidMessage]);

    const showRequiredMsg = useMemo(() =>
            props.required && props.value != null && props.value.length < minLen,
        [props.required, props.value]);

    return (
        <div class="labeled-input">
            {props.children}
            {
                props.textarea
                    ?
                    <textarea
                        value={props.value}
                        onInput={handleInputArea}
                        required={props.required}
                        autoFocus={props.autoFocus}
                        placeholder={props.placeholder}
                        className={`${props.className || ""}`}
                        disabled={props.disabled}
                    />
                    :
                    <Input
                        value={props.value}
                        onChange={handleInput}
                        required={props.required}
                        autoFocus={props.autoFocus}
                        type={props.type}
                        placeholder={props.placeholder}
                        className={`${props.className || ""}`}
                        onKeyUpCapture={(key) => key.code === "Enter" && props.onConfirm && props.onConfirm()}
                        disabled={props.disabled}
                    />
            }
            {showInvalidMsg && (
                <span class="input-note">{props.invalidMessage}</span>
            )}
            {showRequiredMsg && (
                <span class="input-note">{props.requiredMessage || "This field is required"}</span>
            )}
        </div>
    )
}