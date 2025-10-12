// components/StockMovementAnalysisReport.tsx
import React, { useState, useEffect } from 'react';
import { Download, Package, ArrowUp, ArrowDown, RefreshCw, Filter } from 'lucide-react';
import ReportHeader from '../reportHeader';
import StoreSelector from '../storeSelector';
import { baseURL } from '../../../libs/apiConfig';
import axios from 'axios';
import CustomDateInput from '../../../custom/inputs/customDateSelector';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import categories from '../../inventory/categories';
import items from '../../inventory/items';
import useItemCategories from '../../../hooks/inventory/useItemCategories';
import useItems from '../../../hooks/inventory/useItems';

interface Category {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
}

interface Item {
  id: string;
  name: string;
  category: Category;
}

interface Store {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
  abr: string;
  updatedAt: string;
  createdAt: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface Movement {
  id: string;
  category: string;
  itemId: string;
  storeId: string;
  qty: number;
  unitId: string;
  source: string;
  description: string;
  recordedBy: string;
  updatedAt: string;
  createdAt: string;
  item: Item;
  store: Store;
  unit: Unit;
  employee: Employee;
}

interface Summary {
  totalMovements: number;
  totalIn: number;
  totalOut: number;
  netMovement: number;
  movementBreakdown: {
    stockIn: number;
    stockOut: number;
    adjustments: number;
  };
  quantityBreakdown: {
    stockIn: number;
    stockOut: number;
    adjustments: number;
  };
}

interface MovementAnalysisData {
  movements: Movement[];
  summary: Summary;
  filters: {
    storeId: string;
    storeName?: string;
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

const StockMovementAnalysisReport: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [reportData, setReportData] = useState<MovementAnalysisData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: items = [] } = useItems();
  const { data: categories = [] } = useItemCategories();
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    movementType: '',
    itemId: '',
    categoryId: '',
  });

  // Fetch company info on component mount
  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  // Fetch report data when store is selected
  useEffect(() => {
    if (selectedStore) {
      fetchReportData(selectedStore);
    }
  }, [selectedStore, filters]);

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

    const fetchReportData = async (storeId: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add all filters to the request
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.movementType) params.append('movementType', filters.movementType);
      if (filters.itemId) params.append('itemId', filters.itemId);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);

      const queryString = params.toString();
      const url = `http://localhost:3005/api/reports/stock-level-movement/${storeId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch report data');
      
      const data = await response.json();
      
      // Enhance the data with store name in filters
      if (data.data && data.data.movements.length > 0) {
        data.data.filters.storeName = data.data.movements[0].store.name;
      }
      
      setReportData(data.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedStore) return;
    const params = new URLSearchParams();
    try {
            // Add all filters to the request
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.movementType) params.append('movementType', filters.movementType);
      if (filters.itemId) params.append('itemId', filters.itemId);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      const queryString = params.toString();

      setExporting(true);
      const response = await axios.get(
        `${baseURL}/api/reports/stock-level-movement/print/${selectedStore}${queryString ? `?${queryString}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${""}`,
          },
        }
      );

      const { buffer, filename, mimeType } = response.data.data;
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

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      movementType: '',
      itemId: '',
      categoryId: '',
    });
  };

  const getMovementColor = (category: string) => {
    switch (category) {
      case 'RESTOCK':
      case 'STOCK_IN':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'DEPLETION':
      case 'STOCK_OUT':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'ADJUSTMENT':
      case 'STOCK_ADJUSTMENT':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMovementIcon = (category: string) => {
    switch (category) {
      case 'RESTOCK':
      case 'STOCK_IN':
        return <ArrowUp className="w-4 h-4" />;
      case 'DEPLETION':
      case 'STOCK_OUT':
        return <ArrowDown className="w-4 h-4" />;
      case 'ADJUSTMENT':
      case 'STOCK_ADJUSTMENT':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getMovementLabel = (category: string) => {
    switch (category) {
      case 'RESTOCK':
      case 'STOCK_IN':
        return 'Stock In';
      case 'DEPLETION':
      case 'STOCK_OUT':
        return 'Stock Out';
      case 'ADJUSTMENT':
      case 'STOCK_ADJUSTMENT':
        return 'Adjustment';
      default:
        return category;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        {/* Store Selection */}
        {!selectedStore && (
          <div className="mb-8">
            <StoreSelector 
              onStoreSelect={setSelectedStore}
              selectedStore={selectedStore}
            />
          </div>
        )}

        {/* Report Content */}
        {selectedStore && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Report Header */}
            <div className="px-8 py-6 border-b border-gray-200">
              <ReportHeader 
                companyInfo={companyInfo}
                reportName="Stock Movement Analysis Report"
                storeName={reportData?.filters?.storeName}
                generatedDate={new Date()}
              />
              
              {/* Filters Section */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
      <Filter className="w-5 h-5 mr-2" />
      Filters
    </h3>
    <button
      onClick={clearFilters}
      className="text-sm text-teal-600 hover:text-teal-700"
    >
      Clear All
    </button>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
    {/* Start Date */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Start Date
      </label>
      <CustomDateInput
        label=""
        value={filters.startDate}
        onChange={(value) => handleFilterChange('startDate', value)}
        disabled={false}
      />
    </div>
    
    {/* End Date */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        End Date
      </label>
      <CustomDateInput
        label=""
        value={filters.endDate}
        onChange={(value) => handleFilterChange('endDate', value)}
        disabled={false}
        min={filters.startDate}
      />
    </div>
    
    {/* Movement Type */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Movement Type
      </label>
      <CustomDropdown
        options={[
          { value: '', label: 'All Types' },
          { value: 'RESTOCK', label: 'Stock In' },
          { value: 'DEPLETION', label: 'Stock Out' },
          { value: 'ADJUSTMENT', label: 'Adjustment' },
        ]}
        value={filters.movementType ? [filters.movementType] : []}
        onChange={(value) => handleFilterChange('movementType', value[0] || '')}
        placeholder="Select movement type"
        searchPlaceholder="Search types..."
        singleSelect={true}
      />
    </div>
    
    {/* Item Filter */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Item
      </label>
      <CustomDropdown
        options={[
          { value: '', label: 'All Items' },
          ...items.map(item => ({
            value: item.id,
            label: item.name
          }))
        ]}
        value={filters.itemId ? [filters.itemId] : []}
        onChange={(value) => handleFilterChange('itemId', value[0] || '')}
        placeholder="Select item"
        searchPlaceholder="Search items..."
        singleSelect={true}
      />
    </div>
    
    {/* Category Filter */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Category
      </label>
      <CustomDropdown
        options={[
          { value: '', label: 'All Categories' },
          ...categories.map(category => ({
            value: category.id,
            label: category.name
          }))
        ]}
        value={filters.categoryId ? [filters.categoryId] : []}
        onChange={(value) => handleFilterChange('categoryId', value[0] || '')}
        placeholder="Select category"
        searchPlaceholder="Search categories..."
        singleSelect={true}
      />
    </div>
    
    {/* Apply Filters Button */}
    <div className="flex items-end">
      <button
        onClick={() => fetchReportData(selectedStore)}
        disabled={loading}
        className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        <Filter className="w-4 h-4 mr-2" />
        {loading ? 'Applying...' : 'Apply Filters'}
      </button>
    </div>
  </div>
</div>
              
              {/* Export Button */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleExportPDF}
                  disabled={exporting || !reportData}
                  className="flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-5 h-5 mr-2" />
                  {exporting ? 'Exporting...' : 'Export PDF'}
                </button>
              </div>
            </div>

            {/* Report Body */}
            <div className="p-8">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                  <span className="ml-3 text-gray-600">Loading movement data...</span>
                </div>
              ) : reportData ? (
                <div className="space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="border-2 rounded-lg p-6 bg-blue-50 border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2 text-blue-800">Total Movements</h3>
                          <p className="text-3xl font-bold text-blue-600">{reportData.summary.totalMovements}</p>
                          <p className="text-sm opacity-75 mt-1 text-blue-700">records</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <Package className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-2 rounded-lg p-6 bg-green-50 border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2 text-green-800">Total Stock In</h3>
                          <p className="text-3xl font-bold text-green-600">{reportData.summary.totalIn}</p>
                          <p className="text-sm opacity-75 mt-1 text-green-700">units</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <ArrowUp className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-2 rounded-lg p-6 bg-red-50 border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2 text-red-800">Total Stock Out</h3>
                          <p className="text-3xl font-bold text-red-600">{reportData.summary.totalOut}</p>
                          <p className="text-sm opacity-75 mt-1 text-red-700">units</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <ArrowDown className="w-6 h-6 text-red-600" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-2 rounded-lg p-6 bg-purple-50 border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2 text-purple-800">Net Movement</h3>
                          <p className="text-3xl font-bold text-purple-600">{reportData.summary.netMovement}</p>
                          <p className="text-sm opacity-75 mt-1 text-purple-700">units</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <RefreshCw className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Movement Details Table */}
                  <div className="border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b bg-gray-50">
                      <h3 className="text-xl font-semibold text-gray-800">
                        Movement Details ({reportData.movements.length} records)
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date & Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Item
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Unit
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Recorded By
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.movements.map((movement, index) => (
                            <tr key={movement.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(movement.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {movement.item.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {movement.item.category.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementColor(movement.category)}`}>
                                  {getMovementIcon(movement.category)}
                                  <span className="ml-1">{getMovementLabel(movement.category)}</span>
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {movement.qty}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {movement.unit.abr}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {movement.employee.firstName} {movement.employee.lastName}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Movement Data</h3>
                  <p className="text-gray-500">No stock movements found for the selected store and filters.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockMovementAnalysisReport;