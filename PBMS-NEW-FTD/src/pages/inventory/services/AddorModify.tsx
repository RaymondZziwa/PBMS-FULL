import React, { useState, useEffect } from 'react';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import CustomButton from '../../../custom/buttons/customButton';
import { apiRequest } from '../../../libs/apiConfig';
import { toast } from 'sonner';
import type { IService } from '../../../redux/types/inventory';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import useServices from '../../../hooks/inventory/useServices';

interface AddOrModifyServiceProps {
  visible: boolean;
  service: IService | null;
  onCancel: () => void;
}

const AddOrModifyService: React.FC<AddOrModifyServiceProps> = ({
  visible,
  service,
  onCancel
}) => {
  const { refresh } = useServices();

  const [formData, setFormData] = useState({
    name: '',
    price: ''
  });

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        price: service.price ? String(service.price) : ''
      });
    } else {
      setFormData({
        name: '',
        price: ''
      });
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast.error("Please fill in all the fields");
      return;
    }

    try {
      const payload = {
        name: formData.name,
        price: parseFloat(formData.price)
      };

      const endpoint = service
        ? InventoryEndpoints.SERVICE.modify(service.id!)
        : InventoryEndpoints.SERVICE.create;
      const method = service ? 'PATCH' : 'POST';

      await apiRequest(endpoint, method, '', payload);
      refresh();

      setFormData({
        name: '',
        price: ''
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
          {service ? 'Edit Service' : 'Add New Service'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name *
            </label>
            <CustomTextInput
              type="text"
              value={formData.name}
              onChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
              placeholder="Enter service name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price *
            </label>
            <CustomTextInput
              type="number"
              value={formData.price}
              onChange={(val) => setFormData(prev => ({ ...prev, price: val }))}
              placeholder="Enter price"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <CustomButton type="negative" fn={onCancel} />
          <CustomButton
            autoCloseModal={onCancel}
            label={service ? 'Update Service' : 'Create Service'}
            fn={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
};

export default AddOrModifyService;
