import React, { useState, useEffect } from 'react';
import { FaSearch, FaStore } from 'react-icons/fa';
import type { IItem, IStockStore, IStore } from '../../../redux/types/inventory';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import { toast } from 'sonner';

interface ItemsGridProps {
  items: IStockStore[];
  selectedStore: string;
  filterCategory: string;
  onCategoryChange: (category: string) => void;
  onAddToCart: (item: IItem) => void;
  onBarcodeScan: (barcode: string) => void;
  stores: IStore[];
  activeStore: string;
}

const ItemsGrid: React.FC<ItemsGridProps> = ({
  items,
  filterCategory,
  onCategoryChange,
  onAddToCart,
  onBarcodeScan,
  stores,
  activeStore,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStore, setSelectedStore] = useState(activeStore);
  const itemsPerPage = 20;

  // Get unique categories
  const categories = ['all', ...new Set(items.map(item => item.item.category.name))];

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item.barcode.toString().includes(searchTerm);
    const matchesCategory =
      filterCategory === 'all' || item.item.category.name === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Handle barcode scanning
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Enter' && searchTerm) {
        onBarcodeScan(searchTerm);
        setSearchTerm('');
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [searchTerm, onBarcodeScan]);

  // Handle store change
  const handleStoreChange = (newStoreId: string) => {
    const selected = stores.find(s => s.id === newStoreId);
    if (!selected) return;
    setSelectedStore(newStoreId);

    const storeData = {
      storeId: selected.id,
      storeName: selected.name,
      timestamp: Date.now(),
    };
    localStorage.setItem('posStore', JSON.stringify(storeData));
    toast.success(`Active store changed to ${selected.name}`);
    window.location.reload(); // reload to refetch stock for the new store
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
        <div className="flex flex-wrap gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="w-1/4 min-w-[200px]">
            <CustomDropdown
              options={categories.map(category => ({
                value: category,
                label: category === 'all' ? 'All Categories' : category,
              }))}
              value={[filterCategory]}
              onChange={(selectedValues) => {
                onCategoryChange(selectedValues[0] || 'all');
                setCurrentPage(1);
              }}
              placeholder="Select category..."
              searchPlaceholder="Search categories..."
              singleSelect
            />
          </div>

          {/* Store Selector */}
          <div className="w-1/4 min-w-[220px] flex items-center gap-2">
            <FaStore className="text-gray-600" />
            <CustomDropdown
              options={stores.map(store => ({
                value: store.id,
                label: store.name,
              }))}
              value={[selectedStore]}
              onChange={(selectedValues) => {
                if (selectedValues[0]) handleStoreChange(selectedValues[0]);
              }}
              placeholder="Select store..."
              singleSelect
            />
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-auto">
        {paginatedItems.length === 0 ? (
          <p className="text-center text-gray-500 mt-10">No items found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedItems.map(item => (
              <div
                key={item.id}
                onClick={() => onAddToCart(item.item)}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              >
                <h3 className="font-semibold text-gray-800 mb-2">{item.item.name}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Price: {item.item.price.toLocaleString()} UGX</p>
                  <p>Barcode: {item.item.barcode}</p>
                  <p>Category: {item.item.category.name}</p>
                  {item.qty === 0 ? (
                    <p className="text-red-600 font-medium">Out of Stock</p>
                  ) : (
                    <p className="text-green-600 font-medium">
                      In Stock: {item.qty} Available
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 border rounded-lg ${
                  currentPage === page
                    ? 'bg-gray-600 text-white border-gray-600'
                    : 'border-gray-300'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsGrid;
