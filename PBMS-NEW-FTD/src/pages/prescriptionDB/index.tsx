import { useState } from 'react';
import { FaEye, FaImage, FaClipboardCheck } from 'react-icons/fa';
import useClientPrescription from '../../hooks/sales/usePrescriptions';
import type { IClientPrescription } from '../../redux/types/pbpd';
import CustomDeleteModal from '../../custom/modals/customDeleteModal';
import CustomTable from '../../custom/table/customTable';
import ImagePreviewModal from '../../custom/modals/imagePreviewModal';
import ReviewModal from './review';
import { toast } from 'sonner';
import { apiRequest } from '../../libs/apiConfig';
import { SALESENDPOINTS } from '../../endpoints/sales/salesEndpoints';

const ClientPrescriptionsManagement = () => {
  const { data: prescriptions, refresh } = useClientPrescription();
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'review' | '';
    prescription: IClientPrescription | null;
  }>({
    isOpen: false,
    mode: 'create',
    prescription: null
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [imagePreviewProps, setImagePreviewProps] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title: string;
  }>({
    isOpen: false,
    imageUrl: '',
    title: ''
  });

  const handleReviewConfirm = async (reviewNotes: string) => {
    try {
      setIsSubmitting(true)
      await apiRequest(SALESENDPOINTS.CLIENT.review_prescription(modalProps?.prescription?.id), 'PUT', '', { reviewNotes: reviewNotes });
      refresh()
      setModalProps({ ...modalProps, isOpen: false })
      setIsSubmitting(false)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
      setIsSubmitting(false)
    }
  }

  // Table columns
  const columns = [
    { key: 'clientName', label: 'Client', sortable: true, filterable: true },
    { key: 'clientContact', label: 'Contact', sortable: true, filterable: true },
    { key: 'prescribedByName', label: 'Prescribed By', sortable: true, filterable: true },
    { key: 'isReviewed', label: 'Reviewed', sortable: true, filterable: false },
    { key: 'images', label: 'Images', sortable: true, filterable: false },
    { key: 'createdAt', label: 'Created At', sortable: true, filterable: false },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewImage = (prescription: IClientPrescription) => {
    if (prescription.images && prescription.images.length > 0) {
      setImagePreviewProps({
        isOpen: true,
        imageUrl: prescription.images[0], // Show first image, you can extend this to handle multiple images
        title: `Prescription for ${prescription.client?.firstName} ${prescription.client?.lastName}`
      });
    }
  };

  const handleViewAllImages = (prescription: IClientPrescription) => {
    if (prescription.images && prescription.images.length > 0) {
      // For now, we'll just show the first image
      // You can extend this to show a carousel for multiple images
      setImagePreviewProps({
        isOpen: true,
        imageUrl: prescription.images[0],
        title: `Prescription for ${prescription.client?.firstName} ${prescription.client?.lastName} (1 of ${prescription.images.length})`
      });
    }
  };

  // Prepare data for table
  const tableData = prescriptions.map(prescription => ({
    clientName: `${prescription.client?.firstName || ''} ${prescription.client?.lastName || ''}`.trim() || 'N/A',
    clientContact: prescription.client?.contact || 'N/A',
    prescribedByName: `${prescription.employee?.firstName || ''} ${prescription.employee?.lastName || ''}`.trim() || 'N/A',
    isReviewed: prescription.isReviewed ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Reviewed
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pending
      </span>
    ),
    images: (
      <div className="flex items-center gap-2">
        {prescription.images && prescription.images.length > 0 ? (
          <>
            <span className="text-sm text-gray-600">{prescription.images.length}</span>
            <button
              onClick={() => handleViewAllImages(prescription)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
              title="View all images"
            >
              <FaImage className="w-3 h-3" />
              View
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-400">No images</span>
        )}
      </div>
    ),
    createdAt: formatDate(prescription.createdAt),
    actions: (
      <div className="flex gap-3">
        {/* View Images Button - Only show if there are images */}
        {prescription.images && prescription.images.length > 0 && (
          <div className="relative group">
            <button
              className="text-green-600 hover:text-green-800 transition-colors"
              onClick={() => handleViewImage(prescription)}
              title="View Prescription Images"
            >
              <FaEye />
            </button>
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              View Images
            </span>
          </div>
        )}
        
        {/* Edit Button */}
        <div className="relative group">
          <button
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => setModalProps({ isOpen: true, mode: 'review', prescription })}
            title="Review Prescription"
          >
            <FaClipboardCheck />
          </button>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Review
          </span>
        </div>
        
        {/* Delete Button */}
        {/* <div className="relative group">
          <button
            className="text-red-600 hover:text-red-800 transition-colors"
            onClick={() => {
              setModalProps({ isOpen: false, mode: '', prescription });
              setIsDeleteModalOpen(true);
            }}
            title="Delete Prescription"
          >
            <FaTrash />
          </button>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Delete
          </span>
        </div> */}
      </div>
    )
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Client Prescriptions</h2>
        {/* <button
          onClick={() => setModalProps({ isOpen: true, mode: 'create', prescription: null })}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" /> Add New Prescription
        </button> */}
      </div>

      <CustomTable 
        columns={columns} 
        data={tableData} 
        pageSize={10}
        emptyMessage="No prescriptions found. Click 'Add New Prescription' to create one."
      />

      {/* Delete Confirmation Modal */}
      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          // deletePrescription();
          setIsDeleteModalOpen(false);
        }}
        title="Delete Prescription"
        message="Are you sure you want to delete this prescription? This action cannot be undone."
      />

      {/* Image Preview Modal */}
       {imagePreviewProps.isOpen && (
  <ImagePreviewModal
    imageUrl={imagePreviewProps.imageUrl}
    title={imagePreviewProps.title}
    onClose={() => setImagePreviewProps({ isOpen: false, imageUrl: '', title: '' })}
  />
)}

      {/* Add/Edit Prescription Modal - You'll need to create this component */}
        <ReviewModal 
          visible={modalProps.isOpen}
          title="Review Prescription"
          onCancel={() => setModalProps({ ...modalProps, isOpen: false })}
        onConfirm={(reviewNotes) => handleReviewConfirm(reviewNotes)}
        isSubmitting={isSubmitting}
        />
    </div>
  );
};

export default ClientPrescriptionsManagement;