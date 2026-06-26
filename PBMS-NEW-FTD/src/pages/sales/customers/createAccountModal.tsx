import { FaWallet, FaUser, FaEnvelope, FaPhone } from 'react-icons/fa';
import type { IClient } from '../../../redux/types/sales';

interface CreateAccountModalProps {
  visible: boolean;
  client: IClient | null;
  isCreating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const CreateAccountModal = ({ 
  visible, 
  client, 
  isCreating, 
  onConfirm, 
  onCancel 
}: CreateAccountModalProps) => {
  if (!visible || !client) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-full">
              <FaWallet className="text-gray-600" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Create Client Account</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isCreating}
          >
            ✕
          </button>
        </div>

        {/* Client Information */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500 mb-3">You are about to create an account for:</p>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <FaUser className="text-gray-400" size={14} />
              <span className="text-gray-700">
                <span className="font-medium">{client.firstName} {client.lastName}</span>
              </span>
            </div>
            
            {client.email && (
              <div className="flex items-center gap-3 text-sm">
                <FaEnvelope className="text-gray-400" size={14} />
                <span className="text-gray-600">{client.email}</span>
              </div>
            )}
            
            {client.phone && (
              <div className="flex items-center gap-3 text-sm">
                <FaPhone className="text-gray-400" size={14} />
                <span className="text-gray-600">{client.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">⚠️ Important:</span> Creating an account will:
          </p>
          <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
            <li>Generate a unique account number for this client</li>
            <li>Allow account management (deposits, purchases, etc.)</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isCreating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <FaWallet className="mr-2" />
                Create Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAccountModal;