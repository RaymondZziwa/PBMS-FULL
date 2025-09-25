import React from "react";

interface CustomTextareaProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

const CustomTextarea: React.FC<CustomTextareaProps> = ({
  label,
  value = "",
  onChange,
  placeholder = "",
  disabled = false,
  rows = 4,
}) => {
  return (
    <div className="w-full">
      <label className="block mb-1 font-medium text-gray-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
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

export default CustomTextarea;
