// // components/MassageServiceSalesReport.tsx
// import React, { useState, useEffect } from 'react';
// import { Download, DollarSign, Users, TrendingUp, Filter, Spa } from 'lucide-react';
// import ReportHeader from '../reportHeader';
// import { baseURL } from '../../../libs/apiConfig';
// import axios from 'axios';
// import ServiceSelector from './serviceSelector';
// import CustomDateInput from '../../../custom/inputs/customDateSelector';

// interface Service {
//   id: string;
//   name: string;
//   price: number;
// }

// interface ServicePerformance {
//   id: string;
//   name: string;
//   price: number;
//   totalRevenue: number;
//   salesCount: number;
//   totalPaid: number;
// }

// interface MassageServiceData {
//   sales: any[];
//   summary: {
//     totalRevenue: number;
//     totalPaid: number;
//     totalBalance: number;
//     totalSales: number;
//     averageSale: number;
//   };
//   servicePerformance: ServicePerformance[];
//   period: {
//     startDate: string;
//     endDate: string;
//   };
// }

// interface CompanyInfo {
//   id: string;
//   name: string;
//   email: string;
//   tel1: string;
//   tel2: string;
//   address: string;
//   logo: string;
//   website: string;
//   tinNumber: string;
//   description: string;
//   foundedYear: number;
//   industry: string;
//   employees: string;
// }

// const MassageServiceSalesReport: React.FC = () => {
//   const [selectedService, setSelectedService] = useState<string>('');
//   const [reportData, setReportData] = useState<MassageServiceData | null>(null);
//   const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [exporting, setExporting] = useState(false);
//   const [dateFilter, setDateFilter] = useState({
//     startDate: '',
//     endDate: ''
//   });

//   // Fetch company info on component mount
//   useEffect(() => {
//     fetchCompanyInfo();
//   }, []);

//   // Fetch report data when service or dates change
//   useEffect(() => {
//     if (dateFilter.startDate || dateFilter.endDate || selectedService) {
//       fetchReportData();
//     }
//   }, [selectedService, dateFilter]);

//   const fetchCompanyInfo = async () => {
//     try {
//       const response = await fetch(`${baseURL}/api/company/profile`);
//       if (!response.ok) throw new Error('Failed to fetch company info');
//       const data = await response.json();
//       setCompanyInfo(data);
//     } catch (error) {
//       console.error('Error fetching company info:', error);
//     }
//   };

//   const fetchReportData = async () => {
//     try {
//       setLoading(true);
//       const queryParams = new URLSearchParams();
      
//       if (selectedService) queryParams.append('serviceId', selectedService);
//       if (dateFilter.startDate) queryParams.append('startDate', dateFilter.startDate);
//       if (dateFilter.endDate) queryParams.append('endDate', dateFilter.endDate);

//       const response = await fetch(
//         `${baseURL}/api/reports/sales/massage-services?${queryParams.toString()}`
//       );
//       if (!response.ok) throw new Error('Failed to fetch report data');
      
//       const data = await response.json();
//       setReportData(data.data);
//     } catch (error) {
//       console.error('Error fetching report data:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleExportPDF = async () => {
//     try {
//       setExporting(true);
//       const response = await axios.get(`${baseURL}/api/reports/sales/export/massage-services`, {
//         params: {
//           serviceId: selectedService,
//           startDate: dateFilter.startDate,
//           endDate: dateFilter.endDate,
//         },
//         headers: {
//           Authorization: `Bearer `,
//         },
//       });

//       const { buffer, filename, mimeType } = response.data;
//       const uint8Array = new Uint8Array(buffer.data);
//       const file = new Blob([uint8Array], { type: mimeType });
//       const fileURL = URL.createObjectURL(file);
//       window.open(fileURL, "_blank");
      
//       setExporting(false);
//     } catch (error) {
//       console.error("Error previewing the report:", error);
//       setExporting(false);
//     }
//   };

//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-UG', {
//       style: 'currency',
//       currency: 'UGX',
//       minimumFractionDigits: 0,
//     }).format(amount);
//   };

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric'
//     });
//   };

//   if (!companyInfo) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         {/* Service Selection */}
//         {!selectedService && (
//           <div className="mb-8">
//             <ServiceSelector 
//               onServiceSelect={setSelectedService}
//               selectedService={selectedService}
//             />
//           </div>
//         )}

//         {/* Report Content */}
//         {(selectedService || dateFilter.startDate || dateFilter.endDate) && (
//           <div className="bg-white rounded-lg shadow-lg overflow-hidden">
//             {/* Report Header */}
//             <div className="px-8 py-6 border-b border-gray-200">
//               <ReportHeader 
//                 companyInfo={companyInfo}
//                 reportName="Massage Service Sales Report"
//                 generatedDate={new Date()}
//               />
              
//               {/* Date Filter and Export Button */}
//               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
//                 <div className="flex flex-col sm:flex-row gap-4">
//                   <div className="flex-1">
//                     <CustomDateInput
//                       label="Start Date"
//                       value={dateFilter.startDate}
//                       onChange={(value) => setDateFilter(prev => ({ ...prev, startDate: value }))}
//                       max={dateFilter.endDate || undefined}
//                       helperText="Select start date"
//                     />
//                   </div>
//                   <div className="flex-1">
//                     <CustomDateInput
//                       label="End Date"
//                       value={dateFilter.endDate}
//                       onChange={(value) => setDateFilter(prev => ({ ...prev, endDate: value }))}
//                       min={dateFilter.startDate || undefined}
//                       helperText="Select end date"
//                     />
//                   </div>
//                   <div className="flex-1 mt-7">
//                     <button
//                       onClick={fetchReportData}
//                       disabled={loading}
//                       className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
//                     >
//                       <Filter className="w-4 h-4 mr-2" />
//                       {loading ? 'Applying...' : 'Apply Filters'}
//                     </button>
//                   </div>
//                 </div>
                
//                 <button
//                   onClick={handleExportPDF}
//                   disabled={exporting || !reportData}
//                   className="flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                 >
//                   <Download className="w-5 h-5 mr-2" />
//                   {exporting ? 'Exporting...' : 'Export PDF'}
//                 </button>
//               </div>
//             </div>

//             {/* Report Body */}
//             <div className="p-8">
//               {loading ? (
//                 <div className="flex items-center justify-center py-12">
//                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
//                   <span className="ml-3 text-gray-600">Loading service data...</span>
//                 </div>
//               ) : reportData ? (
//                 <div className="space-y-8">
//                   {/* Summary Cards */}
//                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//                     <div className="border-2 rounded-lg p-6 text-green-600 bg-green-50 border-green-200">
//                       <div className="flex items-center justify-between">
//                         <div>
//                           <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
//                           <p className="text-3xl font-bold">{formatCurrency(reportData.summary.totalRevenue)}</p>
//                           <p className="text-sm opacity-75 mt-1">service sales</p>
//                         </div>
//                         <div className="p-3 rounded-full bg-white bg-opacity-50">
//                           <DollarSign className="w-5 h-5" />
//                         </div>
//                       </div>
//                     </div>

//                     <div className="border-2 rounded-lg p-6 text-blue-600 bg-blue-50 border-blue-200">
//                       <div className="flex items-center justify-between">
//                         <div>
//                           <h3 className="text-lg font-semibold mb-2">Total Bookings</h3>
//                           <p className="text-3xl font-bold">{reportData.summary.totalSales}</p>
//                           <p className="text-sm opacity-75 mt-1">service bookings</p>
//                         </div>
//                         <div className="p-3 rounded-full bg-white bg-opacity-50">
//                           <Users className="w-5 h-5" />
//                         </div>
//                       </div>
//                     </div>

//                     <div className="border-2 rounded-lg p-6 text-teal-600 bg-teal-50 border-teal-200">
//                       <div className="flex items-center justify-between">
//                         <div>
//                           <h3 className="text-lg font-semibold mb-2">Amount Paid</h3>
//                           <p className="text-3xl font-bold">{formatCurrency(reportData.summary.totalPaid)}</p>
//                           <p className="text-sm opacity-75 mt-1">collected</p>
//                         </div>
//                         <div className="p-3 rounded-full bg-white bg-opacity-50">
//                           <TrendingUp className="w-5 h-5" />
//                         </div>
//                       </div>
//                     </div>

//                     <div className="border-2 rounded-lg p-6 text-purple-600 bg-purple-50 border-purple-200">
//                       <div className="flex items-center justify-between">
//                         <div>
//                           <h3 className="text-lg font-semibold mb-2">Avg. Booking</h3>
//                           <p className="text-3xl font-bold">{formatCurrency(reportData.summary.averageSale)}</p>
//                           <p className="text-sm opacity-75 mt-1">per service</p>
//                         </div>
//                         <div className="p-3 rounded-full bg-white bg-opacity-50">
//                           <Spa className="w-5 h-5" />
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Service Performance */}
//                   {reportData.servicePerformance.length > 0 && (
//                     <div className="border border-gray-200 rounded-lg">
//                       <div className="px-6 py-4 border-b bg-teal-50 border-teal-200">
//                         <h3 className="text-xl font-semibold flex items-center text-teal-900">
//                           <Spa className="w-5 h-5 mr-2" />
//                           Service Performance
//                         </h3>
//                       </div>
//                       <div className="overflow-x-auto">
//                         <table className="w-full">
//                           <thead className="bg-gray-50">
//                             <tr>
//                               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                 Service Name
//                               </th>
//                               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                 Price
//                               </th>
//                               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                 Total Revenue
//                               </th>
//                               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                 Bookings
//                               </th>
//                               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                                 Avg. Revenue
//                               </th>
//                             </tr>
//                           </thead>
//                           <tbody className="bg-white divide-y divide-gray-200">
//                             {reportData.servicePerformance.map((service) => (
//                               <tr key={service.id} className="hover:bg-gray-50">
//                                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                                   {service.name}
//                                 </td>
//                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                                   {formatCurrency(service.price)}
//                                 </td>
//                                 <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
//                                   {formatCurrency(service.totalRevenue)}
//                                 </td>
//                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                                   {service.salesCount} bookings
//                                 </td>
//                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                                   {formatCurrency(service.totalRevenue / service.salesCount)}
//                                 </td>
//                               </tr>
//                             ))}
//                           </tbody>
//                         </table>
//                       </div>
//                     </div>
//                   )}

//                   {/* Period Summary */}
//                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
//                     <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
//                       <TrendingUp className="w-5 h-5 mr-2" />
//                       Period Summary
//                     </h3>
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
//                       <div>
//                         <strong>Period:</strong> {formatDate(reportData.period.startDate)} - {formatDate(reportData.period.endDate)}
//                       </div>
//                       <div>
//                         <strong>Total Balance Due:</strong> {formatCurrency(reportData.summary.totalBalance)}
//                       </div>
//                       <div>
//                         <strong>Collection Rate:</strong> {((reportData.summary.totalPaid / reportData.summary.totalRevenue) * 100).toFixed(1)}%
//                       </div>
//                       <div>
//                         <strong>Services Offered:</strong> {reportData.servicePerformance.length} services
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="text-center py-12">
//                   <Spa className="w-16 h-16 text-gray-400 mx-auto mb-4" />
//                   <h3 className="text-lg font-medium text-gray-900 mb-2">No Service Data</h3>
//                   <p className="text-gray-500">No service sales records found for the selected criteria.</p>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default MassageServiceSalesReport;