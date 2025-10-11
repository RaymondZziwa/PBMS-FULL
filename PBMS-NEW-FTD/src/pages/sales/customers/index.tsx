import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import AddOrModifyClient from './AddorModify';
import useClients from '../../../hooks/sales/useClients';
import type { IClient } from '../../../redux/types/sales';
import { SALESENDPOINTS } from '../../../endpoints/sales/salesEndpoints';

const ClientsManagement = () => {
  const { data, refresh } = useClients();
  const [clients, setClients] = useState<IClient[]>(data);

  useEffect(() => {
    setClients(data);
  }, [data]);

  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    client: IClient | null;
  }>({
    isOpen: false,
    mode: 'create',
    client: null
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const deleteClient = async () => {
    try {
      if (modalProps.client) {
        await apiRequest(
          SALESENDPOINTS.CLIENT.delete(modalProps.client.id),
          'DELETE',
          ''
        );
        refresh();
        setIsDeleteModalOpen(false);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    }
  };

  // Table columns configuration
  const columns = [
    { key: 'firstName', label: 'First Name', sortable: true, filterable: true },
    { key: 'lastName', label: 'Last Name', sortable: true, filterable: true },
    { key: 'contact', label: 'Contact', sortable: true, filterable: true },
    { key: 'address', label: 'Address', sortable: true, filterable: true },
    { key: 'createdAt', label: 'Created At', sortable: true, filterable: false },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const tableData = clients.map(client => ({
    ...client,
    createdAt: formatDate(client.createdAt),
    actions: (
      <div className="flex gap-3">
        <div className="relative group">
          <button
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => setModalProps({ isOpen: true, mode: 'edit', client })}
          >
            <FaEdit />
          </button>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Edit
          </span>
        </div>

        <div className="relative group">
          <button
            className="text-red-600 hover:text-red-800 transition-colors"
            onClick={() => {
              setModalProps({ isOpen: false, mode: '', client });
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
        <h2 className="text-2xl font-bold text-gray-800">Clients</h2>
        <button
          onClick={() => setModalProps({ isOpen: true, mode: 'create', client: null })}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add New Client
        </button>
      </div>

      <CustomTable columns={columns} data={tableData} pageSize={10} />

      <AddOrModifyClient
        visible={modalProps.isOpen}
        client={modalProps.client}
        onCancel={() => setModalProps({ isOpen: false, mode: 'create', client: null })}
      />

      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteClient}
      />
    </div>
  );
};

export default ClientsManagement;