// components/projects/sales/UploadDeliveryNoteModal.tsx
import React, { useState, useRef } from 'react';
import { FaTimes, FaUpload, FaImage, FaCheck } from 'react-icons/fa';
import { toast } from 'sonner';
import { PROJECTENDPOINTS } from '../../endpoints/projects/projectEndpoints';
import type { IProjectPayment, IProjectSale } from '../../redux/types/sales';
import axios from 'axios';
import { baseURL } from '../../libs/apiConfig';

interface UploadEvidenceModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  projectSale: IProjectSale | null;
  projectPayment: IProjectPayment | null;
  type: 'DeliveryNote' | 'BankSlip' | 'PaymentReceipt' | undefined
}

const UploadEvidenceModal: React.FC<UploadEvidenceModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  projectSale,
  projectPayment,
  type
}) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!visible) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

const handleUpload = async () => {
  if (!selectedFile) return;

  setUploading(true);
  try {
    const formData = new FormData();
    formData.append("file", selectedFile);

    const url = type === 'DeliveryNote' ? PROJECTENDPOINTS.PROJECT_SALES.upload_delivery_note(projectSale?.id) : type === 'BankSlip' ? PROJECTENDPOINTS.PROJECT_PAYMENTS.upload_bank_slip(projectPayment.id) : PROJECTENDPOINTS.PROJECT_PAYMENTS.upload_payment_receipt(projectPayment.id)

    const response = await axios.post(`${baseURL}${url}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.status === 201) {
      toast.success(response.data.message);
      onSuccess();
    }
    resetForm();
  } catch (error: any) {
    console.error(error);
    toast.error(
      error?.response?.data?.message ||
        "Failed to upload image"
    );
  } finally {
    setUploading(false);
  }
};


  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {type === 'DeliveryNote' ? ' Upload Delivery Note' : type === 'BankSlip' ? 'Upload Bank Deposit Slip' : 'Upload Payment Receipt'}
           
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Sale Information */}
          {projectSale && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Sale Details</h3>
              <p className="text-sm text-gray-600">
                <strong>Client:</strong> {projectSale.client?.firstName} {projectSale.client?.lastName}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Project:</strong> {projectSale.project?.name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Total:</strong> {parseInt(projectSale.saleTotal).toLocaleString()} UGX
              </p>
            </div>
          )}

          {/* File Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
              id="deliveryNoteUpload"
            />
            
            {!selectedFile ? (
              <label
                htmlFor="deliveryNoteUpload"
                className="cursor-pointer flex flex-col items-center"
              >
                <FaUpload className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-lg font-medium text-gray-700 mb-1">
                  {type === 'DeliveryNote' ? ' Upload Delivery Note' : type === 'BankSlip' ? 'Upload Bank Deposit Slip' : 'Upload Payment Receipt'}
                </p>
                <p className="text-sm text-gray-500 mb-3">
                  Click to select an image file
                </p>
                <p className="text-xs text-gray-400">
                  Supports: JPG, PNG, GIF • Max: 5MB
                </p>
              </label>
            ) : (
              <div className="flex flex-col items-center">
                <FaImage className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-lg font-medium text-gray-700 mb-1">
                  File Selected
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  {selectedFile.name}
                </p>
                <button
                  onClick={handleRemoveFile}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove File
                </button>
              </div>
            )}
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
              <div className="border border-gray-200 rounded-lg p-2">
                <img
                  src={previewUrl}
                  alt="Delivery note preview"
                  className="w-full h-48 object-contain rounded"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <FaCheck className="mr-2" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadEvidenceModal;