import React, { useState, useEffect } from 'react';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { apiRequest } from '../../../libs/apiConfig';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import useBranches from '../../../hooks/settings/useBranches';
import useDepartments from '../../../hooks/humanResource/useDepartments';
import { DepartmentEndpoints } from '../../../endpoints/humanResource/department';
import type { IDepartment } from '../../../redux/types/hr';


interface AddorModifyDepartmentProps {
  visible: boolean;
  Department: IDepartment | null;
  onCancel: () => void;
}

const AddorModifyDepartment: React.FC<AddorModifyDepartmentProps> = ({
  visible,
  Department,
  onCancel
}) => {
    const {data: branches} = useBranches()
  const {refresh} = useDepartments()
  const [formData, setFormData] = useState({
    name: '',
    branchId: ''
  });

  // Update form data when Department prop changes
  useEffect(() => {
    if (Department) {
      setFormData({
        name: Department.name || '',
        branchId: Department.branchId || ''
      });
    } else {
      setFormData({
        name: '',
        branchId: ''
      });
    }
  }, [Department]);
    
   const handleBranchChange = (selectedBranchIds: string[]) => {
    // For single selection, only keep the last selected item
    const branchId = selectedBranchIds.length > 0 ? selectedBranchIds[selectedBranchIds.length - 1] : '';
    setFormData(prev => ({ ...prev, branchId: branchId }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
  toast.error("Please enter a department name");
  return;
    }
    if (!formData.branchId) {
        toast.error("Please select a branch");
        return;
    }
    try {
      const endpoint = Department ? DepartmentEndpoints.updateDepartment(Department.id!) : DepartmentEndpoints.createDepartment;
      const method = Department ? "PATCH" : "POST"
      await apiRequest(endpoint, method, '', formData);
      refresh();
      setFormData({
        name: '',
        branchId: ''
      });
    } catch (error) {
      toast.error(error?.response?.data?.message)
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {Department ? 'Edit Department' : 'Add New Department'}
        </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department Name *
              </label>
              <CustomTextInput
                type="text"
                name="name"
                value={formData.name}
                onChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
                placeholder="Enter Department name"
                required
              />
            </div>
            
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch *
            </label>
            <CustomDropdown
                options={branches.map((branch) => ({
                label: branch.name,
                value: branch.id
                }))}
                value={formData.branchId ? [formData.branchId] : []}
                onChange={handleBranchChange}
                placeholder="Select a branch"
                searchPlaceholder="Search branches..."
                singleSelect={true} // ADD THIS PROP
            />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <CustomButton type='negative' fn={onCancel}/>
            <CustomButton autoCloseModal={onCancel} label={Department ? 'Update Department' : 'Create Department'} fn={handleSubmit}/>
           
          </div>
      </div>
    </div>
  );
};

export default AddorModifyDepartment;