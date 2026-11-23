import { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaMinus, FaChevronDown, FaChevronRight, FaSync } from 'react-icons/fa';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import CustomDateInput from '../../../custom/inputs/customDateSelector';
import CustomNumberInput from '../../../custom/inputs/customNumberInput';
import type { IPayrollEmployee, IPayrollPeriod } from '../../../redux/types/hr';
import { PayrollEndpoints } from '../../../endpoints/humanResource/payroll';
import axios from 'axios';

interface AddOrModifyPayrollPeriodProps {
  visible: boolean;
  payrollPeriod: IPayrollPeriod | null;
  onCancel: () => void;
  onSuccess: () => void;
}

interface DeductionAllowance {
  name: string;
  value: string;
}

/** A general allowance/deduction. perMonth: multiply by each person's months paid. */
interface GeneralItem extends DeductionAllowance {
  perMonth: boolean;
}

interface MonthInfo {
  month: string; // YYYY-MM
  label: string; // "Sep 2026"
  days: number;
}

interface MonthAttendance extends MonthInfo {
  expectedHours: number;
  workedHours: number;
  missedHours: number;
}

/** One person in the payroll being prepared. */
type PayrollRow = IPayrollEmployee & {
  role: string;
  monthlySalary: number;
  /** Months (YYYY-MM) this person is paid for in this run. */
  paidMonths: string[];
  /** Missed-hours fine for the paid months only (kept out of `deductions`). */
  missedHoursFine: number;
  attendanceData?: AttendanceData;
};

interface CompanyProfile {
  id: string;
  name: string;
}

interface AttendanceData {
  employeeId: string;
  name: string;
  salary: string;
  branch: string;
  role: string;
  department: string;
  totalDays: number;
  totalExpectedHours: number;
  totalWorkedHours: number;
  totalMissedHours: number;
  attendanceRate: string;
  months?: MonthAttendance[];
}

interface PayrollApiResponse {
  status: number;
  message: string;
  company: {
    id: string;
    name: string;
    workHours: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
  months?: MonthInfo[];
  data: AttendanceData[];
}

const AddOrModifyPayrollPeriod: React.FC<AddOrModifyPayrollPeriodProps> = ({
  visible,
  payrollPeriod,
  onCancel,
  onSuccess,
}) => {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [formData, setFormData] = useState({
    periodStart: '',
    periodEnd: '',
    payDate: '',
  });
  
  const [finePerMissedHour, setFinePerMissedHour] = useState<number>(0);
  const [generalDeductions, setGeneralDeductions] = useState<GeneralItem[]>([]);
  const [generalAllowances, setGeneralAllowances] = useState<GeneralItem[]>([]);
  const [payrollEmployees, setPayrollEmployees] = useState<PayrollRow[]>([]);
  const [periodMonths, setPeriodMonths] = useState<MonthInfo[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<PayrollApiResponse | null>(null);


  // Fetch payroll data for the selected period
  const fetchPayrollData = async () => {
    if (!formData.periodStart || !formData.periodEnd) {
      toast.error('Please select period dates first');
      return;
    }

    setFetchingData(true);
    try {
      const response = await apiRequest(
        PayrollEndpoints.PAYROLL.get_employees(formData.periodStart, formData.periodEnd),
        'GET',
        ''
      ) as PayrollApiResponse;
      
      if (response.data && Array.isArray(response.data)) {
        setAttendanceSummary(response);
        
        // The calendar months this period covers (from the server; one month if it didn't send them).
        const months: MonthInfo[] =
          response.months && response.months.length > 0
            ? response.months
            : [{ month: formData.periodStart.slice(0, 7), label: formData.periodStart.slice(0, 7), days: response.data[0]?.totalDays ?? 0 }];
        setPeriodMonths(months);

        // Everyone starts paid for every month in the period; adjust per person below.
        const transformedEmployees: PayrollRow[] = response.data.map((attendance: AttendanceData) =>
          calculateEmployeeNetPay({
            id: attendance.employeeId as unknown as number,
            firstName: attendance.name.split(' ')[0] || 'Unknown',
            lastName: attendance.name.split(' ').slice(1).join(' ') || 'Employee',
            branch: attendance.branch || 'N/A',
            department: attendance.department || 'N/A',
            role: attendance.role || 'N/A',
            monthlySalary: parseFloat(attendance.salary) || 0,
            paidMonths: months.map((m) => m.month),
            baseSalary: '0',
            missedHoursFine: 0,
            deductions: [],
            allowances: [],
            grossPay: '0',
            netPay: '0',
            attendanceData: attendance,
          })
        );
        
        setPayrollEmployees(transformedEmployees);
        setSelectedEmployeeIds(new Set(transformedEmployees.map(employee => String(employee.id))));
        setDataFetched(true);
        toast.success(`Loaded payroll data for ${transformedEmployees.length} employees`);
      } else {
        toast.error('No payroll data found for the selected period');
        setPayrollEmployees([]);
        setSelectedEmployeeIds(new Set());
        setDataFetched(false);
        setAttendanceSummary(null);
      }
    } catch (error: any) {
      console.error('Error fetching payroll data:', error);
      toast.error(error?.response?.data?.message || 'Failed to fetch payroll data');
      setPayrollEmployees([]);
      setSelectedEmployeeIds(new Set());
      setDataFetched(false);
      setAttendanceSummary(null);
    } finally {
      setFetchingData(false);
    }
  };

  // Re-price everyone when the fine rate or the general items change.
  useEffect(() => {
    if (!dataFetched) return;
    setPayrollEmployees((prev) => prev.map((employee) => calculateEmployeeNetPay(employee)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finePerMissedHour, generalDeductions, generalAllowances, dataFetched]);

  // Initialize component
  useEffect(() => {
    if (visible) {
      if (payrollPeriod) {
        setFormData({
          periodStart: payrollPeriod.startDate,
          periodEnd: payrollPeriod.endDate,
          payDate: payrollPeriod.payDate,
        });
        setDataFetched(true);
        // For editing, we assume employees data is already available in payrollPeriod
        if (payrollPeriod.payrollDetails) {
          setPayrollEmployees(payrollPeriod.payrollDetails as unknown as PayrollRow[]);
          setSelectedEmployeeIds(new Set(payrollPeriod.payrollDetails.map(employee => String(employee.id))));
        }
      } else {
        setFormData({
          periodStart: '',
          periodEnd: '',
          payDate: '',
        });
        setFinePerMissedHour(0);
        setGeneralDeductions([]);
        setGeneralAllowances([]);
        setPayrollEmployees([]);
        setSelectedEmployeeIds(new Set());
        setEmployeeSearch('');
        setExpandedEmployees(new Set());
        setDataFetched(false);
        setAttendanceSummary(null);
        setPeriodMonths([]);
      }
    }
  }, [payrollPeriod, visible]);

  /** Attendance for the months this person is paid for. */
  const paidAttendance = (employee: PayrollRow) => {
    const byMonth = employee.attendanceData?.months;
    if (!byMonth || byMonth.length === 0) {
      const a = employee.attendanceData;
      return {
        expectedHours: a?.totalExpectedHours ?? 0,
        workedHours: a?.totalWorkedHours ?? 0,
        missedHours: a?.totalMissedHours ?? 0,
        days: a?.totalDays ?? 0,
      };
    }
    return byMonth
      .filter((m) => employee.paidMonths.includes(m.month))
      .reduce(
        (t, m) => ({
          expectedHours: t.expectedHours + m.expectedHours,
          workedHours: t.workedHours + m.workedHours,
          missedHours: t.missedHours + m.missedHours,
          days: t.days + m.days,
        }),
        { expectedHours: 0, workedHours: 0, missedHours: 0, days: 0 }
      );
  };

  /** A general item's amount for one person: × months paid when it's per month. */
  const generalAmount = (item: GeneralItem, monthsPaid: number) => (parseFloat(item.value) || 0) * (item.perMonth ? monthsPaid : 1);

  /**
   * Works out one person's pay:
   *   base  = monthly salary × months paid
   *   gross = base + general allowances + individual allowances
   *   net   = gross − missed-hours fine (paid months only) − general deductions − individual deductions
   */
  const calculateEmployeeNetPay = (employee: PayrollRow): PayrollRow => {
    const monthsPaid = employee.paidMonths.length;
    const base = employee.monthlySalary * monthsPaid;
    const missedHoursFine = finePerMissedHour > 0 ? paidAttendance(employee).missedHours * finePerMissedHour : 0;

    const allowances =
      generalAllowances.reduce((sum, a) => sum + generalAmount(a, monthsPaid), 0) +
      employee.allowances.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
    const deductions =
      missedHoursFine +
      generalDeductions.reduce((sum, d) => sum + generalAmount(d, monthsPaid), 0) +
      employee.deductions.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0);

    const gross = base + allowances;
    return {
      ...employee,
      baseSalary: base.toFixed(2),
      missedHoursFine: +missedHoursFine.toFixed(2),
      grossPay: gross.toFixed(2),
      netPay: Math.max(0, gross - deductions).toFixed(2),
    };
  };

  /** Turn one month on or off for one person (at least one month must stay on). */
  const togglePaidMonth = (employeeIndex: number, month: string) => {
    setPayrollEmployees((prev) =>
      prev.map((employee, i) => {
        if (i !== employeeIndex) return employee;
        const has = employee.paidMonths.includes(month);
        if (has && employee.paidMonths.length === 1) {
          toast.error('Pay at least one month, or untick the person to leave them out of this payroll.');
          return employee;
        }
        const paidMonths = has
          ? employee.paidMonths.filter((m) => m !== month)
          : periodMonths.map((m) => m.month).filter((m) => m === month || employee.paidMonths.includes(m));
        return calculateEmployeeNetPay({ ...employee, paidMonths });
      })
    );
  };

  const monthLabel = (month: string) => periodMonths.find((m) => m.month === month)?.label ?? month;

  const toggleEmployeeExpansion = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const expandAllEmployees = () => {
    const allEmployeeIds = new Set(payrollEmployees.map(emp => emp.id as unknown as string));
    setExpandedEmployees(allEmployeeIds);
  };

  const collapseAllEmployees = () => {
    setExpandedEmployees(new Set());
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!formData.periodStart || !formData.periodEnd || !formData.payDate) {
    toast.error('Please fill in all required fields');
    return;
  }

  if (selectedPayrollEmployees.length === 0) {
    toast.error('Select at least one employee for this payroll');
    return;
  }

  if (!dataFetched) {
    toast.error('Please fetch payroll data first');
    return;
  }

  setLoading(true);

  try {
    // Construct the paymentStructure array with all employee details
    const paymentStructure = selectedPayrollEmployees.map(employee => {
      const attendance = employee.attendanceData;
      const monthsPaid = employee.paidMonths.length;
      const paid = paidAttendance(employee);

      const generalDeductionItems = generalDeductions.map(d => ({
        name: d.name,
        amount: generalAmount(d, monthsPaid),
        unitAmount: parseFloat(d.value) || 0,
        perMonth: d.perMonth,
      }));
      const employeeDeductionItems = employee.deductions.map(d => ({ name: d.name, amount: parseFloat(d.value) || 0 }));
      const generalAllowanceItems = generalAllowances.map(a => ({
        name: a.name,
        amount: generalAmount(a, monthsPaid),
        unitAmount: parseFloat(a.value) || 0,
        perMonth: a.perMonth,
      }));
      const employeeAllowanceItems = employee.allowances.map(a => ({ name: a.name, amount: parseFloat(a.value) || 0 }));

      const sumItems = (list: { amount: number }[]) => list.reduce((t, i) => t + i.amount, 0);

      return {
        // Employee Basic Information
        employeeId: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        branch: employee.branch,
        department: employee.department,
        role: employee.role,

        // Salary Information (baseSalary = monthlySalary × monthsPaid)
        monthlySalary: employee.monthlySalary,
        monthsPaid,
        periodMonths: periodMonths.length,
        paidMonths: employee.paidMonths.map(m => ({ month: m, label: monthLabel(m) })),
        baseSalary: parseFloat(employee.baseSalary),
        grossPay: parseFloat(employee.grossPay),
        netPay: parseFloat(employee.netPay),

        // Attendance for the paid months only
        attendance: attendance ? {
          totalDays: paid.days,
          totalExpectedHours: +paid.expectedHours.toFixed(2),
          totalWorkedHours: +paid.workedHours.toFixed(2),
          totalMissedHours: +paid.missedHours.toFixed(2),
          attendanceRate: paid.expectedHours > 0 ? +((paid.workedHours / paid.expectedHours) * 100).toFixed(2) : 0,
        } : null,

        // Deductions Breakdown
        deductions: {
          missedHoursFine: employee.missedHoursFine,
          generalDeductions: generalDeductionItems,
          employeeDeductions: employeeDeductionItems,
        },

        // Allowances Breakdown
        allowances: {
          generalAllowances: generalAllowanceItems,
          employeeAllowances: employeeAllowanceItems,
        },

        // Calculation Summary
        summary: {
          totalDeductions: employee.missedHoursFine + sumItems(generalDeductionItems) + sumItems(employeeDeductionItems),
          totalAllowances: sumItems(generalAllowanceItems) + sumItems(employeeAllowanceItems),
        },
      };
    });

    // Calculate total spent for the payroll period
    const totalSpent = selectedPayrollEmployees.reduce((total, employee) => {
      return total + parseFloat(employee.netPay);
    }, 0);

    // Final payload matching your database schema
    const payload = {
      // Payroll Period Information
      periodStart: new Date(formData.periodStart),
      periodEnd: new Date(formData.periodEnd),
      payDate: new Date(formData.payDate),
      totalSpent: totalSpent,
      
      // Fine settings used for this payroll
      fineSettings: {
        finePerMissedHour: finePerMissedHour,
        totalFinesAmount: totalFinesAmount
      },
      
      // Company and period reference
      companyId: companyProfile?.id,
      dateRange: attendanceSummary?.dateRange,
      
      // The main payment structure array for reports
      paymentStructure: paymentStructure,
      
      // Additional metadata for reporting
      metadata: {
        totalEmployees: selectedPayrollEmployees.length,
        periodWorkHours: attendanceSummary?.company.workHours,
        generatedAt: new Date().toISOString(),
        generalDeductions: generalDeductions,
        generalAllowances: generalAllowances,
        periodMonths: periodMonths
      }
    };
    await apiRequest(PayrollEndpoints.PAYROLL.create, 'POST', '', payload);

    onSuccess();
    onCancel();
  } catch (error: any) {
    console.error('Error submitting payroll:', error);
    toast.error(error?.response?.data?.message || 'Something went wrong');
  } finally {
    setLoading(false);
  }
};

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Reset data fetched status when dates change
    if (['periodStart', 'periodEnd'].includes(field)) {
      setDataFetched(false);
      setAttendanceSummary(null);
      setSelectedEmployeeIds(new Set());
      setPeriodMonths([]);
    }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployeeIds(previous => {
      const next = new Set(previous);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

  const selectAllEmployees = () => {
    setSelectedEmployeeIds(new Set(payrollEmployees.map(employee => String(employee.id))));
  };

  const clearEmployeeSelection = () => {
    setSelectedEmployeeIds(new Set());
  };

  // General Deductions Management
  const addGeneralDeduction = () => {
    setGeneralDeductions(prev => [...prev, { name: '', value: '', perMonth: true }]);
  };

  const updateGeneralDeduction = (index: number, field: 'name' | 'value' | 'perMonth', value: string | boolean) => {
    setGeneralDeductions(prev => 
      prev.map((deduction, i) => 
        i === index ? { ...deduction, [field]: value } : deduction
      )
    );
  };

  const removeGeneralDeduction = (index: number) => {
    setGeneralDeductions(prev => prev.filter((_, i) => i !== index));
  };

  // General Allowances Management
  const addGeneralAllowance = () => {
    setGeneralAllowances(prev => [...prev, { name: '', value: '', perMonth: true }]);
  };

  const updateGeneralAllowance = (index: number, field: 'name' | 'value' | 'perMonth', value: string | boolean) => {
    setGeneralAllowances(prev => 
      prev.map((allowance, i) => 
        i === index ? { ...allowance, [field]: value } : allowance
      )
    );
  };

  const removeGeneralAllowance = (index: number) => {
    setGeneralAllowances(prev => prev.filter((_, i) => i !== index));
  };

  // Employee-specific Deductions/Allowances Management
  const addEmployeeDeduction = (employeeIndex: number) => {
    const updatedEmployees = [...payrollEmployees];
    updatedEmployees[employeeIndex].deductions.push({ name: '', value: '' });
    const recalculatedEmployee = calculateEmployeeNetPay(updatedEmployees[employeeIndex]);
    updatedEmployees[employeeIndex] = recalculatedEmployee;
    setPayrollEmployees(updatedEmployees);
  };

  const updateEmployeeDeduction = (employeeIndex: number, deductionIndex: number, field: 'name' | 'value', value: string) => {
    const updatedEmployees = [...payrollEmployees];
    updatedEmployees[employeeIndex].deductions[deductionIndex][field] = value;
    const recalculatedEmployee = calculateEmployeeNetPay(updatedEmployees[employeeIndex]);
    updatedEmployees[employeeIndex] = recalculatedEmployee;
    setPayrollEmployees(updatedEmployees);
  };

  const removeEmployeeDeduction = (employeeIndex: number, deductionIndex: number) => {
    const updatedEmployees = [...payrollEmployees];
    updatedEmployees[employeeIndex].deductions.splice(deductionIndex, 1);
    const recalculatedEmployee = calculateEmployeeNetPay(updatedEmployees[employeeIndex]);
    updatedEmployees[employeeIndex] = recalculatedEmployee;
    setPayrollEmployees(updatedEmployees);
  };

  const addEmployeeAllowance = (employeeIndex: number) => {
    const updatedEmployees = [...payrollEmployees];
    updatedEmployees[employeeIndex].allowances.push({ name: '', value: '' });
    const recalculatedEmployee = calculateEmployeeNetPay(updatedEmployees[employeeIndex]);
    updatedEmployees[employeeIndex] = recalculatedEmployee;
    setPayrollEmployees(updatedEmployees);
  };

  const updateEmployeeAllowance = (employeeIndex: number, allowanceIndex: number, field: 'name' | 'value', value: string) => {
    const updatedEmployees = [...payrollEmployees];
    updatedEmployees[employeeIndex].allowances[allowanceIndex][field] = value;
    const recalculatedEmployee = calculateEmployeeNetPay(updatedEmployees[employeeIndex]);
    updatedEmployees[employeeIndex] = recalculatedEmployee;
    setPayrollEmployees(updatedEmployees);
  };

  const removeEmployeeAllowance = (employeeIndex: number, allowanceIndex: number) => {
    const updatedEmployees = [...payrollEmployees];
    updatedEmployees[employeeIndex].allowances.splice(allowanceIndex, 1);
    const recalculatedEmployee = calculateEmployeeNetPay(updatedEmployees[employeeIndex]);
    updatedEmployees[employeeIndex] = recalculatedEmployee;
    setPayrollEmployees(updatedEmployees);
  };

  // Calculate total payroll amount
  const totalPayrollAmount = payrollEmployees.reduce((total, employee) => {
    return selectedEmployeeIds.has(String(employee.id)) ? total + parseFloat(employee.netPay) : total;
  }, 0);

  // Calculate total fines amount
  const totalFinesAmount = payrollEmployees.reduce((total, employee) => {
    if (!selectedEmployeeIds.has(String(employee.id))) return total;
    return total + employee.missedHoursFine;
  }, 0);

  // Calculate total gross salary
  const totalGrossSalary = payrollEmployees.reduce((total, employee) => {
    return selectedEmployeeIds.has(String(employee.id)) ? total + parseFloat(employee.baseSalary) : total;
  }, 0);

  const expandedCount = expandedEmployees.size;
  const totalCount = payrollEmployees.length;
  const selectedPayrollEmployees = payrollEmployees.filter(employee => selectedEmployeeIds.has(String(employee.id)));
  const normalizedEmployeeSearch = employeeSearch.trim().toLowerCase();
  const filteredPayrollEmployees = payrollEmployees
    .map((employee, index) => ({ employee, index }))
    .filter(({ employee }) => {
      const searchableDetails = [
        employee.firstName,
        employee.lastName,
        `${employee.firstName} ${employee.lastName}`,
        employee.role,
        employee.department,
        employee.branch,
        String(employee.id),
      ];
      return searchableDetails.some(detail => detail.toLowerCase().includes(normalizedEmployeeSearch));
    });

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">
            {payrollPeriod ? 'Edit Payroll Period' : 'Generate Payroll'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date Selection Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period Start *
              </label>
              <CustomDateInput
                value={formData.periodStart}
                onChange={(value) => handleInputChange('periodStart', value)}
                max={new Date().toISOString().split('T')[0]}
                label=""
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period End *
              </label>
              <CustomDateInput
                value={formData.periodEnd}
                onChange={(value) => handleInputChange('periodEnd', value)}
                max={new Date().toISOString().split('T')[0]}
                min={formData.periodStart}
                label=""
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay Date *
              </label>
              <CustomDateInput
                value={formData.payDate}
                onChange={(value) => handleInputChange('payDate', value)}
                min={formData.periodEnd}
                label=""
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={fetchPayrollData}
                disabled={!formData.periodStart || !formData.periodEnd || fetchingData}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <FaSync className={`w-4 h-4 ${fetchingData ? 'animate-spin' : ''}`} />
                {fetchingData ? 'Fetching...' : 'Fetch Data'}
              </button>
            </div>
          </div>

          {/* Fine Per Missed Hour Input */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Attendance Fine Settings
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomNumberInput
                label="Fine per Missed Hour (UGX)"
                value={finePerMissedHour}
                onChange={setFinePerMissedHour}
                placeholder="Enter fine amount per missed hour"
                max={100000}
              />
              <div className="flex items-end">
                <p className="text-sm text-gray-600">
                  This amount will be deducted for each hour missed by employees during the selected period.
                  {finePerMissedHour > 0 && ` Total fines: UGX ${totalFinesAmount.toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          {attendanceSummary && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Attendance Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-green-600">Period</p>
                  <p className="font-medium">{attendanceSummary.dateRange.startDate} to {attendanceSummary.dateRange.endDate}</p>
                </div>
                <div>
                  <p className="text-green-600">Total Employees</p>
                  <p className="font-medium">{attendanceSummary.data.length}</p>
                </div>
                <div>
                  <p className="text-green-600">Work Hours/Day</p>
                  <p className="font-medium">{attendanceSummary.company.workHours}h</p>
                </div>
                <div>
                  <p className="text-green-600">Status</p>
                  <p className="font-medium">Data Loaded</p>
                </div>
              </div>
            </div>
          )}

          {dataFetched && periodMonths.length > 1 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-medium">
                This payroll covers {periodMonths.length} months: {periodMonths.map((m) => m.label).join(', ')}.
              </p>
              {(() => {
                // A month is partial when fewer of its days fall inside the period than the month has.
                const partial = periodMonths.filter((m) => {
                  const [y, mo] = m.month.split('-').map(Number);
                  return m.days < new Date(Date.UTC(y, mo, 0)).getUTCDate();
                });
                return partial.length > 0 ? (
                  <p className="mt-2 rounded-md bg-amber-100 px-3 py-2 font-medium text-amber-900">
                    {partial.map((m) => `${m.label} (${m.days} days)`).join(' and ')} {partial.length === 1 ? 'is' : 'are'} only partly in this period.
                    Each month paid adds a full month's salary, so check the months for each person before generating.
                  </p>
                ) : null;
              })()}
              <p className="mt-1 text-blue-800">
                Everyone starts on all {periodMonths.length} months. Click the month buttons on a person to pay them for fewer months.
                Their salary becomes monthly salary × months paid, missed-hours fines only count those months, and general items marked
                “Per month” are multiplied by the same number.
              </p>
            </div>
          )}

          {dataFetched && (
            <>
              {/* General Deductions Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  General Deductions (Applied to all selected employees)
                </label>
                {generalDeductions.map((deduction, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center">
                    <input
                      type="text"
                      placeholder="Deduction name (e.g., Tax, Insurance)"
                      value={deduction.name}
                      onChange={(e) => updateGeneralDeduction(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={deduction.value}
                      onChange={(e) => updateGeneralDeduction(index, 'value', e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                    />
                    {periodMonths.length > 1 && (
                      <label className="flex items-center gap-1.5 whitespace-nowrap text-sm text-gray-700" title="Multiply by each person's months paid">
                        <input
                          type="checkbox"
                          checked={deduction.perMonth}
                          onChange={(e) => updateGeneralDeduction(index, 'perMonth', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Per month
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => removeGeneralDeduction(index)}
                      className="p-2 text-red-600 hover:text-red-800 transition-colors"
                    >
                      <FaMinus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addGeneralDeduction}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  Add General Deduction
                </button>
              </div>

              {/* General Allowances Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  General Allowances (Applied to all selected employees)
                </label>
                {generalAllowances.map((allowance, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center">
                    <input
                      type="text"
                      placeholder="Allowance name (e.g., Transport, Housing)"
                      value={allowance.name}
                      onChange={(e) => updateGeneralAllowance(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={allowance.value}
                      onChange={(e) => updateGeneralAllowance(index, 'value', e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                    />
                    {periodMonths.length > 1 && (
                      <label className="flex items-center gap-1.5 whitespace-nowrap text-sm text-gray-700" title="Multiply by each person's months paid">
                        <input
                          type="checkbox"
                          checked={allowance.perMonth}
                          onChange={(e) => updateGeneralAllowance(index, 'perMonth', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Per month
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => removeGeneralAllowance(index)}
                      className="p-2 text-red-600 hover:text-red-800 transition-colors"
                    >
                      <FaMinus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addGeneralAllowance}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  Add General Allowance
                </button>
              </div>

              {/* Employees Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Employees for {formData.payDate} ({selectedPayrollEmployees.length} of {totalCount} selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllEmployees}
                      className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearEmployeeSelection}
                      className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={expandAllEmployees}
                      className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllEmployees}
                      className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>
                {selectedPayrollEmployees.length === 0 && (
                  <p className="mb-3 text-sm text-amber-700">
                    Select at least one employee to generate this payroll.
                  </p>
                )}

                <div className="mb-3">
                  <label htmlFor="payroll-employee-search" className="sr-only">
                    Search employees
                  </label>
                  <input
                    id="payroll-employee-search"
                    type="search"
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder="Search by name, role, department, branch, or ID..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  />
                  {normalizedEmployeeSearch && (
                    <p className="mt-1 text-xs text-gray-500" aria-live="polite">
                      Showing {filteredPayrollEmployees.length} of {totalCount} employees
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  {filteredPayrollEmployees.map(({ employee, index: empIndex }) => {
                    const isExpanded = expandedEmployees.has(employee.id as unknown as string);
                    const attendance = employee.attendanceData;
                    const paid = paidAttendance(employee);
                    const monthsPaid = employee.paidMonths.length;
                    
                    return (
                      <div key={employee.id} className="border border-gray-200 rounded-lg">
                        {/* Employee Header - Always Visible */}
                        <div 
                          className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleEmployeeExpansion(employee.id as unknown as string)}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedEmployeeIds.has(String(employee.id))}
                              onChange={() => toggleEmployeeSelection(String(employee.id))}
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`Include ${employee.firstName} ${employee.lastName} in this payroll`}
                              className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                            />
                            {isExpanded ? (
                              <FaChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <FaChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {employee.firstName} {employee.lastName}
                              </h4>
                              <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-1">
                                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                  {employee.role}
                                </span>
                                <span>{employee.department}</span>
                                <span>{employee.branch}</span>
                              </div>
                              <div className="flex gap-4 text-xs text-gray-600 mt-1">
                                <span>Worked: {paid.workedHours.toFixed(1)}h</span>
                                <span>Missed: {paid.missedHours.toFixed(1)}h</span>
                                {employee.missedHoursFine > 0 && (
                                  <span className="text-red-600 font-medium">Fine: UGX {employee.missedHoursFine.toLocaleString()}</span>
                                )}
                              </div>
                              {periodMonths.length > 1 && (
                                <div
                                  role="group"
                                  aria-label={`Months paid for ${employee.firstName} ${employee.lastName}`}
                                  className="mt-2 flex flex-wrap items-center gap-1.5"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <span className="mr-1 text-xs font-medium text-gray-700">Months paid:</span>
                                  {periodMonths.map((m) => {
                                    const on = employee.paidMonths.includes(m.month);
                                    return (
                                      <button
                                        key={m.month}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => togglePaidMonth(empIndex, m.month)}
                                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                          on
                                            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                                            : 'border-gray-300 bg-white text-gray-500 line-through hover:border-gray-400'
                                        }`}
                                      >
                                        {m.label}
                                      </button>
                                    );
                                  })}
                                  <span className="ml-1 text-xs text-gray-600">
                                    {monthsPaid} of {periodMonths.length} month{periodMonths.length === 1 ? '' : 's'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right min-w-32">
                            {periodMonths.length > 1 && (
                              <p className="text-xs text-gray-500">
                                UGX {employee.monthlySalary.toLocaleString()} × {monthsPaid}
                              </p>
                            )}
                            <p className="text-sm text-gray-600">Net Pay</p>
                            <p className="font-medium text-green-600 text-lg">UGX {parseFloat(employee.netPay).toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Expandable Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-200">
                            {/* Employee Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 text-sm bg-gray-50 rounded-lg p-3 mb-3">
                              <div>
                                <p className="text-gray-600">Role</p>
                                <p className="font-medium">{employee.role}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Department</p>
                                <p className="font-medium">{employee.department}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Branch</p>
                                <p className="font-medium">{employee.branch}</p>
                              </div>
                            </div>

                            {/* Attendance Summary */}
                            {attendance && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 text-sm bg-gray-50 rounded-lg p-3 mb-3">
                                <div>
                                  <p className="text-gray-600">Worked Hours</p>
                                  <p className="font-medium">{paid.workedHours.toFixed(1)}h</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Expected Hours</p>
                                  <p className="font-medium">{paid.expectedHours.toFixed(1)}h</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Missed Hours</p>
                                  <p className="font-medium">{paid.missedHours.toFixed(1)}h</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Attendance Rate</p>
                                  <p className="font-medium">
                                    {paid.expectedHours > 0 ? ((paid.workedHours / paid.expectedHours) * 100).toFixed(1) : '0.0'}%
                                  </p>
                                </div>
                                {periodMonths.length > 1 && (
                                  <p className="col-span-2 md:col-span-4 text-xs text-gray-500">
                                    For the months paid: {employee.paidMonths.map(monthLabel).join(', ')}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Base Salary */}
                            <div className="flex justify-between items-center py-3 border-b border-gray-200">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Base Salary</p>
                                <p className="text-xs text-gray-600">
                                  UGX {employee.monthlySalary.toLocaleString()} monthly × {monthsPaid} month{monthsPaid === 1 ? '' : 's'}, before adjustments
                                </p>
                              </div>
                              <p className="font-medium text-lg">UGX {parseFloat(employee.baseSalary).toLocaleString()}</p>
                            </div>

                            {/* Auto-generated Missed Hours Fine */}
                            {employee.missedHoursFine > 0 && (
                              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="text-sm font-medium text-red-800">Missed Hours Fine</p>
                                    <p className="text-xs text-red-600">
                                      {paid.missedHours.toFixed(1)} missed hours × UGX {finePerMissedHour}/hour
                                    </p>
                                  </div>
                                  <p className="font-medium text-red-800 text-lg">- UGX {employee.missedHoursFine.toLocaleString()}</p>
                                </div>
                              </div>
                            )}

                            {/* Employee-specific Deductions */}
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Additional Employee-specific Deductions
                              </label>
                              {employee.deductions.map((deduction, dedIndex) => (
                                <div key={dedIndex} className="flex gap-2 mb-2 items-center">
                                  <input
                                    type="text"
                                    placeholder="Deduction name"
                                    value={deduction.name}
                                    onChange={(e) => updateEmployeeDeduction(empIndex, dedIndex, 'name', e.target.value)}
                                    className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Amount"
                                    value={deduction.value}
                                    onChange={(e) => updateEmployeeDeduction(empIndex, dedIndex, 'value', e.target.value)}
                                    className="w-24 px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeEmployeeDeduction(empIndex, dedIndex)}
                                    className="p-1 text-red-600 hover:text-red-800 transition-colors"
                                  >
                                    <FaMinus className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addEmployeeDeduction(empIndex)}
                                className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <FaPlus className="w-3 h-3" />
                                Add Additional Deduction
                              </button>
                            </div>

                            {/* Employee-specific Allowances */}
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Employee-specific Allowances
                              </label>
                              {employee.allowances.map((allowance, allIndex) => (
                                <div key={allIndex} className="flex gap-2 mb-2 items-center">
                                  <input
                                    type="text"
                                    placeholder="Allowance name"
                                    value={allowance.name}
                                    onChange={(e) => updateEmployeeAllowance(empIndex, allIndex, 'name', e.target.value)}
                                    className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Amount"
                                    value={allowance.value}
                                    onChange={(e) => updateEmployeeAllowance(empIndex, allIndex, 'value', e.target.value)}
                                    className="w-24 px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeEmployeeAllowance(empIndex, allIndex)}
                                    className="p-1 text-red-600 hover:text-red-800 transition-colors"
                                  >
                                    <FaMinus className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addEmployeeAllowance(empIndex)}
                                className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <FaPlus className="w-3 h-3" />
                                Add Allowance
                              </button>
                            </div>

                            {/* Employee Summary */}
                            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                              <div>
                                <p className="text-sm text-gray-600">Gross Pay</p>
                                <p className="font-medium text-lg">UGX {parseFloat(employee.grossPay).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Final Net Pay</p>
                                <p className="font-medium text-green-600 text-xl">UGX {parseFloat(employee.netPay).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredPayrollEmployees.length === 0 && (
                    <p className="py-6 text-center text-sm text-gray-500">
                      No employees match “{employeeSearch.trim()}”.
                    </p>
                  )}
                </div>

                {/* Expand/Collapse Status */}
                <div className="mt-2 text-sm text-gray-600">
                  {expandedCount} of {totalCount} employees expanded
                </div>
              </div>

              {/* Total Payroll Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900">Total Payroll Summary</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Total amount to be paid to {selectedPayrollEmployees.length} employees</p>
                      <p>Total base salary: UGX {totalGrossSalary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                      {totalFinesAmount > 0 && (
                        <p className="text-red-600">Total fines: UGX {totalFinesAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-600">
                      UGX {totalPayrollAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedPayrollEmployees.length === 0 || !dataFetched}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : payrollPeriod ? 'Update Payroll' : 'Generate Payroll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrModifyPayrollPeriod;