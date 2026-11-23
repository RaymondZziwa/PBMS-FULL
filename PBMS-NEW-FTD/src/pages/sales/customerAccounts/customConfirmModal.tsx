import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  type?: "success" | "warning" | "danger";
};

/** Kept for screens that still import it; new screens use useConfirm(). */
const CustomConfirmModal = ({ visible, title, message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel, isLoading, type = "warning" }: Props) => (
  <Modal
    open={visible}
    onClose={onCancel}
    locked={isLoading}
    size="sm"
    role="alertdialog"
    title={title}
    footer={
      <>
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>{cancelText}</Button>
        <Button variant={type === "success" ? "primary" : "danger"} onClick={onConfirm} loading={isLoading}>{confirmText}</Button>
      </>
    }
  >
    <p className="m-0 text-sm leading-relaxed text-ink-soft">{message}</p>
  </Modal>
);

export default CustomConfirmModal;
