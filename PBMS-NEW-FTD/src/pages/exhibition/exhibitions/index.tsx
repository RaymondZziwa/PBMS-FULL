import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import useExhibition from '../../../hooks/exhibitions/useExhibition';
import { ExhibitionEndpoints } from '../../../endpoints/exhibitions/exhibitionEndpoints';
import type { IExhibition } from '../../../redux/types/exhibition';
import AddOrModifyExhibition from './AddorModify';

const ExhibitionManagement = () => {
  const { data, refresh } = useExhibition();
  const [exhibitions, setExhibitions] = useState(data);

  useEffect(() => {
    setExhibitions(data);
  }, [data]);
  
  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    exhibition: IExhibition | null;
  }>({
    isOpen: false,
    mode: 'create',
    exhibition: null
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const deleteExhibition = async () => {
    try {
      if (modalProps.exhibition) {
        await apiRequest(ExhibitionEndpoints.EXHIBITION.delete(modalProps.exhibition.id), "DELETE", '');
        refresh();
        setIsDeleteModalOpen(false);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    }
  }

  // Table columns configuration
  const columns = [
    { key: 'name', label: 'Name', sortable: true, filterable: true },
    { key: 'location', label: 'Location', sortable: true, filterable: true },
    { key: 'startDate', label: 'Start Date', sortable: true, filterable: false },
    { key: 'endDate', label: 'End Date', sortable: true, filterable: false },
    { key: 'description', label: 'Description', sortable: false, filterable: true },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  // Format date for display
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Prepare data for the table
  const tableData = exhibitions.map(exhibition => ({
    ...exhibition,
    startDate: formatDate(exhibition.startDate),
    endDate: formatDate(exhibition.endDate),
    description: exhibition.description || '-',
    actions: (
      <div className="flex gap-3">
        {/* Edit Button with Tooltip */}
        <div className="relative group">
          <button
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => setModalProps({ isOpen: true, mode: 'edit', exhibition })}
          >
            <FaEdit />
          </button>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Edit
          </span>
        </div>
        
        {/* Delete Button with Tooltip */}
        <div className="relative group">
          <button
            className="text-red-600 hover:text-red-800 transition-colors"
            onClick={() => {
              setModalProps({ isOpen: false, mode: '', exhibition });
              setIsDeleteModalOpen(true);
            }}
          >
            <FaTrash />
          </button>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Delete
          </span>
        </div>
      </div>
    )
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Exhibition Management</h2>
          <p className="text-gray-600">Manage all exhibitions and their details</p>
        </div>
        <button
          onClick={() => setModalProps({ isOpen: true, mode: 'create', exhibition: null })}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add New Exhibition
        </button>
      </div>

      <CustomTable columns={columns} data={tableData} pageSize={10} />

      <AddOrModifyExhibition
        visible={modalProps.isOpen}
        exhibition={modalProps.exhibition}
        onCancel={() => setModalProps({ isOpen: false, mode: "create", exhibition: null })}
        onSuccess={refresh}
      />
      
      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteExhibition}
      />
    </div>
  );
};

export default ExhibitionManagement;