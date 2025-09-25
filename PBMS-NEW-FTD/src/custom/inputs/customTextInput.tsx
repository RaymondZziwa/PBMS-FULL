import React from "react";

interface CustomTextInputProps {
  label?: string;
  value?: string;
  type?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isRequired?: boolean
}

const CustomTextInput: React.FC<CustomTextInputProps> = ({
  label,
  value = "",
  onChange,
  type,
  placeholder = "",
  disabled = false,
  isRequired
}) => {
  return (
    <div className="w-full">
      <label className="block mb-1 font-medium text-gray-700">{label} { isRequired && <span className="text-red-500">*</span>}</label>
      <input
        type={type ? type : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
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

export default CustomTextInput;
