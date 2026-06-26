import { FaTimes, FaMoneyBillWave, FaShoppingCart, FaCalendarAlt, FaUser } from 'react-icons/fa';
import type { IClientAccount } from '../../../redux/types/finance';

interface TransactionsModalProps {
  visible: boolean;
  clientAccount: IClientAccount | null;
  onClose: () => void;
}

const TransactionsModal = ({ visible, clientAccount, onClose }: TransactionsModalProps) => {
  if (!visible || !clientAccount) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeBadge = (type: string) => {
    const typeStyles = {
      DEPOSIT: 'bg-green-100 text-green-800',
      WITHDRAWAL: 'bg-red-100 text-red-800',
      PURCHASE: 'bg-blue-100 text-blue-800',
      REFUND: 'bg-purple-100 text-purple-800',
    };
    const style = typeStyles[type as keyof typeof typeStyles] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
      </span>
    );
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <FaMoneyBillWave className="text-green-600" />;
      case 'WITHDRAWAL':
        return <FaMoneyBillWave className="text-red-600" />;
      case 'PURCHASE':
        return <FaShoppingCart className="text-blue-600" />;
      default:
        return <FaMoneyBillWave className="text-gray-600" />;
    }
  };

  const transactions = clientAccount.PatientAccountTransaction || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Transaction History</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FaUser className="text-gray-400" size={14} />
                <span>{clientAccount.client.firstName} {clientAccount.client.lastName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Balance:</span>
                <span className="font-bold text-gray-800">{formatCurrency(clientAccount.balance)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Transaction Summary - Fixed */}
        <div className="grid grid-cols-3 gap-4 mb-4 flex-shrink-0">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total Deposits</p>
            <p className="text-lg font-bold text-green-700">
              {formatCurrency(
                transactions
                  .filter(t => t.type === 'DEPOSIT')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total Transactions</p>
            <p className="text-lg font-bold text-blue-700">
              {transactions.length}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Account Status</p>
            <p className={`text-lg font-bold ${
              clientAccount.status === 'ACTIVE' ? 'text-green-700' : 'text-gray-700'
            }`}>
              {clientAccount.status.charAt(0).toUpperCase() + clientAccount.status.slice(1).toLowerCase()}
            </p>
          </div>
        </div>

        {/* Transactions Table - Scrollable */}
        <div className="flex-1 overflow-auto min-h-[200px]">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaMoneyBillWave className="mx-auto text-4xl text-gray-300 mb-3" />
              <p className="text-lg font-medium">No transactions found</p>
              <p className="text-sm">This account has no transaction history yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                      Transaction Type
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                      Amount
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                      Notes
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          {getTransactionTypeBadge(transaction.type)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${
                          transaction.type === 'DEPOSIT' 
                            ? 'text-green-600' 
                            : transaction.type === 'WITHDRAWAL'
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`}>
                          {transaction.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {transaction.notes || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FaCalendarAlt size={12} className="text-gray-400" />
                          {formatDate(transaction.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-gray-500">
            Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionsModal;