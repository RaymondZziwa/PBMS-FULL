import { useEffect, useState } from 'react';
import { FaTrash, FaToggleOn, FaToggleOff, FaMoneyBillWave, FaUser, FaList } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import useClientAccounts from '../../../hooks/sales/useClientAccounts';
import { SALESENDPOINTS } from '../../../endpoints/sales/salesEndpoints';
import type { IClientAccount } from '../../../redux/types/finance';
import DepositModal from './depositModal';
import CustomConfirmModal from './customConfirmModal';
import TransactionsModal from './txnModal';

const ClientAccountsManagement = () => {
  const { data, refresh } = useClientAccounts();
  const [clientAccounts, setClientAccounts] = useState<IClientAccount[]>(data);

  useEffect(() => {
    setClientAccounts(data);
  }, [data]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isStatusConfirmModalOpen, setIsStatusConfirmModalOpen] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<IClientAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<IClientAccount | null>(null);
  const [statusAction, setStatusAction] = useState<'activate' | 'deactivate' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStatusToggle = (clientAccount: IClientAccount, action: 'activate' | 'deactivate') => {
    setSelectedAccount(clientAccount);
    setStatusAction(action);
    setIsStatusConfirmModalOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedAccount || !statusAction) return;

    setIsProcessing(true);
    try {
      const endpoint = statusAction === 'activate' 
        ? SALESENDPOINTS.CLIENT_ACCOUNTS.activate(selectedAccount.id)
        : SALESENDPOINTS.CLIENT_ACCOUNTS.deactivate(selectedAccount.id);

      await apiRequest(endpoint, 'PATCH', {});
      
      refresh();
      setIsStatusConfirmModalOpen(false);
      setSelectedAccount(null);
      setStatusAction(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update account status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeposit = (clientAccount: IClientAccount) => {
    setSelectedAccount(clientAccount);
    setIsDepositModalOpen(true);
  };

  const handleViewTransactions = (clientAccount: IClientAccount) => {
    setSelectedAccount(clientAccount);
    setIsTransactionsModalOpen(true);
  };

  // Table columns configuration
  const columns = [
    { key: 'clientName', label: 'Client Name', sortable: true, filterable: true },
    { key: 'balance', label: 'Balance', sortable: true, filterable: true },
    { key: 'status', label: 'Status', sortable: true, filterable: true },
    { key: 'transactions', label: 'Transactions', sortable: true, filterable: false },
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      SUSPENDED: 'bg-red-100 text-red-800',
    };
    const style = statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
      </span>
    );
  };

  const tableData = clientAccounts.map(clientAccount => ({
    clientName: (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <FaUser className="text-gray-600" size={14} />
        </div>
        <div>
          <div className="font-medium text-gray-800">
            {clientAccount.client.firstName} {clientAccount.client.lastName}
          </div>
          <div className="text-xs text-gray-500">
            {clientAccount.client.phone}
          </div>
        </div>
      </div>
    ),
    balance: formatCurrency(clientAccount.balance),
    status: getStatusBadge(clientAccount.status),
    transactions: clientAccount.PatientAccountTransaction?.length || 0,
    createdAt: formatDate(clientAccount.createdAt),
    actions: (
      <div className="flex gap-2 flex-wrap">
        {/* View Transactions Action - Always visible */}
        <div className="relative group">
          <button
            className="text-blue-600 hover:text-blue-800 transition-colors p-1"
            onClick={() => handleViewTransactions(clientAccount)}
          >
            <FaList />
          </button>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            View Transactions
          </span>
        </div>

        {/* Deposit Action - Only visible for active accounts */}
        {clientAccount.status === 'ACTIVE' && (
          <div className="relative group">
            <button
              className="text-green-600 hover:text-green-800 transition-colors p-1"
              onClick={() => handleDeposit(clientAccount)}
            >
              <FaMoneyBillWave />
            </button>
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Deposit
            </span>
          </div>
        )}

        {/* Activate/Deactivate Action - Always visible */}
        <div className="relative group">
          {clientAccount.status === 'ACTIVE' ? (
            <button
              className="text-yellow-600 hover:text-yellow-800 transition-colors p-1"
              onClick={() => handleStatusToggle(clientAccount, 'deactivate')}
            >
              <FaToggleOn size={18} />
            </button>
          ) : (
            <button
              className="text-gray-600 hover:text-gray-800 transition-colors p-1"
              onClick={() => handleStatusToggle(clientAccount, 'activate')}
            >
              <FaToggleOff size={18} />
            </button>
          )}
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {clientAccount.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </span>
        </div>
      </div>
    )
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Client Accounts</h2>
        <div className="text-sm text-gray-500">
          Total Accounts: {clientAccounts.length}
        </div>
      </div>

      <CustomTable columns={columns} data={tableData} pageSize={10} />

      <DepositModal
        visible={isDepositModalOpen}
        clientAccount={selectedAccount}
        onCancel={() => {
          setIsDepositModalOpen(false);
          setSelectedAccount(null);
        }}
        onSuccess={() => {
          refresh();
          setIsDepositModalOpen(false);
          setSelectedAccount(null);
          toast.success('Deposit completed successfully');
        }}
      />

      <TransactionsModal
        visible={isTransactionsModalOpen}
        clientAccount={selectedAccount}
        onClose={() => {
          setIsTransactionsModalOpen(false);
          setSelectedAccount(null);
        }}
      />

      {/* Status Change Confirmation Modal */}
      <CustomConfirmModal
        visible={isStatusConfirmModalOpen}
        title={statusAction === 'activate' ? 'Activate Account' : 'Deactivate Account'}
        message={
          statusAction === 'activate' 
            ? `Are you sure you want to activate the account for ${selectedAccount?.client.firstName} ${selectedAccount?.client.lastName}? Once activated, the account will become usable for transactions and deposits.`
            : `Are you sure you want to deactivate the account for ${selectedAccount?.client.firstName} ${selectedAccount?.client.lastName}? The account will need to be activated again to become usable.`
        }
        confirmText={statusAction === 'activate' ? 'Activate' : 'Deactivate'}
        cancelText="Cancel"
        onConfirm={confirmStatusChange}
        onCancel={() => {
          setIsStatusConfirmModalOpen(false);
          setSelectedAccount(null);
          setStatusAction(null);
        }}
        isLoading={isProcessing}
        type={statusAction === 'activate' ? 'success' : 'warning'}
      />
    </div>
  );
};

export default ClientAccountsManagement;