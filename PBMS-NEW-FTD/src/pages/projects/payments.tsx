import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaMoneyBillWave, FaReceipt, FaFilter, FaSearch } from 'react-icons/fa';
import useProjectSale from '../../hooks/projects/useProjectSale';
import type { IProjectSale, IProjectPayment } from '../../redux/types/sales';
import CustomDropdown from '../../custom/inputs/customDropdown';
import AddOrModifyPayment from './AddorModifyPayment';
import { apiRequest } from '../../libs/apiConfig';
import { PROJECTENDPOINTS } from '../../endpoints/projects/projectEndpoints';
import { toast } from 'sonner';
import CustomTable from '../../custom/table/customTable';

const SalePayments: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sales, loading, refresh } = useProjectSale();
  const [sale, setSale] = useState<IProjectSale | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<IProjectPayment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Find the specific sale when sales data loads
  useEffect(() => {
    if (sales && id) {
      const foundSale = sales.find(s => s.id === id);
      setSale(foundSale || null);
    }
  }, [sales, id]);

  // Table columns configuration for payments
  const paymentColumns = [
    { 
      key: 'createdAt', 
      label: 'Payment Date', 
      sortable: true, 
      filterable: false,
      render: (value: Date) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'amount', 
      label: 'Amount (UGX)', 
      sortable: true, 
      filterable: true,
      render: (value: number) => `${value.toLocaleString()}`
    },
    { 
      key: 'paymentMethod', 
      label: 'Payment Method', 
      sortable: true, 
      filterable: true,
      render: (value: string) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {value.replace(/_/g, ' ').toUpperCase()}
        </span>
      )
    },
    { 
      key: 'servedBy', 
      label: 'Served by', 
      sortable: true, 
      filterable: true,
    },
  
    { 
      key: 'notes', 
      label: 'Notes', 
      sortable: false, 
      filterable: false,
      render: (value: string) => value || '-'
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      filterable: false,
      render: (value: any, payment: IProjectPayment) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditPayment(payment);
            }}
            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
            title="Edit Payment"
          >
            <FaEdit size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeletePayment(payment.id);
            }}
            className="p-1 text-red-600 hover:text-red-800 transition-colors"
            title="Delete Payment"
          >
            <FaTrash size={14} />
          </button>
        </div>
      )
    }
  ];

  // Filter payments based on search
  const filteredPayments = sale?.ProjectPayments?.filter(payment => {
    const matchesSearch = 
      payment.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.amount?.toString().includes(searchTerm) ||
      `${payment.employee?.firstName} ${payment.employee?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.paymentMethod === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Handle payment actions
  const handleEditPayment = (payment: IProjectPayment) => {
    setEditingPayment(payment);
    setIsCreateModalOpen(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    
    try {
      await apiRequest(PROJECTENDPOINTS.PROJECT_PAYMENTS.delete(paymentId), "DELETE", '');
      refresh(); // Refresh the data
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete payment');
    }
  };

  const handleAddPayment = () => {
    setEditingPayment(null);
    setIsCreateModalOpen(true);
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setEditingPayment(null);
    refresh(); // Refresh data after any payment operation
  };

  const handlePaymentSubmit = async (paymentData: any) => {
    try {
      if (editingPayment) {
        // Update existing payment
        await apiRequest(
          PROJECTENDPOINTS.PROJECT_PAYMENTS.update(editingPayment.id),
          "PUT",
          paymentData
        );
        toast.success('Payment updated successfully');
      } else {
        // Create new payment
        await apiRequest(
          PROJECTENDPOINTS.PROJECT_PAYMENTS.create,
          "POST",
          { ...paymentData, saleId: sale?.id }
        );
        toast.success('Payment added successfully');
      }
      handleModalClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to process payment');
    }
  };

  const handleRowClick = (payment: IProjectPayment) => {
    // Optional: Add detail view for payments if needed
    console.log('Payment clicked:', payment);
  };

  // Prepare table data with flattened employee name
  const tableData = filteredPayments.map(payment => ({
    ...payment,
    servedBy: payment.employee ? `${payment.employee.firstName} ${payment.employee.lastName}` : '-',
    createdAt: new Date(payment.createdAt),
  }));

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-gray-600">Loading sale details...</div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Sale not found or you don't have permission to view it.
        </div>
        <button
          onClick={() => navigate('/projects/sales')}
          className="mt-4 flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaArrowLeft className="mr-2" />
          Back to Sales
        </button>
      </div>
    );
  }

  const totalPaid = sale.ProjectPayments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const saleTotalNum = typeof sale.saleTotal === 'string' ? parseInt(sale.saleTotal) : Number(sale.saleTotal);
  const remainingBalance = saleTotalNum - totalPaid;
  const paymentProgress = saleTotalNum > 0 ? (totalPaid / saleTotalNum) * 100 : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate('/projects/sales')}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back to Sales
            </button>
            
            <h1 className="text-2xl font-bold text-gray-800">Sale Payment Management</h1>
            
            <button
              onClick={handleAddPayment}
              disabled={remainingBalance <= 0}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                remainingBalance <= 0 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              title={remainingBalance <= 0 ? 'Sale is fully paid' : 'Add new payment'}
            >
              <FaPlus className="mr-2" />
              New Payment
            </button>
          </div>
          
          {/* Sale Summary */}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-600">Client</h3>
                <p className="text-lg font-semibold text-gray-800">
                  {sale.client?.firstName} {sale.client?.lastName}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600">Project</h3>
                <p className="text-lg font-semibold text-gray-800">{sale.project?.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600">Sale Total</h3>
                <p className="text-lg font-semibold text-gray-800">
                  {saleTotalNum.toLocaleString()} UGX
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600">Remaining Balance</h3>
                <p className={`text-lg font-semibold ${
                  remainingBalance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {remainingBalance.toLocaleString()} UGX
                </p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Payment Progress</span>
                <span>{Math.round(paymentProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${
                    paymentProgress >= 100 ? 'bg-green-600' :
                    paymentProgress >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} 
                  style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <FaMoneyBillWave className="text-blue-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-600">Total Paid</h3>
              <p className="text-2xl font-bold text-gray-800">
                UGX {totalPaid.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center">
            <FaReceipt className="text-green-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-600">Payments Count</h3>
              <p className="text-2xl font-bold text-gray-800">
                {sale.ProjectPayments?.length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-purple-500 rounded-full mr-3 flex items-center justify-center">
              <span className="text-white text-xs">I</span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Installments</h3>
              <p className="text-2xl font-bold text-gray-800">
                {sale.ProjectPayments?.length || 0}/{sale.numberOfInstallments}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-orange-500 rounded-full mr-3 flex items-center justify-center">
              <span className="text-white text-xs">%</span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Progress</h3>
              <p className="text-2xl font-bold text-gray-800">
                {Math.round(paymentProgress)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by payment method, reference, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <CustomDropdown
              options={[
                { label: "All Methods", value: "all" },
                { label: "Cash", value: "cash" },
                { label: "MTN Momo", value: "mtn_momo" },
                { label: "Airtel Momo", value: "airtel_momo" },
                { label: "Card", value: "card" },
                { label: "Bank Transfer", value: "bank_transfer" }
              ]}
              value={[statusFilter]}
              singleSelect
              onChange={(val: string[]) => setStatusFilter(val[0] || "all")}
              placeholder="Filter by method"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <CustomTable
          columns={paymentColumns}
          data={tableData}
          pageSize={10}
          onRowClick={handleRowClick}
          loading={false}
          emptyMessage="No payments found. Add your first payment to get started."
        />
      </div>

      {/* Add/Edit Payment Modal */}
      <AddOrModifyPayment
        visible={isCreateModalOpen}
        onCancel={handleModalClose}
        sale={sale}
        payment={editingPayment}
        onSubmit={handlePaymentSubmit}
      />
    </div>
  );
};

export default SalePayments;