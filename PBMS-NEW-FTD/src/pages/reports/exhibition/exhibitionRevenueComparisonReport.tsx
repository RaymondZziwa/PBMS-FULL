// components/ExhibitionRevenueComparisonReport.tsx
import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, Building, DollarSign } from 'lucide-react';
import ReportHeader from '../reportHeader';
import { baseURL } from '../../../libs/apiConfig';
import axios from 'axios';
import ExhibitionSelector from './exhibitionSelector';

interface Exhibition {
  id: string;
  name: string;
  totalRevenue: number;
  salesCount: number;
}

interface RevenueComparisonData {
  exhibitions: Exhibition[];
  summary: {
    totalRevenue: number;
    totalSales: number;
    exhibitionCount: number;
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

const ExhibitionRevenueComparisonReport: React.FC = () => {
  const [selectedExhibitions, setSelectedExhibitions] = useState<string[]>([]);
  const [reportData, setReportData] = useState<RevenueComparisonData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch company info on component mount
  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  // Fetch report data when exhibitions are selected
  useEffect(() => {
    if (selectedExhibitions.length > 0) {
      fetchReportData(selectedExhibitions);
    }
  }, [selectedExhibitions]);

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

  const fetchReportData = async (exhibitionIds: string[]) => {
    try {
      setLoading(true);
      const queryParams = exhibitionIds.length > 0 
        ? `?exhibitionIds=${exhibitionIds.join(',')}`
        : '';
      
      const response = await fetch(`${baseURL}/api/reports/exhibition-revenue-comparison${queryParams}`);
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
    if (!selectedExhibitions) return;
    
    try {
      setExporting(true);
      const response = await axios.get(`${baseURL}/api/reports/exhibition/revenue-comparison/print`, {
        params: {
            reportType: 'revenue-comparison',
            expoId: selectedExhibitions,
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

  const calculateAverageSale = (exhibition: Exhibition) => {
    return exhibition.salesCount > 0 ? exhibition.totalRevenue / exhibition.salesCount : 0;
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
        {/* Exhibition Selection */}
        {selectedExhibitions.length === 0 && (
          <div className="mb-8">
            <ExhibitionSelector 
              onExhibitionSelect={setSelectedExhibitions}
              selectedExhibitions={selectedExhibitions}
              multiple={true}
            />
          </div>
        )}

        {/* Report Content */}
        {selectedExhibitions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Report Header */}
            <div className="px-8 py-6 border-b border-gray-200">
              <ReportHeader 
                companyInfo={companyInfo}
                reportName="Exhibition Revenue Comparison Report"
                generatedDate={new Date()}
                additionalInfo={
                  selectedExhibitions.length > 0 
                    ? `Comparing ${selectedExhibitions.length} Exhibition(s)`
                    : 'All Exhibitions'
                }
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
                    <div className="border-2 rounded-lg p-6 text-green-600 bg-green-50 border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
                          <p className="text-3xl font-bold">{formatCurrency(reportData.summary.totalRevenue)}</p>
                          <p className="text-sm opacity-75 mt-1">across all exhibitions</p>
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
                          <h3 className="text-lg font-semibold mb-2">Exhibitions</h3>
                          <p className="text-3xl font-bold">{reportData.summary.exhibitionCount}</p>
                          <p className="text-sm opacity-75 mt-1">compared</p>
                        </div>
                        <div className="p-3 rounded-full bg-white bg-opacity-50">
                          <Building className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Comparison Table */}
                  <div className="border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b bg-teal-50 border-teal-200">
                      <h3 className="text-xl font-semibold flex items-center text-teal-900">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Exhibition Revenue Comparison
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
                              Exhibition Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Revenue
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Sales Count
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Average Sale
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Revenue Share
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.exhibitions.map((exhibition, index) => {
                            const averageSale = calculateAverageSale(exhibition);
                            const revenueShare = (exhibition.totalRevenue / reportData.summary.totalRevenue) * 100;
                            
                            return (
                              <tr key={exhibition.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${getPerformanceColor(index)}`}>
                                    #{index + 1}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {exhibition.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                  {formatCurrency(exhibition.totalRevenue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {exhibition.salesCount} sales
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(averageSale)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="flex items-center">
                                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                      <div 
                                        className="bg-teal-600 h-2 rounded-full" 
                                        style={{ width: `${revenueShare}%` }}
                                      ></div>
                                    </div>
                                    <span>{revenueShare.toFixed(1)}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Performance Insights */}
                  {reportData.exhibitions.length > 1 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Performance Insights
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                        <div>
                          <strong>Top Performer:</strong> {reportData.exhibitions[0].name} 
                          <span className="ml-2 text-green-600">
                            ({formatCurrency(reportData.exhibitions[0].totalRevenue)})
                          </span>
                        </div>
                        <div>
                          <strong>Revenue Range:</strong> {formatCurrency(reportData.exhibitions[reportData.exhibitions.length - 1].totalRevenue)} - {formatCurrency(reportData.exhibitions[0].totalRevenue)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Data</h3>
                  <p className="text-gray-500">Unable to load revenue comparison data for the selected exhibitions.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExhibitionRevenueComparisonReport;