// components/DailySalesSummaryReport.tsx
import React, { useState, useEffect } from 'react';
import { Download, DollarSign, CreditCard, User, Calendar, Filter } from 'lucide-react';
import ReportHeader from '../reportHeader';
import { baseURL } from '../../../libs/apiConfig';
import axios from 'axios';
import CustomDateInput from '../../../custom/inputs/customDateSelector';
import StoreSelector from '../storeSelector';

interface Store {
  id: string;
  name: string;
}

interface Client {
  firstName: string;
  lastName: string;
}

interface Employee {
  firstName: string;
  lastName: string;
}

interface Sale {
  id: string;
  total: string;
  balance: string;
  status: string;
  paymentMethods: any[];
  createdAt: string;
  store: Store;
  client: Client;
  employee: Employee;
}

interface DailySalesData {
  sales: Sale[];
  summary: {
    totalRevenue: number;
    totalPaid: number;
    totalBalance: number;
    totalSales: number;
    salesByStatus: Record<string, number>;
    paymentMethods: Array<{ type: string; amount: number; count: number }>;
    date: string;
  };
  store: Store | null;
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

const DailySalesSummaryReport: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [reportData, setReportData] = useState<DailySalesData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    date: new Date().toISOString().split('T')[0]
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
  }, [selectedStore, dateFilter]);

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
      const queryParams = new URLSearchParams();
      queryParams.append('storeId', storeId);
      queryParams.append('date', dateFilter.date);

      const response = await fetch(
        `${baseURL}/api/reports/sales/daily-summary?${queryParams.toString()}`
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
    if (!selectedStore) return;
    
    try {
      setExporting(true);
      const response = await axios.get(`${baseURL}/api/reports/export/daily-summary`, {
        params: {
          storeId: selectedStore,
          date: dateFilter.date,
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

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FULLY_PAID': return 'text-green-600 bg-green-50 border-green-200';
      case 'PARTIALLY_PAID': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'PENDING': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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
                reportName="Daily Sales Summary Report"
                storeName={reportData?.store?.name}
                generatedDate={new Date()}
              />
              
              {/* Date Filter and Export Button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <CustomDateInput
                      label="Date"
                      value={dateFilter.date}
                      onChange={(value) => setDateFilter(prev => ({ ...prev, date: value }))}
                      helperText="Select date for the report"
                    />
                  </div>
                  <div className="flex-1 mt-7">
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
                  <span className="ml-3 text-gray-600">Loading sales data...</span>
                </div>
              ) : reportData ? (
                <div className="space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="border-2 rounded-lg p-6 text-green-600 bg-green-50 border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
                          <p className="text-3xl font-bold">{formatCurrency(reportData.summary.totalRevenue)}</p>
                          <p className="text-sm opacity-75 mt-1">gross sales</p>
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
                          <CreditCard className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="border-2 rounded-lg p-6 text-teal-600 bg-teal-50 border-teal-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Amount Paid</h3>
                          <p className="text-3xl font-bold">{formatCurrency(reportData.summary.totalPaid)}</p>
                          <p className="text-sm opacity-75 mt-1">collected</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <User className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="border-2 rounded-lg p-6 text-red-600 bg-red-50 border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Balance Due</h3>
                          <p className="text-3xl font-bold">{formatCurrency(reportData.summary.totalBalance)}</p>
                          <p className="text-sm opacity-75 mt-1">outstanding</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <Calendar className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods Summary */}
                  {reportData.summary.paymentMethods.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                        <CreditCard className="w-5 h-5 mr-2" />
                        Payment Methods
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {reportData.summary.paymentMethods.map((method, index) => (
                          <div key={method.type} className="bg-white rounded-lg p-4 border border-blue-100">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-blue-800 capitalize">{method.type.toLowerCase()}</span>
                              <span className="text-sm text-blue-600">{method.count} transactions</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-900 mt-2">
                              {formatCurrency(method.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sales by Status */}
                  {Object.keys(reportData.summary.salesByStatus).length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                        <Calendar className="w-5 h-5 mr-2" />
                        Sales by Status
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(reportData.summary.salesByStatus).map(([status, count]) => (
                          <div key={status} className="bg-white rounded-lg p-4 border border-green-100">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-green-800 capitalize">{status.toLowerCase().replace('_', ' ')}</span>
                              <span className="text-sm text-green-600">{count} sales</span>
                            </div>
                            <p className="text-2xl font-bold text-green-900 mt-2">
                              {count}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sales Details Table */}
                  <div className="border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b bg-teal-50 border-teal-200">
                      <h3 className="text-xl font-semibold flex items-center text-teal-900">
                        <CreditCard className="w-5 h-5 mr-2" />
                        Sales Transactions ({reportData.sales.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Client
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Employee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Balance
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.sales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatTime(sale.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {sale.client ? `${sale.client.firstName} ${sale.client.lastName}` : 'Walk-in'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {sale.employee.firstName} {sale.employee.lastName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {formatCurrency(sale.total)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                                  {sale.status.replace('_', ' ').toLowerCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(sale.balance)}
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
                  <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Sales Data</h3>
                  <p className="text-gray-500">No sales records found for the selected store and date.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailySalesSummaryReport;