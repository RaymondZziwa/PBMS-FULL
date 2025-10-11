import React, { useState, useEffect, useMemo } from 'react';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { apiRequest } from '../../../libs/apiConfig';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import type { IStore } from '../../../redux/types/inventory';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import useStores from '../../../hooks/inventory/useStores';
import useBranches from '../../../hooks/settings/useBranches';
import useDepartments from '../../../hooks/humanResource/useDepartments';
import useEmployees from '../../../hooks/humanResource/useEmployees';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import type { IDepartment, IEmployee } from '../../../redux/types/hr';
import type { IBranch } from '../../../redux/types/systemSettings';

interface AddorModifyStoreProps {
  visible: boolean;
  store: IStore | null;
  onCancel: () => void;
}

const AddorModifyStore: React.FC<AddorModifyStoreProps> = ({
  visible,
  store,
  onCancel
}) => {
  const { refresh } = useStores();
  const { data: branches } = useBranches();
  const { data: departments } = useDepartments();
  const { data: employees } = useEmployees();

  const [formData, setFormData] = useState({
    branchId: '',
    deptId: '',
    name: '',
    authorizedPersonnel: [] as string[], // store IDs
  });

  // Normalize departments by selected branch
  const filteredDepartments = useMemo(() => {
    if (!formData.branchId) return [];
    return departments?.filter((dept: IDepartment) => dept.branchId === formData.branchId) || [];
  }, [formData.branchId, departments]);

  // Normalize and set initial form data on edit
  useEffect(() => {
    if (store) {
      // branchId / deptId might be nested or direct fields depending on backend shape
      const branchId =
        // try nested relation first, then fallback to top-level id fields
        (store as any).branch?.id || (store as any).branchId || '';
      const deptId =
        (store as any).dept?.id || (store as any).deptId || '';

      // authorizedPersonnel might be stored as ['empId', ...] or [{id: 'empId'}, ...]
      let auth: string[] = [];
      const rawAuth = (store as any).authorizedPersonnel;
      if (Array.isArray(rawAuth)) {
        auth = rawAuth.map(a => (typeof a === 'string' ? a : a?.id || a?.employeeId || '')).filter(Boolean);
      }

      setFormData({
        branchId,
        deptId,
        name: store.name || '',
        authorizedPersonnel: auth,
      });
    } else {
      setFormData({
        branchId: '',
        deptId: '',
        name: '',
        authorizedPersonnel: []
      });
    }
  }, [store]);

  // Helpers: dropdown options
  const branchOptions = branches?.map((b: IBranch) => ({ label: b.name, value: b.id })) || [];
  const deptOptions = filteredDepartments.map((d: IDepartment) => ({ label: d.name, value: d.id })) || [];
  const employeeOptions = employees?.map((emp: IEmployee) => ({
    label: `${emp.firstName} ${emp.lastName}`,
    value: emp.id
  })) || [];

  // Map authorizedPersonnel (ids) to display names for chips
  const authorizedChips = useMemo(() => {
    return formData.authorizedPersonnel
      .map(id => {
        const emp = employees?.find((e: IEmployee) => e.id === id);
        return emp ? { id, label: `${emp.firstName} ${emp.lastName}` } : null;
      })
      .filter(Boolean) as { id: string; label: string }[];
  }, [formData.authorizedPersonnel, employees]);

  const removeAuthorized = (idToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      authorizedPersonnel: prev.authorizedPersonnel.filter(id => id !== idToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.branchId || !formData.deptId) {
      toast.error("Please fill in all the fields");
      return;
    }

    try {
      const endpoint = store
        ? InventoryEndpoints.STORE.modify(store.id!)
        : InventoryEndpoints.STORE.create;
      const method = store ? "PATCH" : "POST";

      // payload includes authorizedPersonnel as string[] (JSON column)
      await apiRequest(endpoint, method, '', {
        name: formData.name,
        branchId: formData.branchId,
        deptId: formData.deptId,
        authorizedPersonnel: formData.authorizedPersonnel,
      });

      setFormData({
        branchId: '',
        deptId: '',
        name: '',
        authorizedPersonnel: [] as string[], // store IDs
      })
      refresh();
      onCancel();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Something went wrong");
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {store ? 'Edit Store' : 'Add New Store'}
        </h3>

        <div className="space-y-4">
          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch *
            </label>
            <CustomDropdown
              options={branchOptions}
              value={formData.branchId ? [formData.branchId] : []}
              onChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  branchId: val[0] || '',
                  deptId: '', // reset department when branch changes
                }))
              }
              placeholder="Select a branch"
              singleSelect
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department *
            </label>
            <CustomDropdown
              options={deptOptions}
              value={formData.deptId ? [formData.deptId] : []}
              onChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  deptId: val[0] || '',
                }))
              }
              placeholder="Select a department"
              singleSelect
              disabled={!formData.branchId}
            />
          </div>

          {/* Store Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Name *
            </label>
            <CustomTextInput
              type="text"
              value={formData.name}
              onChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
              placeholder="Enter store name"
            />
          </div>

          {/* Authorized Personnel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Authorized Personnel *
            </label>

            <CustomDropdown
              options={employeeOptions}
              value={formData.authorizedPersonnel}
              onChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  authorizedPersonnel: val, // val is string[] of ids
                }))
              }
              placeholder="Select employees"
              singleSelect={false} // multi-select
            />

            {/* Currently Authorized chips (visible immediately) */}
            {authorizedChips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {authorizedChips.map(chip => (
                  <div
                    key={chip.id}
                    className="inline-flex items-center bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded-full"
                  >
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={() => removeAuthorized(chip.id)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <CustomButton type="negative" fn={onCancel} label="Cancel" />
          <CustomButton
            label={store ? 'Update Store' : 'Create Store'}
            fn={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
};

export default AddorModifyStore;
