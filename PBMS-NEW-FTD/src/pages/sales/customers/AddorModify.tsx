import React, { useState, useEffect } from 'react';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { apiRequest } from '../../../libs/apiConfig';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import useClients from '../../../hooks/sales/useClients';
import type { IClient } from '../../../redux/types/sales';
import { SALESENDPOINTS } from '../../../endpoints/sales/salesEndpoints';


interface AddOrModifyClientProps {
  visible: boolean;
  client: IClient | null;
  onCancel: () => void;
}

const AddOrModifyClient: React.FC<AddOrModifyClientProps> = ({
  visible,
  client,
  onCancel,
}) => {
  const { refresh: refreshClients } = useClients();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contact: '',
    address: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        contact: client.contact || '',
        address: client.address || '',
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        contact: '',
        address: '',
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.contact) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        contact: formData.contact,
        address: formData.address || undefined,
      };

      const endpoint = client
        ? SALESENDPOINTS.CLIENT.modify(client.id)
        :  SALESENDPOINTS.CLIENT.create;

      const method = client ? 'PUT' : 'POST';
      await apiRequest(endpoint, method, '', payload);
       setFormData({
        firstName: '',
        lastName: '',
        contact: '',
        address: '',
      });
      refreshClients();
      onCancel();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {client ? 'Edit Client' : 'Add New Client'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <CustomTextInput
              type="text"
              value={formData.firstName}
              onChange={(val) => setFormData(prev => ({ ...prev, firstName: val }))}
              placeholder="Enter first name"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <CustomTextInput
              type="text"
              value={formData.lastName}
              onChange={(val) => setFormData(prev => ({ ...prev, lastName: val }))}
              placeholder="Enter last name"
            />
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact *
            </label>
            <CustomTextInput
              type="text"
              value={formData.contact}
              onChange={(val) => setFormData(prev => ({ ...prev, contact: val }))}
              placeholder="Enter contact information"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <CustomTextInput
              type="text"
              value={formData.address}
              onChange={(val) => setFormData(prev => ({ ...prev, address: val }))}
              placeholder="Enter address (optional)"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <CustomButton type='negative' fn={onCancel} label="Cancel" />
            <CustomButton
              type='positive'
              label={client ? 'Update Client' : 'Create Client'}
              fn={handleSubmit}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrModifyClient;