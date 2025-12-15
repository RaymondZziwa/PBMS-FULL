import { useState } from 'react';
import { FaPlus, FaClock, FaSignOutAlt } from 'react-icons/fa';
import CustomTable from '../../../custom/table/customTable';
import CustomDeleteModal from '../../../custom/modals/customDeleteModal';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import AddOrModifyAttendance from './AddorModify';
import useAttendance from '../../../hooks/humanResource/useAttendance';
import type { IAttendance } from '../../../redux/types/hr';
import { PayrollEndpoints } from '../../../endpoints/humanResource/payroll';
import CustomDateInput from '../../../custom/inputs/customDateSelector';

const AttendanceManagement = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
  );
  const { data: attendances, refresh } = useAttendance(selectedDate);

  const [modalProps, setModalProps] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | '';
    attendance: IAttendance | null;
  }>({
    isOpen: false,
    mode: 'create',
    attendance: null
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const deleteAttendance = async () => {
    try {
      if (modalProps.attendance) {
        //await apiRequest(PayrollEndpoints.Attendance.delete(modalProps.attendance.id), "DELETE", '');
        refresh();
        setIsDeleteModalOpen(false);
        toast.success('Attendance record deleted successfully');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Something went wrong');
    }
  }

  const clockOutAttendance = async (attendanceId: string) => {
    try {
      await apiRequest(PayrollEndpoints.Attendance.modify(attendanceId), "PUT", '', {
        timeOut: new Date().toISOString()
      });
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to clock out');
    }
  }

  // Handle date change
  const handleDateChange = (date: string) => {
    console.log('date', date)
    setSelectedDate(date);
    // The useAttendance hook will automatically refetch when selectedDate changes
  };

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Table columns configuration
  const columns = [
    { key: 'employee', label: 'Employee', sortable: true, filterable: true },
    { key: 'timeIn', label: 'Time In', sortable: true, filterable: false },
    { key: 'timeOut', label: 'Time Out', sortable: true, filterable: false },
    { key: 'hoursWorked', label: 'Hours Worked', sortable: true, filterable: false },
    { key: 'status', label: 'Status', sortable: true, filterable: true },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  // Format time for display
  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate hours worked
  const calculateHoursWorked = (timeIn: string, timeOut?: string) => {
    if (!timeOut) return '-';
    
    const start = new Date(timeIn);
    const end = new Date(timeOut);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    return `${hours.toFixed(2)}h`;
  };

  // Get status badge
  const getStatusBadge = (timeOut?: string) => {
    if (!timeOut) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <FaClock className="w-3 h-3 mr-1" />
          Clocked In
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <FaSignOutAlt className="w-3 h-3 mr-1" />
        Clocked Out
      </span>
    );
  };

  // Prepare data for the table
  const tableData = attendances.map(attendance => ({
    ...attendance,
    employee: `${attendance.employee.firstName} ${attendance.employee.lastName}`,
    timeIn: formatTime(attendance.timeIn),
    timeOut: formatTime(attendance.timeOut),
    hoursWorked: calculateHoursWorked(attendance.timeIn, attendance.timeOut),
    status: getStatusBadge(attendance.timeOut),
    actions: (
      <div className="flex gap-3">
        {/* Clock Out Button - Only show if not clocked out */}
        {!attendance.timeOut && (
          <div className="relative group">
            <button
              className="text-green-600 hover:text-green-800 transition-colors"
              onClick={() => clockOutAttendance(attendance.id)}
              title="Clock Out"
            >
              <FaSignOutAlt />
            </button>
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Clock Out
            </span>
          </div>
        )}
      </div>
    )
  }));

  // Calculate summary statistics using the actual attendances data
  const totalEmployees = attendances.length;
  const employeesClockedIn = attendances.filter(att => !att.timeOut).length;
  const employeesClockedOut = attendances.filter(att => att.timeOut).length;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Attendance Records</h2>
          <p className="text-gray-600">
            {formatDisplayDate(selectedDate)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Custom Date Picker */}
          <div className="w-64">
            <CustomDateInput
              label="Select Date"
              value={selectedDate}
              onChange={handleDateChange}
              max={new Date().toISOString().split('T')[0]} // Prevent future dates
              helperText="View attendance records for selected date"
            />
          </div>
          
          {/* Summary Cards */}
          <div className="flex gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-32">
              <div className="text-2xl font-bold text-gray-900">{totalEmployees}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 min-w-32">
              <div className="text-2xl font-bold text-blue-700">{employeesClockedIn}</div>
              <div className="text-sm text-blue-600">Clocked In</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 min-w-32">
              <div className="text-2xl font-bold text-green-700">{employeesClockedOut}</div>
              <div className="text-sm text-green-600">Clocked Out</div>
            </div>
          </div>
          
          <button
            onClick={() => setModalProps({ isOpen: true, mode: 'create', attendance: null })}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FaPlus className="mr-2" />
            Clock In Employee
          </button>
        </div>
      </div>

      <CustomTable 
        columns={columns} 
        data={tableData} 
        pageSize={10}
        emptyMessage={`No attendance records for ${formatDisplayDate(selectedDate)}. Click 'Clock In Employee' to add records.`}
      />

      <AddOrModifyAttendance
        visible={modalProps.isOpen}
        attendance={modalProps.attendance}
        onCancel={() => setModalProps({ isOpen: false, mode: "create", attendance: null })}
        onSuccess={refresh}
      />
      
      <CustomDeleteModal
        visible={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteAttendance}
        title="Delete Attendance Record"
        message="Are you sure you want to delete this attendance record? This action cannot be undone."
      />
    </div>
  );
};

export default AttendanceManagement;