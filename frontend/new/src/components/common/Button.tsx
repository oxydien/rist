import type React from "preact/compat";
import "../../assets/styles/common/button.css";

interface ButtonProps {
  children?: React.ReactNode;
  variant?: "default" | "primary" | "destructive";
  onClick?: (event?: MouseEvent) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  link?: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  className?: string;
  tabIndex?: number;
}

const Button: React.FC<ButtonProps> = ({ children, className = "", variant = "default", link, ...props }) => {
  const buttonClass = `btn btn-${variant}`;

  if (link) {
    return (
      <a
        href={link}
        rel="noopener noreferrer"
        tabindex={props.tabIndex}
        target={props.target}
        className={buttonClass}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <button className={buttonClass} tabindex={props.tabIndex} {...props}>
      {children}
    </button>
  );
};

export default Button;
