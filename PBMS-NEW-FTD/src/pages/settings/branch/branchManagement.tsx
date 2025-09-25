import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import type { IBranch } from '../../../redux/types/systemSettings';
import AddorModifyBranch from './AddorModify';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import useBranches from '../../../hooks/settings/useBranches';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import { branchEndpoints } from '../../../endpoints/settings/branch/branchEndpoints';

const BranchesManagement = () => {
  const { data, refresh } = useBranches();
  const [branches, setBranches] = useState(data);

  useEffect(() => {
    setBranches(data);
  }, [data]);
  
  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    branch: IBranch | null;
  }>({
    isOpen: false,
    mode: 'create',
    branch: null
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const deleteBranch = async () => {
    try {
      if (modalProps.branch) {
        await apiRequest(branchEndpoints.deleteBranch(modalProps?.branch?.id), "DELETE", '');
        refresh();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message)
    }
  }

  // Table columns configuration
  const columns = [
    { key: 'name', label: 'Branch Name', sortable: true, filterable: true },
    { key: 'location', label: 'Location', sortable: true, filterable: true },
    { key: 'createdAt', label: 'Created At', sortable: true, filterable: false },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Prepare data for the table
  const tableData = branches.map(branch => ({
    ...branch,
    createdAt: formatDate(branch.createdAt),
    actions: (
    <div className="flex gap-3">
      {/* Edit Button with Tooltip */}
            <div className="relative group">
              <button
                className="text-blue-600 hover:text-blue-800 transition-colors"
                onClick={()=> setModalProps({ isOpen: true, mode: 'edit', branch: branch })}
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
                    setModalProps({isOpen: false, mode: '', branch: branch})
                    setIsDeleteModalOpen(true)
                  }}
                      >
                <FaTrash />
              </button>
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Delete
              </span>
            </div >
              </div>
    )
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Branches</h2>
        <button
          onClick={()=> setModalProps({ isOpen: true, mode: 'create', branch: null })}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add New Branch
        </button>
      </div>

      <CustomTable columns={columns} data={tableData} pageSize={10} />

      <AddorModifyBranch
        visible={modalProps.isOpen}
        branch={modalProps.branch}
        onCancel={() => setModalProps({ isOpen: false, mode: "create", branch: null })} />
      
      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteBranch} />
    </div>
  );
};

export default BranchesManagement;
