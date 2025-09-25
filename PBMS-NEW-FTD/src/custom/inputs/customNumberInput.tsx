import React from "react";

interface CustomNumberInputProps {
  label?: string;
  value?: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  max?: number;
}

const CustomNumberInput: React.FC<CustomNumberInputProps> = ({
  label,
  value = 0,
  onChange,
  placeholder = "",
  disabled = false,
  max,
}) => {
  return (
    <div className="w-full">
      <label className="block mb-1 font-medium text-gray-700">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder={placeholder}
        disabled={disabled}
        min={0}
        max={max}
        className={`
            w-full
            border border-gray-300
            rounded-md
            px-3 py-2
            text-gray-700
            placeholder-gray-400
            focus:border-blue-500 
            focus:ring-2 
            focus:ring-blue-200
            focus:outline-none
            disabled:bg-gray-50
            disabled:text-gray-400
            transition-colors
            duration-200
        `}
      />
    </div>
  );
};

export default CustomNumberInput;
