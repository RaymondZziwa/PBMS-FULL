// components/productSelector.tsx
import React, { useState, useEffect } from 'react';
import { Package, Search } from 'lucide-react';
import { baseURL } from '../../../libs/apiConfig';
import useItems from '../../../hooks/inventory/useItems';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface ProductSelectorProps {
  onProductSelect: (productId: string) => void;
  selectedProduct: string;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  onProductSelect,
  selectedProduct,
}) => {
    const {data: products} = useItems()
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <Package className="w-5 h-5 mr-2" />
        Select Product
      </h2>
      
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>
      
      <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
            <span className="ml-2 text-gray-600">Loading products...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No products found
          </div>
        ) : (
          filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => onProductSelect(product.id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors ${
                selectedProduct === product.id ? 'bg-teal-50 border-teal-200' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900 block">{product.name}</span>
                  <span className="text-sm text-gray-500">{product.category}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    {formatCurrency(product.price)}
                  </span>
                  {selectedProduct === product.id && (
                    <div className="w-4 h-4 bg-teal-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductSelector;