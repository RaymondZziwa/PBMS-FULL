import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import type { IEmployee } from '../../../redux/types/hr';
import useEmployees from '../../../hooks/humanResource/useEmployees';
import { EmployeeEndpoints } from '../../../endpoints/humanResource/employee';
import AddorModifyEmployee from './AddorModify';

const EmployeeManagement = () => {
  const { data, refresh } = useEmployees();
  const [employees, setEmployees] = useState(data);

  useEffect(() => {
    setEmployees(data);
  }, [data]);
  
  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    employee: IEmployee | null;
  }>({
    isOpen: false,
    mode: 'create',
    employee: null
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const deleteEmployee = async () => {
    try {
      if (modalProps.employee) {
        await apiRequest(EmployeeEndpoints.deleteEmployee(modalProps?.employee?.id), "DELETE", '');
        refresh();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message)
    }
  }

  // Table columns configuration
  const columns = [
    { key: 'firstName', label: 'First Name', sortable: true, filterable: true },
    { key: 'lastName', label: 'Last Name', sortable: true, filterable: true },
    { key: 'gender', label: 'Gender', sortable: true, filterable: true },
    { key: 'branch', label: 'Branch', sortable: true, filterable: true },
    { key: 'role', label: 'Role', sortable: true, filterable: true },
    { key: 'salary', label: 'Salary', sortable: true, filterable: true },
    { key: 'hasAccess', label: 'Has System Access', sortable: true, filterable: true },
    { key: 'hasPrescriptionAccess', label: 'Has Prescription DB Access', sortable: true, filterable: true },
    { key: 'isActive', label: 'Is Active', sortable: true, filterable: true },
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
  const tableData = employees.map(employee => ({
      ...employee,
    branch: employee.branch.name,
    role: employee.role.name,
    hasAccess: employee.hasAccess ? "Yes" : "No",
    hasPrescriptionAccess: employee.hasPrescriptionAccess ? "Yes" : "No",
    isActive: employee.isActive ? "Yes" : "No",
    createdAt: formatDate(employee.createdAt),
    actions: (
    <div className="flex gap-3">
      {/* Edit Button with Tooltip */}
            <div className="relative group">
              <button
                className="text-blue-600 hover:text-blue-800 transition-colors"
                onClick={()=> setModalProps({ isOpen: true, mode: 'edit', employee: employee })}
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
                    setModalProps({isOpen: false, mode: '', employee: employee})
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
        <h2 className="text-2xl font-bold text-gray-800">employees</h2>
        <button
          onClick={()=> setModalProps({ isOpen: true, mode: 'create', employee: null })}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="mr-2" />
          Add New employee
        </button>
      </div>

      <CustomTable columns={columns} data={tableData} pageSize={10} />

      <AddorModifyEmployee
        visible={modalProps.isOpen}
        Employee={modalProps.employee}
        onCancel={() => setModalProps({ isOpen: false, mode: "create", employee: null })} />
      
      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteEmployee} />
    </div>
  );
};

export default EmployeeManagement
