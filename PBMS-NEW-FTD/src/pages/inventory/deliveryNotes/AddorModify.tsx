import React, { useState, useEffect } from 'react';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import CustomTextarea from '../../../custom/inputs/customTextArea';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import { baseURL } from '../../../libs/apiConfig';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import { FaTrash, FaPlus } from 'react-icons/fa';
import ImagePreviewModal from '../../../custom/modals/imagePreviewModal';
import axios from 'axios';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/store';
import useDeliveryNotes from '../../../hooks/inventory/useDeliveryNotes';

interface AddOrModifyDeliveryNoteProps {
  visible: boolean;
  onCancel: () => void;
}

const AddOrModifyDeliveryNote: React.FC<AddOrModifyDeliveryNoteProps> = ({
  visible,
  onCancel,
}) => {
    const userId = useSelector((state: RootState) => state.userAuth.data.id)
  const [formData, setFormData] = useState({
    name: '',
    deliveryNoteNumber: '',
    registeredBy: userId,
    notes: '',
  });
    const {refresh} = useDeliveryNotes()
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewModal, setPreviewModal] = useState<{ visible: boolean; image: string | null }>({
    visible: false,
    image: null,
  });

  useEffect(() => {
    if (!visible) {
      setFormData({
        name: '',
        deliveryNoteNumber: '',
        registeredBy: userId,
        notes: '',
      });
      setSelectedImages([]);
      setPreviewImages([]);
    }
  }, [visible, userId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) =>
      file.type.match(/image\/(jpeg|png|jpg|gif)/)
    );

    if (validFiles.length !== files.length) {
      toast.error('Only image files (jpg, jpeg, png, gif) are allowed.');
    }

    const newFiles = [...selectedImages, ...validFiles];
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));

    setSelectedImages(newFiles);
    setPreviewImages(newPreviews);
  };

  const handleDeleteImage = (index: number) => {
    const newImages = [...selectedImages];
    const newPreviews = [...previewImages];
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setSelectedImages(newImages);
    setPreviewImages(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.deliveryNoteNumber) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const payload = new FormData();
    payload.append('name', formData.name);
    payload.append('deliveryNoteNumber', formData.deliveryNoteNumber);
    payload.append('registeredBy', formData.registeredBy);
    payload.append('notes', formData.notes);

    selectedImages.forEach((file) => {
      payload.append('files', file);
    });

      try {
         await axios.post(
      `${baseURL}${InventoryEndpoints.STOCK_MVT.CREATE_DNS}`, 
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
         );
          refresh()
          toast.success("Delivery note uploaded successfully")
      onCancel();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create delivery note.');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Add New Delivery Note
        </h3>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <CustomTextInput
            label="Name *"
            value={formData.name}
            onChange={(val) => setFormData((prev) => ({ ...prev, name: val }))}
            placeholder="Enter delivery note name"
          />

          <CustomTextInput
            label="Delivery Note Number *"
            value={formData.deliveryNoteNumber}
            onChange={(val) => setFormData((prev) => ({ ...prev, deliveryNoteNumber: val }))}
            placeholder="Enter delivery note number"
          />

          <CustomTextarea
            label="Notes"
            value={formData.notes}
            onChange={(val) => setFormData((prev) => ({ ...prev, notes: val }))}
            placeholder="Enter additional notes (optional)"
          />

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Evidence Images
            </label>
            <div className="flex flex-wrap gap-3">
              {previewImages.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-24 h-24 border rounded-lg overflow-hidden group"
                >
                  <img
                    src={img}
                    alt={`preview-${idx}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() =>
                      setPreviewModal({ visible: true, image: img })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(idx)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
              <label className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <FaPlus className="text-gray-500 text-lg" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <CustomButton type="negative" fn={onCancel} />
            <CustomButton label="Create Delivery Note" fn={handleSubmit} />
          </div>
        </form>

        {/* Image Preview Modal */}
        {previewModal.visible && previewModal.image && (
          <ImagePreviewModal
            imageUrl={previewModal.image}
            title="Image Preview"
            onClose={() => setPreviewModal({ visible: false, image: null })}
          />
        )}
      </div>
    </div>
  );
};

export default AddOrModifyDeliveryNote;
