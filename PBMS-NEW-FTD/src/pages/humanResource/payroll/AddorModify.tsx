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
  const [generalDeductions, setGeneralDeductions] = useState<DeductionAllowance[]>([]);
  const [generalAllowances, setGeneralAllowances] = useState<DeductionAllowance[]>([]);
  const [payrollEmployees, setPayrollEmployees] = useState<IPayrollEmployee[]>([]);
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
        
        // Transform the attendance data to payroll employees
        const transformedEmployees: IPayrollEmployee[] = response.data.map((attendance: AttendanceData) => {
          // Calculate fine deduction for missed hours
          const missedHoursFine = finePerMissedHour > 0 ? (attendance.totalMissedHours * finePerMissedHour) : 0;
          
          // Create initial deductions array including the missed hours fine if applicable
          const initialDeductions: DeductionAllowance[] = [];
          if (missedHoursFine > 0) {
            initialDeductions.push({
              name: 'Missed Hours Fine',
              value: missedHoursFine.toFixed(2)
            });
          }
          
          const grossSalary = parseFloat(attendance.salary) || 0;
          const netSalary = grossSalary - missedHoursFine;
          
          return {
            id: attendance.employeeId,
            firstName: attendance.name.split(' ')[0] || 'Unknown',
            lastName: attendance.name.split(' ').slice(1).join(' ') || 'Employee',
            branch: attendance.branch || 'N/A',
            department: attendance.department || 'N/A',
            role: attendance.role || 'N/A',
            baseSalary: attendance.salary,
            deductions: initialDeductions,
            allowances: [],
            grossPay: grossSalary.toFixed(2),
            netPay: Math.max(0, netSalary).toFixed(2),
            attendanceData: attendance // Store attendance data for reference
          };
        });
        
        setPayrollEmployees(transformedEmployees);
        setDataFetched(true);
        toast.success(`Loaded payroll data for ${transformedEmployees.length} employees`);
      } else {
        toast.error('No payroll data found for the selected period');
        setPayrollEmployees([]);
        setAttendanceSummary(null);
      }
    } catch (error: any) {
      console.error('Error fetching payroll data:', error);
      toast.error(error?.response?.data?.message || 'Failed to fetch payroll data');
      setPayrollEmployees([]);
      setAttendanceSummary(null);
    } finally {
      setFetchingData(false);
    }
  };

  // Update missed hours fines when finePerMissedHour changes
  useEffect(() => {
    if (payrollEmployees.length > 0 && dataFetched && finePerMissedHour >= 0) {
      const updatedEmployees = payrollEmployees.map(employee => {
        const attendance = employee.attendanceData;
        if (!attendance) return employee;

        // Calculate new fine amount
        const missedHoursFine = finePerMissedHour > 0 ? (attendance.totalMissedHours * finePerMissedHour) : 0;
        const grossSalary = parseFloat(attendance.salary) || 0;
        
        // Find and update or add the missed hours fine deduction
        let deductions = [...employee.deductions];
        const existingFineIndex = deductions.findIndex(d => d.name === 'Missed Hours Fine');
        
        if (missedHoursFine > 0) {
          const fineDeduction = {
            name: 'Missed Hours Fine',
            value: missedHoursFine.toFixed(2)
          };
          
          if (existingFineIndex >= 0) {
            deductions[existingFineIndex] = fineDeduction;
          } else {
            deductions.push(fineDeduction);
          }
        } else if (existingFineIndex >= 0) {
          // Remove the fine deduction if fine amount is 0
          deductions.splice(existingFineIndex, 1);
        }
        
        return {
          ...employee,
          deductions,
          baseSalary: attendance.salary, // Use the actual salary from attendance data
        };
      });

      // Recalculate net pay for all employees
      const employeesWithRecalculatedNetPay = updatedEmployees.map(employee => {
        return calculateEmployeeNetPay(employee);
      });
      
      setPayrollEmployees(employeesWithRecalculatedNetPay);
    }
  }, [finePerMissedHour, dataFetched]);

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
          setPayrollEmployees(payrollPeriod.payrollDetails);
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
        setExpandedEmployees(new Set());
        setDataFetched(false);
        setAttendanceSummary(null);
      }
    }
  }, [payrollPeriod, visible]);

  // Recalculate net pay whenever general deductions/allowances or employee-specific changes occur
  useEffect(() => {
    if (payrollEmployees.length > 0 && dataFetched) {
      const updatedEmployees = payrollEmployees.map(employee => {
        return calculateEmployeeNetPay(employee);
      });
      setPayrollEmployees(updatedEmployees);
    }
  }, [generalDeductions, generalAllowances, dataFetched]);

  const calculateEmployeeNetPay = (employee: IPayrollEmployee): IPayrollEmployee => {
    const grossPay = parseFloat(employee.baseSalary) || 0;
    
    // Add general allowances
    const totalGeneralAllowances = generalAllowances.reduce((sum, allowance) => {
      return sum + (parseFloat(allowance.value) || 0);
    }, 0);
    
    // Add employee-specific allowances
    const totalEmployeeAllowances = employee.allowances.reduce((sum, allowance) => {
      return sum + (parseFloat(allowance.value) || 0);
    }, 0);
    
    // Subtract general deductions
    const totalGeneralDeductions = generalDeductions.reduce((sum, deduction) => {
      return sum + (parseFloat(deduction.value) || 0);
    }, 0);
    
    // Subtract employee-specific deductions
    const totalEmployeeDeductions = employee.deductions.reduce((sum, deduction) => {
      return sum + (parseFloat(deduction.value) || 0);
    }, 0);
    
    const netPay = grossPay + totalGeneralAllowances + totalEmployeeAllowances - totalGeneralDeductions - totalEmployeeDeductions;
    
    return {
      ...employee,
      grossPay: grossPay.toFixed(2),
      netPay: Math.max(0, netPay).toFixed(2)
    };
  };

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
    const allEmployeeIds = new Set(payrollEmployees.map(emp => emp.id));
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

  if (payrollEmployees.length === 0) {
    toast.error('No employees available for payroll');
    return;
  }

  if (!dataFetched) {
    toast.error('Please fetch payroll data first');
    return;
  }

  setLoading(true);

  try {
    // Construct the paymentStructure array with all employee details
    const paymentStructure = payrollEmployees.map(employee => {
      const attendance = employee.attendanceData;
      
      return {
        // Employee Basic Information
        employeeId: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        branch: employee.branch,
        department: employee.department,
        role: employee.role,
        
        // Salary Information
        baseSalary: parseFloat(employee.baseSalary),
        grossPay: parseFloat(employee.grossPay),
        netPay: parseFloat(employee.netPay),
        
        // Attendance Record for the period
        attendance: attendance ? {
          totalDays: attendance.totalDays,
          totalExpectedHours: attendance.totalExpectedHours,
          totalWorkedHours: attendance.totalWorkedHours,
          totalMissedHours: attendance.totalMissedHours,
          attendanceRate: attendance.attendanceRate
        } : null,
        
        // Deductions Breakdown
        deductions: {
          // Auto-generated missed hours fine
          missedHoursFine: employee.deductions.find(d => d.name === 'Missed Hours Fine') 
            ? parseFloat(employee.deductions.find(d => d.name === 'Missed Hours Fine')!.value)
            : 0,
          
          // General deductions applied to all employees
          generalDeductions: generalDeductions.map(d => ({
            name: d.name,
            amount: parseFloat(d.value) || 0
          })),
          
          // Employee-specific additional deductions
          employeeDeductions: employee.deductions
            .filter(d => d.name !== 'Missed Hours Fine')
            .map(d => ({
              name: d.name,
              amount: parseFloat(d.value) || 0
            }))
        },
        
        // Allowances Breakdown
        allowances: {
          // General allowances applied to all employees
          generalAllowances: generalAllowances.map(a => ({
            name: a.name,
            amount: parseFloat(a.value) || 0
          })),
          
          // Employee-specific allowances
          employeeAllowances: employee.allowances.map(a => ({
            name: a.name,
            amount: parseFloat(a.value) || 0
          }))
        },
        
        // Calculation Summary
        summary: {
          totalDeductions: employee.deductions.reduce((sum, deduction) => 
            sum + (parseFloat(deduction.value) || 0), 0) + 
            generalDeductions.reduce((sum, deduction) => 
              sum + (parseFloat(deduction.value) || 0), 0),
          
          totalAllowances: employee.allowances.reduce((sum, allowance) => 
            sum + (parseFloat(allowance.value) || 0), 0) + 
            generalAllowances.reduce((sum, allowance) => 
              sum + (parseFloat(allowance.value) || 0), 0)
        }
      };
    });

    // Calculate total spent for the payroll period
    const totalSpent = payrollEmployees.reduce((total, employee) => {
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
        totalEmployees: payrollEmployees.length,
        periodWorkHours: attendanceSummary?.company.workHours,
        generatedAt: new Date().toISOString(),
        generalDeductions: generalDeductions,
        generalAllowances: generalAllowances
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
    }
  };

  // General Deductions Management
  const addGeneralDeduction = () => {
    setGeneralDeductions(prev => [...prev, { name: '', value: '' }]);
  };

  const updateGeneralDeduction = (index: number, field: 'name' | 'value', value: string) => {
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
    setGeneralAllowances(prev => [...prev, { name: '', value: '' }]);
  };

  const updateGeneralAllowance = (index: number, field: 'name' | 'value', value: string) => {
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
    return total + parseFloat(employee.netPay);
  }, 0);

  // Calculate total fines amount
  const totalFinesAmount = payrollEmployees.reduce((total, employee) => {
    const missedHoursFine = employee.deductions.find(d => d.name === 'Missed Hours Fine');
    return total + (missedHoursFine ? parseFloat(missedHoursFine.value) : 0);
  }, 0);

  // Calculate total gross salary
  const totalGrossSalary = payrollEmployees.reduce((total, employee) => {
    return total + parseFloat(employee.baseSalary);
  }, 0);

  const expandedCount = expandedEmployees.size;
  const totalCount = payrollEmployees.length;

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

          {dataFetched && (
            <>
              {/* General Deductions Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  General Deductions (Applied to all employees)
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
                  General Allowances (Applied to all employees)
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
                    Employees Payroll Details ({totalCount} employees)
                  </label>
                  <div className="flex gap-2">
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
                
                <div className="space-y-2">
                  {payrollEmployees.map((employee, empIndex) => {
                    const isExpanded = expandedEmployees.has(employee.id);
                    const attendance = employee.attendanceData;
                    const missedHoursFine = employee.deductions.find(d => d.name === 'Missed Hours Fine');
                    
                    return (
                      <div key={employee.id} className="border border-gray-200 rounded-lg">
                        {/* Employee Header - Always Visible */}
                        <div 
                          className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleEmployeeExpansion(employee.id)}
                        >
                          <div className="flex items-center gap-3">
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
                                <span>Worked: {attendance?.totalWorkedHours}h</span>
                                <span>Missed: {attendance?.totalMissedHours}h</span>
                                <span>Attendance: {attendance?.attendanceRate}</span>
                                {missedHoursFine && (
                                  <span className="text-red-600 font-medium">Fine: UGX {missedHoursFine.value}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right min-w-32">
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
                                  <p className="font-medium">{attendance.totalWorkedHours}h</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Expected Hours</p>
                                  <p className="font-medium">{attendance.totalExpectedHours}h</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Missed Hours</p>
                                  <p className="font-medium">{attendance.totalMissedHours}h</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Attendance Rate</p>
                                  <p className="font-medium">{attendance.attendanceRate}</p>
                                </div>
                              </div>
                            )}

                            {/* Base Salary */}
                            <div className="flex justify-between items-center py-3 border-b border-gray-200">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Gross Salary</p>
                                <p className="text-xs text-gray-600">Monthly salary before adjustments</p>
                              </div>
                              <p className="font-medium text-lg">UGX {parseFloat(employee.baseSalary).toLocaleString()}</p>
                            </div>

                            {/* Auto-generated Missed Hours Fine */}
                            {missedHoursFine && (
                              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="text-sm font-medium text-red-800">Missed Hours Fine</p>
                                    <p className="text-xs text-red-600">
                                      {attendance?.totalMissedHours || 0} missed hours × UGX {finePerMissedHour}/hour
                                    </p>
                                  </div>
                                  <p className="font-medium text-red-800 text-lg">- UGX {parseFloat(missedHoursFine.value).toLocaleString()}</p>
                                </div>
                              </div>
                            )}

                            {/* Employee-specific Deductions */}
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Additional Employee-specific Deductions
                              </label>
                              {employee.deductions
                                .filter(deduction => deduction.name !== 'Missed Hours Fine')
                                .map((deduction, dedIndex) => (
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
                      <p>Total amount to be paid to {payrollEmployees.length} employees</p>
                      <p>Total Gross Salary: UGX {totalGrossSalary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
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
              disabled={loading || payrollEmployees.length === 0 || !dataFetched}
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