import { useEffect, useState } from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";

type ReviewModalProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (reviewNotes: string) => void;
  title?: string;
  isSubmitting: boolean;
  /** Notes already written (when re-reviewing). */
  initialNotes?: string;
};

/** Write review notes for a prescription. */
const ReviewModal = ({ visible, onCancel, onConfirm, title = "Review prescription", isSubmitting, initialNotes = "" }: ReviewModalProps) => {
  const [notes, setNotes] = useState(initialNotes);
  useEffect(() => {
    if (visible) setNotes(initialNotes);
  }, [visible, initialNotes]);

  return (
    <Modal
      open={visible}
      onClose={onCancel}
      locked={isSubmitting}
      size="md"
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={() => onConfirm(notes.trim())} loading={isSubmitting} disabled={!notes.trim()}>
            Mark as reviewed
          </Button>
        </>
      }
    >
      <label htmlFor="review-notes" className="mb-1.5 block text-[13px] font-medium text-ink-soft">
        Review notes <span className="text-[#C0362C]">*</span>
      </label>
      <textarea
        id="review-notes"
        data-autofocus
        rows={6}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What you checked, anything to change, follow-up advice…"
        className="themed w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-brand-ink outline-none placeholder:text-brand-muted/70 focus:border-brand focus:shadow-[0_0_0_3px_rgb(57_89_165/0.18)]"
      />
    </Modal>
  );
};

export default ReviewModal;
