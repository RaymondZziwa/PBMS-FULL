import React, { useState, useEffect } from 'react';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { apiRequest } from '../../../libs/apiConfig';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import useSeedlingStages from '../../../hooks/farm/useSeedlingStages';
import type { SeedlingStages } from '../../../redux/types/farm';
import { farmEndpoints } from '../../../endpoints/farm/farmEndpoints';

interface AddorModifySeedlingStageProps {
  visible: boolean;
  stage: SeedlingStages | null;
  onCancel: () => void;
}

const AddorModifySeedlingStage: React.FC<AddorModifySeedlingStageProps> = ({
  visible,
  stage,
  onCancel
}) => {
  const { refresh } = useSeedlingStages();
  
  // Initial state for form data with `name` and `stageDays`
  const [formData, setFormData] = useState({
    name: '',
    stageDays: 0,
  });

  useEffect(() => {
    if (stage) {
      setFormData({
        name: stage.name || '',
        stageDays: stage.stageDays || 0,
      });
    } else {
      setFormData({
        name: '',
        stageDays: 0,
      });
    }
  }, [stage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.stageDays <= 0) {
      toast.error("Please fill in all the fields correctly");
      return;
    }

    try {
      const endpoint = stage ? farmEndpoints.seedlingStage.update(stage.id) : farmEndpoints.seedlingStage.create;
      const method = stage ? "PATCH" : "POST";

      await apiRequest(endpoint, method, '', formData);
      refresh();
      setFormData({
        name: '',
        stageDays: 0,
      });
    } catch (error) {
      toast.error(error?.response?.data?.message);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {stage ? 'Edit Seedling Stage' : 'Add New Seedling Stage'}
        </h3>
        <div className="space-y-4">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seedling Stage Name *
            </label>
            <CustomTextInput
              type="text"
              value={formData.name}
              onChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
              placeholder="Enter stage name"
            />
          </div>

          {/* Stage Days input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stage Days *
            </label>
            <CustomTextInput
              type="number"
              value={formData.stageDays}
              onChange={(val) => setFormData(prev => ({ ...prev, stageDays: parseInt(val, 10) }))}
              placeholder="Enter stage days"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <CustomButton type="negative" fn={onCancel} />
          <CustomButton autoCloseModal={onCancel} label={stage ? 'Update Stage' : 'Create Stage'} fn={handleSubmit} />
        </div>
      </div>
    </div>
  );
};

export default AddorModifySeedlingStage;
