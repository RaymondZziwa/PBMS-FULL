import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiPlus, FiTrash2 } from 'react-icons/fi';
import Modal from '../../../ui/Modal';
import Button from '../../../ui/Button';
import Combobox from '../../../ui/Combobox';
import { TextField } from '../../../ui/Field';
import { ugx } from '../../../ui/Page';
import { AmountInput } from '../shared/NumberInputs';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import { SALESENDPOINTS } from '../../../endpoints/sales/salesEndpoints';
import type { ISale, IPaymentMethod } from '../../../redux/types/sales';

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
  { value: 'AIRTEL_MOMO', label: 'Airtel Momo' },
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
    return methodType === 'MTN_MOMO' || methodType === 'AIRTEL_MOMO' || methodType === 'PROF_MOMO' || methodType === 'CARD';
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
    <Modal
      open={visible}
      onClose={onClose}
      locked={loading}
      size="lg"
      title={`Collect payment from ${sale.client?.firstName ?? ''} ${sale.client?.lastName ?? ''}`}
      description={`Sale #${(sale as { saleNumber?: string }).saleNumber || String(sale.id).slice(-8)} · owes ${ugx(currentBalance)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading} disabled={amountPaid <= 0}>
            Collect {ugx(amountPaid)}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface-2 p-3 text-sm">
          <div>
            <p className="m-0 text-xs text-brand-muted">Sale total</p>
            <p className="m-0 font-medium tabular-nums text-brand-ink">{ugx(sale.total)}</p>
          </div>
          <div>
            <p className="m-0 text-xs text-brand-muted">Paid so far</p>
            <p className="m-0 font-medium tabular-nums text-brand-ink">{ugx(Number(sale.total || 0) - Number(sale.balance || 0))}</p>
          </div>
          <div>
            <p className="m-0 text-xs text-brand-muted">Still owed</p>
            <p className="m-0 font-semibold tabular-nums text-[#B54708] dark:text-[#F0CF85]">{ugx(currentBalance)}</p>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="m-0 text-[13px] font-medium text-ink-soft">Paid with</p>
            {paymentMethods.length < 3 && (
              <button type="button" onClick={addPaymentMethod} className="flex items-center gap-1 rounded-md px-1 text-sm font-medium text-brand-text hover:underline">
                <FiPlus aria-hidden="true" /> Add method
              </button>
            )}
          </div>
          <ul className="m-0 list-none space-y-2 p-0">
            {paymentMethods.map((method, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2 p-2">
                <Combobox
                  label={`Payment method ${index + 1}`}
                  hideLabel
                  className="min-w-[160px] flex-1"
                  value={method.type}
                  onChange={(v) => handlePaymentMethodChange(index, 'type', v || 'CASH')}
                  options={PAYMENT_METHOD_OPTIONS}
                  searchPlaceholder="Search methods"
                />
                <AmountInput label={`Amount for method ${index + 1}`} className="w-44" value={method.amount} max={currentBalance} onChange={(v) => handlePaymentMethodChange(index, 'amount', v)} />
                {requiresTransactionId(method.type) && (
                  <input
                    aria-label={`Transaction ID for method ${index + 1}`}
                    value={method.transactionId || ''}
                    onChange={(e) => handlePaymentMethodChange(index, 'transactionId', e.target.value)}
                    placeholder="Transaction ID (required)"
                    className="themed h-10 min-w-[180px] flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-brand-ink outline-none focus:border-brand"
                  />
                )}
                {paymentMethods.length > 1 && (
                  <button type="button" onClick={() => removePaymentMethod(index)} aria-label="Remove this payment method" className="flex h-10 w-10 items-center justify-center rounded-lg text-brand-muted hover:bg-[#FDECEA] hover:text-[#B42318] dark:hover:bg-[#381B19]">
                    <FiTrash2 aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${newBalance === 0 ? 'bg-[#E7F6EC] dark:bg-[#15301F]' : 'bg-subtle'}`}>
          <span className="flex items-center gap-2 text-sm font-medium text-brand-ink">
            {newBalance === 0 && <FiCheckCircle aria-hidden="true" className="text-[#1E7B43] dark:text-[#8FD6A8]" />}
            {newBalance === 0 ? 'This settles the debt in full' : 'Still owed after this'}
          </span>
          <span className="font-display text-lg font-semibold tabular-nums text-brand-ink">{ugx(newBalance)}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Reference" value={referenceId} onChange={setReferenceId} placeholder="Optional" />
          <TextField label="Notes" value={notes} onChange={setNotes} placeholder="Optional" />
        </div>
      </div>
    </Modal>
  );
};

export default CollectCreditPaymentModal;
