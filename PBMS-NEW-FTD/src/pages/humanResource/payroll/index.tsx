import { useEffect, useState } from 'react';
import { FaPlus, FaTrash, FaEye } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import AddOrModifyPayrollPeriod from './AddorModify';
import type { IPayrollPeriod } from '../../../redux/types/hr';
import { PayrollEndpoints } from '../../../endpoints/humanResource/payroll';
import usePayroll from '../../../hooks/humanResource/usePayroll';
import PayrollDetailsModal from './modal';

const PayrollManagement = () => {
  const { data, refresh } = usePayroll();
  const [payrollPeriods, setPayrollPeriods] = useState(data);

  useEffect(() => {
    setPayrollPeriods(data);
  }, [data]);
  
  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    payrollPeriod: IPayrollPeriod | null;
  }>({
    isOpen: false,
    mode: 'create',
    payrollPeriod: null
  });
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] = useState<IPayrollPeriod | null>(null);
  
  const deletePayrollPeriod = async () => {
    try {
      if (modalProps.payrollPeriod) {
        await apiRequest(PayrollEndpoints.delete(modalProps?.payrollPeriod?.id), "DELETE", '');
        refresh();
        setIsDeleteModalOpen(false);
        toast.success('Payroll period deleted successfully');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Table columns configuration
  const columns = [
    { key: 'period', label: 'Payroll Period', sortable: true, filterable: true },
    { key: 'payDate', label: 'Pay Date', sortable: true, filterable: false },
    { key: 'totalSpent', label: 'Total Spent (UGX)', sortable: true, filterable: true },
    { key: 'createdAt', label: 'Created At', sortable: true, filterable: false },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  // Prepare data for the table
  const tableData = payrollPeriods.map(payrollPeriod => ({
    ...payrollPeriod,
    period: `${formatDate(payrollPeriod.periodStart)} - ${formatDate(payrollPeriod.periodEnd)}`,
    payDate: formatDate(payrollPeriod.payDate),
    totalSpent: formatCurrency(payrollPeriod.totalSpent || 0),
    createdAt: formatDate(payrollPeriod.createdAt),
    actions: (
      <div className="flex gap-3">
        {/* View Details Button */}
        <div className="relative group">
          <button
            className="text-green-600 hover:text-green-800 transition-colors"
            onClick={() => {
              setSelectedPayrollPeriod(payrollPeriod);
              setIsDetailsModalOpen(true);
            }}
            title="View Payroll Details"
          >
            <FaEye />
          </button>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            View Details
          </span>
        </div>
        
        {/* Delete Button */}
        <div className="relative group">
          <button
            className="text-red-600 hover:text-red-800 transition-colors"
            onClick={() => {
              setModalProps({ isOpen: false, mode: '', payrollPeriod });
              setIsDeleteModalOpen(true);
            }}
            title="Delete Payroll Period"
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
        <h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2>
        <button
          onClick={() => setModalProps({ isOpen: true, mode: 'create', payrollPeriod: null })}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Generate Payroll
        </button>
      </div>

      <CustomTable 
        columns={columns} 
        data={tableData} 
        pageSize={10}
        emptyMessage="No payroll periods found. Click 'Generate Payroll' to create a new payroll period."
      />

      {/* Add/Edit Payroll Period Modal */}
      <AddOrModifyPayrollPeriod
        visible={modalProps.isOpen}
        payrollPeriod={modalProps.payrollPeriod}
        onCancel={() => setModalProps({ isOpen: false, mode: "create", payrollPeriod: null })}
        onSuccess={refresh}
      />
      
      {/* Delete Confirmation Modal */}
      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deletePayrollPeriod}
        title="Delete Payroll Period"
        message="Are you sure you want to delete this payroll period? This action cannot be undone."
      />

      {/* Payroll Details Modal */}
      <PayrollDetailsModal
        visible={isDetailsModalOpen}
        payrollPeriod={selectedPayrollPeriod}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedPayrollPeriod(null);
        }}
      />
    </div>
  );
};

export default PayrollManagement;