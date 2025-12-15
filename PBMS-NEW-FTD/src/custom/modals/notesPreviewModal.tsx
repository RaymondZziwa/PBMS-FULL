import { Modal } from "antd";

interface INotesModalProps {
  visible: boolean;
  onClose: () => void;
  notesData: {
    description?: string | null;
    resolveNotes?: string | null;
    extraNote?: string | null;
  };
}

const NotesPreviewModal = ({ visible, onClose, notesData }: INotesModalProps) => {
  const { description, resolveNotes, extraNote } = notesData;

  const hasNotes =
    (description && description.trim() !== "") ||
    (resolveNotes && resolveNotes.trim() !== "") ||
    (extraNote && extraNote.trim() !== "");

  if (!hasNotes) return null;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      title="Notes Preview"
      className="rounded-xl"
    >
      <div className="flex flex-col gap-4 text-gray-700">
        {description && description.trim() !== "" && (
          <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-md">
            <h4 className="font-semibold text-blue-700 mb-1">Description</h4>
            <p className="text-sm">{description}</p>
          </div>
              )}
              
              {extraNote && extraNote.trim() !== "" && (
          <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
            <h4 className="font-semibold text-yellow-700 mb-1">Confirmation / Rejection Note</h4>
            <p className="text-sm">{extraNote}</p>
          </div>
        )}

        {resolveNotes && resolveNotes.trim() !== "" && (
          <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded-md">
            <h4 className="font-semibold text-green-700 mb-1">Stock Transfer Conflict Resolution Notes</h4>
            <p className="text-sm">{resolveNotes}</p>
          </div>
        )}

        {!hasNotes && <p className="text-gray-400 text-sm">No notes available</p>}
      </div>
    </Modal>
  );
};

export default NotesPreviewModal;
