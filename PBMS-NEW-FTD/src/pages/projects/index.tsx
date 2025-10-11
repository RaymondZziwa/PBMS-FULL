import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'sonner';
import CustomDeleteModal from '../../custom/modals/customDeleteModal';
import CustomTable from '../../custom/table/customTable';
import useProjects from '../../hooks/projects/useProjects';
import { apiRequest } from '../../libs/apiConfig';
import type { IProject } from '../../redux/types/projects';
import { PROJECTENDPOINTS } from '../../endpoints/projects/projectEndpoints';
import AddOrModifyProject from './AddorModify';

const ProjectsManagement = () => {
  const { data, refresh } = useProjects();
  const [projects, setProjects] = useState<IProject[]>(data);

  useEffect(() => {
    setProjects(data);
  }, [data]);
  
  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    project: IProject | null;
  }>({
    isOpen: false,
    mode: 'create',
    project: null
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const deleteProject = async () => {
    try {
      if (modalProps.project) {
        await apiRequest(PROJECTENDPOINTS.PROJECTS.delete(modalProps.project.id), "DELETE", '');
        refresh();
        setIsDeleteModalOpen(false);
        toast.success('Project deleted successfully');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    }
  }

  // Table columns configuration
  const columns = [
    { key: 'name', label: 'Project Name', sortable: true, filterable: true },
    { 
      key: 'price', 
      label: 'Price (UGX)', 
      sortable: true, 
      filterable: true,
      render: (value: string) => `${parseFloat(value).toLocaleString()} UGX`
    },
    { key: 'createdAt', label: 'Created At', sortable: true, filterable: false },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  // Format date for display
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Prepare data for the table
  const tableData = projects.map(project => ({
    ...project,
    createdAt: formatDate(project.createdAt),
    actions: (
      <div className="flex gap-3">
        {/* Edit Button with Tooltip */}
        <div className="relative group">
          <button
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => setModalProps({ isOpen: true, mode: 'edit', project })}
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
              setModalProps({ isOpen: false, mode: '', project });
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
        <h2 className="text-2xl font-bold text-gray-800">Projects</h2>
        <button
          onClick={() => setModalProps({ isOpen: true, mode: 'create', project: null })}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add New Project
        </button>
      </div>

      <CustomTable columns={columns} data={tableData} pageSize={10} />

      <AddOrModifyProject
        visible={modalProps.isOpen}
        project={modalProps.project}
        onCancel={() => setModalProps({ isOpen: false, mode: "create", project: null })}
      />
      
      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteProject}
      />
    </div>
  );
};

export default ProjectsManagement;