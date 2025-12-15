import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import CustomDropdown from '../../custom/inputs/customDropdown';
import CustomTextInput from '../../custom/inputs/customTextInput';
import CustomButton from '../../custom/buttons/customButton';
import { toast } from 'sonner';
import { apiRequest } from '../../libs/apiConfig';
import { ManufacturingEndpoints } from '../../endpoints/manufacturing/manufacturingEndpoints';
import useStores from '../../hooks/inventory/useStores';
import useItems from '../../hooks/inventory/useItems';
import useUnits from '../../hooks/inventory/useUnits';
import type { IStore } from '../../redux/types/inventory';
import type { IItem } from '../../redux/types/inventory';
import type { IUnit } from '../../redux/types/inventory';
import type { RootState } from '../../redux/store';

interface IManufacturingRecord {
  id: string;
  storeId: string;
  storeName: string;
  primaryUnitId?: string;
  primaryUnit?: {
    id: string;
    name: string;
    abr?: string;
  };
  totalQuantity: number;
  unitId: string;
  unitName: string;
  estimatedOutput: number;
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
  }>;
  createdAt: string;
}

interface AddOrModifyManufacturingProps {
  visible: boolean;
  record: IManufacturingRecord | null;
  onCancel: () => void;
  onSuccess?: () => void; // Callback to refresh the list after successful creation
}

interface ManufacturingItem {
  itemId: string;
  itemName: string;
  quantity: number; // in litres
}

const AddOrModifyManufacturing: React.FC<AddOrModifyManufacturingProps> = ({
  visible,
  record,
  onCancel,
  onSuccess,
}) => {
  const { data: storesData } = useStores();
  const { data: itemsData } = useItems();
  const { data: unitsData } = useUnits();
  
  // Get current user from auth state
  const currentUser = useSelector((state: RootState) => state.userAuth.data);

  // Extract data arrays - hooks return slice state with data property
  const stores = useMemo(() => {
    return Array.isArray(storesData) ? storesData : (storesData as { data?: IStore[] })?.data || [];
  }, [storesData]);

  const items = useMemo(() => {
    return Array.isArray(itemsData) ? itemsData : (itemsData as { data?: IItem[] })?.data || [];
  }, [itemsData]);

  const units = useMemo(() => {
    return Array.isArray(unitsData) ? unitsData : (unitsData as { data?: IUnit[] })?.data || [];
  }, [unitsData]);

  // Filter units to only show Litres (L) and Kilograms (KG)
  const primaryUnits = useMemo(() => {
    return units.filter((unit: IUnit) => {
      const unitName = unit.name.toUpperCase();
      const unitAbr = (unit.abr || '').toUpperCase();
      return (
        unitName.includes('LITRE') ||
        unitName.includes('LITER') ||
        unitAbr === 'L' ||
        unitName.includes('KILOGRAM') ||
        unitName.includes('KILO') ||
        unitAbr === 'KG'
      );
    });
  }, [units]);

  const [formData, setFormData] = useState({
    storeId: '',
    primaryUnitId: '', // Unit ID for primary unit (L or KG)
    manufacturingItems: [{ itemId: '', itemName: '', quantity: 0 }] as ManufacturingItem[],
    unitId: '', // Unit ID for packing unit
  });

  // Get selected primary unit
  const selectedPrimaryUnit = useMemo(() => {
    return units.find((u: IUnit) => u.id === formData.primaryUnitId);
  }, [units, formData.primaryUnitId]);

  // Calculate total quantity in primary unit (L or KG)
  const totalQuantity = useMemo(() => {
    return formData.manufacturingItems.reduce((sum, item) => {
      return sum + (item.quantity || 0);
    }, 0);
  }, [formData.manufacturingItems]);

  // Get selected unit
  const selectedUnit = useMemo(() => {
    return units.find((u: IUnit) => u.id === formData.unitId);
  }, [units, formData.unitId]);

  // Calculate estimated output (pieces/units)
  // Formula: Convert total quantity to base unit (L->ml or KG->g), then divide by unit value
  const estimatedOutput = useMemo(() => {
    if (!selectedUnit || !selectedUnit.value || selectedUnit.value <= 0 || totalQuantity === 0) {
      return 0;
    }
    if (!selectedPrimaryUnit || !selectedPrimaryUnit.value || selectedPrimaryUnit.value <= 0) {
      return 0;
    }
    // Convert primary unit to base unit
    // If L: convert to millilitres (1L = 1000ml)
    // If KG: convert to grams (1KG = 1000g)
    // Use the primary unit's value to convert (e.g., if primary unit is "Litre" with value 1, then 1L = 1000ml)
    const totalBaseUnits = totalQuantity * 1000;
    // Divide by unit value to get estimated number of output units/pieces
    const output = totalBaseUnits / selectedUnit.value;
    return Math.floor(output);
  }, [totalQuantity, selectedUnit, selectedPrimaryUnit]);

  useEffect(() => {
    if (record) {
      setFormData({
        storeId: record.storeId,
        primaryUnitId: (record as IManufacturingRecord & { primaryUnitId?: string }).primaryUnitId || '',
        manufacturingItems: record.items.map((item) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
        })),
        unitId: record.unitId,
      });
    } else {
      setFormData({
        storeId: '',
        primaryUnitId: '',
        manufacturingItems: [{ itemId: '', itemName: '', quantity: 0 }],
        unitId: '',
      });
    }
  }, [record, visible]);

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      manufacturingItems: [...prev.manufacturingItems, { itemId: '', itemName: '', quantity: 0 }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (formData.manufacturingItems.length > 1) {
      setFormData((prev) => ({
        ...prev,
        manufacturingItems: prev.manufacturingItems.filter((_, i) => i !== index),
      }));
    }
  };

  const handleItemChange = (index: number, field: 'itemId' | 'quantity', value: string | number) => {
    setFormData((prev) => {
      const updatedItems = [...prev.manufacturingItems];
      if (field === 'itemId') {
        const selectedItem = items.find((item: IItem) => item.id === value);
        updatedItems[index] = {
          ...updatedItems[index],
          itemId: value as string,
          itemName: selectedItem ? selectedItem.name : '',
        };
      } else {
        updatedItems[index] = {
          ...updatedItems[index],
          quantity: Number(value) || 0,
        };
      }
      return {
        ...prev,
        manufacturingItems: updatedItems,
      };
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.storeId) {
      toast.error('Please select a store');
      return;
    }

    if (!formData.primaryUnitId) {
      toast.error('Please select a primary unit');
      return;
    }

    if (!selectedPrimaryUnit) {
      toast.error('Selected primary unit is invalid');
      return;
    }

    if (formData.manufacturingItems.some((item) => !item.itemId || item.quantity <= 0)) {
      toast.error('Please fill in all items with valid quantities');
      return;
    }

    if (!formData.unitId) {
      toast.error('Please select a unit of measurement');
      return;
    }

    if (totalQuantity <= 0) {
      toast.error('Total quantity must be greater than 0');
      return;
    }

    if (!selectedUnit || !selectedUnit.value || selectedUnit.value <= 0) {
      toast.error('Selected unit must have a valid value');
      return;
    }

    // Prepare payload for API submission
    // Payload structure:
    // {
    //   storeId: string,              // ID of the selected store
    //   primaryUnitId: string,        // ID of the primary unit for collection (L or KG unit)
    //   unitId: string,               // ID of the unit of measurement for packing
    //   totalQuantity: number,        // Total quantity in primary unit (sum of all items)
    //   estimatedOutput: number,      // Estimated number of output units/pieces based on unit calculation
    //   items: [                      // Array of manufacturing items
    //     {
    //       itemId: string,           // ID of the item
    //       itemName: string,         // Name of the item (for reference)
    //       quantity: number          // Quantity in primary unit for this specific item
    //     }
    //   ]
    // }
    const payload = {
      storeId: formData.storeId,
      primaryUnitId: formData.primaryUnitId,
      unitId: formData.unitId,
      totalQuantity: parseFloat(totalQuantity.toFixed(2)), // Round to 2 decimal places
      estimatedOutput: estimatedOutput,
      items: formData.manufacturingItems.map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: parseFloat(item.quantity.toFixed(2)), // Round to 2 decimal places
      })),
    };

    // Get current user's employee ID
    if (!currentUser?.id) {
      toast.error('User not authenticated. Please login again.');
      return;
    }

    // Add manufacturedBy to payload
    const finalPayload = {
      ...payload,
      manufacturedBy: currentUser.id,
      notes: '', // Can be added later if needed
    };

    try {
      const response = await apiRequest<{ status: number; message: string; data: unknown }>(
        ManufacturingEndpoints.create,
        'POST',
        '',
        finalPayload,
      );

      if (response.status === 200) {
        toast.success(response.message || 'Manufacturing record created successfully!');
        onSuccess?.(); // Refresh the list
        onCancel();
      }
    } catch (error) {
      console.error('Failed to create manufacturing record:', error);
      // Error toast is already handled by apiRequest
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">
              {record ? 'View Manufacturing Record' : 'New Manufacturing Record'}
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Store Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Store *
              </label>
              <CustomDropdown
                options={stores.map((store: IStore) => ({
                  label: store.name,
                  value: store.id,
                }))}
                value={formData.storeId ? [formData.storeId] : []}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, storeId: val[0] || '' }))
                }
                placeholder="Select store"
                singleSelect
                disabled={!!record}
              />
            </div>

            {/* Primary Unit Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Unit *
              </label>
              <CustomDropdown
                options={primaryUnits.map((unit: IUnit) => ({
                  label: `${unit.name}${unit.abr ? ` (${unit.abr})` : ''}`,
                  value: unit.id,
                }))}
                value={formData.primaryUnitId ? [formData.primaryUnitId] : []}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, primaryUnitId: val[0] || '' }))
                }
                placeholder="Select primary unit (L or KG)"
                singleSelect
                disabled={!!record}
              />
              <p className="text-xs text-gray-500 mt-1">
                Select the unit for collecting/manufacturing quantities (Litres or Kilograms only)
              </p>
            </div>

            {/* Manufacturing Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-700">Manufacturing Items</h4>
                {!record && (
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-700 font-medium"
                  >
                    <Plus size={18} />
                    Add Item
                  </button>
                )}
              </div>

              {formData.manufacturingItems.map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-700">Item {index + 1}</h5>
                      {item.itemName && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Selected:</span> {item.itemName}
                        </p>
                      )}
                    </div>
                    {!record && formData.manufacturingItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Item Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item *
                      </label>
                      <CustomDropdown
                        options={items.map((i: IItem) => ({
                          label: i.name,
                          value: i.id,
                        }))}
                        value={item.itemId ? [item.itemId] : []}
                        onChange={(val) => handleItemChange(index, 'itemId', val[0] || '')}
                        placeholder="Select item"
                        singleSelect
                        disabled={!!record}
                      />
                    </div>

                    {/* Quantity Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity {selectedPrimaryUnit ? `(${selectedPrimaryUnit.abr || selectedPrimaryUnit.name})` : ''} *
                      </label>
                      <CustomTextInput
                        type="number"
                        value={item.quantity.toString()}
                        onChange={(val) => handleItemChange(index, 'quantity', val)}
                        placeholder={selectedPrimaryUnit ? `Enter quantity in ${selectedPrimaryUnit.name.toLowerCase()}` : 'Enter quantity'}
                        disabled={!!record || !formData.primaryUnitId}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Quantity Display */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Quantity:</span>
                <span className="text-lg font-bold text-blue-700">
                  {totalQuantity.toFixed(2)} {selectedPrimaryUnit?.abr || selectedPrimaryUnit?.name || ''}
                </span>
              </div>
            </div>

            {/* Unit of Measurement Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measurement for Packing *
              </label>
              <CustomDropdown
                options={units.map((unit: IUnit) => ({
                  label: `${unit.name}${unit.abr ? ` (${unit.abr})` : ''}`,
                  value: unit.id,
                }))}
                value={formData.unitId ? [formData.unitId] : []}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, unitId: val[0] || '' }))
                }
                placeholder="Select unit of measurement"
                singleSelect
                disabled={!!record}
              />
            </div>

            {/* Estimated Output Display */}
            {formData.unitId && totalQuantity > 0 && selectedUnit?.value && selectedUnit.value > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Estimated Output:
                  </span>
                  <span className="text-lg font-bold text-green-700">
                    {estimatedOutput.toLocaleString()} pcs of {selectedUnit.abr || selectedUnit.name}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Calculation: {totalQuantity.toFixed(2)}{selectedPrimaryUnit?.abr || selectedPrimaryUnit?.name || ''} = {(totalQuantity * 1000).toFixed(0)}{selectedPrimaryUnit?.name.toUpperCase().includes('LITRE') || selectedPrimaryUnit?.abr === 'L' ? 'ml' : 'g'} ÷ {selectedUnit.value}{selectedUnit.abr || 'units'} = {estimatedOutput.toLocaleString()} pcs of {selectedUnit.abr || selectedUnit.name}
                </p>
              </div>
            )}
            {formData.unitId && totalQuantity > 0 && (!selectedUnit?.value || selectedUnit.value <= 0) && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Selected unit does not have a valid value. Please select a unit with a value (e.g., 100ml, 250ml, 100g, 500g, etc.)
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {!record && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <CustomButton
                  label="Cancel"
                  fn={onCancel}
                  type='negative'
                />
                <CustomButton
                  label="Save Manufacturing Record"
                  type='positive'
                  fn={handleSubmit}
                />
              </div>
            )}
            {record && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <CustomButton
                  label="Close"
                  type='negative'
                  fn={onCancel}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddOrModifyManufacturing;

