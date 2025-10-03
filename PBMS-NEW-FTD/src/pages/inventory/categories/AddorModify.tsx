import React, { useState, useEffect } from 'react';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { apiRequest } from '../../../libs/apiConfig';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import type { IItemCategory } from '../../../redux/types/inventory';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import useItemCategories from '../../../hooks/inventory/useItemCategories';


interface AddorModifyItemCategoryProps {
  visible: boolean;
  category: IItemCategory | null;
  onCancel: () => void;
}

const AddorModifyItemCategory: React.FC<AddorModifyItemCategoryProps> = ({
  visible,
  category,
  onCancel
}) => {
  const {refresh} = useItemCategories()
  const [formData, setFormData] = useState({
    name: '',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || ''
      });
    } else {
      setFormData({
        name: '',
      });
    }
  }, [category]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please fill in all the fields")
      return;
    }
    try {
      const endpoint = category ? InventoryEndpoints.ITEM_CATEGORIES.modify(category.id!) : InventoryEndpoints.ITEM_CATEGORIES.create;
      const method = category ? "PATCH" : "POST"
      await apiRequest(endpoint, method, '', formData);
      refresh();
      setFormData({
        name: '',
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
          {category ? 'Edit Item Category' : 'Add New Item Category'}
        </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Category Name *
              </label>
              <CustomTextInput
                type="text"
                value={formData.name}
                onChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
              placeholder="Enter category name"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <CustomButton type='negative' fn={onCancel}/>
            <CustomButton autoCloseModal={onCancel} label={category ? 'Update Category' : 'Create Category'} fn={handleSubmit}/>
           
          </div>
      </div>
    </div>
  );
};

export default AddorModifyItemCategory