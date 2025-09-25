import React, { useState } from "react";
import { FaCheck, FaTimes, FaSpinner } from "react-icons/fa";

interface CustomButtonProps {
  fn?: (arg1?: any, arg2?: any, arg3?: any) => Promise<void> | void;
  disabled?: boolean;
    type?: "positive" | "negative";
    label?: string;
  autoCloseModal?: () => void;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  fn,
  disabled = false,
  type = "positive",
  autoCloseModal,
   label,
}) => {
  const [loading, setLoading] = useState(false);

  const baseStyles =
    "mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white font-medium transition-colors duration-200";

  const typeStyles =
    type === "positive"
      ? "bg-gray-600 hover:bg-gray700"
      : "bg-red-400 hover:bg-red00";

  const disabledStyles = "opacity-50 cursor-not-allowed";

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!fn) return;
  
    setLoading(true);
  
    try {
      // Wrap setTimeout in a promise so we can await it
      await new Promise((resolve) => setTimeout(resolve, 1000));
  
      // Now call fn after 2s
      await Promise.resolve(fn(e));
  
      autoCloseModal?.();
    } catch (err) {
      console.error("Button action failed:", err);
    } finally {
      setLoading(false);
    }
  };
  
  

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${typeStyles} ${
        disabled || loading ? disabledStyles : ""
      }`}
    >
      {loading ? (
        <FaSpinner className="animate-spin text-sm" />
      ) : type === "positive" ? (
        <FaCheck className="text-sm" />
      ) : (
        <FaTimes className="text-sm" />
      )}
     {loading ? "Processing..." : label || (type === "positive" ? "Save" : "Cancel")}
    </button>
  );
};

export default CustomButton;
