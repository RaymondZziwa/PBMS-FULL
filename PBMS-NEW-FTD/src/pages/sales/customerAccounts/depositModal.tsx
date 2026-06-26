import { useState } from 'react';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import { SALESENDPOINTS } from '../../../endpoints/sales/salesEndpoints';
import type { IClientAccount } from '../../../redux/types/sales';

interface DepositModalProps {
  visible: boolean;
  clientAccount: IClientAccount | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const DepositModal = ({ visible, clientAccount, onCancel, onSuccess }: DepositModalProps) => {
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    if (!clientAccount) {
      toast.error('No account selected');
      return;
    }

    setIsLoading(true);
    try {
      // Expected payload matching DepositDto
      const payload = {
        accId: clientAccount.id,
        amount: amount,
        notes: notes
      };

      await apiRequest(
        SALESENDPOINTS.CLIENT_ACCOUNTS.deposit,
          'POST',
        '',
        payload
      );
      
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Deposit failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setAmount(0);
    setNotes('');
    onCancel();
  };

  if (!visible) return null;

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
    }).format(amount);
  };

  // Quick deposit amounts
  const quickAmounts = [10000, 20000, 50000, 100000, 200000, 500000];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Make Deposit</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Account Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Account Name</p>
              <p className="font-medium text-gray-800">{clientAccount?.accountName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Account Number</p>
              <p className="font-medium text-gray-800">{clientAccount?.accountNumber}</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-500">Current Balance</p>
            <p className="font-bold text-lg text-gray-800">
              {formatCurrency(clientAccount?.balance || 0)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Deposit Amount *
            </label>
            <div className="relative">
              
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-4 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="0.00"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Quick Amounts
            </label>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(quickAmount)}
                  className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                    amount === quickAmount
                      ? 'bg-gray-600 text-white border-gray-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  UGX {quickAmount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Notes <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
              placeholder="Add notes about this deposit (e.g., cash payment, bank transfer, etc.)"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !amount || amount <= 0}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                `Deposit ${amount > 0 ? formatCurrency(amount) : ''}`
              )}
            </button>
          </div>

          {/* Amount Summary */}
          {amount > 0 && clientAccount && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">New Balance After Deposit:</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency((clientAccount.balance || 0) + amount)}
                </span>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default DepositModal;