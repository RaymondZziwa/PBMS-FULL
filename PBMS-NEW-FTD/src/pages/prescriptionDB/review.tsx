import { useEffect, useState } from 'react';
import CustomTextarea from '../../custom/inputs/customTextArea';
import CustomButton from '../../custom/buttons/customButton';

type ReviewModalProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (reviewNotes: string) => void;
  title?: string;
    loading?: boolean;
    isSubmitting: boolean;
};

const ReviewModal = ({
  visible,
  onCancel,
  onConfirm,
  title = "Review Prescription",
  isSubmitting
}: ReviewModalProps) => {
  const [reviewNotes, setReviewNotes] = useState('');

  // Reset notes when modal is opened/closed
  // Useful for multiple open/close cycles
  // eslint-disable-next-line
useEffect(() => {
    setReviewNotes('');
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">{title}</h3>
            <CustomTextarea
              label="Review Notes"
              value={reviewNotes}
              onChange={e => setReviewNotes(e)}
              placeholder="Enter your notes regarding this prescription review..."
            />
       
              <div className="flex justify-end gap-3">
            <CustomButton type="negative" fn={onCancel} label="Cancel" disabled={isSubmitting} />
            <CustomButton
              label={isSubmitting ? "Submitting..." : "Submit"}
              fn={() => onConfirm(reviewNotes)}
              disabled={isSubmitting || !reviewNotes.trim()}
            />
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
