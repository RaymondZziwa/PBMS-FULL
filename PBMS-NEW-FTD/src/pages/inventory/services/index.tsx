import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import type { IService } from '../../../redux/types/inventory';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import useServices from '../../../hooks/inventory/useServices';
import AddOrModifyService from './AddorModify';

const ServicesManagement = () => {
  const { data, refresh } = useServices();
  const [services, setServices] = useState<IService[]>(data);

  useEffect(() => {
    setServices(data);
  }, [data]);

  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    service: IService | null;
  }>({
    isOpen: false,
    mode: 'create',
    service: null
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const deleteService = async () => {
    try {
      if (modalProps.service) {
        await apiRequest(
          InventoryEndpoints.SERVICE.delete(modalProps.service.id), // Adjust if there's a SERVICE delete endpoint
          'DELETE',
          ''
        );
        refresh();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    }
  };

  // Table columns configuration
  const columns = [
    { key: 'name', label: 'Service Name', sortable: true, filterable: true },
    { key: 'price', label: 'Price', sortable: true, filterable: true },
    { key: 'createdAt', label: 'Created At', sortable: true, filterable: false },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  // Format date for display
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Prepare data for the table
  const tableData = services.map(service => ({
    ...service,
    createdAt: formatDate(service.createdAt),
    actions: (
      <div className="flex gap-3">
        {/* Edit Button */}
        <div className="relative group">
          <button
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => setModalProps({ isOpen: true, mode: 'edit', service })}
          >
            <FaEdit />
          </button>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Edit
          </span>
        </div>

        {/* Delete Button */}
        <div className="relative group">
          <button
            className="text-red-600 hover:text-red-800 transition-colors"
            onClick={() => {
              setModalProps({ isOpen: false, mode: '', service });
              setIsDeleteModalOpen(true);
            }}
          >
            <FaTrash />
          </button>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Delete
          </span>
        </div>
      </div>
    )
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Services</h2>
        <button
          onClick={() => setModalProps({ isOpen: true, mode: 'create', service: null })}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add New Service
        </button>
      </div>

      <CustomTable columns={columns} data={tableData} pageSize={10} />

      <AddOrModifyService
        visible={modalProps.isOpen}
        service={modalProps.service}
        onCancel={() => setModalProps({ isOpen: false, mode: 'create', service: null })}
      />

      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteService}
      />
    </div>
  );
};

export default ServicesManagement;
