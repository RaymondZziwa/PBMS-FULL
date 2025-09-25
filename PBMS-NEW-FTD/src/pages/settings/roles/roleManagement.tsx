import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import CustomTable from "../../../custom/table/customTable";
import type { IRole } from "../../../redux/types/systemSettings";
import AddorModifyRole from "./AddorModify";
import CustomDeleteModal from "../../../custom/modals/customDeleteModal";
import { FaKey, FaUsers } from "react-icons/fa6";
import RoleUsersModal from "./viewUsers";
import RolePermissionsModal from "./viewPermissions";
import useRoles from "../../../hooks/settings/useRoles";
import { apiRequest } from "../../../libs/apiConfig";
import { RoleEndpoints } from "../../../endpoints/settings/role/roleEndpoints";
import { toast } from "sonner";

// Define Role type
interface Role {
  id: string;
  name: string;
  Employee: string[];
}

const RoleManagement: React.FC = () => {

  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    role: IRole | null;
  }>({
    isOpen: false,
    mode: 'create',
    role: null
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<IRole>()
  const [showPermModal, setShowPermModal] = useState(false);
  const {data: roles, refresh} = useRoles()
  
  const handleDeleteRole = async (roleId: string) => {
   try {
     await apiRequest(RoleEndpoints.delete(roleId), "DELETE", '');
     refresh()
   } catch (error) {
    toast.error(error?.response?.data?.message)
   }
  };

  // Columns for the table
  const columns = [
    { key: "name", label: "Role Name", sortable: true },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
    },
  ];

  // Transform roles into table rows
  const tableData = roles.map((role) => ({
    ...role,
    actions: (
      <div className="flex items-center gap-2">
        {/* View Users */}
        <button
          onClick={() => {
            setShowModal(true)
            setSelectedRole(role)
          }}
          className="px-3 py-1.5 bg-gray-500 text-white rounded-lg flex items-center gap-2 shadow-sm hover:bg-gray-600 transition"
        >
          <FaUsers className="w-4 h-4" />
          <span>View Users</span>
        </button>
    
        {/* View Permissions */}
        <button
           onClick={() => {
            setShowPermModal(true)
            setSelectedRole(role)
          }}
          className="px-3 py-1.5 bg-gray-500 text-white rounded-lg flex items-center gap-2 shadow-sm hover:bg-gray-600 transition"
        >
          <FaKey className="w-4 h-4" />
          <span> View Permissions</span>
        </button>

            <div className="flex gap-3">
      {/* Edit Button with Tooltip */}
            <div className="relative group">
              <button
                className="text-blue-600 hover:text-blue-800 transition-colors"
                onClick={()=> setModalProps({ isOpen: true, mode: 'edit', role: role })}
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
                    setModalProps({isOpen: false, mode: "", role: role})
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
      </div>
    ),    
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Roles</h2>
              <button
                onClick={()=> setModalProps({ isOpen: true, mode: 'create', role: null })}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaPlus className="mr-2" />
                Add New Role
              </button>
        </div>
      <CustomTable columns={columns} data={tableData} pageSize={5} />
      <AddorModifyRole
        visible={modalProps.isOpen}
        role={modalProps.role}
        onCancel={() => setModalProps({ isOpen: false, mode: "create", role: null })} onSubmit={()=> {} } />
       <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={() => handleDeleteRole(modalProps.role?.id)} />
      <RoleUsersModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        role={selectedRole}
      />
       <RolePermissionsModal
        visible={showPermModal}
        onClose={() => setShowPermModal(false)}
        role={selectedRole}
      />
    </div>
  );
};

export default RoleManagement;
