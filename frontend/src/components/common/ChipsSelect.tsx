import { useCallback } from "preact/hooks";
import Button from "./Button";

interface Option<T> {
  label: string;
  value: T;
  onSelect?: () => void;
}

interface ChipsSelectProps<T> {
  options: Option<T>[];
  value?: T;
  onChange?: (selected: T[]) => void;
  disabled?: boolean;
  className?: string;
}

function ChipsSelect<T extends string | number | boolean | object = string>({
  options,
  value,
  onChange,
  disabled = false,
  className,
}: ChipsSelectProps<T>) {
  import("../../assets/styles/common/chipsselect.css");

  const handleSelect = useCallback(
    (selected: Option<T>) => {
      if (onChange) {
        onChange([selected.value]);
        if (selected.onSelect) {
          selected.onSelect();
        }
      }
    },
    [onChange]
  );

  const isSelected = useCallback(
    (selected: T) => {
      return value === selected;
    },
    [value]
  );

  return (
    <div className={`chips-select ${className || ""}`}>
      {options.map((option) => (
        <Button
          key={typeof option.value === "object" ? JSON.stringify(option.value) : String(option.value)}
          type="button"
          onClick={() => handleSelect(option)}
          disabled={disabled}
          className={"chip"}
          variant={isSelected(option.value) ? "primary" : "default"}
          data-selected={isSelected(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export default ChipsSelect;
