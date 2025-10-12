// components/StoreSelector.tsx
import React from 'react';
import { Warehouse, ChevronDown } from 'lucide-react';
import useStores from '../../hooks/inventory/useStores';


interface StoreSelectorProps {
  onStoreSelect: (storeId: string) => void;
  selectedStore?: string;
}

const StoreSelector: React.FC<StoreSelectorProps> = ({ onStoreSelect, selectedStore }) => {
  const {data: stores} = useStores()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Select Store</h2>
          <p className="text-gray-600 text-sm">Choose a store to view stock level analysis</p>
        </div>
        <Warehouse className="w-8 h-8 text-teal-600" />
      </div>

      <div className="space-y-4">
        <div className="relative">
          <select
            value={selectedStore || ''}
            onChange={(e) => onStoreSelect(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white pr-10"
          >
            <option value="">Select a store...</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        </div>

        {selectedStore && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
            <p className="text-teal-700 text-sm">
              Store selected. Loading report...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreSelector;