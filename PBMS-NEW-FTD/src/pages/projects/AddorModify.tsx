import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import CustomButton from '../../custom/buttons/customButton';
import CustomTextInput from '../../custom/inputs/customTextInput';
import useProjects from '../../hooks/projects/useProjects';
import { apiRequest } from '../../libs/apiConfig';
import type { IProject } from '../../redux/types/projects';
import { PROJECTENDPOINTS } from '../../endpoints/projects/projectEndpoints';
import CustomNumberInput from '../../custom/inputs/customNumberInput';

interface AddOrModifyProjectProps {
  visible: boolean;
  project: IProject | null;
  onCancel: () => void;
}

const AddOrModifyProject: React.FC<AddOrModifyProjectProps> = ({
  visible,
  project,
  onCancel,
}) => {
  const { refresh: refreshProjects } = useProjects();
  const [formData, setFormData] = useState({
    name: '',
    price: '',
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        price: project.price || '',
      });
    } else {
      setFormData({
        name: '',
        price: '',
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate price is a positive number
    const priceValue = parseFloat(formData.price);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      const payload = {
        name: formData.name,
        price: priceValue,
      };

      const endpoint = project
        ? PROJECTENDPOINTS.PROJECTS.modify(project.id)
        : PROJECTENDPOINTS.PROJECTS.create;

      const method = project ? 'PATCH' : 'POST';
      await apiRequest(endpoint, method, '', payload);
      
      refreshProjects();
      onCancel();
        setFormData({
            name: '',
            price: ''
      })
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {project ? 'Edit Project' : 'Add New Project'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <CustomTextInput
              type="text"
              value={formData.name}
              onChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
              placeholder="Enter project name"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (UGX) *
            </label>
            <CustomNumberInput
              value={formData.price}
              onChange={(val) => setFormData(prev => ({ ...prev, price: val }))}
              placeholder="Enter project price"
              min="0"
              step="0.01"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <CustomButton 
              type='negative' 
              label="Cancel"
              fn={onCancel} 
            />
            <CustomButton
              label={project ? 'Update Project' : 'Create Project'}
              fn={handleSubmit}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrModifyProject;