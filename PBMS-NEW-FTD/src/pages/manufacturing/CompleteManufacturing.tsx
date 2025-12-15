import React, { useState } from 'react';
import { X } from 'lucide-react';
import CustomTextInput from '../../custom/inputs/customTextInput';
import CustomButton from '../../custom/buttons/customButton';
import { toast } from 'sonner';
import { apiRequest } from '../../libs/apiConfig';
import { ManufacturingEndpoints } from '../../endpoints/manufacturing/manufacturingEndpoints';

interface IManufacturingRecord {
  id: string;
  storeId: string;
  storeName: string;
  primaryUnitId?: string;
  primaryUnit?: {
    id: string;
    name: string;
    abr?: string;
  };
  totalQuantity: number;
  unitId: string;
  unitName: string;
  estimatedOutput: number;
  actualOutput?: number;
  status?: 'PENDING' | 'NORMAL' | 'WASTAGE_DETECTED' | 'GOOD_UTILIZATION';
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
  }>;
  createdAt: string;
}

interface CompleteManufacturingModalProps {
  visible: boolean;
  record: IManufacturingRecord | null;
  onCancel: () => void;
  onSuccess?: () => void;
}

const CompleteManufacturingModal: React.FC<CompleteManufacturingModalProps> = ({
  visible,
  record,
  onCancel,
  onSuccess,
}) => {
  const [actualOutput, setActualOutput] = useState<string>('');

  if (!visible || !record) return null;

  const handleSubmit = async () => {
    if (!actualOutput || parseFloat(actualOutput) <= 0) {
      toast.error('Please enter a valid actual output');
      return;
    }

    try {
      const response = await apiRequest<{ status: number; message: string; data: unknown }>(
        ManufacturingEndpoints.complete(record.id),
        'PATCH',
        '',
        {
          actualOutput: parseFloat(actualOutput),
        },
      );

      if (response.status === 200) {
        toast.success(response.message || 'Manufacturing record completed successfully!');
        onSuccess?.();
      }
    } catch (error) {
      console.error('Failed to complete manufacturing record:', error);
      // Error toast is already handled by apiRequest
    }
  };

  const difference = record.estimatedOutput - parseFloat(actualOutput || '0');
  const statusMessage =
    parseFloat(actualOutput || '0') > record.estimatedOutput
      ? 'Good Utilization (Actual > Estimated)'
      : difference >= 5
        ? 'Wastage Detected (Difference ≥ 5)'
        : 'Normal (Difference < 5)';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">
              Complete Manufacturing Record
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Record Info */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Store:</span>
                <span className="text-sm text-gray-900">{record.storeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Estimated Output:</span>
                <span className="text-sm text-gray-900">
                  {record.estimatedOutput.toLocaleString()} pcs
                </span>
              </div>
            </div>

            {/* Actual Output Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actual Output (pcs) *
              </label>
              <CustomTextInput
                type="number"
                value={actualOutput}
                onChange={(val) => setActualOutput(val)}
                placeholder="Enter actual output quantity"
                isRequired
                min="0"
                step="1"
              />
            </div>

            {/* Status Preview */}
            {actualOutput && parseFloat(actualOutput) > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Difference:</span>
                  <span className={`text-sm font-bold ${difference >= 5 ? 'text-red-700' : difference < 0 ? 'text-green-700' : 'text-blue-700'}`}>
                    {difference >= 0 ? `-${difference.toLocaleString()}` : `+${Math.abs(difference).toLocaleString()}`} pcs
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Expected Status:</span>
                  <span className={`text-sm font-medium ${
                    parseFloat(actualOutput) > record.estimatedOutput
                      ? 'text-green-700'
                      : difference >= 5
                        ? 'text-red-700'
                        : 'text-blue-700'
                  }`}>
                    {statusMessage}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <CustomButton
                label="Cancel"
                fn={onCancel}
                type="negative"
              />
              <CustomButton
                label="Complete Record"
                type="positive"
                fn={handleSubmit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteManufacturingModal;

