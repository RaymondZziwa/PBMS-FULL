// ChannelTable.tsx (updated)
import React, { useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa6';
import { FaCheckCircle, FaEdit } from 'react-icons/fa';
import { toast } from 'sonner';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import CustomTable from '../../../custom/table/customTable';
import { ChannelEndpoints } from '../../../endpoints/finance/FinanceEndpoints';
import useChannels from '../../../hooks/finance/useChannels';
import { apiRequest } from '../../../libs/apiConfig';
import { formatDate } from '../../../libs/dateFormatter';
import type { IChannel } from '../../../redux/types/finance';
import AddOrModifyChannel from './AddorModify';
import BankTransferVerification from './bankDetailsVerification';
import MobileMoneyVerification from './mobilePhoneVerification';

const ChannelTable: React.FC = () => {
  const { data: channels, refresh } = useChannels();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showMobileVerification, setShowMobileVerification] = useState<boolean>(false);
  const [showBankVerification, setShowBankVerification] = useState<boolean>(false);
  const [selectedChannel, setSelectedChannel] = useState<IChannel | null>(null);
  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'delete' | 'view' | null;
    channel: IChannel | null;
  }>({
    isOpen: false,
    mode: null,
    channel: null
  });

  const deleteChannel = async () => {
    try {
      await apiRequest(ChannelEndpoints.deleteChannel(modalProps.channel?.id), "DELETE", '');
      refresh();
      //toast.success('Channel deleted successfully');
      setModalProps({ isOpen: false, mode: null, channel: null });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete channel');
    }
  };

  const handleVerifyChannel = (channel: IChannel) => {
    setSelectedChannel(channel);
    if (channel.type === 'MOBILE_MONEY') {
      setShowMobileVerification(true);
    } else if (channel.type === 'BANK_TRANSFER') {
      setShowBankVerification(true);
    }
  };

  const handleVerificationSuccess = () => {
    refresh();
    //toast.success('Channel verified successfully');
  };

  const columns = [
    {
      key: "type",
      label: "Type",
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          value === 'MOBILE_MONEY' ? 'bg-green-100 text-green-800' :
          value === 'BANK_TRANSFER' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value === 'MOBILE_MONEY' ? 'Mobile Money' : value === 'BANK_TRANSFER' ? 'Bank Transfer' : value?.replace('_', ' ')}
        </span>
      )
    },
    { key: "name", label: "Channel Name" },
    { 
      key: "phoneNumber", 
      label: "Phone Number", 
      render: (value: string, row: IChannel) => 
        row.type === 'MOBILE_MONEY' ? (value || '-') : '-'
    },
    { 
      key: "bank", 
      label: "Bank", 
      render: (value: string, row: IChannel) => 
        row.type === 'BANK_TRANSFER' ? (value || '-') : '-'
    },
    { 
      key: "accountNumber", 
      label: "Account Number", 
      render: (value: string, row: IChannel) => 
        row.type === 'BANK_TRANSFER' ? (value || '-') : '-'
    },
    {
      key: "isVerified",
      label: "Status",
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-500 text-white'
        }`}>
          {value ? 'Verified' : 'Not Verified'}
        </span>
      )
    },
    {
      key: "createdAt",
      label: "Created Date",
      render: (value: string) => formatDate(value)
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, row: IChannel) => (
        <div className="flex gap-3">
          {/* Verify Button - only show for unverified channels */}
          {!row.isVerified && (
            <div className="relative group">
              <button
                className="text-green-600 hover:text-green-800 transition-colors"
                onClick={() => handleVerifyChannel(row)}
              >
                <FaCheckCircle />
              </button>
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Verify Channel
              </span>
            </div>
          )}
          
          {/* Edit Button - only show for unverified channels */}
          {!row.isVerified && (
            <div className="relative group">
              <button
                className="text-blue-600 hover:text-blue-800 transition-colors"
                onClick={() => {
                  setShowModal(true);
                  setModalProps({
                    isOpen: false,
                    mode: 'edit',
                    channel: row
                  });
                }}
              >
                <FaEdit />
              </button>
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Edit Channel
              </span>
            </div>
          )}

          {/* Delete Button - available for all channels */}
          <div className="relative group">
            <button
              className="text-red-600 hover:text-red-800 transition-colors"
              onClick={() => setModalProps({
                isOpen: true,
                mode: 'delete',
                channel: row
              })}
            >
              <FaTrash />
            </button>
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Delete Channel
            </span>
          </div>
        </div>
      ),
    }
  ];

  const handleCreateNew = () => {
    setSelectedChannel(null);
    setModalProps({ isOpen: false, mode: null, channel: null });
    setShowModal(true);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Withdrawal Channels</h2>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          onClick={handleCreateNew}
        >
          <FaPlus /> New Channel
        </button>
      </div>

      <CustomTable
        columns={columns}
        data={channels}
      />

      {/* Add/Edit Channel Modal */}
      {showModal && (
        <AddOrModifyChannel
          visible={showModal}
          onCancel={() => {
            setShowModal(false);
            setModalProps({ isOpen: false, mode: null, channel: null });
          }}
          channel={modalProps.channel}
          onSuccess={() => {
            refresh();
            setShowModal(false);
            setModalProps({ isOpen: false, mode: null, channel: null });
          }}
        />
      )}

      {/* Mobile Money Verification Modal */}
      <MobileMoneyVerification
        visible={showMobileVerification}
        channel={selectedChannel}
        onClose={() => {
          setShowMobileVerification(false);
          setSelectedChannel(null);
        }}
        onSuccess={handleVerificationSuccess}
      />

      {/* Bank Transfer Verification Modal */}
      <BankTransferVerification
        visible={showBankVerification}
        channel={selectedChannel}
        onClose={() => {
          setShowBankVerification(false);
          setSelectedChannel(null);
        }}
        onSuccess={handleVerificationSuccess}
      />

      {/* Delete Confirmation Modal */}
      <CustomDeleteModal 
        visible={modalProps.isOpen} 
        onCancel={() => setModalProps({ isOpen: false, mode: null, channel: null })} 
        onConfirm={deleteChannel}
        title="Delete Channel"
        message={`Are you sure you want to delete ${modalProps.channel?.name}? This action cannot be undone.`}
      />
    </div>
  );
};

export default ChannelTable;