import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import CustomDateInput from '../../../custom/inputs/customDateSelector';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { baseURL } from '../../../libs/apiConfig';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux/store';
import { toast } from 'sonner';
import axios from 'axios';
import useSupplier from '../../../hooks/inventory/useSupplier';
import CustomButton from '../../../custom/buttons/customButton';

export enum PaymentType {
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  MOBILE_MONEY = 'MOBILE_MONEY',
  BARTER_PAYMENT = 'BARTER_PAYMENT',
}

interface ProcessPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplyId: string;
}

const ProcessPaymentModal: React.FC<ProcessPaymentModalProps> = ({
  isOpen,
  onClose,
  supplyId,
}) => {
  const [paymentType, setPaymentType] = useState<string>(PaymentType.CASH);
  const [barterItemName, setBarterItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeBankingDate, setChequeBankingDate] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = useSelector((state: RootState) => state.userAuth.data.id);
  const { refresh } = useSupplier();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setProofImage(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!amount) {
      toast.error('Please enter a payment amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('supplyId', supplyId);
      formData.append('paymentType', paymentType);
      formData.append('amount', amount);
      formData.append('paidBy', user);

      if (proofImage) formData.append('proofImage', proofImage);
      if (paymentType === PaymentType.BARTER_PAYMENT)
        formData.append('barterItemName', barterItemName);
      if (paymentType === PaymentType.CHEQUE) {
        formData.append('chequeNumber', chequeNumber);
        formData.append('chequeBankingDate', new Date(chequeBankingDate).toISOString());
        formData.append('bankName', bankName);
      }

      await axios.post(
        `${baseURL}${InventoryEndpoints.SUPPLY.SUPPLY_PAYMENTS.PAY}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      toast.success('Payment processed successfully!');
      refresh();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentOptions = Object.values(PaymentType).map((type) => ({
    label: type.replace('_', ' '),
    value: type,
  }));

  return (
    <div className="fixed inset-0 -top-6 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Process Supplier Payment</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            <FaTimes />
          </button>
        </div>

        <div className="space-y-4">
          {/* Payment Type */}
          <CustomDropdown
            options={paymentOptions}
            value={[paymentType]}
            onChange={(val) => setPaymentType(val[0])}
            singleSelect
            placeholder="Select Payment Type"
          />

          {/* Barter Item */}
          {paymentType === PaymentType.BARTER_PAYMENT && (
            <CustomTextInput
              label="Barter Item Name"
              value={barterItemName}
              onChange={setBarterItemName}
              isRequired
            />
          )}

          {/* Cheque Details */}
          {paymentType === PaymentType.CHEQUE && (
            <>
              <CustomTextInput
                label="Bank Name"
                value={bankName}
                onChange={setBankName}
                isRequired
              />
              <CustomTextInput
                label="Cheque Number"
                value={chequeNumber}
                onChange={setChequeNumber}
                isRequired
              />
              <CustomDateInput
                label="Cheque Banking Date"
                value={chequeBankingDate}
                onChange={setChequeBankingDate}
                isRequired
              />
            </>
          )}

          {/* Amount */}
          <CustomTextInput
            label="Amount"
            type="number"
            value={amount}
            onChange={setAmount}
            isRequired
          />

          {/* Proof Image */}
          <div>
            <label className="block text-sm font-medium mb-1">Proof Image</label>
            <input type="file" onChange={handleFileChange} />
            {proofImage && (
              <p className="mt-1 text-sm text-gray-500">{proofImage.name}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <CustomButton
              type="negative"
              fn={onClose}
              label="Cancel"
              disabled={isSubmitting}
            />
            <CustomButton
              label={isSubmitting ? 'Submitting...' : 'Submit'}
              fn={handleSubmit}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessPaymentModal;
