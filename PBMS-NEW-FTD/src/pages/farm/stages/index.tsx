import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import useSeedlingStages from '../../../hooks/farm/useSeedlingStages';
import type { SeedlingStages } from '../../../redux/types/farm';
import { farmEndpoints } from '../../../endpoints/farm/farmEndpoints';
import AddorModifySeedlingStage from './AddorModify';

const SeedlingStagesManagement = () => {
  const { data, refresh } = useSeedlingStages();
  const [stages, setStages] = useState(data);

  useEffect(() => {
    setStages(data);
  }, [data]);
  
  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    stage: SeedlingStages | null;
  }>({
    isOpen: false,
    mode: 'create',
    stage: null
  });
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const deleteStage = async () => {
    try {
      if (modalProps.stage) {
        await apiRequest(farmEndpoints.seedlingStage.remove(modalProps?.stage?.id), "DELETE", '');
        refresh();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message)
    }
  }

  // Table columns configuration
  const columns = [
    { key: 'name', label: 'Name', sortable: true, filterable: true },
    { key: 'stageDays', label: 'Stage Days', sortable: true, filterable: true },
    { key: 'createdAt', label: 'Created At', sortable: true, filterable: false },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Prepare data for the table
  const tableData = stages.map(stage => ({
    ...stage,
    createdAt: formatDate(stage.createdAt),
    actions: (
    <div className="flex gap-3">
      {/* Edit Button with Tooltip */}
            <div className="relative group">
              <button
                className="text-blue-600 hover:text-blue-800 transition-colors"
                onClick={()=> setModalProps({ isOpen: true, mode: 'edit', stage: stage })}
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
                    setModalProps({isOpen: false, mode: '', stage: stage})
                    setIsDeleteModalOpen(true)
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
        <h2 className="text-2xl font-bold text-gray-800">Seedling Stages</h2>
        <button
          onClick={()=> setModalProps({ isOpen: true, mode: 'create', stage: null })}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add New Seedling Stage
        </button>
      </div>

      <CustomTable columns={columns} data={tableData} pageSize={10} />

      <AddorModifySeedlingStage
        visible={modalProps.isOpen}
        stage={modalProps.stage}
        onCancel={() => setModalProps({ isOpen: false, mode: "create", stage: null })} />
      
      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteStage} />
    </div>
  );
};

export default SeedlingStagesManagement;
