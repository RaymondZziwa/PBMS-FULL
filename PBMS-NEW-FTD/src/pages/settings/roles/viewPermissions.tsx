import React from "react";
import { FaTimes } from "react-icons/fa";
import CustomTable from "../../../custom/table/customTable";
import type { IRole } from "../../../redux/types/systemSettings";

interface RolePermissionsModalProps {
  visible: boolean;
  onClose: () => void;
  role: IRole;
}

const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({ visible, onClose, role }) => {
  if (!visible) return null;

  const columns = [
    { key: "module", label: "Module", sortable: true, filterable: true },
    { key: "name", label: "Permission Name", sortable: true, filterable: true },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Permissions for Role: <span className="text-gray-600">{role.name}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Permissions Table */}
        <CustomTable columns={columns} data={role.permissions} pageSize={6} />
      </div>
    </div>
  );
};

export default RolePermissionsModal;
