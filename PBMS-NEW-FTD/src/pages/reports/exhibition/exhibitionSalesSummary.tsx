// components/ExhibitionSalesSummaryReport.tsx
import React, { useState, useEffect } from 'react';
import { Download, Receipt, User, Calendar, CreditCard, Package, Filter } from 'lucide-react';
import ReportHeader from '../reportHeader';
import { baseURL } from '../../../libs/apiConfig';
import axios from 'axios';
import ExhibitionSelector from './exhibitionSelector';
import CustomDateInput from '../../../custom/inputs/customDateSelector';

interface Category {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
}

interface SaleItem {
  id: string;
  categoryId: string;
  name: string;
  price: string;
  barcode: string;
  updatedAt: string;
  createdAt: string;
  category: Category;
  quantity: number;
  discount: number;
  total: number;
}

interface PaymentMethod {
  type: string;
  amount: number;
}

interface Client {
  firstName: string;
  lastName: string;
}

interface ExhibitionStore {
  id: string;
  name: string;
}

interface Sale {
  id: string;
  clientId: string;
  items: SaleItem[];
  total: string;
  status: string;
  balance: string;
  paymentMethods: PaymentMethod[];
  notes: string;
  exhibitionStoreId: string;
  servedBy: string;
  updatedAt: string;
  createdAt: string;
  exhibitionStore: ExhibitionStore;
  client: Client;
}

interface SalesSummaryData {
  sales: Sale[];
  summary: {
    totalAmount: number;
    totalSales: number;
  };
  exhibition: ExhibitionStore | null;
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

const ExhibitionSalesSummaryReport: React.FC = () => {
  const [selectedExhibition, setSelectedExhibition] = useState<string>('');
  const [reportData, setReportData] = useState<SalesSummaryData | null>(null);
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

  // Fetch report data when exhibition is selected
  useEffect(() => {
    if (selectedExhibition) {
      fetchReportData(selectedExhibition);
    }
  }, [selectedExhibition, dateFilter]);

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

  const fetchReportData = async (exhibitionId: string) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append('expoId', exhibitionId);
      
      if (dateFilter.startDate) queryParams.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) queryParams.append('endDate', dateFilter.endDate);

      const response = await fetch(
        `${baseURL}/api/reports/exhibition-sales-summary?${queryParams.toString()}`
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
    if (!selectedExhibition) return;
    
    try {
      setExporting(true);
      const response = await axios.get(`${baseURL}/api/reports/exhibition/sales-summary/print`, {
        params: {
            reportType: 'sales-summary',
            expoId: selectedExhibition,
            startDate: dateFilter.startDate || undefined,
            endDate: dateFilter.endDate || undefined,
        },
        headers: {
            Authorization: `Bearer `,
        },
        });


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

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(numAmount);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FULLY_PAID':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'PARTIALLY_PAID':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'PENDING':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPaymentMethodSummary = (sales: Sale[]) => {
    const paymentSummary = sales.reduce((acc, sale) => {
      sale.paymentMethods.forEach(payment => {
        const type = payment.type.toUpperCase();
        if (!acc[type]) {
          acc[type] = { type, total: 0, count: 0 };
        }
        acc[type].total += payment.amount;
        acc[type].count += 1;
      });
      return acc;
    }, {} as Record<string, { type: string; total: number; count: number }>);

    return Object.values(paymentSummary);
  };

  const getTopSellingItems = (sales: Sale[]) => {
    const itemsMap = new Map();
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = itemsMap.get(item.id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.total;
        } else {
          itemsMap.set(item.id, {
            id: item.id,
            name: item.name,
            category: item.category.name,
            quantity: item.quantity,
            total: item.total,
            price: parseFloat(item.price)
          });
        }
      });
    });

    return Array.from(itemsMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
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
        {/* Exhibition Selection */}
        {!selectedExhibition && (
          <div className="mb-8">
            <ExhibitionSelector 
              onExhibitionSelect={(ids) => setSelectedExhibition(ids[0] || '')}
              selectedExhibitions={selectedExhibition ? [selectedExhibition] : []}
              multiple={false}
            />
          </div>
        )}

        {/* Report Content */}
        {selectedExhibition && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Report Header */}
            <div className="px-8 py-6 border-b border-gray-200">
              <ReportHeader 
                companyInfo={companyInfo}
                reportName="Exhibition Sales Summary Report"
                storeName={reportData?.exhibition?.name}
                generatedDate={new Date()}
              />
              
              {/* Date Filter and Export Button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <CustomDateInput
                        label="Start Date"
                        value={dateFilter.startDate}
                        onChange={(value) => setDateFilter(prev => ({ ...prev, startDate: value }))}
                        max={dateFilter.endDate || undefined}
                        helperText="Select start date for the report"
                        />
                    </div>
                    <div className="flex-1">
                        <CustomDateInput
                        label="End Date"
                        value={dateFilter.endDate}
                        onChange={(value) => setDateFilter(prev => ({ ...prev, endDate: value }))}
                        min={dateFilter.startDate || undefined}
                        helperText="Select end date for the report"
                        />
                                  </div>
                                               <div className="flex-1 mt-7">
                                        <button
                                          onClick={() => fetchReportData(selectedExhibition)}
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
                          <p className="text-3xl font-bold">{formatCurrency(reportData.summary.totalAmount)}</p>
                          <p className="text-sm opacity-75 mt-1">gross sales</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <Receipt className="w-5 h-5" />
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

                    <div className="border-2 rounded-lg p-6 text-purple-600 bg-purple-50 border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Avg. Sale Value</h3>
                          <p className="text-3xl font-bold">
                            {formatCurrency(reportData.summary.totalAmount / reportData.summary.totalSales)}
                          </p>
                          <p className="text-sm opacity-75 mt-1">per transaction</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <User className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="border-2 rounded-lg p-6 text-orange-600 bg-orange-50 border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Exhibition</h3>
                          <p className="text-xl font-bold truncate">
                            {reportData.exhibition?.name || 'All Exhibitions'}
                          </p>
                          <p className="text-sm opacity-75 mt-1">location</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <Calendar className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Summary */}
                  {reportData.sales.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                        <CreditCard className="w-5 h-5 mr-2" />
                        Payment Methods Summary
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {getPaymentMethodSummary(reportData.sales).map((method, index) => (
                          <div key={method.type} className="bg-white rounded-lg p-4 border border-blue-100">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-blue-800 capitalize">{method.type.toLowerCase()}</span>
                              <span className="text-sm text-blue-600">{method.count} transactions</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-900 mt-2">
                              {formatCurrency(method.total)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Selling Items */}
                  {reportData.sales.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                        <Package className="w-5 h-5 mr-2" />
                        Top Selling Items
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-green-200">
                              <th className="text-left py-2 text-green-800 font-medium">Item Name</th>
                              <th className="text-left py-2 text-green-800 font-medium">Category</th>
                              <th className="text-left py-2 text-green-800 font-medium">Quantity Sold</th>
                              <th className="text-left py-2 text-green-800 font-medium">Total Revenue</th>
                              <th className="text-left py-2 text-green-800 font-medium">Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getTopSellingItems(reportData.sales).map((item, index) => (
                              <tr key={item.id} className="border-b border-green-100 last:border-b-0">
                                <td className="py-3 text-green-900 font-medium">{item.name}</td>
                                <td className="py-3 text-green-700">{item.category}</td>
                                <td className="py-3 text-green-900">{item.quantity}</td>
                                <td className="py-3 text-green-900 font-semibold">{formatCurrency(item.total)}</td>
                                <td className="py-3 text-green-700">{formatCurrency(item.price)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Sales Details Table */}
                  <div className="border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b bg-teal-50 border-teal-200">
                      <h3 className="text-xl font-semibold flex items-center text-teal-900">
                        <Receipt className="w-5 h-5 mr-2" />
                        Sales Details ({reportData.sales.length} transactions)
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
                              Client
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Items
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Payment Method
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.sales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(sale.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {sale.client.firstName} {sale.client.lastName}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                <div className="max-w-xs">
                                  {sale.items.map((item, index) => (
                                    <div key={item.id} className="flex justify-between">
                                      <span>
                                        {item.quantity}x {item.name}
                                      </span>
                                      <span className="ml-2 text-gray-900">
                                        {formatCurrency(item.total)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {formatCurrency(sale.total)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                                  {sale.status.replace('_', ' ').toLowerCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                {sale.paymentMethods.map(pm => pm.type).join(', ')}
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
                  <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Sales Data</h3>
                  <p className="text-gray-500">No sales records found for the selected exhibition and date range.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExhibitionSalesSummaryReport;