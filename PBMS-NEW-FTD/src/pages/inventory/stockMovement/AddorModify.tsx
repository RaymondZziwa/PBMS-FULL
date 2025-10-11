import React, { useState, useEffect } from 'react';
import CustomTextInput from '../../../custom/inputs/customTextInput';
import { apiRequest } from '../../../libs/apiConfig';
import CustomButton from '../../../custom/buttons/customButton';
import { toast } from 'sonner';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import { InventoryEndpoints } from '../../../endpoints/inventory/inventory';

import useItems from '../../../hooks/inventory/useItems';
import useStores from '../../../hooks/inventory/useStores';
import type { IItem, IStockMovement, IStore, IUnit } from '../../../redux/types/inventory';
import useUnits from '../../../hooks/inventory/useUnits';
import CustomTextarea from '../../../custom/inputs/customTextArea';
import useStockMovement from '../../../hooks/inventory/useStockMovement';

interface AddOrModifyRecordProps {
  visible: boolean;
  onCancel: () => void;
    employeeId: string;
    record: IStockMovement
}

const AddOrModifyRecord: React.FC<AddOrModifyRecordProps> = ({
  visible,
  onCancel,
  employeeId
}) => {
  const { data: items } = useItems();
  const { data: stores } = useStores();
    const { data: units } = useUnits();
    const {refresh} = useStockMovement()

  const [formData, setFormData] = useState({
    itemId: '',
    storeId: '',
    unitId: '',
    qty: '',
    source: '',
    description: '',
    category: '', // RESTOCK | DEPLETION | ADJUSTMENT
  });

  useEffect(() => {
    if (!visible) {
      setFormData({
        itemId: '',
        storeId: '',
        unitId: '',
        qty: '',
        source: '',
        description: '',
        category: '',
      });
    }
  }, [visible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.itemId || !formData.storeId || !formData.unitId || !formData.qty || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const payload = {
        itemId: formData.itemId,
        storeId: formData.storeId,
        unitId: formData.unitId,
        qty: parseFloat(formData.qty),
        source: formData.source,
        description: formData.description,
        category: formData.category,
        employeeId, // ✅ from props
      };

        await apiRequest(InventoryEndpoints.STOCK_MVT.create, "POST", '', payload);
        refresh()
      onCancel();
    } catch (error: any) {
        console.log(error)
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Record Stock Movement
        </h3>

        <div className="space-y-4">
          {/* Item */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
            <CustomDropdown
              options={items?.map((i: IItem) => ({ label: i.name, value: i.id })) || []}
              value={formData.itemId ? [formData.itemId] : []}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, itemId: val[0] || '' }))
              }
              placeholder="Select item"
              singleSelect
            />
          </div>

          {/* Store */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store *</label>
            <CustomDropdown
              options={stores?.map((s: IStore) => ({ label: s.name, value: s.id })) || []}
              value={formData.storeId ? [formData.storeId] : []}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, storeId: val[0] || '' }))
              }
              placeholder="Select store"
              singleSelect
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
            <CustomDropdown
              options={units?.map((u: IUnit) => ({ label: u.name, value: u.id })) || []}
              value={formData.unitId ? [formData.unitId] : []}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, unitId: val[0] || '' }))
              }
              placeholder="Select unit"
              singleSelect
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <CustomTextInput
              type="number"
              value={formData.qty}
              onChange={(val) => setFormData((prev) => ({ ...prev, qty: val }))}
              placeholder="Enter quantity"
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <CustomTextInput
              type="text"
              value={formData.source}
              onChange={(val) => setFormData((prev) => ({ ...prev, source: val }))}
              placeholder="Enter source (optional)"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type *</label>
            <CustomDropdown
              options={[
                { label: 'Restock', value: 'RESTOCK' },
                { label: 'Depletion', value: 'DEPLETION' },
                { label: 'Adjustment', value: 'ADJUSTMENT' },
              ]}
              value={formData.category ? [formData.category] : []}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, category: val[0] || '' }))
              }
              placeholder="Select type"
              singleSelect
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <CustomTextarea
              value={formData.description}
              onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
              placeholder="Enter description (optional)"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <CustomButton type="negative" fn={onCancel} label="Cancel" />
          <CustomButton
            label="Submit"
            fn={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
};

export default AddOrModifyRecord;
