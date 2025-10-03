import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import useItems from '../../../hooks/inventory/useItems';
import type { IItem } from '../../../redux/types/inventory';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import AddOrModifyItem from './AddorModify';

const ItemsManagement = () => {
  const { data, refresh } = useItems();
  const [items, setItems] = useState<IItem[]>(data);

  useEffect(() => {
    setItems(data);
  }, [data]);

  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    item: IItem | null;
  }>({
    isOpen: false,
    mode: 'create',
    item: null
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const deleteItem = async () => {
    try {
      if (modalProps.item) {
        await apiRequest(
          InventoryEndpoints.ITEM.delete(modalProps.item.id), // Make sure this endpoint exists
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
    { key: 'category.name', label: 'Category', sortable: true, filterable: true, render: (_, row: IItem) => row.category?.name },
    { key: 'name', label: 'Item Name', sortable: true, filterable: true },
    { key: 'barcode', label: 'Barcode', sortable: true, filterable: true },
    { key: 'price', label: 'Price', sortable: true, filterable: true },
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

  const tableData = items.map(item => ({
    ...item,
    createdAt: formatDate(item.createdAt),
    actions: (
      <div className="flex gap-3">
        <div className="relative group">
          <button
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => setModalProps({ isOpen: true, mode: 'edit', item })}
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
              setModalProps({ isOpen: false, mode: '', item });
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
        <h2 className="text-2xl font-bold text-gray-800">Items</h2>
        <button
          onClick={() => setModalProps({ isOpen: true, mode: 'create', item: null })}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add New Item
        </button>
      </div>

      <CustomTable columns={columns} data={tableData} pageSize={10} />

      <AddOrModifyItem
        visible={modalProps.isOpen}
        item={modalProps.item}
        onCancel={() => setModalProps({ isOpen: false, mode: 'create', item: null })}
      />

      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteItem}
      />
    </div>
  );
};

export default ItemsManagement;
