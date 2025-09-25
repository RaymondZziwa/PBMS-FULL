import React, { useState, useEffect } from "react";
import CustomTextInput from "../../../custom/inputs/customTextInput";
import usePermissions from "../../../hooks/settings/usePermissions";
import useRoles from "../../../hooks/settings/useRoles";
import { apiRequest } from "../../../libs/apiConfig";
import { RoleEndpoints } from "../../../endpoints/settings/role/roleEndpoints";
import { toast } from "sonner";
import CustomButton from "../../../custom/buttons/customButton";

interface Role {
  id?: string;
  name: string;
  permissions: string[]; // store permission names/values
}

interface AddorModifyRoleProps {
  visible: boolean;
  role: Role | null;
  onCancel: () => void;
  onSubmit: (role: Role) => void;
}

const AddorModifyRole: React.FC<AddorModifyRoleProps> = ({
  visible,
  role,
  onCancel,
  onSubmit,
}) => {
  const { data } = usePermissions();
  const {refresh} = useRoles()
  const [formData, setFormData] = useState<Role>({
    name: "",
    permissions: [],
  });

  // Populate form on edit
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || "",
        permissions: role.permissions ? role.permissions.map((p: any) => p.value) : [],
      });
    } else {
      setFormData({ name: "", permissions: [] });
    }
  }, [role]);

  const handleNameChange = (val: string) => {
    setFormData((prev) => ({ ...prev, name: val }));
  };

  const togglePermission = (permissionValue: string) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permissionValue);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permissionValue)
          : [...prev.permissions, permissionValue],
      };
    });
  };

  const toggleCategory = (
    module: string,
    permissions: { id: string; name: string; value?: string }[]
  ) => {
    const categoryPermissions = permissions.map(
      (perm) => perm.value || perm.name
    );

    setFormData((prev) => {
      const allSelected = categoryPermissions.every((p) =>
        prev.permissions.includes(p)
      );

      return {
        ...prev,
        permissions: allSelected
          ? prev.permissions.filter((p) => !categoryPermissions.includes(p))
          : [...new Set([...prev.permissions, ...categoryPermissions])],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please provide a role name");
      return;
    }
    try {
      const endpoint = role ? RoleEndpoints.modify(role?.id) : RoleEndpoints.create;
      const method = role ? "PATCH" : "POST"
      await apiRequest(endpoint, method, "", formData);
      onCancel()
      refresh()
    } catch (error) {
      toast.error(error?.response?.data?.message)
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {role ? "Edit Role" : "Add New Role"}
        </h3>

        <form className="space-y-6">
          {/* Role Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Name *
            </label>
            <CustomTextInput
              type="text"
              name="name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="Enter role name"
              required
            />
          </div>

          {/* Permissions */}
          <div>
            <h4 className="text-md font-semibold text-gray-700 mb-2">
              Permissions
            </h4>

            <div className="space-y-4 max-h-72 overflow-y-auto">
              {data.map(({ module, permissions }) => {
                const allSelected = permissions.every((perm) =>
                  formData.permissions.includes(perm.value || perm.name)
                );

                return (
                  <div
                    key={module}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    {/* Module Header */}
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-800">
                        {module}
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleCategory(module, permissions)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-gray-600">
                          Select All
                        </span>
                      </label>
                    </div>

                    {/* Permissions */}
                    <div className="grid grid-cols-2 gap-2">
                      {permissions.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(
                              perm.value || perm.name
                            )}
                            onChange={() =>
                              togglePermission(perm.value || perm.name)
                            }
                            className="h-4 w-4"
                          />
                          <span>{perm.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <CustomButton type='negative' fn={onCancel}/>
            <CustomButton autoCloseModal={onCancel} label={role ? 'Update Role' : 'Create Role'} fn={handleSubmit}/>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddorModifyRole;
