import {InputHTMLAttributes, TargetedEvent} from "preact";
import "../../assets/styles/common/input.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "primary" | "destructive";
  disabled?: boolean;
  type?: "text" | "number" | "email" | "password";
  target?: "_blank" | "_self" | "_parent" | "_top";
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (event: TargetedEvent<HTMLInputElement>) => void;
  onKeyUpCapture?: (event: KeyboardEvent) => void;
}

export default function Input({
  className = "",
  variant = "default",
  value,
  ...props
}: InputProps) {
  const buttonClass = `input input-${variant}`;

  return (
    <input
      className={buttonClass}
      value={value}
      onChange={props.onChange}
      onKeyUpCapture={props.onKeyUpCapture}
      {...props}
    />
  );
};
