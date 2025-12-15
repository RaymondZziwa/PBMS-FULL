import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { Download, TrendingUp, FileText } from "lucide-react";
import { baseURL } from "../../../libs/apiConfig";
import ReportHeader from "../reportHeader";
import type { RootState } from "../../../redux/store";
import CustomDateInput from "../../../custom/inputs/customDateSelector";

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

interface Employee {
  firstName: string;
  lastName: string;
}

interface Branch {
  name: string;
}

interface Expense {
  id: string;
  category: string;
  title: string;
  description?: string;
  amount: number;
  dateIncurred: string;
  employee: Employee;
  branch: Branch;
}

interface ExpenseCategory {
  category: string;
  totalAmount: number;
  expenseCount: number;
  expenses: Expense[];
}

interface ExpenseReportData {
  totalCategories: number;
  totalAmount: number;
  data: ExpenseCategory[];
}

const ExpensesReport: React.FC = () => {
  const branch = useSelector((state: RootState) => state.userAuth.data.branch);
  const [reportData, setReportData] = useState<ExpenseReportData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Fetch company info once
  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const res = await fetch(`${baseURL}/api/company/profile`);
      const data = await res.json();
      setCompanyInfo(data);
    } catch (err) {
      console.error("Error fetching company info:", err);
    }
  };

  // Automatically fetch report when branch or date range changes
  useEffect(() => {
    if (!branch) return;

    const delayDebounce = setTimeout(() => {
      fetchReportData();
    }, 400); // debounce to prevent too many calls

    return () => clearTimeout(delayDebounce);
  }, [branch, startDate, endDate]);

  const fetchReportData = async () => {
    if (!branch) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("branchId", branch.id);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(
        `${baseURL}/api/reports/expenses/expenses-report?${params.toString()}`
      );
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  };
    
const handleExportPDF = async () => {
  if (!branch) return;

  try {
    setExporting(true);

    const params = new URLSearchParams();
    params.append("branchId", branch.id);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await axios.get(
      `${baseURL}/api/reports/expenses/export-report?${params.toString()}`
    );

    // ✅ Extract fields from JSON
    const { buffer, filename, mimeType } = response.data;

    // ✅ Convert the buffer data array into a Uint8Array
    const uint8Array = new Uint8Array(buffer.data);

    // ✅ Create a blob and open it in a new tab
    const file = new Blob([uint8Array], { type: mimeType });
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, "_blank");

    // (Optional) — Trigger a download instead of open
    // const link = document.createElement("a");
    // link.href = fileURL;
    // link.download = filename;
    // link.click();

  } catch (error) {
    console.error("Error exporting report:", error);
  } finally {
    setExporting(false);
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
        {reportData ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-200">
              <ReportHeader
                companyInfo={companyInfo}
                reportName="Expenses Report"
                branchName={branch?.name || "All Branches"}
                generatedDate={new Date()}
              />

              {/* Filters (inside header) */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CustomDateInput
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  isRequired
                />
                <CustomDateInput
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  isRequired
                />
                <div className="flex items-end justify-end">
                  <button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    {exporting ? "Exporting..." : "Export PDF"}
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
                  <span className="ml-3 text-gray-600">Loading report...</span>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 border border-teal-200 bg-teal-50 rounded-lg">
                      <p className="text-sm text-gray-700 font-medium mb-1">
                        Total Categories
                      </p>
                      <p className="text-3xl font-bold text-teal-700">
                        {reportData.totalCategories}
                      </p>
                    </div>
                    <div className="p-6 border border-blue-200 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-700 font-medium mb-1">
                        Total Amount
                      </p>
                      <p className="text-3xl font-bold text-blue-700">
                        {reportData.totalAmount.toLocaleString()} UGX
                      </p>
                    </div>
                    <div className="p-6 border border-yellow-200 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-700 font-medium mb-1">
                        Report Generated On
                      </p>
                      <p className="text-3xl font-bold text-yellow-700">
                        {new Date().toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  {reportData.data.map((cat) => (
                    <div
                      key={cat.category}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b">
                        <h3 className="text-xl font-semibold flex items-center">
                          <FileText className="w-5 h-5 mr-2 text-teal-600" />
                          {cat.category}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Total:{" "}
                          <span className="font-semibold text-teal-700">
                            {cat.totalAmount.toLocaleString()} UGX
                          </span>{" "}
                          • {cat.expenseCount} expenses
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Title
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Recorded By
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Branch
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {cat.expenses.map((exp) => (
                              <tr key={exp.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                  {exp.title}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                  {exp.amount.toLocaleString()} UGX
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {new Date(
                                    exp.dateIncurred
                                  ).toLocaleDateString('en-GB')}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {exp.employee.firstName}{" "}
                                  {exp.employee.lastName}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {exp.branch.name}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Loading Expenses Report
            </h3>
            <p className="text-gray-500">Fetching report for {branch?.name}...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpensesReport;
