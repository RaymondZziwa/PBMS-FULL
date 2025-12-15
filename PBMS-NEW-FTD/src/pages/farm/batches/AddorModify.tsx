import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../libs/apiConfig';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import { type SeedlingBatch, type SeedlingGrowthStatus } from '../../../redux/types/farm';
import { farmEndpoints } from '../../../endpoints/farm/farmEndpoints';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import { X, Plus, Trash2 } from 'lucide-react';
import useSeedlingStages from '../../../hooks/farm/useSeedlingStages';
import useItems from '../../../hooks/inventory/useItems';
import useSeedlingBatches from '../../../hooks/farm/useSeedlingBatches';


interface AddorModifySeedlingBatchProps {
  visible: boolean;
  batch: SeedlingBatch | null;
  onCancel: () => void;
}

// Custom TextArea Component
const CustomTextArea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}> = ({ 
  value, 
  onChange, 
  placeholder, 
  rows = 3, 
  required = false, 
  disabled = false,
  className = ''
}) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      required={required}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none ${className} ${
        disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'
      }`}
    />
  );
};

interface SeedlingFormData {
  itemId: string;
  itemName: string;
  plantedQty: number;
}

const AddorModifySeedlingBatch: React.FC<AddorModifySeedlingBatchProps> = ({
  visible,
  batch,
  onCancel
}) => {
    const { refresh } = useSeedlingBatches();
  const { data: stagesData, refresh: refreshStages } = useSeedlingStages();
  const { data: itemsData, refresh: refreshItems } = useItems();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    batchNumber: '',
    currentStageId: '',
    seedlings: [{ itemId: '', itemName: '', plantedQty: 0 }],
    daysSpentInCurrentStage: 0,
    status: 'IN_PROGRESS' as SeedlingGrowthStatus,
    notes: '',
  });

  useEffect(() => {
    if (batch) {
      setFormData({
        batchNumber: batch.batchNumber || '',
        currentStageId: batch.currentStageId || '',
        seedlings: batch.seedlings.map(seedling => ({
          itemId: seedling.id,
          itemName: seedling.name, // Get name from existing batch
          plantedQty: seedling.plantedQty,
        })) || [{ itemId: '', itemName: '', plantedQty: 0 }],
        daysSpentInCurrentStage: batch.daysSpentInCurrentStage || 0,
        status: batch.status || 'IN_PROGRESS' as SeedlingGrowthStatus,
        notes: batch.notes || '',
      });
    } else {
      // Reset form when adding new
      setFormData({
        batchNumber: '',
        currentStageId: '',
        seedlings: [{ itemId: '', itemName: '', plantedQty: 0 }],
        daysSpentInCurrentStage: 0,
        status: 'IN_PROGRESS' as SeedlingGrowthStatus,
        notes: '',
      });
    }
  }, [batch, visible]);

  useEffect(() => {
    if (visible) {
      refreshStages();
      refreshItems();
    }
  }, [visible]);

  const handleSeedlingChange = (index: number, field: string, value: any) => {
    const newSeedlings = [...formData.seedlings];
    
    // If changing itemId, also update itemName
    if (field === 'itemId') {
      const selectedItem = itemsData?.find(item => item.id === value);
      newSeedlings[index] = { 
        ...newSeedlings[index], 
        itemId: value,
        itemName: selectedItem?.name || '' 
      };
    } else {
      newSeedlings[index] = { ...newSeedlings[index], [field]: value };
    }
    
    setFormData(prev => ({ ...prev, seedlings: newSeedlings }));
  };

  const handleAddSeedling = () => {
    setFormData(prev => ({
      ...prev,
      seedlings: [...prev.seedlings, { itemId: '', itemName: '', plantedQty: 0 }],
    }));
  };

  const handleRemoveSeedling = (index: number) => {
    if (formData.seedlings.length > 1) {
      const newSeedlings = formData.seedlings.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, seedlings: newSeedlings }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.batchNumber.trim()) {
      toast.error("Batch number is required");
      return;
    }
    
    if (!formData.currentStageId) {
      toast.error("Please select a current stage");
      return;
    }
    
    if (formData.seedlings.length === 0) {
      toast.error("At least one seedling is required");
      return;
    }
    
    // Validate seedling data
    const invalidSeedlings = formData.seedlings.some(seedling => 
      !seedling.itemId || !seedling.itemName || seedling.plantedQty <= 0
    );
    
    if (invalidSeedlings) {
      toast.error("Please select a seedling and enter a valid planted quantity for all items");
      return;
    }

    // Check for duplicate seedlings
    const seedlingIds = formData.seedlings.map(s => s.itemId);
    const hasDuplicates = new Set(seedlingIds).size !== seedlingIds.length;
    if (hasDuplicates) {
      toast.error("Duplicate seedlings found. Please remove duplicates.");
      return;
    }

    setLoading(true);
    try {
      // Transform data for API - include name from itemName
      const transformedData = {
        ...formData,
        seedlings: formData.seedlings.map(seedling => ({
          id: seedling.itemId,
          name: seedling.itemName, // Include the name
          plantedQty: seedling.plantedQty,
          currentQty: seedling.plantedQty, // Set current quantity same as planted
          lostQty: 0 // Initialize lost quantity as 0
        }))
      };

      const endpoint = batch ? farmEndpoints.seedlingBatch.update(batch.id) : farmEndpoints.seedlingBatch.create;
      const method = batch ? 'PATCH' : 'POST';

      await apiRequest(endpoint, method, '', transformedData);
        refresh();
      onCancel();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  // Prepare stage options for dropdown
  const stageOptions = stagesData?.map(stage => ({
    value: stage.id,
    label: stage.name
  })) || [];

  // Prepare item options for dropdown (assuming itemsData has id and name)
  const itemOptions = itemsData?.map(item => ({
    value: item.id,
    label: item.name
  })) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-800">
            {batch ? 'Edit Seedling Batch' : 'Add New Seedling Batch'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            type="button"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-700">Basic Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Batch Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Number *
                  </label>
                  <CustomTextInput
                    type="text"
                    value={formData.batchNumber}
                    onChange={(val) => setFormData(prev => ({ ...prev, batchNumber: val }))}
                    placeholder="e.g., BATCH-2024-001"
                    required
                  />
                </div>

                {/* Current Stage Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Stage *
                  </label>
                  <CustomDropdown
                    options={stageOptions}
                    value={formData.currentStageId ? [formData.currentStageId] : []}
                    onChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      currentStageId: value[0] || '' 
                    }))}
                    singleSelect={true}
                    placeholder="Select a stage"
                    searchable
                  />
                </div>
              </div>

              {/* Status and Days Spent */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <CustomDropdown
                    options={[
                      { value: 'IN_PROGRESS', label: 'In Progress' },
                      { value: 'COMPLETED', label: 'Completed' },
                      { value: 'FAILED', label: 'Failed' },
                    ]}
                    value={[formData.status]}
                    onChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      status: value[0] as SeedlingGrowthStatus 
                    }))}
                    singleSelect={true}
                    placeholder="Select status"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Days in Current Stage *
                  </label>
                  <CustomTextInput
                    type="number"
                    value={formData.daysSpentInCurrentStage}
                    onChange={(val) => setFormData(prev => ({ 
                      ...prev, 
                      daysSpentInCurrentStage: parseInt(val, 10) || 0 
                    }))}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Seedlings Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-700">Seedlings</h4>
                <button
                  type="button"
                  onClick={handleAddSeedling}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-700 font-medium"
                >
                  <Plus size={18} />
                  Add Seedling
                </button>
              </div>

              {formData.seedlings.map((seedling, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-700">
                        Seedling {index + 1}
                      </h5>
                      {seedling.itemName && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Selected:</span> {seedling.itemName}
                        </p>
                      )}
                    </div>
                    {formData.seedlings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSeedling(index)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seedling Item *
                      </label>
                      <CustomDropdown
                        options={itemOptions}
                        value={seedling.itemId ? [seedling.itemId] : []}
                        onChange={(value) => handleSeedlingChange(index, 'itemId', value[0] || '')}
                        singleSelect={true}
                        placeholder="Select a seedling item"
                        searchable
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Planted Quantity *
                      </label>
                      <CustomTextInput
                        type="number"
                        value={seedling.plantedQty}
                        onChange={(val) => handleSeedlingChange(index, 'plantedQty', parseInt(val, 10) || 0)}
                        placeholder="0"
                        min="1"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Current quantity will be set equal to planted quantity
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes - Using Custom TextArea */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <CustomTextArea
                value={formData.notes}
                onChange={(val) => setFormData(prev => ({ ...prev, notes: val }))}
                placeholder="Add any additional notes or observations about this batch..."
                rows={4}
              />
            </div>
          </form>
        </div>

        {/* Footer with Actions */}
        <div className="border-t p-6">
          <div className="flex justify-end space-x-3">
            <CustomButton
              type="negative"
              label="Cancel"
              fn={onCancel}
              disabled={loading}
            />
            <CustomButton
              label={batch ? 'Update Batch' : 'Create Batch'}
              fn={handleSubmit}
              loading={loading}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddorModifySeedlingBatch;