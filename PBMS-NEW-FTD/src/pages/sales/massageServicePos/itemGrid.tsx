import React, { useState, useEffect } from 'react';
import { FaSearch } from 'react-icons/fa';
import type { IItem, IStockStore } from '../../../redux/types/inventory';

interface ItemsGridProps {
  items: IStockStore[];
  selectedStore: string;
  filterCategory: string;
  onCategoryChange: (category: string) => void;
  onAddToCart: (item: IItem) => void;
  onBarcodeScan: (barcode: string) => void;
}

const ItemsGrid: React.FC<ItemsGridProps> = ({
  items,
  onAddToCart,
  onBarcodeScan,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;


  // Filter items based on search and category
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Handle barcode scanner input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // If user is typing in search, don't trigger barcode scan
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === 'Enter' && searchTerm) {
        onBarcodeScan(searchTerm);
        setSearchTerm('');
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [searchTerm, onBarcodeScan]);

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
  <div className="flex gap-4">
    {/* Search Input - Now takes up most space */}
    <div className="flex-1 relative">
      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder="Search by name or barcode..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>   
  </div>
</div>

      {/* Items Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedItems.map(item => (
            <div
              key={item.id}
              onClick={() => onAddToCart(item)}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            >
              <h3 className="font-semibold text-gray-800 mb-2">{item.name}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Price: {item.price.toLocaleString()} UGX</p>
                {
                  item.qty == 0 ? (
                    <p className="text-red-600">Out of Stock</p>
                  ) : <p className="text-green-600">In Stock: {item.qty} Available</p>
                }
              </div>
            </div>
          ))}
        </div>

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
                    ? 'bg-blue-600 text-white border-blue-600'
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