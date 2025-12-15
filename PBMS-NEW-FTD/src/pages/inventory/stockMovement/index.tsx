import { useState } from "react";
import CustomTable from "../../../custom/table/customTable";
import useStockMovement from "../../../hooks/inventory/useStockMovement";
import type { IStockMovement } from "../../../redux/types/inventory";
import {
  FaPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaImages,
  FaEye,
} from "react-icons/fa";
import AddOrModifyRecord from "./AddorModify";
import { useSelector } from "react-redux";
import type { RootState } from "../../../redux/store";
import { Modal } from "antd";
import ImagePreviewModal from "../../../custom/modals/imagePreviewModal";
import CustomTextarea from "../../../custom/inputs/customTextArea";
import CustomNumberInput from "../../../custom/inputs/customNumberInput";
import { apiRequest } from "../../../libs/apiConfig";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import { toast } from "sonner";
import NotesPreviewModal from "../../../custom/modals/notesPreviewModal";

const StockMovementRecords = () => {
  const user = useSelector((state: RootState) => state.userAuth.data.id);
  const { data: records, refresh } = useStockMovement();
  const [formData, setFormData] = useState({ confirmedQty: "", notes: "" });
  const [notesModal, setNotesModal] = useState<{
  visible: boolean;
  notesData: {
    description?: string | null;
    resolveNotes?: string | null;
    extraNote?: string | null;
  };
}>({ visible: false, notesData: {} });


  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: "create" | "edit" | "";
    record: IStockMovement | null;
  }>({ isOpen: false, mode: "create", record: null });

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    record: IStockMovement | null;
    action: "confirm" | "reject" | "resolve" | "";
  }>({ visible: false, record: null, action: "" });

  const [previewModal, setPreviewModal] = useState<{
    visible: boolean;
    images: string[];
    index: number;
    title: string;
  }>({ visible: false, images: [], index: 0, title: "" });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const columns = [
    { key: "category", label: "Category", sortable: true },
    { key: "item", label: "Item", sortable: true, filterable: true },
    { key: "store", label: "Store", sortable: true, filterable: true },
    { key: "toStore", label: "Destination Store", sortable: true, filterable: true },
    {
      key: "transferStatus",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (value: string) => {
        let color = "text-gray-700 bg-gray-100";
        if (value === "PENDING") color = "text-yellow-800 bg-yellow-100";
        if (value === "CONFIRMED") color = "text-green-800 bg-green-100";
        if (value === "REJECTED") color = "text-red-800 bg-red-100";
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
            {value}
          </span>
        );
      },
    },
    { key: "unit", label: "Unit", sortable: true },
    {
      key: "qty",
      label: "TRANSFERRED QTY",
      sortable: true,
      render: (_: any, row: IStockMovement) => {
        if (row.category === "TRANSFER" && row.initiatedQty !== undefined && row.qty !== row.initiatedQty) {
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-red-600 font-semibold">
                {row.qty} 
                <FaExclamationTriangle className="w-4 h-4" title="Quantity mismatch" />
                <span className="text-xs font-medium ml-1">Mismatch!</span>
              </div>
              {row.isResolved && (
                <span className="inline-block px-2 py-0.5 text-xs text-center font-semibold text-green-800 bg-green-100 rounded-full w-[100px]">
                  Resolved
                </span>
              )}
            </div>

          );
        }
        return <span>{row.qty}</span>;
      },
    },
    { key: "initiatedQty", label: "Initiated Qty", sortable: true },
    { key: "remainingQuantity", label: "Rem. Qty", sortable: true },
    { key: "employee", label: "Recorded By", sortable: true },
    { key: "createdAt", label: "Created At", sortable: true },

    // Evidence Column
    {
  key: "images",
  label: "Evidence",
  sortable: false,
  render: (_: any, row: IStockMovement) => {
    // Combine images from record and delivery note
    const evidenceImages =
      row?.images?.length > 0
        ? row.images
        : row?.deliveryNote?.images?.length > 0
        ? row.deliveryNote.images
        : [];

    // If no evidence found anywhere
    if (evidenceImages.length === 0) {
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <FaExclamationTriangle className="w-4 h-4" />
          <span className="text-xs font-medium">No Evidence</span>
        </div>
      );
    }

    // Show Preview button
    return (
      <button
        onClick={() =>
          setPreviewModal({
            visible: true,
            images: evidenceImages,
            index: 0,
            title: `Evidence for ${row.item?.name || "Record"}`,
          })
        }
        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700"
      >
        <FaImages className="w-4 h-4" /> Preview
      </button>
    );
  },
},

{
  key: "actions",
  label: "Actions",
  render: (_: any, row: IStockMovement) => {
    return (
      <div className="flex gap-2 flex-wrap">
        {/* Case 1: Pending Transfer → Show Confirm/Reject buttons */}
        {row.category === "TRANSFER" && row.transferStatus === "PENDING" && (
          <>
            <button
              onClick={() =>
                setConfirmModal({ visible: true, record: row, action: "confirm" })
              }
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <FaCheckCircle /> Confirm
            </button>

            <button
              onClick={() =>
                setConfirmModal({ visible: true, record: row, action: "reject" })
              }
              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <FaTimesCircle /> Reject
            </button>
          </>
        )}

        {/* Case 2: Transfer mismatch (unresolved) → Show Resolve button */}
        {row.category?.toLowerCase() === "transfer" &&
          row.qty !== row.initiatedQty &&
          !row.isResolved && (
            <button
              onClick={() =>
                setConfirmModal({ visible: true, record: row, action: "resolve" })
              }
              className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              <FaExclamationTriangle /> Resolve
            </button>
          )}

        {/* Always show View Notes button */}
        <button
          onClick={() =>
            setNotesModal({
              visible: true,
              notesData: {
                description: row.description,
                resolveNotes: row.resolveNotes,
                extraNote: row.extraNote,
              },
            })
          }
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          <FaEye/> Notes
        </button>
      </div>
    );
  },
}



  ];

  const tableData = records.map((rec) => ({
    ...rec,
    item: rec.item?.name || "—",
    store: rec.store?.name || "—",
    toStore: rec.toStore?.name || "—",
    transferStatus: rec.transferStatus,
    unit: rec.unit?.name || "—",
    qty: rec.qty,
    initiatedQty: rec.initiatedQty ?? "—",
    remainingQuantity: rec.remainingQuantity ?? "—",
    category: rec.category,
    employee:
      `${rec.employee?.firstName || ""} ${rec.employee?.lastName || ""}`.trim() ||
      rec.employee?.id,
    createdAt: formatDate(rec.createdAt),
  }));

  const getRowClass = (row: IStockMovement) => {
    if (row.category === "TRANSFER" && row.initiatedQty !== undefined && row.qty !== row.initiatedQty && !row.isResolved) {
      return "bg-red-100"; 
    }
     // Yellow if BOTH images and delivery note are missing
  const noImages = !row.images || row.images.length === 0;
  const noDeliveryNote = !row.deliveryNote;

  if (noImages && noDeliveryNote) return "bg-yellow-100"; // missing evidence
    if (row.category === "TRANSFER" && row.transferStatus === "PENDING")
      return "bg-yellow-50"; // pending transfer
    return "";
  };

  const handleConfirmAction = async () => {
    const { record, action } = confirmModal;
    if (!record) return;
    setConfirmModal({ visible: false, record: null, action: "" });

    if (action === "confirm") {
      const payload = {
        transferId: record.id,
        confirmedQty: parseFloat(formData.confirmedQty),
        notes: formData.notes,
      };
      if (parseFloat(formData.confirmedQty) > record.initiatedQty) {
        toast.error("You cant confirm quantity that is greater that the initiated quantity")
        return;
      }
      await apiRequest(
        InventoryEndpoints.STOCK_MVT.CONFIRM_STOCK_TRANSFER,
        "POST",
        "",
        payload
      );
    } else if (action === 'resolve') {
      const payload = {
        notes: formData.notes,
      };

      await apiRequest(
        InventoryEndpoints.STOCK_MVT.resolve_transfer_conflict(record.id),
        "POST",
        "",
        payload
      );
    } else {
      const payload = {
        transferId: record.id,
        reason: formData.notes,
      };
      await apiRequest(
        InventoryEndpoints.STOCK_MVT.REJECT_STOCK_TRANSFER,
        "POST",
        "",
        payload
      );
    }
    refresh();
    setFormData({
      confirmedQty: '',
      notes: ''
    })
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Stock Movement Records
        </h2>
        <button
          onClick={() =>
            setModalProps({ isOpen: true, mode: "create", record: null })
          }
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add New Record
        </button>
      </div>

      <CustomTable
        columns={columns}
        data={tableData}
        pageSize={10}
        getRowClass={getRowClass}
      />

      <AddOrModifyRecord
        visible={modalProps.isOpen}
        record={modalProps.record}
        employeeId={user}
        onCancel={() =>
          setModalProps({ isOpen: false, mode: "create", record: null })
        }
      />

      <Modal
        open={confirmModal.visible}
        onCancel={() =>
          setConfirmModal({ visible: false, record: null, action: "" })
        }
        onOk={handleConfirmAction}
        okText={
          confirmModal.action === "confirm"
            ? "Confirm Transfer" : confirmModal.action === "reject"
            ? "Reject Transfer" : "Resolve"
        }
        okButtonProps={{
          className:
            confirmModal.action === "confirm"
              ? "bg-green-600 !hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700",
        }}
        title={
          confirmModal.action === "confirm"
            ? "Confirm Stock Transfer"
            : confirmModal.action === "reject" ? "Reject Stock Transfer" : "Resolve Transfer Conflict"
        }
      >
        {confirmModal.record?.category === "TRANSFER" &&
          confirmModal.record.initiatedQty !== undefined &&
          confirmModal.record.qty !== confirmModal.record.initiatedQty && (
            <div className="mb-2 p-2 bg-red-100 text-red-700 rounded-md text-sm font-medium">
              Attention: Initiated quantity ({confirmModal.record.initiatedQty}) and current quantity ({confirmModal.record.qty}) do not match.
            </div>
        )}

        {confirmModal.record && (
          <>
            {/* Transfer Record Details */}
            <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
              <h3 className="text-gray-700 font-semibold mb-2">
                Transfer Details
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>
                  <strong>Item:</strong>{" "}
                  {confirmModal.record.item|| "—"}
                </div>
                <div>
                  <strong>From Store:</strong>{" "}
                  {confirmModal.record.store || "—"}
                </div>
                <div>
                  <strong>To Store:</strong>{" "}
                  {confirmModal.record.toStore || "—"}
                </div>
                <div>
                  <strong>Unit:</strong> {confirmModal.record.unit || "—"}
                </div>
                <div>
                  <strong>Initiated Qty:</strong>{" "}
                  {confirmModal.record.initiatedQty ?? "—"}
                </div>
                <div>
                  <strong>Category:</strong> {confirmModal.record.category}
                </div>
                <div>
                  <strong>Recorded By:</strong>{" "}
                  {`${confirmModal.record.employee || ""} ${confirmModal.record.employee?.lastName || ""}`.trim() ||
                    confirmModal.record.employee?.id}
                </div>
                <div>
                  <strong>Created At:</strong>{" "}
                  {formatDate(confirmModal.record.createdAt)}
                </div>
              </div>
            </div>

            {/* Confirm Quantity and Notes */}
            {confirmModal.action === "confirm" && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <CustomNumberInput
                    value={formData.confirmedQty}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, confirmedQty: val }))
                    }
                    max={confirmModal.record?.qty}
                    placeholder="Enter quantity"
                  />
                </div>
              </>
            )}
             <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <CustomTextarea
                    value={formData.notes}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, notes: val }))
                    }
                    placeholder="Enter notes (optional)"
                  />
                </div>
          </>
        )}
      </Modal>

      {previewModal.visible && (
        <ImagePreviewModal
          imageUrl={previewModal.images[previewModal.index]}
          title={previewModal.title}
          onClose={() =>
            setPreviewModal({ visible: false, images: [], index: 0, title: "" })
          }
        />
      )}
      <NotesPreviewModal
        visible={notesModal.visible}
        onClose={() => setNotesModal({ visible: false, notesData: {} })}
        notesData={notesModal.notesData}
      />

    </div>
  );
};

export default StockMovementRecords;
