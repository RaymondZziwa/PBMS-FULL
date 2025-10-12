// components/ProductPerformanceReport.tsx
import React, { useState, useEffect } from 'react';
import { Download, Package, TrendingUp, BarChart3, ShoppingCart, Store, Search, X } from 'lucide-react';
import ReportHeader from '../reportHeader';
import { baseURL } from '../../../libs/apiConfig';
import axios from 'axios';
import CustomDateInput from '../../../custom/inputs/customDateSelector';
import useItems from '../../../hooks/inventory/useItems';
import useStores from '../../../hooks/inventory/useStores';

interface ProductSale {
  saleId: string;
  date: Date;
  store: string;
  quantity: number;
  price: number;
  total: number;
  discount: number;
}

interface ProductPerformanceData {
  product: {
    id: string;
    name: string;
    category: string;
    totalUnitsSold: number;
    totalRevenue: number;
    averagePrice: number;
    salesCount: number;
    storeCount: number;
  };
  sales: ProductSale[];
  summary: {
    totalUnitsSold: number;
    totalRevenue: number;
    averagePrice: number;
    salesCount: number;
    storeCount: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

interface CompanyInfo {
  id: string;
  name: string;
  email: string;
  tel1: string;
  tel2: string;
  address: string;
  logo: string;
  website: string;
  tinNumber: string;
  description: string;
  foundedYear: number;
  industry: string;
  employees: string;
}

interface Product {
  id: string;
  name: string;
  category: {
    name: string;
  };
  sellingPrice: number;
}

interface StoreType {
  id: string;
  name: string;
}

const ProductPerformanceReport: React.FC = () => {
    const { data: products } = useItems();
    const {data: stores} = useStores()
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [reportData, setReportData] = useState<ProductPerformanceData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  // Selector states
  const [productSearch, setProductSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);

  // Fetch initial data on mount
  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  // Fetch report data when product, store, or dates change
  useEffect(() => {
    if (selectedProduct) {
      fetchReportData();
    }
  }, [selectedProduct, selectedStore, dateFilter]);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch(`${baseURL}/api/company/profile`);
      if (!response.ok) throw new Error('Failed to fetch company info');
      const data = await response.json();
      setCompanyInfo(data);
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

  const fetchReportData = async () => {
    if (!selectedProduct) return;
    
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (selectedStore) queryParams.append('storeId', selectedStore);
      if (dateFilter.startDate) queryParams.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) queryParams.append('endDate', dateFilter.endDate);

      const response = await fetch(
        `${baseURL}/api/reports/sales/product-performance?itemId=${selectedProduct}&${queryParams.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch report data');
      
      const data = await response.json();
      setReportData(data.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedProduct) return;
    
    try {
      setExporting(true);
      const response = await axios.get(`${baseURL}/api/reports/export/product-performance`, {
        params: {
          itemId: selectedProduct,
          storeId: selectedStore,
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate,
        },
      });

      const { buffer, filename, mimeType } = response.data;
      const uint8Array = new Uint8Array(buffer.data);
      const file = new Blob([uint8Array], { type: mimeType });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, "_blank");
      
      setExporting(false);
    } catch (error) {
      console.error("Error previewing the report:", error);
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSelectedProduct = () => {
    return products.find(p => p.id === selectedProduct);
  };

  const getSelectedStore = () => {
    return stores.find(s => s.id === selectedStore);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.category.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (!companyInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Product Selection Section */}
        {!selectedProduct && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Select Product to Analyze
            </h2>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products by name or category..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Product List */}
            <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                  <span className="ml-2 text-gray-600">Loading products...</span>
                </div>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product.id)}
                    className="w-full text-left px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-teal-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.category.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(product.price)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">
                  {productSearch ? 'No products found matching your search' : 'No products available'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Report Content */}
        {selectedProduct && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Report Header */}
            <div className="px-8 py-6 border-b border-gray-200">
              <ReportHeader 
                companyInfo={companyInfo}
                reportName="Product Performance Report"
                generatedDate={new Date()}
              />

              {/* Selected Product Display */}
              <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-sm text-teal-600 font-medium">Selected Product</div>
                  <div className="text-lg font-semibold text-teal-900">
                    {getSelectedProduct()?.name}
                  </div>
                  <div className="text-sm text-teal-700">
                    {getSelectedProduct()?.category.name}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedProduct('');
                    setReportData(null);
                  }}
                  className="px-4 py-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors flex items-center"
                >
                  <X className="w-4 h-4 mr-1" />
                  Change Product
                </button>
              </div>
              
              {/* Filters */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Store Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store (Optional)
                  </label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    disabled={loadingStores}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">All Stores</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filters */}
                <div>
                  <CustomDateInput
                    label="Start Date"
                    value={dateFilter.startDate}
                    onChange={(value) => setDateFilter(prev => ({ ...prev, startDate: value }))}
                    max={dateFilter.endDate || undefined}
                    helperText="Optional"
                  />
                </div>
                <div>
                  <CustomDateInput
                    label="End Date"
                    value={dateFilter.endDate}
                    onChange={(value) => setDateFilter(prev => ({ ...prev, endDate: value }))}
                    min={dateFilter.startDate || undefined}
                    helperText="Optional"
                  />
                </div>

                {/* Export Button */}
                <div className="flex items-end">
                  <button
                    onClick={handleExportPDF}
                    disabled={exporting || !reportData}
                    className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {exporting ? 'Exporting...' : 'Export PDF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Report Body */}
            <div className="p-8">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                  <span className="ml-3 text-gray-600">Loading product data...</span>
                </div>
              ) : reportData ? (
                <div className="space-y-8">
                  {/* Product Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      Product Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-900">
                      <div>
                        <strong>Product Name:</strong> {reportData.product.name}
                      </div>
                      <div>
                        <strong>Category:</strong> {reportData.product.category}
                      </div>
                      <div>
                        <strong>Average Price:</strong> {formatCurrency(reportData.product.averagePrice)}
                      </div>
                      <div>
                        <strong>Stores Selling:</strong> {reportData.product.storeCount} location{reportData.product.storeCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="border-2 rounded-lg p-6 text-green-600 bg-green-50 border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Units Sold</h3>
                          <p className="text-3xl font-bold">{reportData.summary.totalUnitsSold.toLocaleString()}</p>
                          <p className="text-sm opacity-75 mt-1">total quantity</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="border-2 rounded-lg p-6 text-blue-600 bg-blue-50 border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
                          <p className="text-3xl font-bold">{formatCurrency(reportData.summary.totalRevenue)}</p>
                          <p className="text-sm opacity-75 mt-1">generated</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="border-2 rounded-lg p-6 text-purple-600 bg-purple-50 border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Sales Count</h3>
                          <p className="text-3xl font-bold">{reportData.summary.salesCount}</p>
                          <p className="text-sm opacity-75 mt-1">transactions</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="border-2 rounded-lg p-6 text-teal-600 bg-teal-50 border-teal-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Stores</h3>
                          <p className="text-3xl font-bold">{reportData.summary.storeCount}</p>
                          <p className="text-sm opacity-75 mt-1">selling</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <Store className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sales History */}
                  {reportData.sales.length > 0 && (
                    <div className="border border-gray-200 rounded-lg">
                      <div className="px-6 py-4 border-b bg-teal-50 border-teal-200">
                        <h3 className="text-xl font-semibold flex items-center text-teal-900">
                          <BarChart3 className="w-5 h-5 mr-2" />
                          Sales History ({reportData.sales.length} transactions)
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Store
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantity
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Price
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Discount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.sales.map((sale, index) => (
                              <tr key={`${sale.saleId}-${index}`} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatDate(sale.date.toString())}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {sale.store}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                                  {sale.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                  {formatCurrency(sale.price)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                  {formatCurrency(sale.total)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                  {formatCurrency(sale.discount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Performance Insights */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Performance Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-800">
                      <div>
                        <strong>Average Units per Sale:</strong> {(reportData.summary.totalUnitsSold / reportData.summary.salesCount).toFixed(1)}
                      </div>
                      <div>
                        <strong>Revenue per Unit:</strong> {formatCurrency(reportData.summary.totalRevenue / reportData.summary.totalUnitsSold)}
                      </div>
                      <div>
                        <strong>Period:</strong> {formatDate(reportData.period.startDate)} - {formatDate(reportData.period.endDate)}
                      </div>
                      <div>
                        <strong>Average Sale Value:</strong> {formatCurrency(reportData.summary.totalRevenue / reportData.summary.salesCount)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Product Data</h3>
                  <p className="text-gray-500">No sales data found for the selected product and criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPerformanceReport;