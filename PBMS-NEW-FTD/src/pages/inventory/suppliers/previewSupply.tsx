import React, { useState } from 'react';
import {
  FaTimes, FaExpand, FaBox, FaMoneyBillWave, FaUser,
  FaCalendar, FaBalanceScale, FaReceipt, FaEdit, FaTrash
} from 'react-icons/fa';
import { apiRequest, baseURL } from '../../../libs/apiConfig';
import CustomButton from '../../../custom/buttons/customButton';
import ImagePreviewModal from '../../../custom/modals/imagePreviewModal';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import useSupplier from '../../../hooks/inventory/useSupplier';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';

interface PreviewSupplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  supply: any;
  onEditPayment?: (payment: any) => void;
  onDeletePayment?: (payment: any) => void;
}

const PreviewSupplyModal: React.FC<PreviewSupplyModalProps> = ({
  isOpen,
  onClose,
  supply,
  onEditPayment,
}) => {
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  const { refresh } = useSupplier();

  if (!isOpen || !supply) return null;

  const proofImage = supply?.proofImage;
  const payments = supply?.SupplyPayments || [];

  const paymentStatusColors = {
    PAID: 'bg-green-100 text-green-800 border border-green-200',
    PENDING: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    PARTIALLY_PAID: 'bg-blue-100 text-blue-800 border border-blue-200',
    OVERDUE: 'bg-red-100 text-red-800 border border-red-200',
  };

  const InfoRow = ({
    icon, label, value, isCurrency = false
  }: { icon: React.ReactNode; label: string; value: any; isCurrency?: boolean }) => (
    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-100">
      <div className="text-gray-500 bg-gray-50 p-2 rounded-lg">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-gray-600 font-medium">{label}</p>
        <p className="text-gray-900 font-semibold mt-1">
          {isCurrency && value ? `UGX ${Number(value).toLocaleString()}` : value || '-'}
        </p>
      </div>
    </div>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const color = paymentStatusColors[status as keyof typeof paymentStatusColors] ||
      'bg-gray-100 text-gray-800 border border-gray-200';
    return (
      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${color}`}>
        {status?.toLowerCase().replace('_', ' ')}
      </span>
    );
  };

  const handleImagePreview = (img: string) => {
    setPreviewImage(img);
    setIsImagePreviewOpen(true);
  };

  const confirmDeletePayment = (payment: any) => {
    setPaymentToDelete(payment);
    setDeleteModalVisible(true);
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    await apiRequest(
      InventoryEndpoints.SUPPLY.SUPPLY_PAYMENTS.DELETE(paymentToDelete.id),
      'DELETE',
      ''
    );
    refresh();
    setDeleteModalVisible(false);
    setPaymentToDelete(null);
  };

  return (
    <>
      <div className="fixed inset-0 -top-6 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-50 rounded-xl shadow-xl w-full max-w-3xl transform transition-all duration-300">
          {/* Header */}
          <div className="flex justify-between items-center p-6 bg-white rounded-t-xl border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Supply Details</h2>
              <p className="text-sm text-gray-500 mt-1">Complete supply information and payment history</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <FaTimes className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
            {/* Status Section */}
            <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FaReceipt className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Status</p>
                  <p className="text-gray-900 font-semibold">Supply Payment</p>
                </div>
              </div>
              <StatusBadge status={supply.paymentStatus} />
            </div>

            {/* Supply Info */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoRow icon={<FaBox />} label="Item Name" value={supply.item?.name} />
                <InfoRow icon={<FaBalanceScale />} label="Unit of Measure" value={supply.uom?.name} />
                <InfoRow icon={<FaBox />} label="Quantity Supplied" value={supply.qty} />
                <InfoRow icon={<FaMoneyBillWave />} label="Total Value" value={supply.value} isCurrency />
                <InfoRow icon={<FaMoneyBillWave />} label="Balance Due" value={supply.balance} isCurrency />
                <InfoRow icon={<FaUser />} label="Received By" value={`${supply.employee?.firstName} ${supply.employee?.lastName}`} />
                <InfoRow icon={<FaCalendar />} label="Date Created" value={new Date(supply.createdAt).toLocaleString()} />
              </div>
            </div>

            {/* Proof Image */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-700">Proof of Supply Document</p>
              </div>
              <div className="p-4">
                {proofImage ? (
                  <div
                    className="relative group cursor-pointer w-fit"
                    onClick={() => handleImagePreview(`${proofImage}`)}
                  >
                    <img
                      src={`${baseURL}${proofImage}`}
                      alt="Proof"
                      className="w-48 h-36 rounded-lg border object-cover group-hover:opacity-90 transition"
                    />
                    <div className="absolute inset-0 flex justify-center items-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-25 rounded-lg transition">
                      <FaExpand className="text-white" />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No proof image available for this supply.</p>
                )}
              </div>
            </div>

            {/* Payments Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <p className="text-sm font-semibold text-gray-700">Payments Made</p>
                <span className="text-xs text-gray-500">Total: {payments.length}</span>
              </div>

              <div className="divide-y divide-gray-100">
                {payments.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 italic">No payments recorded yet.</div>
                ) : (
                  payments.map((payment: any) => (
                    <div key={payment.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-800">
                                  {payment.paymentType} - {payment.bank ? payment.bank : ''} — UGX {Number(payment.amount).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          By {payment.employee?.firstName} {payment.employee?.lastName} • {new Date(payment.createdAt).toLocaleString()}
                        </p>
                        {payment.proofImage ? (
                          <button
                            className="text-blue-600 text-sm mt-1 hover:underline"
                            onClick={() => handleImagePreview(payment.proofImage)}
                          >
                            View Payment Proof
                          </button>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1 italic">No proof image uploaded.</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-3 text-gray-500">
                        <button
                          onClick={() => confirmDeletePayment(payment)}
                          className="text-red-500 hover:text-red-600 transition"
                          title="Delete Payment"
                        >
                          <FaTrash className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-gray-200 bg-white p-6 rounded-b-xl">
            <CustomButton
              type="negative"
              fn={onClose}
              label="Close Details"
              className="px-6 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors duration-200 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {isImagePreviewOpen && previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          title="Image Preview"
          onClose={() => setIsImagePreviewOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <CustomDeleteModal
        visible={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={handleDeletePayment}
        title="Confirm Delete Payment"
        message={`Are you sure you want to delete this payment record of UGX ${Number(paymentToDelete?.amount || 0).toLocaleString()}?`}
      />
    </>
  );
};

export default PreviewSupplyModal;
