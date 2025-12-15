import { FaTimes, FaDownload, FaPrint } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import type { IPayrollPeriod } from '../../../redux/types/hr';

interface PayrollDetailsModalProps {
  visible: boolean;
  payrollPeriod: IPayrollPeriod | null;
  onClose: () => void;
}

const PayrollDetailsModal: React.FC<PayrollDetailsModalProps> = ({
  visible,
  payrollPeriod,
  onClose,
}) => {
  if (!visible || !payrollPeriod) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Extract payroll data - each payroll object contains one employee's payment structure
  const payrolls = payrollPeriod.payrolls || [];
  
  if (payrolls.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Payroll Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 text-center">
            <p className="text-gray-600">No payroll data available for this period.</p>
          </div>
        </div>
      </div>
    );
  }

  // Extract all payment structures from payrolls
  const paymentStructures = payrolls.map(payroll => payroll.paymentStructure);

  // Table columns for payroll details
  const detailColumns = [
    { key: 'employee', label: 'Employee', sortable: true, filterable: true },
    { key: 'role', label: 'Role', sortable: true, filterable: true },
    { key: 'department', label: 'Department', sortable: true, filterable: true },
    { key: 'branch', label: 'Branch', sortable: true, filterable: true },
    { key: 'baseSalary', label: 'Base Salary', sortable: true, filterable: false },
    { key: 'grossPay', label: 'Gross Pay', sortable: true, filterable: false },
    { key: 'totalAllowances', label: 'Allowances', sortable: true, filterable: false },
    { key: 'totalDeductions', label: 'Deductions', sortable: true, filterable: false },
    { key: 'netPay', label: 'Net Pay', sortable: true, filterable: false },
  ];

  // Prepare data for the details table
  const detailTableData = paymentStructures.map((employee: any) => ({
    ...employee,
    employee: employee.name,
    role: employee.role,
    department: employee.department,
    branch: employee.branch,
    baseSalary: formatCurrency(employee.baseSalary),
    grossPay: formatCurrency(employee.grossPay),
    totalAllowances: formatCurrency(employee.summary?.totalAllowances || 0),
    totalDeductions: formatCurrency(employee.summary?.totalDeductions || 0),
    netPay: formatCurrency(employee.netPay),
  }));

  // Calculate totals from all employees
  const totals = {
    baseSalary: paymentStructures.reduce((sum: number, emp: any) => sum + (emp.baseSalary || 0), 0),
    grossPay: paymentStructures.reduce((sum: number, emp: any) => sum + (emp.grossPay || 0), 0),
    totalAllowances: paymentStructures.reduce((sum: number, emp: any) => sum + (emp.summary?.totalAllowances || 0), 0),
    totalDeductions: paymentStructures.reduce((sum: number, emp: any) => sum + (emp.summary?.totalDeductions || 0), 0),
    netPay: paymentStructures.reduce((sum: number, emp: any) => sum + (emp.netPay || 0), 0),
    totalFines: paymentStructures.reduce((sum: number, emp: any) => sum + (emp.deductions?.missedHoursFine || 0), 0),
  };

  // Calculate attendance statistics
  const attendanceStats = {
    totalWorkedHours: paymentStructures.reduce((sum: number, emp: any) => sum + (emp.attendance?.totalWorkedHours || 0), 0),
    totalMissedHours: paymentStructures.reduce((sum: number, emp: any) => sum + (emp.attendance?.totalMissedHours || 0), 0),
    totalExpectedHours: paymentStructures.reduce((sum: number, emp: any) => sum + (emp.attendance?.totalExpectedHours || 0), 0),
  };

  const overallAttendanceRate = attendanceStats.totalExpectedHours > 0 
    ? ((attendanceStats.totalWorkedHours / attendanceStats.totalExpectedHours) * 100).toFixed(1)
    : '0.0';

  // Get unique deduction types from general deductions
  const allDeductions = paymentStructures.flatMap((emp: any) => 
    emp.deductions?.generalDeductions?.map((d: any) => d.name) || []
  );
  const uniqueDeductionTypes = [...new Set(allDeductions)];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[95vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Payroll Details
            </h3>
            <p className="text-sm text-gray-600">
              Period: {formatDate(payrollPeriod.periodStart)} - {formatDate(payrollPeriod.periodEnd)}
            </p>
            <p className="text-sm text-gray-600">
              Pay Date: {formatDate(payrollPeriod.payDate)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* <button
              className="flex items-center px-3 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors"
              title="Download PDF"
            >
              <FaDownload className="mr-2" />
              Export
            </button>
            <button
              className="flex items-center px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              title="Print"
            >
              <FaPrint className="mr-2" />
              Print
            </button> */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Summary Section */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{paymentStructures.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Base Salary</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.baseSalary)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Gross Pay</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.grossPay)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Net Pay</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.netPay)}</p>
              </div>
            </div>
            
            {/* Attendance Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600">Worked Hours</p>
                <p className="text-lg font-semibold text-gray-900">{attendanceStats.totalWorkedHours.toFixed(1)}h</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Missed Hours</p>
                <p className="text-lg font-semibold text-red-600">{attendanceStats.totalMissedHours.toFixed(1)}h</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Expected Hours</p>
                <p className="text-lg font-semibold text-gray-900">{attendanceStats.totalExpectedHours.toFixed(1)}h</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className="text-lg font-semibold text-green-600">{overallAttendanceRate}%</p>
              </div>
            </div>
          </div>

          {/* Fine Summary */}
          {totals.totalFines > 0 && (
            <div className="px-6 py-3 bg-red-50 border-b border-red-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-red-800">Total Fines Applied</p>
                  <p className="text-xs text-red-600">
                    Based on {attendanceStats.totalMissedHours.toFixed(1)} missed hours across all employees
                  </p>
                </div>
                <p className="text-lg font-bold text-red-800">
                  {formatCurrency(totals.totalFines)}
                </p>
              </div>
            </div>
          )}

          {/* Deductions Summary */}
          {uniqueDeductionTypes.length > 0 && (
            <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-yellow-800">General Deductions Applied</p>
                  <p className="text-xs text-yellow-600">
                    Types: {uniqueDeductionTypes.join(', ')}
                  </p>
                </div>
                <p className="text-lg font-bold text-yellow-800">
                  {formatCurrency(totals.totalDeductions - totals.totalFines)}
                </p>
              </div>
            </div>
          )}

          {/* Employee Payments Table */}
          <div className="p-6">
            <CustomTable
              columns={detailColumns}
              data={detailTableData}
              pageSize={10}
              emptyMessage="No payroll details found for this period."
            />
          </div>

          {/* Breakdown Summary */}
          <div className="px-6 py-4 bg-blue-50 border-t border-blue-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-blue-600">Total Allowances</p>
                <p className="text-lg font-bold text-blue-800">{formatCurrency(totals.totalAllowances)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-red-600">Total Deductions</p>
                <p className="text-lg font-bold text-red-800">{formatCurrency(totals.totalDeductions)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-green-600">Total Gross Pay</p>
                <p className="text-lg font-bold text-green-800">{formatCurrency(totals.grossPay)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-purple-600">Total Net Pay</p>
                <p className="text-lg font-bold text-purple-800">{formatCurrency(totals.netPay)}</p>
              </div>
            </div>
          </div>

          {/* Footer with Grand Total */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {paymentStructures.length} employee(s) processed • Period Total: {formatCurrency(parseFloat(payrollPeriod.totalSpent))}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Final Net Pay Total</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(totals.netPay)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollDetailsModal;