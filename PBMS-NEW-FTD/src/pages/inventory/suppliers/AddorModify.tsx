import React, { useState, useEffect } from 'react';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import CustomButton from '../../../custom/buttons/customButton';
import { apiRequest } from '../../../libs/apiConfig';
import { toast } from 'sonner';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import type { ISupplier } from '../../../redux/types/supplyMgt';
import useSupplier from '../../../hooks/inventory/useSupplier';

interface AddOrModifySupplierProps {
  visible: boolean;
  supplier: ISupplier | null;
  onCancel: () => void;
}

const AddOrModifySupplier: React.FC<AddOrModifySupplierProps> = ({
  visible,
  supplier,
  onCancel
}) => {
  const { refresh } = useSupplier();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contact: '',
    address: '',
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        firstName: supplier.firstName || '',
        lastName: supplier.lastName || '',
        contact: supplier.contact || '',
        address: supplier.address || '',
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        contact: '',
        address: '',
      });
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.contact) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const endpoint = supplier
        ? InventoryEndpoints.SUPPLY.SUPPLIER.modify(supplier.id)
        : InventoryEndpoints.SUPPLY.SUPPLIER.Create_supplier;
      const method = supplier ? 'PUT' : 'POST';

      await apiRequest(endpoint, method, '', formData);
      refresh();
        onCancel();
         setFormData({
        firstName: '',
        lastName: '',
        contact: '',
        address: '',
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {supplier ? 'Edit Supplier' : 'Add New Supplier'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <CustomTextInput
              type="text"
              value={formData.firstName}
              onChange={(val) => setFormData((prev) => ({ ...prev, firstName: val }))}
              placeholder="Enter supplier first name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <CustomTextInput
              type="text"
              value={formData.lastName}
              onChange={(val) => setFormData((prev) => ({ ...prev, lastName: val }))}
              placeholder="Enter supplier last name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact *
            </label>
            <CustomTextInput
              type="text"
              value={formData.contact}
              onChange={(val) => setFormData((prev) => ({ ...prev, contact: val }))}
              placeholder="Enter contact number or email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address (optional)
            </label>
            <CustomTextInput
              type="text"
              value={formData.address}
              onChange={(val) => setFormData((prev) => ({ ...prev, address: val }))}
              placeholder="Enter supplier address"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <CustomButton type="negative" fn={onCancel} label="Cancel" />
            <CustomButton
              label={supplier ? 'Update Supplier' : 'Create Supplier'}
              fn={handleSubmit}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrModifySupplier;
