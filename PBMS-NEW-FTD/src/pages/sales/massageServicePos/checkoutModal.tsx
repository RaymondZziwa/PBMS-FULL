import React, { useState, useEffect, useRef } from 'react';
import { FiCheck, FiPlus, FiPrinter, FiTrash2 } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import useClients from '../../../hooks/sales/useClients';
import type { ICartItem, ICheckoutData, IClient, IPaymentMethod } from '../../../redux/types/sales';
import { PrintableContent } from './receipt';
import Modal from '../../../ui/Modal';
import Button from '../../../ui/Button';
import Combobox from '../../../ui/Combobox';
import { ugx } from '../../../ui/Page';
import { AmountInput } from '../shared/NumberInputs';
import { CustomerPicker, OrderSummary, PaymentStatusPicker, SummaryRow } from '../shared/CheckoutParts';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/store';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import { SALESENDPOINTS } from '../../../endpoints/sales/salesEndpoints';
import AddOrModifyClient from '../customers/AddorModify';

interface CheckoutModalProps {
  visible: boolean;
  cart: ICartItem[];
  total: number;
  onClose: () => void;
  onCompleteSale: () => void;
}

// Map the enum values to display labels
const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MTN_MOMO', label: 'MTN Momo' },
  { value: 'AIRTEL_MOMO', label: 'Airtel Momo' },
  { value: 'CARD', label: 'Card' },
  { value: 'PROF_MOMO', label: 'Prof Momo' }
];

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible,
  cart,
  total,
  onClose,
  onCompleteSale,
}) => {
  const { data: clients } = useClients();
  const user = useSelector((state: RootState) => state.userAuth.data);

  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'FULLY_PAID' | 'UNPAID' | 'PARTIALLY_PAID'>('FULLY_PAID');
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([
    { type: 'CASH', amount: total }
  ]);
  const [notes, setNotes] = useState('');
  const [amountPaid, setAmountPaid] = useState(total);

  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    client: IClient | null;
  }>({
    isOpen: false,
    mode: 'create',
    client: null
  });

  const [busy, setBusy] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingPhone) return;
    const digits = (s?: string) => (s ?? '').replace(/\D/g, '').slice(-9);
    const found = clients?.find(c => digits(c.phone) === digits(pendingPhone));
    if (found) {
      setSelectedCustomer(String(found.id));
      setPendingPhone(null);
    }
  }, [clients, pendingPhone]);

  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${new Date().getTime()}`,
  });

  const balance = total - amountPaid;

  // Get selected customer name for receipt
  const selectedCustomerName = (() => {
    if (!selectedCustomer || !clients) return 'Walk-in Customer';
    const client = clients.find(c => c.id === selectedCustomer);
    return client ? `${client.firstName || ''} ${client.lastName || ''}` : 'Walk-in Customer';
  })();

  // Format payment method for receipt
  const getPaymentMethodForReceipt = () => {
    if (paymentMethods.length === 0) return 'UNPAID';
    if (paymentMethods.length === 1) {
      const method = paymentMethods[0];
      const methodOption = PAYMENT_METHOD_OPTIONS.find(opt => opt.value === method.type);
      return methodOption ? methodOption.label : method.type;
    }
    return 'Multiple Methods';
  };

  const getTransactionIdForReceipt = () => {
    const momoMethod = paymentMethods.find(method => 
        method.type === 'MTN_MOMO' || method.type === 'AIRTEL_MOMO' || method.type === 'PROF_MOMO'
    );
    return momoMethod?.transactionId || '';
  };

  useEffect(() => {
    if (paymentStatus === 'FULLY_PAID') {
      setAmountPaid(total);
      if (paymentMethods.length === 0) {
        setPaymentMethods([{ type: 'CASH', amount: total }]);
      } else if (paymentMethods.length === 1) {
        setPaymentMethods([{ ...paymentMethods[0], amount: total }]);
      }
    } else if (paymentStatus === 'UNPAID') {
      setAmountPaid(0);
      setPaymentMethods([]);
    }
  }, [paymentStatus, total]);

  // Calculate total from payment methods
  useEffect(() => {
    const paymentTotal = paymentMethods.reduce((sum, method) => sum + (method.amount || 0), 0);
    setAmountPaid(paymentTotal);
  }, [paymentMethods]);

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

  const handleAmountPaidChange = (amount: number) => {
    setAmountPaid(amount);
    if (paymentMethods.length === 1) {
      setPaymentMethods([{ ...paymentMethods[0], amount }]);
    }
  };

  // Check if payment method requires transaction ID
  const requiresTransactionId = (methodType: string) => {
    return methodType === 'MTN_MOMO' || methodType === 'AIRTEL_MOMO' || methodType === 'PROF_MOMO' || methodType === 'CARD';
  };

  const validatePaymentMethods = () => {
    // Check if any payment method has invalid amount
    if (paymentMethods.some(method => method.amount <= 0)) {
      toast.error('Please enter valid amounts for all payment methods');
      return false;
    }

    // Check if total payment methods amount matches amount paid
    const paymentTotal = paymentMethods.reduce((sum, method) => sum + method.amount, 0);
    if (paymentTotal !== amountPaid) {
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

  const handleCompleteSale = async () => {
    if (paymentStatus === 'PARTIALLY_PAID' && amountPaid <= 0) {
      toast.error('Please enter a valid amount paid');
      return;
    }

    if (paymentStatus !== 'UNPAID' && !validatePaymentMethods()) {
      return;
    }

    // const storeId = (() => {
    //   try {
    //     const storedStore = localStorage.getItem('posStore');
    //     return storedStore ? JSON.parse(storedStore).storeId : null;
    //   } catch (error) {
    //     console.error('Error reading store data from localStorage:', error);
    //     return null;
    //   }
    // })();

    // if (!storeId) {
    //   toast.error('Store information not found. Please select a store.');
    //   return;
    // }
    const storedStore = localStorage.getItem('posStore');
    const storeId = storedStore ? JSON.parse(storedStore).storeId : null;

    const checkoutData = {
      customerId: selectedCustomer ? Number(selectedCustomer) : undefined,
      status: paymentStatus,
      paymentMethods: paymentStatus === 'UNPAID' ? [] : paymentMethods.filter(method => method.amount > 0).map(method => ({
        type: method.type,
        amount: method.amount
      })),
      notes,
      total,
      balance,
      items: cart.map(item => ({
        id: Number(item.id || 0),
        categoryId: Number(item.category?.id || 0),
        name: item.name || '',
        price: (item.price || 0).toString(),
        barcode: (item.barcode || '').toString(),
        category: {
          id: Number(item.category?.id || 0),
          name: item.category?.name || ''
        },
        quantity: item.quantity || 0,
        discount: item.discount || 0,
        total: item.total || 0
      })),
      storeId: Number(storeId),
      servedBy: user?.id ? Number(user.id) : 0
    };

    if (!checkoutData.customerId) {
      toast.error('Please select a customer');
      return;
    }

    try {
      await apiRequest(SALESENDPOINTS.SERVICEPOS.complete_sale, 'POST', '', checkoutData);

      // Clear all form fields after successful sale
      setSelectedCustomer('');
      setPaymentStatus('FULLY_PAID');
      setPaymentMethods([]); // Clear payment methods completely
      setNotes('');
      setAmountPaid(0);
      handlePrint();

      onCompleteSale();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'An error occurred while processing the sale.');
    }
  };

  if (!visible) return null;

  if (!user) {
    console.error('CheckoutModal: user data not available');
    return null;
  }

  // Guard against double taps while the sale is saving.
  const complete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await handleCompleteSale();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        open={visible}
        onClose={onClose}
        locked={busy}
        size="xl"
        title="Checkout"
        description={`${cart.length} ${cart.length === 1 ? 'service' : 'services'} · ${ugx(total)}`}
        footer={
          <>
            <Button variant="ghost" icon={<FiPrinter aria-hidden="true" />} onClick={() => handlePrint()} disabled={busy} className="sm:mr-auto">
              Print receipt
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={complete} loading={busy} icon={<FiCheck aria-hidden="true" />}>
              Complete sale
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <CustomerPicker clients={clients ?? []} value={selectedCustomer} onChange={setSelectedCustomer} onNew={() => setModalProps({ isOpen: true, mode: 'create', client: null })} />

            <PaymentStatusPicker
              value={paymentStatus}
              onChange={(v) => {
                setPaymentStatus(v);
                // Part payment: start from nothing so the cashier types what was actually paid.
                if (v === 'PARTIALLY_PAID') {
                  // Coming from "On credit" there is no payment method yet.
                  setPaymentMethods(prev => (prev.length ? prev.map((m, i) => (i === 0 ? { ...m, amount: 0 } : m)) : [{ type: 'CASH', amount: 0 }]));
                  setAmountPaid(0);
                }
              }}
            />

            {paymentStatus === 'PARTIALLY_PAID' && (
              <div>
                <p className="m-0 mb-1.5 text-[13px] font-medium text-ink-soft">Amount paid now</p>
                <AmountInput size="lg" label="Amount paid now" value={amountPaid} max={total} onChange={handleAmountPaidChange} />
                <p className="m-0 mt-1.5 text-xs text-brand-muted">Total due {ugx(total)}. The rest is recorded as owed.</p>
              </div>
            )}

            {paymentStatus !== 'UNPAID' && amountPaid > 0 && (
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
                      <AmountInput label={`Amount for method ${index + 1}`} className="w-40" value={method.amount} max={amountPaid} onChange={(v) => handlePaymentMethodChange(index, 'amount', v)} />
                      {requiresTransactionId(method.type) && (
                        <input
                          aria-label={`Transaction ID for method ${index + 1}`}
                          value={method.transactionId || ''}
                          onChange={(e) => handlePaymentMethodChange(index, 'transactionId', e.target.value)}
                          placeholder="Transaction ID"
                          className="themed h-10 min-w-[160px] flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-brand-ink outline-none focus:border-brand"
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
                {paymentMethods.length > 1 && (
                  <p className="m-0 mt-1.5 text-xs text-brand-muted">
                    Methods add up to {ugx(paymentMethods.reduce((sum, m) => sum + (m.amount || 0), 0))}
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="service-notes" className="mb-1.5 block text-[13px] font-medium text-ink-soft">
                Notes <span className="font-normal text-brand-muted">(optional)</span>
              </label>
              <textarea
                id="service-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Therapist, room, anything to remember"
                className="themed w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-brand-ink outline-none placeholder:text-brand-muted/70 focus:border-brand focus:shadow-[0_0_0_3px_rgb(57_89_165/0.18)]"
              />
            </div>
          </div>

          <OrderSummary cart={cart}>
            <SummaryRow label="Total" value={ugx(total)} />
            {paymentStatus !== 'UNPAID' && <SummaryRow label="Paying now" value={ugx(amountPaid)} />}
            <SummaryRow strong label="Balance owed" value={ugx(balance)} tone={balance > 0 ? 'warn' : 'good'} />
          </OrderSummary>
        </div>

        {/* Hidden receipt for printing */}
        <div style={{ display: 'none' }}>
          <div ref={receiptRef}>
            <PrintableContent
              client_names={selectedCustomerName}
              cart={cart.map(item => ({
                ...item,
                price: item.price.toString(),
                quantity: item.quantity.toString(),
                discount: item.discount.toString()
              }))}
              total={total}
              status={paymentStatus}
              amountPaid={amountPaid}
              balance={balance}
              branch={user.branch?.name || 'Unknown Branch'}
              department={user.department?.name || 'Unknown Department'}
              user={user.lastName}
              paymentMethod={getPaymentMethodForReceipt()}
              transactionId={getTransactionIdForReceipt()}
            />
          </div>
        </div>
      </Modal>

      <AddOrModifyClient
        visible={modalProps.isOpen}
        client={modalProps.client}
        onCancel={() => setModalProps({ isOpen: false, mode: 'create', client: null })}
        onSaved={setPendingPhone}
      />
    </>
  );
};

export default CheckoutModal;
