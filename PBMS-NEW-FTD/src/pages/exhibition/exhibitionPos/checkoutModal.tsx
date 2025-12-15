import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaUserPlus, FaPrint, FaCheck } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';
import useClients from '../../../hooks/sales/useClients';
import type { ICartItem, ICheckoutData, IClient, IPaymentMethod } from '../../../redux/types/sales';
import { PrintableContent } from './receipt';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/store';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import { SALESENDPOINTS } from '../../../endpoints/sales/salesEndpoints';
import AddOrModifyClient from '../../sales/customers/AddorModify';
import { ExhibitionEndpoints } from '../../../endpoints/exhibitions/exhibitionEndpoints';

interface CheckoutModalProps {
  visible: boolean;
  cart: ICartItem[];
  total: number;
  onClose: () => void;
  onCompleteSale: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible,
  cart,
  total,
  onClose,
  onCompleteSale,
}) => {
  const { data: clients, refresh } = useClients();
  const user = useSelector((state: RootState) => state.userAuth.data);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'FULLY_PAID' | 'UNPAID' | 'PARTIALLY_PAID'>('FULLY_PAID');
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([
    { type: 'cash', amount: total }
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
  
    const receiptRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${new Date().getTime()}`,
  });

  const balance = total - amountPaid;

  // Get selected customer name for receipt
  const selectedCustomerName = selectedCustomer 
    ? clients?.find(c => c.id === selectedCustomer) 
      ? `${clients.find(c => c.id === selectedCustomer)?.firstName} ${clients.find(c => c.id === selectedCustomer)?.lastName}`
      : 'Walk-in Customer'
    : 'Walk-in Customer';

  // Format payment method for receipt
  const getPaymentMethodForReceipt = () => {
    if (paymentMethods.length === 0) return 'UNPAID';
    if (paymentMethods.length === 1) {
      const method = paymentMethods[0];
      switch (method.type) {
        case 'cash': return 'Cash';
        case 'mtn_momo': return 'MTN mobile money';
        case 'airtel_momo': return 'Airtel money';
        case 'card': return 'Card';
        case 'prof_momo': return 'Prof Momo';
        default: return method.type;
      }
    }
    return 'Multiple Methods';
  };

  const getTransactionIdForReceipt = () => {
    const momoMethod = paymentMethods.find(method => 
      method.type === 'mtn_momo' || method.type === 'airtel_momo'
    );
    return momoMethod?.transactionId || '';
  };

  useEffect(() => {
    if (paymentStatus === 'FULLY_PAID') {
      setAmountPaid(total);
      if (paymentMethods.length === 0) {
        setPaymentMethods([{ type: 'cash', amount: total }]);
      } else if (paymentMethods.length === 1) {
        setPaymentMethods([{ ...paymentMethods[0], amount: total }]);
      }
    } else if (paymentStatus === 'UNPAID') {
      setAmountPaid(0);
      setPaymentMethods([]);
    }
  }, [paymentStatus, total]);

  const handlePaymentMethodChange = (index: number, field: keyof IPaymentMethod, value: any) => {
    setPaymentMethods(prev => prev.map((method, i) => 
      i === index ? { ...method, [field]: value } : method
    ));
  };

  const addPaymentMethod = () => {
    setPaymentMethods(prev => [...prev, { type: 'cash', amount: 0 }]);
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

  const handleCompleteSale = async () => {
    if (paymentStatus === 'PARTIALLY_PAID' && amountPaid <= 0) {
      alert('Please enter a valid amount paid');
      return;
    }

    if (paymentMethods.some(method => method.amount <= 0)) {
      alert('Please enter valid amounts for all payment methods');
      return;
    }

    // Validate transaction IDs for mobile money and card payments
    for (const method of paymentMethods) {
      if ((method.type.includes('momo') || method.type === 'card') && !method.transactionId) {
        alert(`Please enter transaction ID for ${method.type}`);
        return;
      }
    }

    const checkoutData: ICheckoutData = {
      customerId: selectedCustomer || undefined,
      status: paymentStatus,
      paymentMethods: paymentMethods.filter(method => method.amount > 0),
      notes,
      total,
      balance,
      items: cart,
      storeId: localStorage.getItem('posStore') ? JSON.parse(localStorage.getItem('posStore')!).storeId : '',
      servedBy: user.id
    };


    if (!checkoutData.customerId) {
      toast.error('Please select a customer')
      return;
    }


    try {
      await apiRequest(ExhibitionEndpoints.EXHIBITION_POS.create, 'POST', '', checkoutData);
      handlePrint()
      onCompleteSale();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'An error occurred while processing the sale.');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Checkout</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="overflow-auto max-h-[70vh] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Customer & Payment Info */}
            <div className="space-y-6">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer
                </label>
                <div className="flex gap-2">
                  <CustomDropdown
                    options={[
                      ...(clients?.map(client => ({
                        value: client.id,
                        label: `${client.firstName} ${client.lastName} - ${client.contact}`
                      })) || [])
                    ]}
                    value={[selectedCustomer]}
                    onChange={(selectedValues) => setSelectedCustomer(selectedValues[0] || '')}
                    placeholder="Select customer..."
                    searchPlaceholder="Search customers..."
                    singleSelect={true}
                    maxHeight={200}
                  />
                  <button
                    onClick={() => setModalProps({ isOpen: true, mode: 'create', client: null })}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center"
                  >
                    <FaUserPlus className="mr-2" />
                    New
                  </button>
                </div>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'FULLY_PAID', label: 'FULLY PAID' },
                    { value: 'PARTIALLY_PAID', label: 'PARTIAL' },
                    { value: 'UNPAID', label: 'UNPAID' }

                  ].map(status => (
                    <button
                      key={status.value}
                      onClick={() => setPaymentStatus(status.value as any)}
                      className={`p-3 border rounded-lg text-center ${
                        paymentStatus === status.value
                          ? 'border-gray-500 bg-gray-50 text-gray-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Paid */}
              {paymentStatus !== 'UNPAID' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Paid (UGX)
                  </label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => handleAmountPaidChange(Number(e.target.value))}
                    disabled={paymentStatus === 'FULLY_PAID'}
                    className="w-full p-3 border border-gray-300 rounded-lg text-lg font-semibold"
                    min="0"
                    max={total}
                  />
                </div>
              )}

              {/* Payment Methods */}
              {paymentStatus !== 'UNPAID' && amountPaid > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Payment Methods
                    </label>
                    {paymentMethods.length < 3 && (
                      <button
                        onClick={addPaymentMethod}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        + Add Method
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {paymentMethods.map((method, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <CustomDropdown
                          options={[
                            { value: 'cash', label: 'Cash' },
                            { value: 'mtn_momo', label: 'MTN Momo' },
                            { value: 'airtel_momo', label: 'Airtel Momo' },
                            { value: 'card', label: 'Card' },
                            { value: 'prof_momo', label: 'Prof Momo' }
                          ]}
                          value={[method.type]} // Wrap in array since your component expects string[]
                          onChange={(selectedValues) => handlePaymentMethodChange(index, 'type', selectedValues[0] || 'cash')}
                          placeholder="Select payment method..."
                          searchPlaceholder="Search payment methods..."
                          singleSelect={true}
                          maxHeight={200}
                        />
                        
                        <input
                          type="number"
                          value={method.amount}
                          onChange={(e) => handlePaymentMethodChange(index, 'amount', Number(e.target.value))}
                          className="w-32 p-2 border border-gray-300 rounded-lg"
                          placeholder="Amount"
                          min="0"
                          max={amountPaid}
                        />
                        
                        {(method.type.includes('momo') || method.type === 'card') && (
                          <input
                            type="text"
                            value={method.transactionId || ''}
                            onChange={(e) => handlePaymentMethodChange(index, 'transactionId', e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded-lg"
                            placeholder="Transaction ID"
                            required
                          />
                        )}
                        
                        {paymentMethods.length > 1 && (
                          <button
                            onClick={() => removePaymentMethod(index)}
                            className="p-2 text-red-600 hover:text-red-800"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="Add any notes about this sale..."
                />
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              
              {/* Cart Items */}
              <div className="space-y-3 mb-4">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.quantity}x </span>
                      {item.name}
                      {item.discount > 0 && (
                        <span className="text-red-600 text-xs ml-2">
                          (-{item.discount.toLocaleString()} UGX)
                        </span>
                      )}
                    </div>
                    <span className="font-medium">
                      {item.total.toLocaleString()} UGX
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{total.toLocaleString()} UGX</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="text-green-600">
                    {amountPaid.toLocaleString()} UGX
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Balance:</span>
                  <span className={balance === 0 ? 'text-green-600' : 'text-orange-600'}>
                    {balance.toLocaleString()} UGX
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <button
            onClick={handlePrint}
            className="flex items-center px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <FaPrint className="mr-2" />
            Print Receipt
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteSale}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FaCheck className="mr-2" />
              Complete Sale
            </button>
          </div>
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
              branch={user.branch.name}
              user={user.lastName}
              paymentMethod={getPaymentMethodForReceipt()}
              transactionId={getTransactionIdForReceipt()}
            />
          </div>
        </div>
      </div>
      <AddOrModifyClient
        visible={modalProps.isOpen}
        client={modalProps.client}
        onCancel={() => setModalProps({ isOpen: false, mode: 'create', client: null })}
      />
    </div>
  );
};

export default CheckoutModal;