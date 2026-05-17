import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { IChannel } from '../../../redux/types/finance';
import CustomButton from '../../../custom/buttons/customButton';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { ChannelEndpoints } from '../../../endpoints/finance/FinanceEndpoints';
import useChannels from '../../../hooks/finance/useChannels';
import { apiRequest } from '../../../libs/apiConfig';
import useSupportedBanks from '../../../hooks/finance/useSupportedBanks';

// Interface for supported banks from API
export interface ISupportedBanks {
    code: string;
    name: string;
    aliases: string[];
}

interface AddOrModifyChannelProps {
  visible: boolean;
  channel: IChannel | null;
  onCancel: () => void;
  onSuccess: () => void;
}

// Helper function to format phone number
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  let cleaned = value.replace(/\D/g, '');
  
  // If empty, return empty string
  if (!cleaned) return '';
  
  // Handle Ugandan numbers
  // If starts with 0 (like 070, 074, 078, 077, 075)
  if (cleaned.startsWith('0')) {
    // Remove the leading zero and add +256
    cleaned = cleaned.substring(1);
    return `+256${cleaned}`;
  }
  
  // If starts with 256 (without +)
  if (cleaned.startsWith('256') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  // If already has +256 at start (user typed it)
  if (value.startsWith('+256')) {
    // Ensure only digits after +256
    const afterCode = value.substring(4).replace(/\D/g, '');
    if (afterCode) {
      return `+256${afterCode}`;
    }
    return '+256';
  }
  
  // Return the original cleaned with + if it starts with 256
  if (cleaned.startsWith('256')) {
    return `+${cleaned}`;
  }
  
  // Default: just return the cleaned number with + if it's a valid format
  return cleaned ? `+${cleaned}` : '';
};

// Validate phone number
const validatePhoneNumber = (phoneNumber: string): boolean => {
  // Check if it matches Ugandan format +256XXXXXXXXX (9 digits after +256)
  const ugandaRegex = /^\+256[0-9]{9}$/;
  return ugandaRegex.test(phoneNumber);
};

const AddOrModifyChannel: React.FC<AddOrModifyChannelProps> = ({
  visible,
  channel,
  onCancel,
  onSuccess,
}) => {
    const { refresh } = useChannels();
    const { data: supportedBanks } = useSupportedBanks();
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  
  const [formData, setFormData] = useState({
    type: '' as 'BANK_TRANSFER' | 'MOBILE_MONEY' | '',
    name: '',
    phoneNumber: '',
    bank: '',
    accountNumber: '',
  });

  // Populate form when editing
  useEffect(() => {
    if (channel) {
      setFormData({
        type: channel.type || '',
        name: channel.name || '',
        phoneNumber: channel.phoneNumber || '',
        bank: channel.bank || '',
        accountNumber: channel.accountNumber || '',
      });
    } else {
      setFormData({
        type: '',
        name: '',
        phoneNumber: '',
        bank: '',
        accountNumber: '',
      });
    }
  }, [channel]);

  const handlePhoneNumberChange = (value: string) => {
    // Format the phone number as user types
    let formatted = formatPhoneNumber(value);
    
    // Prevent incomplete formatting if user is deleting
    if (value === '') {
      formatted = '';
    }
    
    setFormData((p) => ({ ...p, phoneNumber: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on channel type
    const { type, name } = formData;
    if (!type || !name) {
      toast.error('Please fill in all required fields');
      return;
    }

    let payload: any = { type, name };

    if (type === 'MOBILE_MONEY') {
      let { phoneNumber } = formData;
      if (!phoneNumber) {
        toast.error('Phone number is required for Mobile Money');
        return;
      }
      
      // Validate phone number format
      if (!validatePhoneNumber(phoneNumber)) {
        toast.error('Invalid phone number format. Must be +256 followed by 9 digits (e.g., +256707090690)');
        return;
      }
      
      payload.phoneNumber = phoneNumber;
    } else if (type === 'BANK_TRANSFER') {
      const { bank, accountNumber } = formData;
      if (!bank || !accountNumber) {
        toast.error('Bank and account number are required for Bank Transfer');
        return;
      }
      payload.bank = bank;
      payload.accountNumber = accountNumber;
    }

    try {
      const endpoint = channel
        ? ChannelEndpoints.updateChannel(channel.id)
        : ChannelEndpoints.createChannel;
      const method = channel ? 'PATCH' : 'POST';
      await apiRequest(endpoint, method, '', payload);
      
      refresh();
      //toast.success(channel ? 'Channel updated successfully' : 'Channel created successfully');
      onSuccess();
      onCancel();
    } catch (error: any) {
        console.log(error)
      toast.error(error?.response?.data?.message || 'Failed to save channel');
    }
  };

  const handleTypeChange = (type: string) => {
    // Reset channel-specific fields when type changes
    setFormData({
      type: type as 'BANK_TRANSFER' | 'MOBILE_MONEY' | '',
      name: '',
      phoneNumber: '',
      bank: '',
      accountNumber: '',
    });
  };

  if (!visible) return null;

  // Channel type options
  const typeOptions = [
    { label: 'Mobile Money', value: 'MOBILE_MONEY' },
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
  ];

  // Bank options from API
  const bankOptions = supportedBanks.map((bank) => ({
    label: `${bank.name} (${bank.code})`,
    value: bank.name, // Using bank name as value
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {channel ? 'Edit Withdrawal Channel' : 'Add New Withdrawal Channel'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel Type *
            </label>
            <CustomDropdown
              options={typeOptions}
              value={formData.type ? [formData.type] : []}
              onChange={(values: string[]) => handleTypeChange(values[0] || '')}
              placeholder="Select channel type"
              singleSelect={true}
            />
          </div>

          {/* Channel Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel Name *
            </label>
            <CustomTextInput
              type="text"
              value={formData.name}
              onChange={(val) => setFormData((p) => ({ ...p, name: val }))}
              placeholder={
                formData.type === 'MOBILE_MONEY' 
                  ? 'e.g., Airtel Mobile Money, MTN MoMo'
                  : formData.type === 'BANK_TRANSFER'
                  ? 'e.g., My Business Account'
                  : 'Enter channel name'
              }
            />
          </div>

          {/* Mobile Money specific fields */}
          {formData.type === 'MOBILE_MONEY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <CustomTextInput
                type="tel"
                value={formData.phoneNumber}
                onChange={handlePhoneNumberChange}
                placeholder="e.g., 0707090690 or +256707090690"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter phone number - automatically formats to +256XXXXXXXXX format
              </p>
              {formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber) && (
                <p className="text-xs text-red-500 mt-1">
                  Must be +256 followed by 9 digits (e.g., +256707090690)
                </p>
              )}
            </div>
          )}

          {/* Bank Transfer specific fields */}
          {formData.type === 'BANK_TRANSFER' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank *
                </label>
                <CustomDropdown
                  options={bankOptions}
                  value={formData.bank ? [formData.bank] : []}
                  onChange={(values: string[]) =>
                    setFormData((p) => ({ ...p, bank: values[0] || '' }))
                  }
                  placeholder={isLoadingBanks ? "Loading banks..." : "Select bank"}
                  singleSelect={true}
                  disabled={isLoadingBanks}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <CustomTextInput
                  type="text"
                  value={formData.accountNumber}
                  onChange={(val) => setFormData((p) => ({ ...p, accountNumber: val }))}
                  placeholder="Enter account number"
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <CustomButton type="negative" fn={onCancel} label="Cancel" />
            <CustomButton
              type="positive"
              label={channel ? 'Update Channel' : 'Create Channel'}
              fn={handleSubmit}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrModifyChannel;