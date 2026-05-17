// MobileMoneyVerification.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import CustomButton from '../../../custom/buttons/customButton';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { apiRequest } from '../../../libs/apiConfig';
import { ChannelEndpoints } from '../../../endpoints/finance/FinanceEndpoints';
import type { IChannel } from '../../../redux/types/finance';

interface MobileMoneyVerificationProps {
  visible: boolean;
  channel: IChannel | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MobileMoneyVerification: React.FC<MobileMoneyVerificationProps> = ({
  visible,
  channel,
  onClose,
  onSuccess,
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // Request verification code when modal opens
  useEffect(() => {
    if (visible && channel && channel.type === 'MOBILE_MONEY') {
      requestVerificationCode();
    }
  }, [visible, channel]);

  const requestVerificationCode = async () => {
    setIsLoading(true);
    try {
      await apiRequest(
        ChannelEndpoints.requestMobileVerificationCode(channel?.id),
        'GET',
        '',
        { phoneNumber: channel?.phoneNumber }
      );
      toast.success('Verification code sent to your mobile number');
      setTimeLeft(60); // 60 seconds cooldown
      setCanResend(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    if (verificationCode.length !== 6) {
      toast.error('Verification code must be 6 digits');
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest(
        ChannelEndpoints.verifyMobileMoney(channel?.id),
        'POST',
        '',
        { code: verificationCode }
      );
      //toast.success('Mobile money channel verified successfully');
      onSuccess();
      onClose();
      setVerificationCode('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) {
      toast.error(`Please wait ${timeLeft} seconds before requesting again`);
      return;
    }
    await requestVerificationCode();
  };

  if (!visible || !channel || channel.type !== 'MOBILE_MONEY') return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Verify Mobile Money Channel
        </h3>
        <p className="text-gray-600 text-sm mb-6">
          A verification code has been sent to {channel.phoneNumber}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code *
            </label>
            <CustomTextInput
              type="text"
              value={verificationCode}
              onChange={(val) => setVerificationCode(val.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the 6-digit code sent to your mobile number
            </p>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={!canResend || isLoading}
              className={`text-sm ${
                canResend && !isLoading
                  ? 'text-blue-600 hover:text-blue-800'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              {canResend ? 'Resend Code' : `Resend code in ${timeLeft}s`}
            </button>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <CustomButton type="negative" fn={onClose} label="Cancel" />
            <CustomButton
              type="positive"
              label="Verify"
              fn={handleVerify}
              isLoading={isLoading}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMoneyVerification;