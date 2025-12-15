// components/MassageServiceSalesReport.tsx
import React, { useState, useEffect } from 'react';
import { Download, Heart, TrendingUp, Users, Calendar, Search, X } from 'lucide-react';
import ReportHeader from '../reportHeader';
import { baseURL } from '../../../libs/apiConfig';
import axios from 'axios';
import CustomDateInput from '../../../custom/inputs/customDateSelector';

interface MassageService {
  id: string;
  name: string;
  price: number;
}

interface Client {
  firstName: string;
  lastName: string;
}

interface Employee {
  firstName: string;
  lastName: string;
}

interface MassageSaleItem {
  id: string;
  name: string;
  price: string;
  quantity: number;
  discount: number;
  total: number;
  updatedAt: string;
  createdAt: string;
}

interface MassageSale {
  id: string;
  createdAt: string;
  client: Client;
  employee: Employee;
  items: MassageSaleItem[];
  total: number;
  balance: number;
  paid: number;
  status: string;
  paymentMethods: Array<{ type: string; amount: number }>;
  notes: string;
}

interface ServicePerformance {
  id: string;
  name: string;
  price: number;
  totalRevenue: number;
  salesCount: number;
  totalQuantity: number;
}

interface MassageSalesData {
  sales: MassageSale[];
  summary: {
    totalRevenue: number;
    totalPaid: number;
    totalBalance: number;
    totalSales: number;
    averageSale: number;
  };
  servicePerformance: ServicePerformance[];
  period: {
    startDate: string;
    endDate: string;
  };
  service: ServicePerformance | null;
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

const MassageServiceSalesReport: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string>('');
  const [reportData, setReportData] = useState<MassageSalesData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [services, setServices] = useState<MassageService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchCompanyInfo();
    fetchServices();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [selectedService, dateFilter]);

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

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const response = await fetch(`${baseURL}/api/reports/massage-services/list`);
      if (!response.ok) throw new Error('Failed to fetch services');
      const data = await response.json();
      setServices(data.data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      // Fallback: extract from report data if endpoint doesn't exist
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (selectedService) queryParams.append('serviceId', selectedService);
      if (dateFilter.startDate) queryParams.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) queryParams.append('endDate', dateFilter.endDate);

      const response = await fetch(
        `${baseURL}/api/reports/massage-services?${queryParams.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch report data');
      
      const data = await response.json();
      setReportData(data.data);

      // Extract services from report if not loaded
      if (services.length === 0 && data.data?.servicePerformance) {
        const extractedServices = data.data.servicePerformance.map((sp: ServicePerformance) => ({
          id: sp.id,
          name: sp.name,
          price: sp.price,
        }));
        setServices(extractedServices);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const response = await axios.get(`${baseURL}/api/reports/export/massage-services`, {
        params: {
          serviceId: selectedService,
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

  const getSelectedService = () => {
    return services.find(s => s.id === selectedService);
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(serviceSearch.toLowerCase())
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
        {/* Service Selection (Optional) */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Heart className="w-5 h-5 mr-2" />
            Filter by Service (Optional)
          </h2>

          {selectedService && (
            <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-sm text-teal-600 font-medium">Selected Service</div>
                <div className="text-lg font-semibold text-teal-900">
                  {getSelectedService()?.name}
                </div>
                <div className="text-sm text-teal-700">
                  {formatCurrency(getSelectedService()?.price || 0)}
                </div>
              </div>
              <button
                onClick={() => setSelectedService('')}
                className="px-4 py-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors flex items-center"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filter
              </button>
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Service List */}
          <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
            {loadingServices ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                <span className="ml-2 text-gray-600">Loading services...</span>
              </div>
            ) : filteredServices.length > 0 ? (
              <>
                <button
                  onClick={() => setSelectedService('')}
                  className={`w-full text-left px-4 py-3 border-b border-gray-200 hover:bg-teal-50 transition-colors ${
                    !selectedService ? 'bg-teal-50 border-l-4 border-l-teal-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">All Services</div>
                    {!selectedService && (
                      <div className="w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
                {filteredServices.map(service => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-teal-50 transition-colors ${
                      selectedService === service.id ? 'bg-teal-50 border-l-4 border-l-teal-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{service.name}</div>
                        <div className="text-sm text-gray-500">{formatCurrency(service.price)}</div>
                      </div>
                      {selectedService === service.id && (
                        <div className="w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <div className="py-8 text-center text-gray-500">
                {serviceSearch ? 'No services found matching your search' : 'No services available'}
              </div>
            )}
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Report Header */}
          <div className="px-8 py-6 border-b border-gray-200">
            <ReportHeader 
              companyInfo={companyInfo}
              reportName="Massage Service Sales Report"
              generatedDate={new Date()}
            />

            {/* Filters */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <span className="ml-3 text-gray-600">Loading massage service data...</span>
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
                        <p className="text-sm opacity-75 mt-1">service sales</p>
                      </div>
                      <div className="p-3 rounded-full bg-white bg-opacity-50">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="border-2 rounded-lg p-6 text-blue-600 bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Total Sales</h3>
                        <p className="text-3xl font-bold">{reportData.summary.totalSales}</p>
                        <p className="text-sm opacity-75 mt-1">bookings</p>
                      </div>
                      <div className="p-3 rounded-full bg-white bg-opacity-50">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="border-2 rounded-lg p-6 text-teal-600 bg-teal-50 border-teal-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Average Sale</h3>
                        <p className="text-3xl font-bold">{formatCurrency(reportData.summary.averageSale)}</p>
                        <p className="text-sm opacity-75 mt-1">per service</p>
                      </div>
                      <div className="p-3 rounded-full bg-white bg-opacity-50">
                        <Heart className="w-5 h-5" />
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

                {/* Service Performance */}
                {reportData.servicePerformance.length > 0 && (
                  <div className="border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b bg-teal-50 border-teal-200">
                      <h3 className="text-xl font-semibold flex items-center text-teal-900">
                        <Heart className="w-5 h-5 mr-2" />
                        Service Performance
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Name</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Count</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg per Sale</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.servicePerformance.map((service) => (
                            <tr key={service.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{service.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(service.price)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{formatCurrency(service.totalRevenue)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{service.salesCount}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{service.totalQuantity}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                {formatCurrency(service.salesCount > 0 ? service.totalRevenue / service.salesCount : 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sales Details */}
                {reportData.sales.length > 0 && (
                  <div className="border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b bg-teal-50 border-teal-200">
                      <h3 className="text-xl font-semibold flex items-center text-teal-900">
                        <Calendar className="w-5 h-5 mr-2" />
                        Sales Transactions ({reportData.sales.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.sales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div>{formatDate(sale.createdAt)}</div>
                                <div className="text-xs text-gray-500">{formatTime(sale.createdAt)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {sale.client.firstName} {sale.client.lastName}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="flex flex-col gap-1">
                                  {sale.items.map((item, idx) => (
                                    <div key={idx} className="text-xs">
                                      {item.name} x{item.quantity}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                {formatCurrency(sale.total)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                                  {sale.status.replace('_', ' ').toLowerCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                {formatCurrency(sale.balance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Sales Data</h3>
                <p className="text-gray-500">No massage service sales found for the selected criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MassageServiceSalesReport;