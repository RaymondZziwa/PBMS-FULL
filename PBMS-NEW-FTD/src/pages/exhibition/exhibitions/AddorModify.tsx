import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import CustomButton from '../../../custom/buttons/customButton';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import CustomDateInput from '../../../custom/inputs/customDateSelector';
import { ExhibitionEndpoints } from '../../../endpoints/exhibitions/exhibitionEndpoints';
import { apiRequest } from '../../../libs/apiConfig';
import type { IExhibition } from '../../../redux/types/exhibition';

interface AddOrModifyExhibitionProps {
  visible: boolean;
  exhibition?: IExhibition | null;
  onCancel: () => void;
  onSuccess?: () => void;
}

const AddOrModifyExhibition: React.FC<AddOrModifyExhibitionProps> = ({
  visible,
  exhibition,
  onCancel,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  const [loading, setLoading] = useState(false);

  // Prefill form when exhibition prop changes (edit mode)
  useEffect(() => {
    if (exhibition && visible) {
      setFormData({
        name: exhibition.name || '',
        location: exhibition.location || '',
        description: exhibition.description || '',
        startDate: exhibition.startDate ? new Date(exhibition.startDate).toISOString().split('T')[0] : '',
        endDate: exhibition.endDate ? new Date(exhibition.endDate).toISOString().split('T')[0] : '',
      });
    } else if (!exhibition && visible) {
      // Reset form for create mode
      setFormData({
        name: '',
        location: '',
        description: '',
        startDate: '',
        endDate: '',
      });
    }
  }, [exhibition, visible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate required fields
    if (!formData.name || !formData.location || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all required fields");
      setLoading(false);
      return;
    }

    // Validate dates
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      toast.error("Start date cannot be in the past");
      setLoading(false);
      return;
    }

    if (endDate <= startDate) {
      toast.error("End date must be after start date");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        description: formData.description.trim() || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
      };

      const endpoint = exhibition
        ? ExhibitionEndpoints.EXHIBITION.modify(exhibition.id)
        : ExhibitionEndpoints.EXHIBITION.create;

      const method = exhibition ? 'PUT' : 'POST';
      
      await apiRequest(endpoint, method, '', payload);
      
      onSuccess?.();
      onCancel();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-800">
            {exhibition ? 'Edit Exhibition' : 'Create New Exhibition'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {exhibition ? 'Update the exhibition details' : 'Set up a new exhibition with dates and location'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Exhibition Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exhibition Name *
              </label>
              <CustomTextInput
                value={formData.name}
                onChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
                placeholder="Enter exhibition name"
              />
            </div>

            {/* Location */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <CustomTextInput
                value={formData.location}
                onChange={(val) => setFormData(prev => ({ ...prev, location: val }))}
                placeholder="Enter exhibition location"
              />
            </div>

            {/* Start Date */}
            <div>
              <CustomDateInput
                label="Start Date *"
                value={formData.startDate}
                onChange={(value) => setFormData(prev => ({ ...prev, startDate: value }))}
                min={new Date().toISOString().split('T')[0]}
                helperText="Exhibition start date"
              />
            </div>

            {/* End Date */}
            <div>
              <CustomDateInput
                label="End Date *"
                value={formData.endDate}
                onChange={(value) => setFormData(prev => ({ ...prev, endDate: value }))}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
                helperText="Exhibition end date"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter exhibition description (optional)"
              />
            </div>
          </div>

          {/* Exhibition Summary */}
          {(formData.startDate && formData.endDate) && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3">Exhibition Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <p className="font-semibold">
                    {new Date(formData.startDate).toLocaleDateString()} - {new Date(formData.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Total Days:</span>
                  <p className="font-semibold">
                    {Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                  </p>
                </div>
                {formData.name && (
                  <div className="md:col-span-2">
                    <span className="text-gray-600">Exhibition:</span>
                    <p className="font-semibold">{formData.name} at {formData.location}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
            <CustomButton 
              type='negative' 
              label="Cancel"
              fn={onCancel}
              disabled={loading}
            />
            <CustomButton
              label={exhibition ? 'Update Exhibition' : 'Create Exhibition'}
              fn={handleSubmit}
              loading={loading}
              disabled={loading}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrModifyExhibition;