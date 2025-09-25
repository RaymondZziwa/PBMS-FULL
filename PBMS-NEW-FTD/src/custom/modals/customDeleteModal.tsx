import React from "react";
import CustomButton from "../buttons/customButton";

interface CustomDeleteModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  message?: string;
}

const CustomDeleteModal: React.FC<CustomDeleteModalProps> = ({
  visible,
  onCancel,
  onConfirm,
  title = "Confirm Deletion",
  message = "Are you sure you want to proceed with this action? This action cannot be reversed.",
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[400px] animate-fade-in">
        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-800 mb-2">{title}</h2>

        {/* Message */}
        <p className="text-gray-600 mb-6">{message}</p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <CustomButton
            label="Cancel"
            type="negative"
            fn={onCancel}
          />
          <CustomButton
            label="Confirm"
            type="positive"
            fn={onConfirm}
            autoCloseModal={onCancel}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomDeleteModal;
