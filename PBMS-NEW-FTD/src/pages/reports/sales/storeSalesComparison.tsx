// components/StoreSalesComparisonReport.tsx
import React, { useState, useEffect } from 'react';
import { Download, DollarSign, TrendingUp, Building, Filter, Award } from 'lucide-react';
import ReportHeader from '../reportHeader';
import { baseURL } from '../../../libs/apiConfig';
import axios from 'axios';
import CustomDateInput from '../../../custom/inputs/customDateSelector';

interface StoreComparison {
  id: string;
  name: string;
  totalRevenue: number;
  salesCount: number;
  totalPaid: number;
  totalBalance: number;
  revenueShare: number;
}

interface StoreComparisonData {
  stores: StoreComparison[];
  summary: {
    totalRevenue: number;
    totalSales: number;
    storeCount: number;
    period: {
      startDate: string;
      endDate: string;
    };
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

const StoreSalesComparisonReport: React.FC = () => {
  const [reportData, setReportData] = useState<StoreComparisonData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  // Fetch company info on component mount
  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  // Fetch report data when dates change
  useEffect(() => {
    if (dateFilter.startDate || dateFilter.endDate) {
      fetchReportData();
    }
  }, [dateFilter]);

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
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (dateFilter.startDate) queryParams.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) queryParams.append('endDate', dateFilter.endDate);

      const response = await fetch(
        `${baseURL}/api/reports/sales/store-comparison?${queryParams.toString()}`
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
    try {
      setExporting(true);
      const response = await axios.get(`${baseURL}/api/reports/export/store-comparison`, {
        params: {
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate,
        },
        headers: {
          Authorization: `Bearer `,
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

  const getPerformanceColor = (index: number) => {
    if (index === 0) return 'text-green-600 bg-green-50 border-green-200';
    if (index === 1) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (index === 2) return 'text-purple-600 bg-purple-50 border-purple-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
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
        {/* Report Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Report Header */}
          <div className="px-8 py-6 border-b border-gray-200">
            <ReportHeader 
              companyInfo={companyInfo}
              reportName="Store Sales Comparison Report"
              generatedDate={new Date()}
            />
            
            {/* Date Filter and Export Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-2">
                  <CustomDateInput
                    label="Start Date"
                    value={dateFilter.startDate}
                    onChange={(value) => setDateFilter(prev => ({ ...prev, startDate: value }))}
                    max={dateFilter.endDate || undefined}
                    helperText="Select start date"
                  />
                </div>
                <div className="flex-2">
                  <CustomDateInput
                    label="End Date"
                    value={dateFilter.endDate}
                    onChange={(value) => setDateFilter(prev => ({ ...prev, endDate: value }))}
                    min={dateFilter.startDate || undefined}
                    helperText="Select end date"
                  />
                </div>
                <div className="flex-1 mt-7">
                  <button
                    onClick={fetchReportData}
                    disabled={loading}
                    className="w-f ull px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {loading ? 'Applying...' : 'Apply Filters'}
                  </button>
                </div>
              </div>
              
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
                <span className="ml-3 text-gray-600">Loading comparison data...</span>
              </div>
            ) : reportData ? (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border-2 rounded-lg p-6 text-green-600 bg-green-50 border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
                        <p className="text-3xl font-bold">{formatCurrency(reportData.summary.totalRevenue)}</p>
                        <p className="text-sm opacity-75 mt-1">across all stores</p>
                      </div>
                      <div className="p-3 rounded-full bg-white bg-opacity-50">
                        <DollarSign className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="border-2 rounded-lg p-6 text-blue-600 bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Total Sales</h3>
                        <p className="text-3xl font-bold">{reportData.summary.totalSales}</p>
                        <p className="text-sm opacity-75 mt-1">transactions</p>
                      </div>
                      <div className="p-3 rounded-full bg-white bg-opacity-50">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="border-2 rounded-lg p-6 text-purple-600 bg-purple-50 border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Stores</h3>
                        <p className="text-3xl font-bold">{reportData.summary.storeCount}</p>
                        <p className="text-sm opacity-75 mt-1">compared</p>
                      </div>
                      <div className="p-3 rounded-full bg-white bg-opacity-50">
                        <Building className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Store Comparison Table */}
                {reportData.stores.length > 0 && (
                  <div className="border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b bg-teal-50 border-teal-200">
                      <h3 className="text-xl font-semibold flex items-center text-teal-900">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Store Performance Comparison
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rank
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Store Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Revenue
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Sales Count
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Revenue Share
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Average Sale
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.stores.map((store, index) => {
                            const averageSale = store.totalRevenue / store.salesCount;
                            
                            return (
                              <tr key={store.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${getPerformanceColor(index)}`}>
                                    #{index + 1}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {store.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                  {formatCurrency(store.totalRevenue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {store.salesCount} sales
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="flex items-center">
                                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                      <div 
                                        className="bg-teal-600 h-2 rounded-full" 
                                        style={{ width: `${store.revenueShare}%` }}
                                      ></div>
                                    </div>
                                    <span>{store.revenueShare.toFixed(1)}%</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(averageSale)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Performance Insights */}
                {reportData.stores.length > 1 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                      <Award className="w-5 h-5 mr-2" />
                      Performance Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                      <div>
                        <strong>Top Performing Store:</strong> {reportData.stores[0].name} 
                        <span className="ml-2 text-green-600">
                          ({formatCurrency(reportData.stores[0].totalRevenue)})
                        </span>
                      </div>
                      <div>
                        <strong>Revenue Range:</strong> {formatCurrency(reportData.stores[reportData.stores.length - 1].totalRevenue)} - {formatCurrency(reportData.stores[0].totalRevenue)}
                      </div>
                      <div>
                        <strong>Average per Store:</strong> {formatCurrency(reportData.summary.totalRevenue / reportData.summary.storeCount)}
                      </div>
                      <div>
                        <strong>Performance Gap:</strong> {((reportData.stores[0].totalRevenue - reportData.stores[reportData.stores.length - 1].totalRevenue) / reportData.stores[reportData.stores.length - 1].totalRevenue * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Comparison Data</h3>
                <p className="text-gray-500">Select a date range to view store comparison data.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreSalesComparisonReport;