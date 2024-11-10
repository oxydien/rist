import type React from "preact/compat";
import "../../assets/styles/common/input.css"

interface InputProps {
  variant?: "default" | "primary" | "destructive";
  disabled?: boolean;
  type?: "text" | "number" | "email" | "password";
  target?: "_blank" | "_self" | "_parent" | "_top";
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input: React.FC<InputProps> = ({
  className = "",
  variant = "default",
  value,
  ...props
}) => {
  const buttonClass = `input input-${variant}`;

  return (
    <input
      className={buttonClass}
      value={value}
      onChange={props.onChange}
      {...props}
    />
  );
};

export default Input;
