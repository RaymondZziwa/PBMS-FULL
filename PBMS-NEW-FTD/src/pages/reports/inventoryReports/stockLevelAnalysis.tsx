// components/StockLevelAnalysisReport.tsx
import React, { useState, useEffect } from 'react';
import { Download, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import ReportHeader from '../reportHeader';
import StoreSelector from '../storeSelector';
import { baseURL } from '../../../libs/apiConfig';
import axios from 'axios';


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

interface StockItem {
  item: Item;
  qty: number;
  store: Store;
}

interface StockAnalysisData {
  lowStockItems: StockItem[];
  inStockItems: StockItem[];
  overStockedItems: StockItem[];
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

const StockLevelAnalysisReport: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [reportData, setReportData] = useState<StockAnalysisData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch company info on component mount
  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  // Fetch report data when store is selected
  useEffect(() => {
    if (selectedStore) {
      fetchReportData(selectedStore);
    }
  }, [selectedStore]);

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
      const response = await fetch(`${baseURL}/api/reports/stock-level-analysis/${storeId}`);
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
  if (!selectedStore) return;
  
  try {
    setExporting(true);
    const response = await axios.get(
      `${baseURL}/api/reports/stock-level-analysis/print/${selectedStore}`,
      {
        headers: {
          Authorization: `Bearer ${""}`,
        },
      }
    );

    // Extract buffer data from the response
    const { buffer, filename, mimeType } = response.data;
    
    // Convert array to Uint8Array
    const uint8Array = new Uint8Array(buffer.data);
    
    // Create blob
    const file = new Blob([uint8Array], { type: mimeType });
    const fileURL = URL.createObjectURL(file);
    
    // Open in new tab
    window.open(fileURL, "_blank");
    
    setExporting(false);
  } catch (error) {
    console.error("Error previewing the report:", error);
    setExporting(false);
  }
};

  const getStockLevelColor = (level: string) => {
    switch (level) {
      case 'lowStockItems': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'inStockItems': return 'text-green-600 bg-green-50 border-green-200';
      case 'overStockedItems': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStockLevelIcon = (level: string) => {
    switch (level) {
      case 'lowStockItems': return <AlertTriangle className="w-5 h-5" />;
      case 'inStockItems': return <Package className="w-5 h-5" />;
      case 'overStockedItems': return <TrendingUp className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getStockLevelTitle = (level: string) => {
    switch (level) {
      case 'lowStockItems': return 'Low Stock Items';
      case 'inStockItems': return 'In Stock Items';
      case 'overStockedItems': return 'Overstocked Items';
      default: return 'Stock Items';
    }
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
                reportName="Stock Level Analysis Report"
                storeName={reportData?.inStockItems[0]?.store.name}
                generatedDate={new Date()}
              />
              
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
                  <span className="ml-3 text-gray-600">Loading report data...</span>
                </div>
              ) : reportData ? (
                <div className="space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(reportData).map(([level, items]) => (
                      <div key={level} className={`border-2 rounded-lg p-6 ${getStockLevelColor(level)}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold mb-2">{getStockLevelTitle(level)}</h3>
                            <p className="text-3xl font-bold">{items.length}</p>
                            <p className="text-sm opacity-75 mt-1">items</p>
                          </div>
                          <div className="p-3 rounded-full bg-white bg-opacity-50">
                            {getStockLevelIcon(level)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Sections */}
                  {Object.entries(reportData).map(([level, items]) => (
                    items.length > 0 && (
                      <div key={level} className="border border-gray-200 rounded-lg">
                        <div className={`px-6 py-4 border-b ${getStockLevelColor(level)}`}>
                          <h3 className="text-xl font-semibold flex items-center">
                            {getStockLevelIcon(level)}
                            <span className="ml-2">{getStockLevelTitle(level)} ({items.length})</span>
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Item Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Current Stock
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Unit
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Store
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {items.map((stockItem, index) => (
                                <tr key={`${level}-${stockItem.item.id}-${index}`} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {stockItem.item.name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {stockItem.item.category.name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <span className="font-semibold">{stockItem.qty}</span>
                                  </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <span className="font-semibold">{stockItem.unit.name}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {stockItem.store.name}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Data</h3>
                  <p className="text-gray-500">Unable to load report data for the selected store.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockLevelAnalysisReport;