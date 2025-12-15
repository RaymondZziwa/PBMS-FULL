import { useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import useSupplier from '../../../hooks/inventory/useSupplier';
import type { ISupplier } from '../../../redux/types/supplyMgt';
import AddOrModifySupplier from './AddorModify';
import { useNavigate } from 'react-router-dom';

const SuppliersManagement = () => {
    const navigate = useNavigate()
  const { data: suppliers, refresh } = useSupplier();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    supplier: ISupplier | null;
  }>({
    isOpen: false,
    mode: 'create',
    supplier: null,
  });


  const deleteSupplier = async () => {
    try {
      if (modalProps.supplier) {
        await apiRequest(
          InventoryEndpoints.SUPPLY.SUPPLIER.delete(modalProps.supplier.id),
          'DELETE',
          ''
        );
        refresh();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error deleting supplier');
    }
  };

  // Table columns configuration
  const columns = [
      { key: 'firstName', label: 'First Name', sortable: true, filterable: true },
    { key: 'lastName', label: 'Last Name', sortable: true, filterable: true },
    { key: 'contact', label: 'Contact', sortable: true, filterable: true },
    { key: 'address', label: 'Address', sortable: false, filterable: true },
    { key: 'createdAt', label: 'Created At', sortable: true, filterable: false },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  // Format date for display
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  // Prepare data for table
  const tableData = suppliers.map((supplier) => ({
    ...supplier,
    createdAt: formatDate(supplier.createdAt),
    actions: (
<div className="flex gap-3">
  {/* View Button */}
  <div className="relative group">
    <button
      className="text-green-600 hover:text-green-800 transition-colors"
      onClick={() => navigate(`/inventory/supplier/${supplier.id}`)}
    >
      <FaEye />
    </button>
    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
      View
    </span>
  </div>

  {/* Edit Button */}
  <div className="relative group">
    <button
      className="text-blue-600 hover:text-blue-800 transition-colors"
      onClick={() =>
        setModalProps({
          isOpen: true,
          mode: 'edit',
          supplier: supplier,
        })
      }
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
        setModalProps({
          isOpen: false,
          mode: '',
          supplier: supplier,
        });
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
    ),
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Suppliers</h2>
        <button
          onClick={() =>
            setModalProps({ isOpen: true, mode: 'create', supplier: null })
          }
          className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add New Supplier
        </button>
      </div>

      <CustomTable columns={columns} data={tableData} pageSize={10} />

      <AddOrModifySupplier
        visible={modalProps.isOpen}
        supplier={modalProps.supplier}
        onCancel={() =>
          setModalProps({ isOpen: false, mode: 'create', supplier: null })
        }
      />

      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteSupplier}
      />
    </div>
  );
};

export default SuppliersManagement;
