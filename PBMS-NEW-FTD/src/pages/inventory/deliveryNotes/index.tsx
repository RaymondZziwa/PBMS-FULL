import { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaEye } from "react-icons/fa";
import CustomTable from "../../../custom/table/customTable";
import CustomDeleteModal from "../../../custom/modals/customDeleteModal";
import { toast } from "sonner";
import { apiRequest, baseURL } from "../../../libs/apiConfig";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { IDeliveryNote } from "../../../redux/types/inventory";
import useDeliveryNotes from "../../../hooks/inventory/useDeliveryNotes";
import AddOrModifyDeliveryNote from "./AddorModify";

const DeliveryNotes = () => {
  const { data, refresh } = useDeliveryNotes();
  const [deliveryNotes, setDeliveryNotes] = useState<IDeliveryNote[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: "create" | "edit" | "";
    deliveryNote: IDeliveryNote | null;
  }>({
    isOpen: false,
    mode: "create",
    deliveryNote: null,
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    setDeliveryNotes(data);
  }, [data]);

  const deleteDeliveryNote = async () => {
    try {
      if (modalProps.deliveryNote) {
        await apiRequest(
          InventoryEndpoints.STOCK_MVT.delete_DN(modalProps.deliveryNote.id),
          "POST",
          ""
        );
        refresh();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete");
    }
  };

  // Columns definition
  const columns = [
    { key: "deliveryNoteNumber", label: "Delivery Note #", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "employeeName", label: "Registered By", sortable: true },
    { key: "notes", label: "Notes", sortable: false },
    { key: "images", label: "Images", sortable: false },
    { key: "createdAt", label: "Created At", sortable: true },
    { key: "actions", label: "Actions", sortable: false },
  ];

  // Format date
  const formatDate = (date: string) =>
    new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const tableData = deliveryNotes.map((note) => ({
    ...note,
    employeeName: note.employee
      ? `${note.employee.firstName} ${note.employee.lastName}`
      : "Unknown",
    createdAt: formatDate(note.createdAt),
    images: (
      <div className="flex flex-wrap gap-2">
        {note.images?.length ? (
          note.images.map((img, idx) => (
            <img
              key={idx}
                  src={`${baseURL}${img}`}
              alt={`DN-${idx}`}
              className="w-14 h-14 object-cover rounded-md border cursor-pointer hover:opacity-80 transition"
              onClick={() => setPreviewImage(`${baseURL}${img}`)}
            />
          ))
        ) : (
          <span className="text-gray-400 italic">No images</span>
        )}
      </div>
    ),
    actions: (
      <div className="flex gap-3">
        <div className="relative group">
          <button
            className="text-gray-600 hover:text-gray-800 transition-colors"
            onClick={() => {
              if (note.images?.[0]) setPreviewImage(`${baseURL}${note.images[0]}`);
            }}
          >
            <FaEye />
          </button>
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            View
          </span>
        </div>

        <div className="relative group">
          <button
            className="text-red-600 hover:text-red-800 transition-colors"
            onClick={() => {
              setModalProps({
                isOpen: false,
                mode: "",
                deliveryNote: note,
              });
              setIsDeleteModalOpen(true);
            }}
          >
            <FaTrash />
          </button>
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Delete
          </span>
        </div>
      </div>
    ),
  }));

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Delivery Notes</h2>
        <button
          onClick={() =>
            setModalProps({ isOpen: true, mode: "create", deliveryNote: null })
          }
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add Delivery Note
        </button>
      </div>

      {/* Table */}
      <CustomTable columns={columns} data={tableData} pageSize={10} />

      {/* Create/Edit Modal */}
      <AddOrModifyDeliveryNote
        visible={modalProps.isOpen}
        note={modalProps.deliveryNote}
        onCancel={() =>
          setModalProps({ isOpen: false, mode: "create", deliveryNote: null })
        }
      />

      {/* Delete Modal */}
      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteDeliveryNote}
      />

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-[90%] max-h-[90%] rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default DeliveryNotes;
