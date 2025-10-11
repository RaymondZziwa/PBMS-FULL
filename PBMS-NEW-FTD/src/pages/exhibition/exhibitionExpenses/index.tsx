import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import type { IExhibitionExpense } from '../../../redux/types/exhibition';
import { ExhibitionEndpoints } from '../../../endpoints/exhibitions/exhibitionEndpoints';
import AddOrModifyExhibitionExpense from './AddorModify';
import useExhibitionExpense from '../../../hooks/exhibitions/useExhibitionExpense';

const ExhibitionExpensesManagement = () => {
  const { data, refresh } = useExhibitionExpense();
  const [expenses, setExpenses] = useState<IExhibitionExpense[]>(data || []);

  useEffect(() => {
    setExpenses(data);
  }, [data]);

  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    expense: IExhibitionExpense | null;
  }>({
    isOpen: false,
    mode: 'create',
    expense: null,
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const deleteExpense = async () => {
    try {
      if (modalProps.expense) {
        await apiRequest(
          ExhibitionEndpoints.EXHIBITION_EXPENSES.delete(modalProps.expense.id),
          'DELETE',
          ''
        );
        refresh();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete expense');
    }
  };

  // Table columns
  const columns = [
    { key: 'title', label: 'Expense Name', sortable: true, filterable: true },
    { key: 'category', label: 'Category', sortable: true, filterable: true },
    { key: 'amount', label: 'Amount (UGX)', sortable: true, filterable: true },
    { key: 'expenseDate', label: 'Date', sortable: true, filterable: true },
    { key: 'remarks', label: 'Remarks', sortable: false, filterable: false },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const tableData = expenses.map((expense) => ({
    ...expense,
    expenseDate: formatDate(expense.createdAt),
    actions: (
      <div className="flex gap-3">
        {/* Edit Button */}
        <div className="relative group">
          <button
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() =>
              setModalProps({
                isOpen: true,
                mode: 'edit',
                expense,
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
              setModalProps({ isOpen: false, mode: '', expense });
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
        <h2 className="text-2xl font-bold text-gray-800">Exhibition Expenses</h2>
        <button
          onClick={() =>
            setModalProps({ isOpen: true, mode: 'create', expense: null })
          }
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add New Expense
        </button>
      </div>

      <CustomTable columns={columns} data={tableData} pageSize={10} />

      <AddOrModifyExhibitionExpense
        visible={modalProps.isOpen}
        expense={modalProps.expense}
        onCancel={() =>
          setModalProps({ isOpen: false, mode: 'create', expense: null })
        }
      />

      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteExpense}
      />
    </div>
  );
};

export default ExhibitionExpensesManagement
