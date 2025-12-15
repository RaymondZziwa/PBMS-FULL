import React, { useState, useEffect } from 'react';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { baseURL } from '../../../libs/apiConfig';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import useItems from '../../../hooks/inventory/useItems';
import useStores from '../../../hooks/inventory/useStores';
import type { IDeliveryNote, IItem, IStockMovement, IStore, IUnit } from '../../../redux/types/inventory';
import useUnits from '../../../hooks/inventory/useUnits';
import CustomTextarea from '../../../custom/inputs/customTextArea';
import useStockMovement from '../../../hooks/inventory/useStockMovement';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/store';
import { FaUpload, FaTrash } from 'react-icons/fa';
import ImagePreviewModal from '../../../custom/modals/imagePreviewModal';
import axios from 'axios';
import useDeliveryNotes from '../../../hooks/inventory/useDeliveryNotes';

interface AddOrModifyRecordProps {
  visible: boolean;
  onCancel: () => void;
  employeeId: string;
  record: IStockMovement;
}

const AddOrModifyRecord: React.FC<AddOrModifyRecordProps> = ({
  visible,
  onCancel,
  employeeId
}) => {
  const userRole = useSelector((state: RootState) => state.userAuth.data.role);
  const { data: dns } = useDeliveryNotes();
  const { data: items } = useItems();
  const { data: stores } = useStores();
  const { data: units } = useUnits();
  const { refresh } = useStockMovement();
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const [attachmentMode, setAttachmentMode] = useState<'deliveryNote' | 'images'>('images');

  const [formData, setFormData] = useState({
    itemId: '',
    storeId: '',
    toStoreId: '',
    unitId: '',
    qty: '',
    source: '',
    description: '',
    deliveryNoteId: '',
    category: '', // RESTOCK | DEPLETION | ADJUSTMENT | TRANSFER
  });

  const categoryOptions = [
    { label: 'Restock', value: 'RESTOCK' },
    { label: 'Depletion', value: 'DEPLETION' },
    { label: 'Transfer', value: 'TRANSFER' },
    ...(userRole.name.toLowerCase() === 'administrator'
      ? [{ label: 'Adjustment', value: 'ADJUSTMENT' }]
      : []),
  ];

  useEffect(() => {
    if (!visible) {
      setFormData({
        itemId: '',
        storeId: '',
        toStoreId: '',
        unitId: '',
        qty: '',
        source: '',
        description: '',
        deliveryNoteId: '',
        category: '',
      });
      setSelectedFiles([]);
      setPreviews([]);
    }
  }, [visible]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...fileArray]);

    const newPreviews = fileArray.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  // Remove image
  const removeImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.itemId || !formData.storeId || !formData.unitId || !formData.qty || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    // if (attachmentMode === 'images' && selectedFiles.length === 0) {
    //   toast.error("Please upload at least one evidence image or switch to Delivery Note mode");
    //   return;
    // }

    if (attachmentMode === 'deliveryNote' && !formData.deliveryNoteId) {
      toast.error("Please select a delivery note");
      return;
    }

    setIsUploading(true);

    try {
      const payload = new FormData();
      payload.append("itemId", formData.itemId);
      payload.append("storeId", formData.storeId);
      payload.append("toStoreId", formData.toStoreId);
      payload.append("unitId", formData.unitId);
      payload.append("qty", formData.qty);
      payload.append("source", formData.source);
      payload.append("description", formData.description);
      payload.append("category", formData.category);
      payload.append("employeeId", employeeId);

      if (attachmentMode === 'images') {
        selectedFiles.forEach((file) => {
          payload.append("files", file);
        });
      } else if (attachmentMode === 'deliveryNote' && formData.deliveryNoteId) {
        payload.append("deliveryNoteId", formData.deliveryNoteId);
      }

      await axios.post(`${baseURL}${InventoryEndpoints.STOCK_MVT.create}`, payload, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success("Stock movement recorded successfully");
      refresh();
      onCancel();
      setSelectedFiles([]);
      setPreviews([]);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to record stock movement");
    } finally {
      setIsUploading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Record Stock Movement
          </h3>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type *</label>
              <CustomDropdown
                options={categoryOptions}
                value={formData.category ? [formData.category] : []}
                onChange={(val) => setFormData((prev) => ({ ...prev, category: val[0] || '' }))}
                placeholder="Select type"
                singleSelect
              />
            </div>

            {/* Item */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
              <CustomDropdown
                options={items?.map((i: IItem) => ({ label: i.name, value: i.id })) || []}
                value={formData.itemId ? [formData.itemId] : []}
                onChange={(val) => setFormData((prev) => ({ ...prev, itemId: val[0] || '' }))}
                placeholder="Select item"
                singleSelect
              />
            </div>

            {/* Store */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store *</label>
              <CustomDropdown
                options={stores?.map((s: IStore) => ({ label: s.name, value: s.id })) || []}
                value={formData.storeId ? [formData.storeId] : []}
                onChange={(val) => setFormData((prev) => ({ ...prev, storeId: val[0] || '' }))}
                placeholder="Select store"
                singleSelect
              />
            </div>

            {/* To Store (Transfer Only) */}
            {formData.category.toLowerCase() === 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination Store *</label>
                <CustomDropdown
                  options={stores?.map((s: IStore) => ({ label: s.name, value: s.id })) || []}
                  value={formData.toStoreId ? [formData.toStoreId] : []}
                  onChange={(val) => setFormData((prev) => ({ ...prev, toStoreId: val[0] || '' }))}
                  placeholder="Select destination store"
                  singleSelect
                />
              </div>
            )}

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <CustomDropdown
                options={units?.map((u: IUnit) => ({ label: u.name, value: u.id })) || []}
                value={formData.unitId ? [formData.unitId] : []}
                onChange={(val) => setFormData((prev) => ({ ...prev, unitId: val[0] || '' }))}
                placeholder="Select unit"
                singleSelect
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <CustomTextInput
                type="number"
                value={formData.qty}
                onChange={(val) => setFormData((prev) => ({ ...prev, qty: val }))}
                placeholder="Enter quantity"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <CustomTextInput
                type="text"
                value={formData.source}
                onChange={(val) => setFormData((prev) => ({ ...prev, source: val }))}
                placeholder="Enter source (optional)"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <CustomTextarea
                value={formData.description}
                onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
                placeholder="Enter description (optional)"
              />
            </div>

            {/* Attachment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attach Evidence</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="attachmentMode"
                    value="images"
                    checked={attachmentMode === 'images'}
                    onChange={() => setAttachmentMode('images')}
                  />
                  <span>Upload Images</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="attachmentMode"
                    value="deliveryNote"
                    checked={attachmentMode === 'deliveryNote'}
                    onChange={() => setAttachmentMode('deliveryNote')}
                  />
                  <span>Attach Delivery Note</span>
                </label>
              </div>
            </div>

            {/* Conditional Attachment */}
            {attachmentMode === 'images' ? (
              <div>
                <label className="block font-medium mb-2">Upload Evidence Images</label>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="file-upload"
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700"
                  >
                    <FaUpload />
                    <span>Choose Images</span>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {previews.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {previews.map((src, index) => (
                      <div key={index} className="relative">
                        <img
                          src={src}
                          alt={`Preview ${index + 1}`}
                          className="h-28 w-full object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block font-medium mb-2">Select Delivery Note *</label>
                <CustomDropdown
                  options={dns?.map((dn: IDeliveryNote) => ({
                    label: `${dn.deliveryNoteNumber} - ${dn.name}`,
                    value: dn.id,
                  })) || []}
                  value={formData.deliveryNoteId ? [formData.deliveryNoteId] : []}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, deliveryNoteId: val[0] || '' }))
                  }
                  placeholder="Select Delivery Note"
                  singleSelect
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <CustomButton type="negative" fn={onCancel} label="Cancel" disabled={isUploading} />
            <CustomButton
              label={isUploading ? "Submitting..." : "Submit"}
              fn={handleSubmit}
              disabled={isUploading}
            />
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage.url}
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
};

export default AddOrModifyRecord;
