// components/SuppliersReport.tsx
import React, { useState, useEffect } from 'react';
import { Download, DollarSign, Users, CreditCard, Building, Filter } from 'lucide-react';
import ReportHeader from '../reportHeader';
import { baseURL } from '../../../libs/apiConfig';
import axios from 'axios';

interface Supplier {
  supplierId: string;
  supplierName: string;
  contact: string;
  address: string;
  totalSupplied: number;
  totalPaid: number;
  balance: number;
  supplies: Supply[];
}

interface Supply {
  id: string;
  itemName: string;
  qty: number;
  uom: string;
  value: number;
  balance: number;
  paymentStatus: string;
  receivedBy: string;
  createdAt: string;
  payments: Payment[];
}

interface Payment {
  id: string;
  paymentType: string;
  amount: number;
  paymentStatus: string;
  proofImage: string | null;
  paidBy: string;
  createdAt: string;
  bank: string | null;
  chequeNumber: string | null;
  chequeBankingDate: string | null;
  barterItemName: string | null;
}

interface SuppliersReportData {
  suppliers: Supplier[];
  summary: {
    totalSuppliers: number;
    overallTotalSupplied: number;
    overallTotalPaid: number;
    overallBalance: number;
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

const SuppliersReport: React.FC = () => {
  const [reportData, setReportData] = useState<SuppliersReportData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  // Fetch company info and report data on component mount
  useEffect(() => {
    fetchCompanyInfo();
    fetchReportData();
  }, []);

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
      const response = await fetch(`${baseURL}/api/suppliers/report`);
      if (!response.ok) throw new Error('Failed to fetch suppliers report');
      
      const data = await response.json();
      setReportData(data.data);
    } catch (error) {
      console.error('Error fetching suppliers report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const response = await axios.get(`${baseURL}/api/suppliers/report/export`, {
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
      console.error("Error exporting the report:", error);
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
      day: 'numeric'
    });
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-green-600 bg-green-50 border-green-200';
      case 'PARTIALLY_PAID': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'PENDING': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'CASH': return 'text-green-600 bg-green-50';
      case 'MOBILE_MONEY': return 'text-blue-600 bg-blue-50';
      case 'CHEQUE': return 'text-purple-600 bg-purple-50';
      case 'BARTER_PAYMENT': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const toggleSupplierExpansion = (supplierId: string) => {
    setExpandedSupplier(expandedSupplier === supplierId ? null : supplierId);
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
              reportName="Suppliers Summary Report"
              generatedDate={new Date()}
            />
            
            {/* Export Button */}
            <div className="flex justify-end items-center mt-4">
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
                <span className="ml-3 text-gray-600">Loading suppliers data...</span>
              </div>
            ) : reportData ? (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="border-2 rounded-lg p-6 text-blue-600 bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Total Suppliers</h3>
                        <p className="text-3xl font-bold">{reportData.summary.totalSuppliers}</p>
                        <p className="text-sm opacity-75 mt-1">active suppliers</p>
                      </div>
                      <div className="p-3 rounded-full bg-white bg-opacity-50">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="border-2 rounded-lg p-6 text-green-600 bg-green-50 border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Total Supplied</h3>
                        <p className="text-3xl font-bold">{formatCurrency(reportData.summary.overallTotalSupplied)}</p>
                        <p className="text-sm opacity-75 mt-1">goods value</p>
                      </div>
                      <div className="p-3 rounded-full bg-white bg-opacity-50">
                        <DollarSign className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="border-2 rounded-lg p-6 text-teal-600 bg-teal-50 border-teal-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Total Paid</h3>
                        <p className="text-3xl font-bold">{formatCurrency(reportData.summary.overallTotalPaid)}</p>
                        <p className="text-sm opacity-75 mt-1">amount paid</p>
                      </div>
                      <div className="p-3 rounded-full bg-white bg-opacity-50">
                        <CreditCard className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="border-2 rounded-lg p-6 text-red-600 bg-red-50 border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Balance Due</h3>
                        <p className="text-3xl font-bold">{formatCurrency(reportData.summary.overallBalance)}</p>
                        <p className="text-sm opacity-75 mt-1">outstanding</p>
                      </div>
                      <div className="p-3 rounded-full bg-white bg-opacity-50">
                        <Building className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suppliers List */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="px-6 py-4 border-b bg-teal-50 border-teal-200">
                    <h3 className="text-xl font-semibold flex items-center text-teal-900">
                      <Users className="w-5 h-5 mr-2" />
                      Suppliers Summary ({reportData.suppliers.length})
                    </h3>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {reportData.suppliers.map((supplier) => (
                      <div key={supplier.supplierId} className="bg-white">
                        {/* Supplier Header */}
                        <div 
                          className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => toggleSupplierExpansion(supplier.supplierId)}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {supplier.supplierName}
                                </h4>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-600">{supplier.contact}</span>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-600">{supplier.address}</span>
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <span>Supplies: {supplier.supplies.length}</span>
                                <span>Supplied: {formatCurrency(supplier.totalSupplied)}</span>
                                <span>Paid: {formatCurrency(supplier.totalPaid)}</span>
                                <span className={`font-semibold ${
                                  supplier.balance > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  Balance: {formatCurrency(supplier.balance)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                supplier.balance > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'
                              }`}>
                                {supplier.balance > 0 ? 'Has Balance' : 'Settled'}
                              </div>
                              <div className={`transform transition-transform ${
                                expandedSupplier === supplier.supplierId ? 'rotate-180' : ''
                              }`}>
                                <Filter className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Supplies Details */}
                        {expandedSupplier === supplier.supplierId && supplier.supplies.length > 0 && (
                          <div className="bg-gray-50 border-t border-gray-200 p-6">
                            <h5 className="text-md font-semibold text-gray-900 mb-4">
                              Supply Details ({supplier.supplies.length})
                            </h5>
                            <div className="space-y-4">
                              {supplier.supplies.map((supply) => (
                                <div key={supply.id} className="bg-white rounded-lg border border-gray-200 p-4">
                                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3">
                                    <div>
                                      <h6 className="font-semibold text-gray-900">{supply.itemName}</h6>
                                      <p className="text-sm text-gray-600">
                                        {supply.qty} {supply.uom} • {formatCurrency(supply.value)} • {formatDate(supply.createdAt)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(supply.paymentStatus)}`}>
                                        {supply.paymentStatus.replace('_', ' ').toLowerCase()}
                                      </span>
                                      <span className="text-sm text-gray-600">
                                        Balance: {formatCurrency(supply.balance)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Payments */}
                                  {supply.payments.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                      <p className="text-sm font-medium text-gray-700 mb-2">Payments:</p>
                                      <div className="space-y-2">
                                        {supply.payments.map((payment) => (
                                          <div key={payment.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-3">
                                              <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentTypeColor(payment.paymentType)}`}>
                                                {payment.paymentType.replace('_', ' ').toLowerCase()}
                                              </span>
                                              <span>{formatCurrency(payment.amount)}</span>
                                              {payment.barterItemName && (
                                                <span className="text-orange-600">({payment.barterItemName})</span>
                                              )}
                                              {payment.chequeNumber && (
                                                <span className="text-purple-600">Cheque #{payment.chequeNumber}</span>
                                              )}
                                            </div>
                                            <div className="text-gray-500 text-xs">
                                              {formatDate(payment.createdAt)} • {payment.paidBy}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Suppliers Data</h3>
                <p className="text-gray-500">No supplier records found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuppliersReport;