import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import type { IClient } from "../../../redux/types/sales";

type Props = { visible: boolean; client: IClient | null; isCreating: boolean; onConfirm: () => void; onCancel: () => void };

/** Kept for other screens that import it; Customers now confirms inline. */
const CreateAccountModal = ({ visible, client, isCreating, onConfirm, onCancel }: Props) => (
  <Modal
    open={visible && !!client}
    onClose={onCancel}
    locked={isCreating}
    size="sm"
    title={`Open a prepaid account for ${client?.firstName ?? ""} ${client?.lastName ?? ""}?`}
    footer={
      <>
        <Button variant="secondary" onClick={onCancel} disabled={isCreating}>Cancel</Button>
        <Button onClick={onConfirm} loading={isCreating}>Open account</Button>
      </>
    }
  >
    <p className="m-0 text-sm text-ink-soft">They get an account number. Money they deposit can then pay for purchases at the till.</p>
  </Modal>
);

export default CreateAccountModal;
