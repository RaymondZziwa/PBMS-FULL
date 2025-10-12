import React, { useState, useEffect } from 'react';
import { FaTimes, FaCheck, FaMoneyBillWave } from 'react-icons/fa';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import { SALESENDPOINTS } from '../../../endpoints/sales/salesEndpoints';
import type { ISale, IPaymentMethod } from '../../../redux/types/sales';
import CustomTextInput from '../../../custom/inputs/customTextInput';

interface CollectCreditPaymentModalProps {
  visible: boolean;
  sale: ISale;
  onClose: () => void;
  onPaymentCollected: () => void;
  currentUser: { id: string; name: string };
}

// Payment method options matching the enum
const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MTN_MOMO', label: 'MTN Momo' },
  { value: 'AIRTELL_MOMO', label: 'Airtel Momo' },
  { value: 'CARD', label: 'Card' },
  { value: 'PROF_MOMO', label: 'Prof Momo' }
];

const CollectCreditPaymentModal: React.FC<CollectCreditPaymentModalProps> = ({
  visible,
  sale,
  onClose,
  onPaymentCollected,
  currentUser
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([
    { type: 'CASH', amount: 0 }
  ]);
  const [notes, setNotes] = useState('');
  const [referenceId, setReferenceId] = useState('');

  // Calculate sale totals - FIXED: Use balance directly
  const currentBalance = typeof sale.balance === 'string' ? parseFloat(sale.balance) : sale.balance;

  // Calculate form totals
  const amountPaid = paymentMethods.reduce((sum, method) => sum + (method.amount || 0), 0);
  const newBalance = Math.max(0, currentBalance - amountPaid);

  // Reset form when modal opens - FIXED: Use currentBalance instead of sale.total
  useEffect(() => {
    if (visible) {
      // Set initial payment amount to the current balance (what's actually owed)
      setPaymentMethods([{ type: 'CASH', amount: currentBalance }]);
      setNotes('');
      setReferenceId('');
    }
  }, [visible, currentBalance]);

  const handlePaymentMethodChange = (index: number, field: keyof IPaymentMethod, value: any) => {
    setPaymentMethods(prev => prev.map((method, i) => 
      i === index ? { ...method, [field]: value } : method
    ));
  };

  const addPaymentMethod = () => {
    if (paymentMethods.length >= 3) {
      toast.error('Maximum of 3 payment methods allowed');
      return;
    }
    setPaymentMethods(prev => [...prev, { type: 'CASH', amount: 0 }]);
  };

  const removePaymentMethod = (index: number) => {
    setPaymentMethods(prev => prev.filter((_, i) => i !== index));
  };

  // Check if payment method requires transaction ID
  const requiresTransactionId = (methodType: string) => {
    return methodType === 'MTN_MOMO' || methodType === 'AIRTELL_MOMO' || methodType === 'PROF_MOMO' || methodType === 'CARD';
  };

  const validateForm = () => {
    if (amountPaid <= 0) {
      toast.error('Please enter a valid payment amount');
      return false;
    }

    if (amountPaid > currentBalance) {
      toast.error('Payment amount cannot exceed current balance');
      return false;
    }

    // Check if any payment method has invalid amount
    if (paymentMethods.some(method => method.amount <= 0)) {
      toast.error('Please enter valid amounts for all payment methods');
      return false;
    }

    // Check if total payment methods amount matches amount paid
    const paymentTotal = paymentMethods.reduce((sum, method) => sum + method.amount, 0);
    if (Math.abs(paymentTotal - amountPaid) > 0.01) {
      toast.error('Payment methods total must match amount paid');
      return false;
    }

    // Validate transaction IDs for required methods
    for (const method of paymentMethods) {
      if (requiresTransactionId(method.type) && !method.transactionId?.trim()) {
        const methodName = PAYMENT_METHOD_OPTIONS.find(opt => opt.value === method.type)?.label || method.type;
        toast.error(`Please enter transaction ID for ${methodName}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    const payload = {
      saleId: sale.id,
      paymentMethods: paymentMethods.filter(method => method.amount > 0),
      servedBy: currentUser.id,
      referenceId: referenceId.trim() || undefined,
      notes: notes.trim() || undefined,
      amountPaid,
      newBalance
    };

    try {
      await apiRequest(SALESENDPOINTS.POS.collect_payment, 'POST', '', payload);
      onPaymentCollected();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to collect payment');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Collect Credit Payment</h2>
            <p className="text-sm text-gray-600 mt-1">
              Sale #{sale.saleNumber || sale.id.slice(-8)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={loading}
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="overflow-auto max-h-[70vh] p-6">
          <div className="space-y-6">
            {/* Sale Information */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-700 mb-3">Sale Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Client:</span>
                  <p className="font-medium">
                    {sale.client?.firstName} {sale.client?.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Total Due:</span>
                  <p className="font-medium">{sale.total?.toLocaleString()} UGX</p>
                </div>
                <div>
                  <span className="text-gray-600">Paid So Far:</span>
                  <p className="font-medium text-green-600">
                    {(Number(sale.total) - Number(sale.balance)).toLocaleString()} UGX
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Current Balance:</span>
                  <p className="font-medium text-orange-600">{currentBalance.toLocaleString()} UGX</p>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Payment Methods
                </label>
                {paymentMethods.length < 3 && (
                  <button
                    onClick={addPaymentMethod}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    type="button"
                  >
                    + Add Method
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {paymentMethods.map((method, index) => (
                  <div key={index} className="flex gap-3 items-start p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CustomDropdown
                        label="Payment Method"
                        options={PAYMENT_METHOD_OPTIONS}
                        value={[method.type]}
                        onChange={(selectedValues) => handlePaymentMethodChange(index, 'type', selectedValues[0] || 'CASH')}
                        placeholder="Select payment method..."
                        searchPlaceholder="Search payment methods..."
                        singleSelect={true}
                        maxHeight={200}
                      />

                      <CustomTextInput
                        type="number"
                        value={method.amount.toString()}
                        onChange={(value) => handlePaymentMethodChange(index, 'amount', parseFloat(value) || 0)}
                        placeholder="Enter amount"
                        min="0"
                        max={currentBalance.toString()}
                      />

                      {requiresTransactionId(method.type) && (
                        <div className="md:col-span-2">
                          <CustomTextInput
                            label="Transaction ID"
                            type="text"
                            value={method.transactionId || ''}
                            onChange={(value) => handlePaymentMethodChange(index, 'transactionId', value)}
                            placeholder="Enter transaction ID"
                            required
                          />
                        </div>
                      )}
                    </div>
                    
                    {paymentMethods.length > 1 && (
                      <button
                        onClick={() => removePaymentMethod(index)}
                        className="p-2 text-red-600 hover:text-red-800 transition-colors mt-6"
                        type="button"
                        title="Remove payment method"
                      >
                        <FaTimes size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3">Payment Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Amount Being Paid:</span>
                  <p className="font-bold text-lg text-blue-800">
                    {amountPaid.toLocaleString()} UGX
                  </p>
                </div>
                <div>
                  <span className="text-blue-700">New Balance:</span>
                  <p className={`font-bold text-lg ${
                    newBalance === 0 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {newBalance.toLocaleString()} UGX
                  </p>
                </div>
              </div>
              {newBalance === 0 && (
                <div className="mt-2 text-green-600 text-sm font-medium">
                  <FaCheck className="inline mr-1" />
                  This payment will fully settle the credit
                </div>
              )}
            </div>

            {/* Reference and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <CustomTextInput
                label="Reference ID (Optional)"
                type="text"
                value={referenceId}
                onChange={setReferenceId}
                placeholder="Enter reference number"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any notes about this payment..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <CustomButton
            type="negative"
            label="Cancel"
            fn={onClose}
            disabled={loading}
          />
          <CustomButton
            label={
              <span className="flex items-center">
                <FaMoneyBillWave className="mr-2" />
                Collect Payment
              </span>
            }
            fn={handleSubmit}
            loading={loading}
            disabled={loading || amountPaid <= 0}
          />
        </div>
      </div>
    </div>
  );
};

export default CollectCreditPaymentModal;