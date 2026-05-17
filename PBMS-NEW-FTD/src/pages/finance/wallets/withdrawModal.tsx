// WithdrawModal.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import CustomButton from '../../../custom/buttons/customButton';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { apiRequest } from '../../../libs/apiConfig';
import { TransactionEndpoints } from '../../../endpoints/finance/FinanceEndpoints';
import useChannels from '../../../hooks/finance/useChannels';
import type { IChannel } from '../../../redux/types/finance';

interface IWallet {
  id: number;
  name: string;
  purpose: string;
  balance: string | number;
  isActive: boolean;
  isForSales: boolean;
  isForTickets: boolean;
  canBeDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WithdrawModalProps {
  visible: boolean;
  wallet: IWallet | null;
  onClose: () => void;
  onSuccess: () => void;
}

type WithdrawType = 'MOBILE_MONEY' | 'BANK_TRANSFER' | '';

const WithdrawModal: React.FC<WithdrawModalProps> = ({
  visible,
  wallet,
  onClose,
  onSuccess,
}) => {
  const { data: allChannels } = useChannels();
  const [withdrawType, setWithdrawType] = useState<WithdrawType>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [availableChannels, setAvailableChannels] = useState<IChannel[]>([]);

  // Filter channels based on selected withdraw type
  useEffect(() => {
    if (withdrawType && allChannels) {
      const filtered = allChannels.filter(
        (channel: IChannel) => 
          channel.type === withdrawType && 
          channel.isVerified === true
      );
      setAvailableChannels(filtered);
    } else {
      setAvailableChannels([]);
    }
    // Reset selected channel when type changes
    setSelectedChannel('');
  }, [withdrawType, allChannels]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setWithdrawType('');
      setSelectedChannel('');
      setAmount('');
      setDescription('');
    }
  }, [visible]);

  const getWalletBalance = (): number => {
    if (!wallet) return 0;
    return typeof wallet.balance === 'string' ? parseFloat(wallet.balance) : wallet.balance;
  };

  const handleAmountChange = (value: string) => {
    // Remove any non-numeric characters except decimal point
    let cleaned = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const decimalCount = (cleaned.match(/\./g) || []).length;
    if (decimalCount > 1) {
      return;
    }
    
    const numAmount = parseFloat(cleaned);
    const balance = getWalletBalance();
    
    // If the entered amount exceeds balance, cap it at balance
    if (!isNaN(numAmount) && numAmount > balance) {
      setAmount(balance.toString());
      toast.warning(`Amount cannot exceed available balance of ${new Intl.NumberFormat("en-UG", {
        style: "currency",
        currency: "UGX",
      }).format(balance)}`);
      return;
    }
    
    setAmount(cleaned);
  };

  const validateAmount = (amountValue: string): boolean => {
    const numAmount = parseFloat(amountValue);
    const balance = getWalletBalance();
    const minWithdrawAmount = 5000;

    if (!amountValue || amountValue === '') {
      toast.error('Please enter an amount to withdraw');
      return false;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid positive amount');
      return false;
    }

    if (numAmount < minWithdrawAmount) {
      toast.error(`Minimum withdrawal amount is ${new Intl.NumberFormat("en-UG", {
        style: "currency",
        currency: "UGX",
      }).format(minWithdrawAmount)}`);
      return false;
    }

    if (numAmount > balance) {
      toast.error(`Amount exceeds available balance. Maximum withdrawal is ${new Intl.NumberFormat("en-UG", {
        style: "currency",
        currency: "UGX",
      }).format(balance)}`);
      return false;
    }

    return true;
  };

  const handleWithdraw = async () => {
    if (!wallet) {
      toast.error('Wallet not found');
      return;
    }

    if (!withdrawType) {
      toast.error('Please select withdrawal type');
      return;
    }

    if (!selectedChannel) {
      toast.error('Please select a withdrawal channel');
      return;
    }

    if (!amount) {
      toast.error('Please enter amount to withdraw');
      return;
    }

    if (!description || description.trim() === '') {
      toast.error('Please enter a description for this withdrawal');
      return;
    }

    if (!validateAmount(amount)) {
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        internalWalletId: wallet.id,
        channelId: parseInt(selectedChannel),
        amount: parseFloat(amount),
        type: withdrawType,
        description: description.trim(),
      };

      await apiRequest(TransactionEndpoints.withdrawFromWallet, 'POST', '', payload);
      toast.info('Withdrawal request is being processed. You will be notified once it is completed.');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to process withdrawal');
    } finally {
      setIsLoading(false);
    }
  };

  // Withdrawal type options
  const withdrawTypeOptions = [
    { label: 'Mobile Money', value: 'MOBILE_MONEY' },
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
  ];

  // Channel options based on selected type
  const channelOptions = availableChannels.map((channel) => ({
    label: channel.type === 'MOBILE_MONEY' 
      ? `${channel.name} (${channel.phoneNumber})`
      : `${channel.name} - ${channel.bank} (${channel.accountNumber})`,
    value: channel.id.toString(),
  }));

  const balance = getWalletBalance();
  const minWithdrawAmount = 5000;
  const maxWithdrawAmount = balance;

  if (!visible || !wallet) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Withdraw from {wallet.name}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Available Balance: {new Intl.NumberFormat("en-UG", {
            style: "currency",
            currency: "UGX",
          }).format(balance)}
        </p>

        <div className="space-y-4">
          {/* Withdrawal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Withdrawal Type *
            </label>
            <CustomDropdown
              options={withdrawTypeOptions}
              value={withdrawType ? [withdrawType] : []}
              onChange={(values: string[]) => setWithdrawType(values[0] as WithdrawType)}
              placeholder="Select withdrawal type"
              singleSelect={true}
            />
          </div>

          {/* Channel Selection */}
          {withdrawType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {withdrawType === 'MOBILE_MONEY' ? 'Mobile Money Channel *' : 'Bank Account *'}
              </label>
              <CustomDropdown
                options={channelOptions}
                value={selectedChannel ? [selectedChannel] : []}
                onChange={(values: string[]) => setSelectedChannel(values[0] || '')}
                placeholder={
                  availableChannels.length === 0 
                    ? `No verified ${withdrawType === 'MOBILE_MONEY' ? 'mobile money' : 'bank'} channels available` 
                    : `Select ${withdrawType === 'MOBILE_MONEY' ? 'mobile money channel' : 'bank account'}`
                }
                singleSelect={true}
                disabled={availableChannels.length === 0}
              />
              {availableChannels.length === 0 && withdrawType && (
                <p className="text-xs text-red-500 mt-1">
                  No verified {withdrawType === 'MOBILE_MONEY' ? 'mobile money channels' : 'bank accounts'} found. 
                  Please add and verify a channel first.
                </p>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (UGX) *
            </label>
            <CustomTextInput
              type="number"
              value={amount}
              onChange={handleAmountChange}
              placeholder={`Enter amount (Min: ${new Intl.NumberFormat("en-UG", {
                style: "currency",
                currency: "UGX",
              }).format(minWithdrawAmount)}, Max: ${new Intl.NumberFormat("en-UG", {
                style: "currency",
                currency: "UGX",
              }).format(maxWithdrawAmount)})`}
              min={minWithdrawAmount}
              max={maxWithdrawAmount}
              step="1000"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                Minimum: {new Intl.NumberFormat("en-UG", {
                  style: "currency",
                  currency: "UGX",
                }).format(minWithdrawAmount)}
              </p>
              <p className="text-xs text-gray-500">
                Maximum: {new Intl.NumberFormat("en-UG", {
                  style: "currency",
                  currency: "UGX",
                }).format(maxWithdrawAmount)}
              </p>
            </div>
            {parseFloat(amount) > balance && (
              <p className="text-xs text-red-500 mt-1">
                Amount cannot exceed available balance of {new Intl.NumberFormat("en-UG", {
                  style: "currency",
                  currency: "UGX",
                }).format(balance)}
              </p>
            )}
            {parseFloat(amount) < minWithdrawAmount && amount && (
              <p className="text-xs text-red-500 mt-1">
                Amount below minimum withdrawal limit
              </p>
            )}
          </div>

          {/* Description - New Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <CustomTextInput
              type="text"
              value={description}
              onChange={(val) => setDescription(val)}
              placeholder="Enter reason for withdrawal (e.g., Staff salaries, Operational costs, etc.)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide a clear description for this withdrawal request
            </p>
          </div>

          {/* Quick Amount Buttons */}
          {balance > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Select Amount
              </label>
              <div className="flex gap-2 flex-wrap">
                {[5000, 10000, 20000, 50000, 100000, 200000].map((amt) => (
                  amt <= balance && (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt.toString())}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {new Intl.NumberFormat("en-UG", {
                        style: "currency",
                        currency: "UGX",
                      }).format(amt)}
                    </button>
                  )
                ))}
                {balance > 200000 && (
                  <button
                    type="button"
                    onClick={() => setAmount(balance.toString())}
                    className="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors"
                  >
                    Max ({new Intl.NumberFormat("en-UG", {
                      style: "currency",
                      currency: "UGX",
                    }).format(balance)})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Summary Section */}
          {withdrawType && selectedChannel && amount && parseFloat(amount) > 0 && description && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Withdrawal Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Wallet:</span>
                  <span className="font-medium">{wallet.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-yellow-600">
                    {new Intl.NumberFormat("en-UG", {
                      style: "currency",
                      currency: "UGX",
                    }).format(parseFloat(amount))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Channel:</span>
                  <span className="font-medium">
                    {availableChannels.find(c => c.id.toString() === selectedChannel)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Description:</span>
                  <span className="font-medium">{description}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Remaining Balance:</span>
                  <span className="font-medium text-green-600">
                    {new Intl.NumberFormat("en-UG", {
                      style: "currency",
                      currency: "UGX",
                    }).format(balance - parseFloat(amount))}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <CustomButton type="negative" fn={onClose} label="Cancel" />
            <CustomButton
              type="positive"
              label="Withdraw"
              fn={handleWithdraw}
              isLoading={isLoading}
              disabled={isLoading || !withdrawType || !selectedChannel || !amount || !description}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawModal;