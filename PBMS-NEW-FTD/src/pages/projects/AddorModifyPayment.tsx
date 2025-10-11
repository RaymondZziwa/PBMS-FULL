// AddOrModifyPayment.tsx
import React, { useState, useEffect } from 'react';
import type { IProjectSale, IProjectPayment } from '../../redux/types/sales';
import CustomButton from '../../custom/buttons/customButton';
import CustomDropdown from '../../custom/inputs/customDropdown';
import CustomTextInput from '../../custom/inputs/customTextInput';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import { toast } from 'sonner';
import { apiRequest } from '../../libs/apiConfig';
import { PROJECTENDPOINTS } from '../../endpoints/projects/projectEndpoints';

interface AddOrModifyPaymentProps {
  visible: boolean;
  onCancel: () => void;
  sale: IProjectSale;
  payment?: IProjectPayment | null;
  onSubmit: (paymentData: any) => Promise<void>;
}

interface PaymentFormData {
  amount: string;
  paymentMethod: string;
  referenceId: string;
  notes: string;
  exhibitionId: string;
  cashierId: string;
}

const AddOrModifyPayment: React.FC<AddOrModifyPaymentProps> = ({
  visible,
  onCancel,
  sale,
  payment,
  onSubmit
}) => {
  const user = useSelector((state: RootState) => state.userAuth.data);
  const [loading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: '',
    paymentMethod: 'cash',
    referenceId: '',
    notes: '',
    exhibitionId: '',
    cashierId: sale.cashierId || ''
  });

  useEffect(() => {
    if (payment) {
      setFormData({
        amount: payment.amount.toString(),
        paymentMethod: payment.paymentMethod,
        referenceId: payment.referenceId || '',
        notes: payment.notes || '',
        exhibitionId: payment.exhibitionId,
        cashierId: payment.cashierId
      });
    } else {
      setFormData({
        amount: '',
        paymentMethod: 'cash',
        referenceId: '',
        notes: '',
        exhibitionId: sale.exhibitionId || '',
        cashierId: sale.cashierId || ''
      });
    }
  }, [payment, sale]);

  if (!visible) return null;

  const isEditing = !!payment;
  const totalPaid = sale.ProjectPayments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;
  const currentPaymentAmount = isEditing ? parseFloat(payment.amount.toString()) : 0;
  const remainingBalance = parseFloat(sale.saleTotal.toString()) - totalPaid + currentPaymentAmount;
  
  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(formData.amount) > remainingBalance) {
      alert('Payment amount cannot exceed remaining balance');
      return;
    }

    setIsLoading(true);
    try {
      const paymentData = {
        saleId: sale.id,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        referenceId: formData.referenceId || undefined,
        notes: formData.notes || undefined,
        exhibitionId: formData.exhibitionId,
        cashierId: user.id
      };

      const endpoint = isEditing && payment ? PROJECTENDPOINTS.PROJECT_PAYMENTS.modify(payment.id) : PROJECTENDPOINTS.PROJECT_PAYMENTS.create;
      const method = isEditing ? 'PUT' : 'POST';
      await apiRequest(endpoint, method, '', paymentData);
      onCancel();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'An error occurred while submitting the payment.');
      console.error('Error submitting payment:', error);
    } finally {
      setIsLoading(false);
    }
  };


const paymentMethodOptions = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MTN_MOMO', label: 'MTN Momo' },
  { value: 'AIRTEL_MOMO', label: 'Airtel Momo' },
  { value: 'CARD', label: 'Card' },
  { value: 'PROF_MOMO', label: 'Prof Momo' },
];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {isEditing ? 'Edit Payment' : 'Add New Payment'}
          </h2>
          
          {/* Sale Information */}
          <div className="mb-6 p-3 bg-gray-50 rounded border">
            <h3 className="font-semibold text-gray-700 mb-2">Sale Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Client:</span>
                <p className="font-medium">{sale.client?.firstName} {sale.client?.lastName}</p>
              </div>
              <div>
                <span className="text-gray-600">Project:</span>
                <p className="font-medium">{sale.project?.name}</p>
              </div>
              <div>
                <span className="text-gray-600">Sale Total:</span>
                <p className="font-medium">{parseFloat(sale.saleTotal.toString()).toLocaleString()} UGX</p>
              </div>
              <div>
                <span className="text-gray-600">Remaining Balance:</span>
                <p className="font-medium text-green-600">{remainingBalance.toLocaleString()} UGX</p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-4">
            <CustomTextInput
              label="Amount *"
              type="number"
              value={formData.amount}
              onChange={(value) => handleInputChange('amount', value)}
              placeholder="Enter payment amount"
              max={remainingBalance.toString()}
              required
            />

            <CustomDropdown
              options={paymentMethodOptions}
              value={[formData.paymentMethod]}
              onChange={(selectedValues) => handleInputChange('paymentMethod', selectedValues[0] || 'cash')}
              placeholder="Select payment method"
              searchPlaceholder="Search payment methods..."
              singleSelect={true}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes about this payment such as Transaction reference, receipt number, etc..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <CustomButton 
              type='negative' 
              label="Cancel"
              fn={onCancel}
              disabled={loading}
            />
            <CustomButton
              label={isEditing ? 'Update Payment' : 'Create Payment'}
              fn={handleSubmit}
              disabled={loading || !formData.amount || parseFloat(formData.amount) <= 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddOrModifyPayment;