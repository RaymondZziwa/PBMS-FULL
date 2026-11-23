import React, { useState, useEffect, useRef } from 'react';
import { FiAlertCircle, FiCheck, FiPrinter, FiTrash2, FiUser } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import useClients from '../../../hooks/sales/useClients';
import type { ICartItem, IClient, IPaymentMethod } from '../../../redux/types/sales';
import { PrintableContent } from './receipt';
import Modal from '../../../ui/Modal';
import Button from '../../../ui/Button';
import Combobox from '../../../ui/Combobox';
import { TextField } from '../../../ui/Field';
import { ugx } from '../../../ui/Page';
import { AmountInput } from '../shared/NumberInputs';
import { CustomerPicker, OrderSummary, PaymentStatusPicker, SummaryRow } from '../shared/CheckoutParts';
import AddOrModifyClient from '../customers/AddorModify';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/store';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import { SALESENDPOINTS } from '../../../endpoints/sales/salesEndpoints';
import PaymentWaitingModal from './paymentWaitingModal';

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
  { value: 'PROF_MOMO', label: 'Prof Momo' },
  {value: 'PATIENT_ACCOUNT', label: 'Patient Account'}
];

const chargePercentage = 0.05;
    
const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible,
  cart,
  total,
  onClose,
  onCompleteSale,
}) => {
  const { data: clients, refresh } = useClients();
  const user = useSelector((state: RootState) => state.userAuth.data);

  const [client, setClient] = useState<IClient>()
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'FULLY_PAID' | 'UNPAID' | 'PARTIALLY_PAID'>('FULLY_PAID');
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([
    { type: 'CASH' as const, amount: total }
  ]);
  const [notes, setNotes] = useState('');
  const [amountPaid, setAmountPaid] = useState(total);
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Loading state for the complete sale button
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Payment waiting modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingReference, setPendingReference] = useState<string | null>(null);

  // "New" customer from the till: open the form, then pick them once saved.
  const [newCustomer, setNewCustomer] = useState(false);
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

  // Format phone number to always start with +256
  const formatPhoneNumber = (number: string) => {
    if (!number) return '';
    const cleanNumber = number.replace(/\D/g, '');
    
    if (cleanNumber.startsWith('0') && cleanNumber.length === 10) {
      return '+256' + cleanNumber.substring(1);
    }
    
    if (cleanNumber.startsWith('256') && cleanNumber.length === 12) {
      return '+' + cleanNumber;
    }
    
    if (number.startsWith('+256')) {
      return number;
    }
    
    if (cleanNumber.length === 9) {
      return '+256' + cleanNumber;
    }
    
    return number;
  };

  // Check if there are mobile money payments
  const hasMobileMoneyPayments = () => {
    return  paymentMethods.some(method => 
      (method.type === 'AIRTEL_MOMO' || method.type === 'MTN_MOMO') && method.amount > 0
    );
  };


  useEffect(() => {
    const client = clients.find(c => c.id === selectedCustomer);
    setClient(client)
  }, [clients, selectedCustomer])
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
        method.type === 'MTN_MOMO' || method.type === 'AIRTEL_MOMO'
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
    setPaymentMethods(prev => [...prev, { type: 'CASH' as const, amount: 0 }]);
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
    return methodType === 'MTN_MOMO' || methodType === 'AIRTEL_MOMO';
  };

  const validatePaymentMethods = () => {
    if (paymentMethods.some(method => method.amount <= 0)) {
      toast.error('Please enter valid amounts for all payment methods');
      return false;
    }

    const paymentTotal = paymentMethods.reduce((sum, method) => sum + method.amount, 0);
    if (paymentTotal !== amountPaid) {
      toast.error('Payment methods total must match amount paid');
      return false;
    }

    if (hasMobileMoneyPayments() && !phoneNumber.trim()) {
      toast.error('Please enter a phone number for mobile money payments');
      return false;
    }

    if (hasMobileMoneyPayments() && phoneNumber.trim()) {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      if (!formattedNumber.startsWith('+256') || formattedNumber.length !== 13) {
        toast.error('Please enter a valid phone number (e.g., 07xx... or +256xxx...)');
        return false;
      }
    }

    return true;
  };

  // Handle payment completion after successful webhook
  const handlePaymentComplete = () => {
    setShowPaymentModal(false);
    setPendingReference(null);
    
    // Print receipt and complete sale
    handlePrint();
    onCompleteSale();
    
    // Reset form
    setSelectedCustomer('');
    setPaymentStatus('FULLY_PAID');
    setPaymentMethods([]);
    setNotes('');
    setAmountPaid(0);
    setPhoneNumber('');
    setIsSubmitting(false);
  };

  // Handle payment failure
  const handlePaymentFailed = () => {
    setShowPaymentModal(false);
    setPendingReference(null);
    setIsSubmitting(false);
    
    toast.error('Payment failed. Please try again or use another payment method.');
  };

  const handleCompleteSale = async () => {
    // Prevent double submission
    if (isSubmitting) return;
    
    if (paymentStatus === 'PARTIALLY_PAID' && amountPaid <= 0) {
      toast.error('Please enter a valid amount paid');
      return;
    }

    if (paymentStatus !== 'UNPAID' && !validatePaymentMethods()) {
      return;
    }

    setIsSubmitting(true);

    const storedStore = localStorage.getItem('posStore');
    const storeId = storedStore ? JSON.parse(storedStore).storeId : null;

    // Calculate mobile money charges (8% only on mobile money payments)
    const mobileMoneyMethods = paymentMethods.filter(method => 
      (method.type === 'AIRTEL_MOMO' || method.type === 'MTN_MOMO') && method.amount > 0
    );
    const mobileMoneyTotal = mobileMoneyMethods.reduce((sum, method) => sum + method.amount, 0);
    const charges = mobileMoneyTotal * chargePercentage;
    const totalWithCharges = total + charges;

    const checkoutData: any = {
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
        total: item.total || 0,
        unitId: item.unitId || 0
      })),
      storeId: Number(storeId),
      servedBy: user?.id ? Number(user.id) : 0
    };

    if (mobileMoneyTotal > 0) {
      checkoutData.totalWithCharges = totalWithCharges;
    }

    if (hasMobileMoneyPayments() && phoneNumber.trim()) {
      checkoutData.phoneNumber = formatPhoneNumber(phoneNumber);
    }

    if (!checkoutData.customerId) {
      toast.error('Please select a customer');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await apiRequest(SALESENDPOINTS.POS.complete_sale, 'POST', '', checkoutData);


      // Check if this is a mobile money payment that needs confirmation
      // Look for reference in different possible locations in the response
      const reference = res?.data?.transaction?.reference || 
                       res?.data?.reference || 
                       res?.transaction?.reference ||
                       res?.reference;
      
      if (hasMobileMoneyPayments() && reference) {
        // Store reference in localStorage for polling
        localStorage.setItem('PendingReference', reference);
        setPendingReference(reference);
        
        // Show payment waiting modal
        setShowPaymentModal(true);
        
        // Don't close modal or reset form yet - wait for payment confirmation
        // The payment waiting modal will handle polling and completion
        
      } else if (hasMobileMoneyPayments() && !reference) {
        // Mobile money payment but no reference returned - show error
        toast.error('Failed to initiate mobile money payment. Please try again.');
        setIsSubmitting(false);
      } else {
        // For cash payments, complete immediately
        handlePrint();
        onCompleteSale();
        
        // Reset form
        setSelectedCustomer('');
        setPaymentStatus('FULLY_PAID');
        setPaymentMethods([]);
        setNotes('');
        setAmountPaid(0);
        setPhoneNumber('');
        setIsSubmitting(false);
      }
      
    } catch (error: any) {
      console.error('Complete sale error:', error);
      toast.error(error?.response?.data?.message || 'An error occurred while processing the sale.');
      setIsSubmitting(false);
    } finally {
      refresh()
    }
  };

  if (!visible) return null;

  if (!user) {
    console.error('CheckoutModal: user data not available');
    return null;
  }

  const momo = hasMobileMoneyPayments();
  const charges = momo ? Number(amountPaid) * chargePercentage : 0;
  const account = client?.PatientAccount?.[0];

  return (
    <>
      {/* Mobile money: waits for the customer to approve on their phone */}
      <PaymentWaitingModal
        visible={showPaymentModal}
        reference={pendingReference}
        onClose={() => {
          setShowPaymentModal(false);
          setPendingReference(null);
          setIsSubmitting(false);
        }}
        onPaymentComplete={handlePaymentComplete}
        onPaymentFailed={handlePaymentFailed}
      />

      <Modal
        open={visible}
        onClose={onClose}
        locked={isSubmitting}
        size="xl"
        title="Checkout"
        description={`${cart.length} ${cart.length === 1 ? 'line' : 'lines'} · ${ugx(total)}`}
        footer={
          <>
            <Button variant="ghost" icon={<FiPrinter aria-hidden="true" />} onClick={() => handlePrint()} disabled={isSubmitting} className="sm:mr-auto">
              Print receipt
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCompleteSale} loading={isSubmitting} icon={<FiCheck aria-hidden="true" />}>
              {isSubmitting ? 'Processing…' : 'Complete sale'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <CustomerPicker clients={clients ?? []} value={selectedCustomer} onChange={setSelectedCustomer} onNew={() => setNewCustomer(true)} />

            {client && (
              account ? (
                <div className="flex items-center gap-3 rounded-lg border border-[#C8EBD4] bg-[#E7F6EC] px-4 py-3 dark:border-[#24482F] dark:bg-[#15301F]">
                  <FiUser aria-hidden="true" className="h-5 w-5 flex-none text-[#1E7B43] dark:text-[#8FD6A8]" />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-medium text-brand-ink">Patient account</p>
                    <p className="m-0 text-xs text-brand-muted">Can pay with “Patient Account”.</p>
                  </div>
                  <div className="text-right">
                    <p className="m-0 text-[11px] uppercase tracking-wide text-brand-muted">Balance</p>
                    <p className="m-0 font-display font-semibold tabular-nums text-brand-ink">{ugx(parseFloat(String(account.balance ?? 0)))}</p>
                  </div>
                </div>
              ) : (
                <p className="m-0 flex items-center gap-2 text-sm text-brand-muted">
                  <FiAlertCircle aria-hidden="true" className="h-4 w-4 flex-none" />
                  {client.firstName} has no patient account.
                </p>
              )
            )}

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
                <p className="m-0 mb-1.5 text-[13px] font-medium text-ink-soft">Paid with</p>
                <ul className="m-0 list-none space-y-2 p-0">
                  {paymentMethods.map((method, index) => (
                    <li key={index} className="flex flex-wrap items-end gap-2">
                      <Combobox
                        label={`Payment method ${index + 1}`}
                        hideLabel
                        className="min-w-[180px] flex-1"
                        value={method.type}
                        onChange={(v) => handlePaymentMethodChange(index, 'type', v || 'CASH')}
                        options={PAYMENT_METHOD_OPTIONS}
                        searchPlaceholder="Search methods"
                      />
                      {paymentMethods.length > 1 && (
                        <AmountInput label={`Amount for method ${index + 1}`} className="w-40" value={method.amount} max={amountPaid} onChange={(v) => handlePaymentMethodChange(index, 'amount', v)} />
                      )}
                      {paymentMethods.length > 1 && (
                        <button type="button" onClick={() => removePaymentMethod(index)} aria-label="Remove this payment method" className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-muted hover:bg-[#FDECEA] hover:text-[#B42318] dark:hover:bg-[#381B19]">
                          <FiTrash2 aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {momo && (
              <TextField
                label="Customer's mobile money number"
                required
                type="tel"
                inputMode="tel"
                value={phoneNumber}
                onChange={setPhoneNumber}
                placeholder="07XX XXX XXX"
                hint={`They'll get a prompt on their phone. A ${Math.round(chargePercentage * 100)}% mobile money charge is added.`}
              />
            )}

            <div>
              <label htmlFor="sale-notes" className="mb-1.5 block text-[13px] font-medium text-ink-soft">
                Notes <span className="font-normal text-brand-muted">(optional)</span>
              </label>
              <textarea
                id="sale-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything to remember about this sale"
                className="themed w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-brand-ink outline-none placeholder:text-brand-muted/70 focus:border-brand focus:shadow-[0_0_0_3px_rgb(57_89_165/0.18)]"
              />
            </div>
          </div>

          <OrderSummary cart={cart}>
            <SummaryRow label="Total" value={ugx(total)} />
            {paymentStatus !== 'UNPAID' && <SummaryRow label="Paying now" value={ugx(amountPaid)} />}
            {momo && <SummaryRow label="Mobile money charge" value={`+ ${ugx(charges)}`} />}
            {momo && <SummaryRow label="Customer pays" value={ugx(Number(amountPaid) + charges)} />}
            <SummaryRow strong label="Balance owed" value={ugx(balance)} tone={balance > 0 ? 'warn' : 'good'} />
            {paymentStatus !== 'UNPAID' && paymentMethods.length > 0 && (
              <p className="m-0 pt-1 text-xs text-brand-muted">
                {paymentMethods.map(m => `${PAYMENT_METHOD_OPTIONS.find(o => o.value === m.type)?.label ?? m.type} ${ugx(m.amount)}`).join(' + ')}
              </p>
            )}
          </OrderSummary>
        </div>

        {/* Hidden receipt for printing */}
        <div style={{ display: 'none' }}>
          <div ref={receiptRef}>
            <PrintableContent
              client_names={selectedCustomerName}
              cart={cart}
              total={total}
              status={paymentStatus}
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

      <AddOrModifyClient visible={newCustomer} client={null} onCancel={() => setNewCustomer(false)} onSaved={setPendingPhone} />
    </>
  );
};

export default CheckoutModal;
