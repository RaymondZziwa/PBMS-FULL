import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { baseURL } from '../../../libs/apiConfig';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import useItems from '../../../hooks/inventory/useItems';
import useEmployees from '../../../hooks/humanResource/useEmployees';
import useUnits from '../../../hooks/inventory/useUnits';
import useStores from '../../../hooks/inventory/useStores';
import axios from 'axios';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import useSupplier from '../../../hooks/inventory/useSupplier';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string;
  existingSupply?: any; // 👈 make this optional prop
}

const AddOrModifySupplyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  supplierId,
  existingSupply,
}) => {
  const { data: items } = useItems();
  const { data: employees } = useEmployees();
  const { data: units } = useUnits();
  const { data: stores } = useStores();
  const { refresh } = useSupplier();

  const [form, setForm] = useState({
    itemId: '',
    qty: '',
    value: '',
    unitId: '',
    recievedBy: '',
    destinationStoreId: '',
    proofImage: null as File | null,
  });

  const [isUploading, setIsUploading] = useState(false);

  // ✅ Pre-fill form when editing
  useEffect(() => {
    if (existingSupply) {
      setForm({
        itemId: existingSupply.item?.id || '',
        qty: existingSupply.qty?.toString() || '',
        value: existingSupply.value?.toString() || '',
        unitId: existingSupply.uom?.id || '',
        recievedBy: existingSupply.employee?.id || '',
        destinationStoreId: existingSupply.destinationStore?.id || '', // may not exist in your model, safe check
        proofImage: null,
      });
    } else {
      // Reset form when creating a new one
      setForm({
        itemId: '',
        qty: '',
        value: '',
        unitId: '',
        recievedBy: '',
        destinationStoreId: '',
        proofImage: null,
      });
    }
  }, [existingSupply, isOpen]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, proofImage: file }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsUploading(true);

    const formData = new FormData();
    formData.append('itemId', form.itemId);
    formData.append('qty', form.qty);
    formData.append('value', form.value);
    formData.append('unitId', form.unitId);
    formData.append('recievedBy', form.recievedBy);
    formData.append('destinationStoreId', form.destinationStoreId);
    if (form.proofImage) formData.append('proofImage', form.proofImage);

    try {
      if (existingSupply) {
        // ✅ PUT when editing
        await axios.put(
          `${baseURL}${InventoryEndpoints.SUPPLY.SUPPLIES.modify(existingSupply.id)}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        toast.success('Supply updated successfully!');
      } else {
        // ✅ POST when creating
        await axios.post(`${baseURL}/api/suppliers/${supplierId}/save-supply`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Supply added successfully!');
      }

      refresh();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save supply');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed -top-6 left-0 w-screen h-screen bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700">
          <FaTimes />
        </button>

        <h2 className="text-lg font-semibold mb-5 text-gray-800">
          {existingSupply ? 'Edit Supply' : 'Add Supply'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item <span className="text-red-500">*</span>
            </label>
            <CustomDropdown
              options={(items || []).map((item) => ({ value: item.id, label: item.name }))}
              value={form.itemId ? [form.itemId] : []}
              onChange={(val) => handleChange('itemId', val[0])}
              placeholder="Select an item"
              singleSelect
            />
          </div>

          {/* Quantity & Value */}
          <div className="grid grid-cols-2 gap-4">
            <CustomTextInput
              label="Quantity"
              type="number"
              value={form.qty}
              onChange={(v) => handleChange('qty', v)}
              isRequired
            />
            <CustomTextInput
              label="Value (UGX)"
              type="number"
              value={form.value}
              onChange={(v) => handleChange('value', v)}
              isRequired
            />
          </div>

          {/* Units & Received By */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                options={(units || []).map((u) => ({ value: u.id, label: u.name }))}
                value={form.unitId ? [form.unitId] : []}
                onChange={(val) => handleChange('unitId', val[0])}
                placeholder="Select unit"
                singleSelect
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Received By <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                options={(employees || []).map((emp) => ({
                  value: emp.id,
                  label: `${emp.firstName} ${emp.lastName}`,
                }))}
                value={form.recievedBy ? [form.recievedBy] : []}
                onChange={(val) => handleChange('recievedBy', val[0])}
                placeholder="Select employee"
                singleSelect
              />
            </div>
          </div>

          {/* Destination Store */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination Store <span className="text-red-500">*</span>
            </label>
            <CustomDropdown
              options={(stores || []).map((store) => ({ value: store.id, label: store.name }))}
              value={form.destinationStoreId ? [form.destinationStoreId] : []}
              onChange={(val) => handleChange('destinationStoreId', val[0])}
              placeholder="Select store"
              singleSelect
            />
          </div>

          {/* Proof Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Proof Image (optional)</label>
            {!form.proofImage ? (
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="w-full border rounded px-3 py-2"
              />
            ) : (
              <div className="mt-2 border border-gray-300 rounded-lg p-3 flex flex-col items-center justify-center gap-3 bg-gray-50 relative">
                <img
                  src={URL.createObjectURL(form.proofImage)}
                  alt="Proof Preview"
                  className="w-full h-48 object-contain rounded"
                />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, proofImage: null }))}
                  className="absolute top-2 right-2 bg-white border border-gray-300 rounded-full p-1 hover:bg-gray-100 text-gray-600"
                  title="Remove Image"
                >
                  <FaTimes />
                </button>
                <p className="text-sm text-gray-500 truncate max-w-full">
                  {form.proofImage.name}
                </p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <CustomButton type="negative" fn={onClose} label="Cancel" disabled={isUploading} />
            <CustomButton
              label={isUploading ? 'Saving...' : existingSupply ? 'Update' : 'Submit'}
              fn={handleSubmit}
              disabled={isUploading}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrModifySupplyModal;
