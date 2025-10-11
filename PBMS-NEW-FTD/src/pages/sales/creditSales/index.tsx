import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import { SALESENDPOINTS } from '../../../endpoints/sales/salesEndpoints';
import useCreditSale from '../../../hooks/sales/useCreditSales';
import type { ISale } from '../../../redux/types/sales';

const CreditSalesManagement = () => {
  const { data, refresh } = useCreditSale();
  const [creditSales, setCreditSales] = useState<ISale[]>(data);

  useEffect(() => {
    setCreditSales(data);
  }, [data]);

  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    sale: ISale | null;
  }>({
    isOpen: false,
    mode: 'create',
    sale: null
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const deleteCreditSale = async () => {
    try {
      if (modalProps.sale) {
          await apiRequest(
          SALESENDPOINTS.POS.delete(modalProps.sale.id),
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
    { key: 'clientName', label: 'Client', sortable: true, filterable: true },
    { key: 'amount', label: 'Amount (UGX)', sortable: true, filterable: false },
    { key: 'status', label: 'Status', sortable: true, filterable: true },
    { key: 'createdAt', label: 'Created At', sortable: true, filterable: false },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const tableData = creditSales.map(sale => ({
    ...sale,
    clientName: sale.client ? `${sale.client.firstName} ${sale.client.lastName}` : 'Unknown Client',
    amount: typeof sale.total === 'number' ? sale.total.toLocaleString() : String(sale.total),
    createdAt: formatDate(sale.createdAt),
    actions: (
      <div className="flex gap-3">
        <div className="relative group">
          <button
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => setModalProps({ isOpen: true, mode: 'edit', sale })}
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
              setModalProps({ isOpen: false, mode: '', sale });
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
        <h2 className="text-2xl font-bold text-gray-800">Credit Sales</h2>
      </div>

      <CustomTable columns={columns} data={tableData} pageSize={10} />
{/* 
      <AddOrModifyCreditSale
        visible={modalProps.isOpen}
        sale={modalProps.sale}
        onCancel={() => setModalProps({ isOpen: false, mode: 'create', sale: null })}
      /> */}

      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteCreditSale}
      />
    </div>
  );
};

export default CreditSalesManagement;
