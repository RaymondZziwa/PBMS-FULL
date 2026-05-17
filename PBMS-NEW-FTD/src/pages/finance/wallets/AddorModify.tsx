// AddOrModifyWallet.tsx
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import CustomButton from '../../../custom/buttons/customButton';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { apiRequest } from '../../../libs/apiConfig';
import useWallets from '../../../hooks/finance/useWallets';
import { WalletEndpoints } from '../../../endpoints/finance/FinanceEndpoints';

interface IWallet {
  id: number;
  name: string;
  purpose: string;
  balance?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AddOrModifyWalletProps {
  visible: boolean;
  wallet: IWallet | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const AddOrModifyWallet: React.FC<AddOrModifyWalletProps> = ({
  visible,
  wallet,
  onCancel,
  onSuccess,
}) => {
  const { refresh } = useWallets();
  const [formData, setFormData] = useState({
    name: '',
    purpose: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (wallet) {
      setFormData({
        name: wallet.name || '',
        purpose: wallet.purpose || '',
      });
    } else {
      setFormData({
        name: '',
        purpose: '',
      });
    }
  }, [wallet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { name, purpose } = formData;
    if (!name || !purpose) {
      toast.error('Please fill in all required fields');
      return;
    }

    const payload = { name, purpose };

    setIsLoading(true);
    try {
      const endpoint = wallet
        ? WalletEndpoints.updateWallet(wallet.id)
        : WalletEndpoints.createWallet;
      const method = wallet ? 'PATCH' : 'POST';
      await apiRequest(endpoint, method, '', payload);
      
      refresh();
      //toast.success(wallet ? 'Wallet updated successfully' : 'Wallet created successfully');
      onSuccess();
        onCancel();
        setFormData({
            name: '',
            purpose: '',
        })
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || 'Failed to save wallet');
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {wallet ? 'Edit Wallet' : 'Add New Wallet'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Wallet Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wallet Name *
            </label>
            <CustomTextInput
              type="text"
              value={formData.name}
              onChange={(val) => setFormData((p) => ({ ...p, name: val }))}
              placeholder="e.g., Sales Wallet, Marketing Wallet"
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purpose *
            </label>
            <CustomTextInput
              type="text"
              value={formData.purpose}
              onChange={(val) => setFormData((p) => ({ ...p, purpose: val }))}
              placeholder="e.g., For collecting sales payments"
            />
            <p className="text-xs text-gray-500 mt-1">
              Specify the purpose of this wallet
            </p>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <CustomButton type="negative" fn={onCancel} label="Cancel" />
            <CustomButton
              type="positive"
              label={wallet ? 'Update Wallet' : 'Create Wallet'}
              fn={handleSubmit}
              isLoading={isLoading}
              disabled={isLoading}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrModifyWallet;