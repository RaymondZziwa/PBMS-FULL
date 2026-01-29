import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaArrowLeft, FaArrowRight, FaCheck } from 'react-icons/fa';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { baseURL } from '../../../libs/apiConfig';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import useItems from '../../../hooks/inventory/useItems';
import useStores from '../../../hooks/inventory/useStores';
import type { IItem, IStore, IUnit } from '../../../redux/types/inventory';
import useUnits from '../../../hooks/inventory/useUnits';
import CustomTextarea from '../../../custom/inputs/customTextArea';
import useStockMovement from '../../../hooks/inventory/useStockMovement';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/store';
import { FaUpload } from 'react-icons/fa';
import axios from 'axios';
import useDeliveryNotes from '../../../hooks/inventory/useDeliveryNotes';
import type { IDeliveryNote } from '../../../redux/types/inventory';

interface BulkItem {
  id: string;
  itemId: string;
  itemName: string;
  unitId: string;
  unitName: string;
  quantity: string;
}

interface BulkRestockFormProps {
  visible: boolean;
  onCancel: () => void;
  employeeId: string;
}

const StockMovementForm: React.FC<BulkRestockFormProps> = ({
  visible,
  onCancel,
  employeeId
}) => {
  const userRole = useSelector((state: RootState) => state.userAuth.data.role);
  const { data: items } = useItems();
  const { data: stores } = useStores();
  const { data: units } = useUnits();
  const { data: dns } = useDeliveryNotes();
  const { refresh } = useStockMovement();

  const categoryOptions = [
    { label: 'Restock', value: 'RESTOCK' },
    { label: 'Depletion', value: 'DEPLETION' },
    { label: 'Transfer', value: 'TRANSFER' },
    ...(userRole.name.toLowerCase() === 'administrator'
      ? [{ label: 'Adjustment', value: 'ADJUSTMENT' }]
      : []),
  ];

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Basic Details
  const [basicDetails, setBasicDetails] = useState({
    category: '',
    storeId: '',
    toStoreId: '',
    source: '',
    description: '',
    deliveryNoteId: '',
  });

  // Step 2: Items
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [currentItem, setCurrentItem] = useState({
    itemId: '',
    unitId: '',
    quantity: '',
  });

  // Step 3: Attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [attachmentMode, setAttachmentMode] = useState<'deliveryNote' | 'images'>('images');

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setCurrentStep(1);
      setBasicDetails({
        category: '',
        storeId: '',
        toStoreId: '',
        source: '',
        description: '',
        deliveryNoteId: '',
      });
      setBulkItems([]);
      setCurrentItem({
        itemId: '',
        unitId: '',
        quantity: '',
      });
      setSelectedFiles([]);
      setPreviews([]);
      setAttachmentMode('images');
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

  // Add item to bulk list
  const addItem = () => {
    if (!currentItem.itemId || !currentItem.unitId || !currentItem.quantity) {
      toast.error('Please fill in all required fields for the item');
      return;
    }

    const item = items?.find(i => i.id === currentItem.itemId);
    const unit = units?.find(u => u.id === currentItem.unitId);

    if (!item || !unit) {
      toast.error('Invalid item or unit selected');
      return;
    }

    const newBulkItem: BulkItem = {
      id: Date.now().toString(),
      itemId: currentItem.itemId,
      itemName: item.name,
      unitId: currentItem.unitId,
      unitName: unit.name,
      quantity: currentItem.quantity,
    };

    setBulkItems(prev => [...prev, newBulkItem]);
    setCurrentItem({
      itemId: '',
      unitId: '',
      quantity: '',
    });
    toast.success('Item added to list');
  };

  // Remove item from bulk list
  const removeItem = (itemId: string) => {
    setBulkItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Step validation
  const validateStep1 = () => {
    if (!basicDetails.category || !basicDetails.storeId) {
      toast.error('Please fill in all required fields in Step 1');
      return false;
    }
    if (basicDetails.category === 'TRANSFER' && !basicDetails.toStoreId) {
      toast.error('Please select destination store for transfer');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (bulkItems.length === 0) {
      toast.error('Please add at least one item');
      return false;
    }
    return true;
  };

  // const validateStep3 = () => {
  //   if (attachmentMode === 'deliveryNote' && !basicDetails.deliveryNoteId) {
  //     toast.error('Please select a delivery note');
  //     return false;
  //   }
  //   if (attachmentMode === 'images' && selectedFiles.length === 0) {
  //     toast.error('Please upload at least one evidence image');
  //     return false;
  //   }
  //   return true;
  // };

  // Navigation
  const nextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit
  const handleSubmit = async () => {
    // if (!validateStep3()) return;

    setIsSubmitting(true);

    try {
      // Create FormData for each item
      for (const bulkItem of bulkItems) {
        const payload = new FormData();
        payload.append("itemId", bulkItem.itemId);
        payload.append("storeId", basicDetails.storeId);
        if (basicDetails.category === 'TRANSFER' && basicDetails.toStoreId) {
          payload.append("toStoreId", basicDetails.toStoreId);
        }
        payload.append("unitId", bulkItem.unitId);
        payload.append("qty", bulkItem.quantity);
        payload.append("source", basicDetails.source);
        payload.append("description", basicDetails.description);
        payload.append("category", basicDetails.category);
        payload.append("employeeId", employeeId);

        if (attachmentMode === 'images') {
          selectedFiles.forEach((file) => {
            payload.append("files", file);
          });
        } else if (attachmentMode === 'deliveryNote' && basicDetails.deliveryNoteId) {
          payload.append("deliveryNoteId", basicDetails.deliveryNoteId);
        }

        await axios.post(`${baseURL}${InventoryEndpoints.STOCK_MVT.create}`, payload, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
      }

      toast.success(`${bulkItems.length} items processed successfully`);
      refresh();
      onCancel();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to record restock");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-semibold text-gray-800">
              Record Stock Movement
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step ? 'text-gray-600' : 'text-gray-500'
                }`}>
                  {step === 1 && 'Basic Details'}
                  {step === 2 && 'Add Items'}
                  {step === 3 && 'Review & Submit'}
                </span>
                {step < 3 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    currentStep > step ? 'bg-gray-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Basic Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">Step 1: Movement Details</h4>

              <div className="space-y-4">
                {/* Movement Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type *</label>
                  <CustomDropdown
                    options={categoryOptions}
                    value={basicDetails.category ? [basicDetails.category] : []}
                    onChange={(val) => setBasicDetails((prev) => ({ ...prev, category: val[0] || '' }))}
                    placeholder="Select movement type"
                    singleSelect
                  />
                </div>

                {/* Store */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store *</label>
                  <CustomDropdown
                    options={stores?.map((s: IStore) => ({ label: s.name, value: s.id })) || []}
                    value={basicDetails.storeId ? [basicDetails.storeId] : []}
                    onChange={(val) => setBasicDetails((prev) => ({ ...prev, storeId: val[0] || '' }))}
                    placeholder="Select store"
                    singleSelect
                  />
                </div>

                {/* To Store (Transfer Only) */}
                {basicDetails.category === 'TRANSFER' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination Store *</label>
                    <CustomDropdown
                      options={stores?.map((s: IStore) => ({ label: s.name, value: s.id })) || []}
                      value={basicDetails.toStoreId ? [basicDetails.toStoreId] : []}
                      onChange={(val) => setBasicDetails((prev) => ({ ...prev, toStoreId: val[0] || '' }))}
                      placeholder="Select destination store"
                      singleSelect
                    />
                  </div>
                )}

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <CustomTextInput
                    type="text"
                    value={basicDetails.source}
                    onChange={(val) => setBasicDetails((prev) => ({ ...prev, source: val }))}
                    placeholder="Enter source (optional)"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <CustomTextarea
                    value={basicDetails.description}
                    onChange={(val) => setBasicDetails((prev) => ({ ...prev, description: val }))}
                    placeholder="Enter description (optional)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Add Items */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-800">Step 2: Add Items</h4>

              {/* Current Items List */}
              {bulkItems.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-700 mb-3">Items ({bulkItems.length})</h5>
                  <div className="space-y-2">
                    {bulkItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div>
                          <span className="font-medium">{item.itemName}</span>
                          <span className="text-gray-600 ml-2">
                            {item.quantity} {item.unitName}
                          </span>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Item Form */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-700 mb-4">Add New Item</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Item */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
                    <CustomDropdown
                      options={items?.map((i: IItem) => ({ label: i.name, value: i.id })) || []}
                      value={currentItem.itemId ? [currentItem.itemId] : []}
                      onChange={(val) => setCurrentItem((prev) => ({ ...prev, itemId: val[0] || '' }))}
                      placeholder="Select item"
                      singleSelect
                    />
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                    <CustomDropdown
                      options={units?.map((u: IUnit) => ({ label: u.name, value: u.id })) || []}
                      value={currentItem.unitId ? [currentItem.unitId] : []}
                      onChange={(val) => setCurrentItem((prev) => ({ ...prev, unitId: val[0] || '' }))}
                      placeholder="Select unit"
                      singleSelect
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                    <CustomTextInput
                      type="number"
                      value={currentItem.quantity}
                      onChange={(val) => setCurrentItem((prev) => ({ ...prev, quantity: val }))}
                      placeholder="Enter quantity"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <CustomButton
                    label="Add Item"
                    fn={addItem}
                    className="flex items-center gap-2"
                  >
                    <FaPlus size={14} />
                    Add to List
                  </CustomButton>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-800">Step 3: Review & Submit</h4>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-700 mb-3">Movement Summary</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Type:</span> {categoryOptions.find(c => c.value === basicDetails.category)?.label}
                  </div>
                  <div>
                    <span className="font-medium">Store:</span> {stores?.find(s => s.id === basicDetails.storeId)?.name}
                  </div>
                  {basicDetails.category === 'TRANSFER' && (
                    <div>
                      <span className="font-medium">To Store:</span> {stores?.find(s => s.id === basicDetails.toStoreId)?.name}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Source:</span> {basicDetails.source || 'Not specified'}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium">Items:</span> {bulkItems.length}
                  </div>
                </div>
              </div>

              {/* Items Review */}
              <div className="bg-white border rounded-lg">
                <div className="p-4 border-b">
                  <h5 className="font-medium text-gray-700">Items</h5>
                </div>
                <div className="divide-y">
                  {bulkItems.map((item) => (
                    <div key={item.id} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium">{item.itemName}</div>
                        <div className="text-sm text-gray-600">
                          {item.quantity} {item.unitName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <label className="block font-medium mb-2">Upload Evidence Images *</label>
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
                    value={basicDetails.deliveryNoteId ? [basicDetails.deliveryNoteId] : []}
                    onChange={(val) =>
                      setBasicDetails((prev) => ({ ...prev, deliveryNoteId: val[0] || '' }))
                    }
                    placeholder="Select Delivery Note"
                    singleSelect
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between">
            <CustomButton
              type="secondary"
              fn={currentStep === 1 ? onCancel : prevStep}
              label={currentStep === 1 ? "Cancel" : "Previous"}
              disabled={isSubmitting}
            />

            <div className="flex gap-3">
              {currentStep < 3 ? (
                <CustomButton
                  fn={nextStep}
                  label="Next"
                  className="flex items-center gap-2"
                >
                  Next
                  <FaArrowRight size={14} />
                </CustomButton>
              ) : (
                <CustomButton
                  fn={handleSubmit}
                  label={isSubmitting ? "Submitting..." : "Submit Movement"}
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  <FaCheck size={14} />
                  {isSubmitting ? "Submitting..." : "Submit Movement"}
                </CustomButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockMovementForm;
