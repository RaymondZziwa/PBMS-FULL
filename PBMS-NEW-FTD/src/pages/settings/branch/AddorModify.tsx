import React, { useState, useEffect } from 'react';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { apiRequest } from '../../../libs/apiConfig';
import { branchEndpoints } from '../../../endpoints/settings/branch/branchEndpoints';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import useBranches from '../../../hooks/settings/useBranches';

interface Branch {
  id?: string;
  name: string;
  location: string;
}

interface AddorModifyBranchProps {
  visible: boolean;
  branch: Branch | null;
  onCancel: () => void;
}

const AddorModifyBranch: React.FC<AddorModifyBranchProps> = ({
  visible,
  branch,
  onCancel
}) => {
  const {refresh} = useBranches()
  const [formData, setFormData] = useState({
    name: '',
    location: ''
  });

  // Update form data when branch prop changes
  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name || '',
        location: branch.location || ''
      });
    } else {
      setFormData({
        name: '',
        location: ''
      });
    }
  }, [branch]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name && !formData.location) {
      toast.error("Please fill in all the fields")
      return;
    }
    try {
      const endpoint = branch ? branchEndpoints.updateBranch(branch.id!) : branchEndpoints.createBranch;
      const method = branch ? "PATCH" : "POST"
      await apiRequest(endpoint, method, '', formData);
      refresh();
      setFormData({
        name: '',
        location: ''
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
          {branch ? 'Edit Branch' : 'Add New Branch'}
        </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch Name *
              </label>
              <CustomTextInput
                type="text"
                name="name"
                value={formData.name}
                onChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
                placeholder="Enter branch name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <CustomTextInput
                type="text"
                name="location"
                value={formData.location}
                onChange={(val) => setFormData(prev => ({ ...prev, location: val }))}
                placeholder="Enter branch location"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <CustomButton type='negative' fn={onCancel}/>
            <CustomButton autoCloseModal={onCancel} label={branch ? 'Update Branch' : 'Create Branch'} fn={handleSubmit}/>
           
          </div>
      </div>
    </div>
  );
};

export default AddorModifyBranch;