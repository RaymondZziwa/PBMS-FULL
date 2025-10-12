// components/ExhibitionExpensesSummaryReport.tsx
import React, { useState, useEffect } from 'react';
import { Download, DollarSign, AlertTriangle, PieChart, List, Filter } from 'lucide-react';
import ReportHeader from '../reportHeader';
import { baseURL } from '../../../libs/apiConfig';
import axios from 'axios';
import ExhibitionSelector from './exhibitionSelector';
import CustomDateInput from '../../../custom/inputs/customDateSelector';

interface Exhibition {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  category: string;
  exhibitionId: string;
  title: string;
  description: string;
  amount: number;
  dateIncurred: string;
  updatedAt: string;
  createdAt: string;
  exhibition: Exhibition;
}

interface ExpensesByCategory {
  category: string;
  totalAmount: number;
  count: number;
}

interface ExpensesSummaryData {
  expenses: Expense[];
  summary: {
    totalExpenses: number;
    totalExpenseCount: number;
    expensesByCategory: ExpensesByCategory[];
  };
  exhibition: Exhibition | null;
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

const ExhibitionExpensesSummaryReport: React.FC = () => {
  const [selectedExhibition, setSelectedExhibition] = useState<string>('');
  const [reportData, setReportData] = useState<ExpensesSummaryData | null>(null);
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
        `${baseURL}/api/reports/exhibition-expenses-summary?${queryParams.toString()}`
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
      const response = await axios.get(`${baseURL}/api/reports/exhibition/expenses-summary/print`, {
        params: {
            reportType: 'expenses-summary',
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

  const getCategoryColor = (category: string) => {
    const colors = {
      'MISCELLANEOUS': 'text-purple-600 bg-purple-50 border-purple-200',
      'TRANSPORT': 'text-blue-600 bg-blue-50 border-blue-200',
      'ACCOMMODATION': 'text-green-600 bg-green-50 border-green-200',
      'FOOD': 'text-orange-600 bg-orange-50 border-orange-200',
      'MARKETING': 'text-pink-600 bg-pink-50 border-pink-200',
      'STAFF': 'text-red-600 bg-red-50 border-red-200',
      'EQUIPMENT': 'text-indigo-600 bg-indigo-50 border-indigo-200',
      'UTILITIES': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    };
    
    return colors[category as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'MISCELLANEOUS': <AlertTriangle className="w-4 h-4" />,
      'TRANSPORT': <DollarSign className="w-4 h-4" />,
      'ACCOMMODATION': <DollarSign className="w-4 h-4" />,
      'FOOD': <DollarSign className="w-4 h-4" />,
      'MARKETING': <DollarSign className="w-4 h-4" />,
      'STAFF': <DollarSign className="w-4 h-4" />,
      'EQUIPMENT': <DollarSign className="w-4 h-4" />,
      'UTILITIES': <DollarSign className="w-4 h-4" />,
    };
    
    return icons[category as keyof typeof icons] || <DollarSign className="w-4 h-4" />;
  };

  const calculateAverageExpense = (category: ExpensesByCategory) => {
    return category.totalAmount / category.count;
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
                reportName="Exhibition Expenses Summary Report"
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
                  <span className="ml-3 text-gray-600">Loading expenses data...</span>
                </div>
              ) : reportData ? (
                <div className="space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="border-2 rounded-lg p-6 text-red-600 bg-red-50 border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Total Expenses</h3>
                          <p className="text-3xl font-bold">{formatCurrency(reportData.summary.totalExpenses)}</p>
                          <p className="text-sm opacity-75 mt-1">total spent</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <DollarSign className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="border-2 rounded-lg p-6 text-orange-600 bg-orange-50 border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Expense Items</h3>
                          <p className="text-3xl font-bold">{reportData.summary.totalExpenseCount}</p>
                          <p className="text-sm opacity-75 mt-1">records</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <List className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="border-2 rounded-lg p-6 text-purple-600 bg-purple-50 border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Categories</h3>
                          <p className="text-3xl font-bold">{reportData.summary.expensesByCategory.length}</p>
                          <p className="text-sm opacity-75 mt-1">expense types</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <PieChart className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="border-2 rounded-lg p-6 text-blue-600 bg-blue-50 border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Avg. Expense</h3>
                          <p className="text-3xl font-bold">
                            {formatCurrency(reportData.summary.totalExpenses / reportData.summary.totalExpenseCount)}
                          </p>
                          <p className="text-sm opacity-75 mt-1">per item</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expenses by Category */}
                  {reportData.summary.expensesByCategory.length > 0 && (
                    <div className="border border-gray-200 rounded-lg">
                      <div className="px-6 py-4 border-b bg-teal-50 border-teal-200">
                        <h3 className="text-xl font-semibold flex items-center text-teal-900">
                          <PieChart className="w-5 h-5 mr-2" />
                          Expenses by Category
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Count
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Average
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Percentage
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.summary.expensesByCategory.map((category, index) => {
                              const percentage = (category.totalAmount / reportData.summary.totalExpenses) * 100;
                              const average = calculateAverageExpense(category);
                              
                              return (
                                <tr key={category.category} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className={`p-2 rounded-full ${getCategoryColor(category.category)}`}>
                                        {getCategoryIcon(category.category)}
                                      </div>
                                      <span className="ml-3 text-sm font-medium text-gray-900 capitalize">
                                        {category.category.toLowerCase()}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                    {formatCurrency(category.totalAmount)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {category.count} items
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatCurrency(average)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex items-center">
                                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                        <div 
                                          className="bg-red-600 h-2 rounded-full" 
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                      <span>{percentage.toFixed(1)}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Category Distribution Visualization */}
                  {reportData.summary.expensesByCategory.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                        <PieChart className="w-5 h-5 mr-2" />
                        Expense Distribution
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Category Breakdown */}
                        <div>
                          <h4 className="font-medium text-blue-800 mb-3">By Category</h4>
                          <div className="space-y-2">
                            {reportData.summary.expensesByCategory
                              .sort((a, b) => b.totalAmount - a.totalAmount)
                              .map((category) => {
                                const percentage = (category.totalAmount / reportData.summary.totalExpenses) * 100;
                                return (
                                  <div key={category.category} className="flex items-center justify-between text-sm">
                                    <span className="text-blue-700 capitalize">
                                      {category.category.toLowerCase()}
                                    </span>
                                    <div className="flex items-center">
                                      <span className="text-blue-900 font-medium mr-2">
                                        {formatCurrency(category.totalAmount)}
                                      </span>
                                      <span className="text-blue-600 text-xs">
                                        ({percentage.toFixed(1)}%)
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        {/* Insights */}
                        <div>
                          <h4 className="font-medium text-blue-800 mb-3">Key Insights</h4>
                          <div className="space-y-2 text-sm text-blue-700">
                            {reportData.summary.expensesByCategory.length > 0 && (
                              <>
                                <div>
                                  <strong>Largest Category:</strong>{' '}
                                  {reportData.summary.expensesByCategory
                                    .reduce((prev, current) => 
                                      prev.totalAmount > current.totalAmount ? prev : current
                                    ).category.toLowerCase()}
                                </div>
                                <div>
                                  <strong>Most Frequent:</strong>{' '}
                                  {reportData.summary.expensesByCategory
                                    .reduce((prev, current) => 
                                      prev.count > current.count ? prev : current
                                    ).category.toLowerCase()}
                                </div>
                                <div>
                                  <strong>Total Categories:</strong>{' '}
                                  {reportData.summary.expensesByCategory.length}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed Expenses Table */}
                  <div className="border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b bg-teal-50 border-teal-200">
                      <h3 className="text-xl font-semibold flex items-center text-teal-900">
                        <List className="w-5 h-5 mr-2" />
                        Expense Details ({reportData.expenses.length} records)
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
                              Title
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Exhibition
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.expenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(expense.dateIncurred)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {expense.title}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                                  {expense.category.toLowerCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                                {formatCurrency(expense.amount)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                {expense.description || (
                                  <span className="text-gray-400 italic">No description</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {expense.exhibition.name}
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
                  <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Expenses Data</h3>
                  <p className="text-gray-500">No expense records found for the selected exhibition and date range.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExhibitionExpensesSummaryReport;