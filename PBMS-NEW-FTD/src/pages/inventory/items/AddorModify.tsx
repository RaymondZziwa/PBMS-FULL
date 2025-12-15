import React, { useState, useEffect } from 'react';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { apiRequest } from '../../../libs/apiConfig';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import type { IItem, IItemCategory } from '../../../redux/types/inventory';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';
import useItemCategories from '../../../hooks/inventory/useItemCategories';
import useItems from '../../../hooks/inventory/useItems';
import CustomDropdown from '../../../custom/inputs/customDropdown';

interface AddOrModifyItemProps {
  visible: boolean;
  item: IItem | null;
  onCancel: () => void;
}

const AddOrModifyItem: React.FC<AddOrModifyItemProps> = ({
  visible,
  item,
  onCancel,
}) => {
  const { refresh: refreshItems } = useItems();
  const { data: itemCategories } = useItemCategories();
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    barcode: '',
    categoryId: '',
    showInPos: false,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        price: item.price?.toString() || '',
        barcode: item.barcode?.toString() || '',
        categoryId: item.category?.id || '',
        showInPos: item.showInPos ?? false,
      });
    } else {
      setFormData({
        name: '',
        price: '',
        barcode: '',
        categoryId: '',
        showInPos: false,
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.categoryId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        price: parseFloat(formData.price),
        barcode: formData.barcode.toString(),
        categoryId: formData.categoryId,
        showInPos: formData.showInPos,
      };

      const endpoint = item
        ? InventoryEndpoints.ITEM.modify(item.id)
        : InventoryEndpoints.ITEM.create;

      const method = item ? 'PATCH' : 'POST';
      await apiRequest(endpoint, method, '', payload);

      refreshItems();
      setFormData({
        name: '',
        price: '',
        barcode: '',
        categoryId: '',
        showInPos: false,
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {item ? 'Edit Item' : 'Add New Item'}
        </h3>

        <div className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <CustomDropdown
              options={itemCategories?.map((cat: IItemCategory) => ({
                label: cat.name,
                value: cat.id,
              }))}
              value={formData.categoryId ? [formData.categoryId] : []}
              onChange={(val: string[]) =>
                setFormData((prev) => ({
                  ...prev,
                  categoryId: val[0] || '',
                }))
              }
              placeholder="Select a category"
            />
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name *
            </label>
            <CustomTextInput
              type="text"
              value={formData.name}
              onChange={(val) => setFormData((prev) => ({ ...prev, name: val }))}
              placeholder="Enter item name"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price *
            </label>
            <CustomTextInput
              type="number"
              value={formData.price}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, price: val }))
              }
              placeholder="Enter item price"
            />
          </div>

          {/* Toggle: Show in POS */}
          <div className="flex items-center justify-between mt-4">
            <label className="text-sm font-medium text-gray-700">
              Show item in POS
            </label>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, showInPos: !prev.showInPos }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                formData.showInPos ? 'bg-gray-700' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                  formData.showInPos ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <CustomButton type="negative" fn={onCancel} />
          <CustomButton
            autoCloseModal={onCancel}
            label={item ? 'Update Item' : 'Create Item'}
            fn={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
};

export default AddOrModifyItem;
