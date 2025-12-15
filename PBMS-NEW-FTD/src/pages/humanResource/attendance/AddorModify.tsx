import { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { toast } from 'sonner';
import { apiRequest } from '../../../libs/apiConfig';
import CustomDateInput from '../../../custom/inputs/customDateSelector';
import useEmployees from '../../../hooks/humanResource/useEmployees';
import CustomDropdown from '../../../custom/inputs/customDropdown';
import type { IEmployee } from '../../../redux/types/hr';
import { PayrollEndpoints } from '../../../endpoints/humanResource/payroll';
import { createISOStringInEAT } from '../../../libs/timetoEAT';

// ... your interfaces remain the same

const AddOrModifyAttendance: React.FC<AddOrModifyAttendanceProps> = ({
  visible,
  attendance,
  onCancel,
  onSuccess,
}) => {
  const getCurrentTime = () => {
    const now = new Date();
    console.log('Current time:', now);
    return now.toTimeString().slice(0, 5); // Returns "HH:MM" format
  };

  const { data: employees } = useEmployees();
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    timeIn: getCurrentTime(),
    timeOut: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  // Function to create proper ISO string (NO timezone conversion needed)
  const createISOString = (dateStr: string, timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);
    
    // Return as ISO string - let the backend handle timezone conversion
    return date.toISOString();
  };

  // Function to format time for display (NO timezone conversion needed)
  const formatTimeForDisplay = (isoString: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toTimeString().slice(0, 5);
  };

  useEffect(() => {
    if (attendance) {
      // Edit mode - use the time directly
      setFormData({
        employeeId: attendance.employeeId,
        date: attendance.date,
        timeIn: formatTimeForDisplay(attendance.timeIn),
        timeOut: attendance.timeOut ? formatTimeForDisplay(attendance.timeOut) : '',
        notes: (attendance as any).notes || '',
      });
    } else {
      // Create mode - reset form with current time
      setFormData({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        timeIn: getCurrentTime(),
        timeOut: '',
        notes: '',
      });
    }
  }, [attendance, visible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.date || !formData.timeIn) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        employeeId: formData.employeeId,
        date: formData.date,
        timeIn: createISOStringInEAT(formData.date, formData.timeIn),
        timeOut: formData.timeOut ? createISOStringInEAT(formData.date, formData.timeOut) : undefined,
        notes: formData.notes || undefined,
      };
      console.log(payload)

      if (attendance) {
        // Update existing attendance
        await apiRequest(PayrollEndpoints.Attendance.modify(attendance.id), 'PUT', '', payload);
      } else {
        // Create new attendance
        await apiRequest(PayrollEndpoints.Attendance.create, 'POST', '', payload);
      }

      onSuccess();
      onCancel();
    } catch (error: any) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update timeIn to current time when modal opens for create mode
  useEffect(() => {
    if (visible && !attendance) {
      const timer = setInterval(() => {
        setFormData(prev => ({
          ...prev,
          timeIn: getCurrentTime()
        }));
      }, 60000); // Update every minute
      
      return () => clearInterval(timer);
    }
  }, [visible, attendance]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {attendance ? 'Edit Attendance' : 'Clock In Employee'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee *
            </label>
            <CustomDropdown
              options={
                employees?.map((employee: IEmployee) => ({
                  value: employee.id,
                  label: `${employee.firstName} ${employee.lastName}`,
                })) || []
              }
              value={formData.employeeId ? [formData.employeeId] : []}
              onChange={(selectedValues) => handleInputChange('employeeId', selectedValues[0] || '')}
              placeholder="Select Employee"
              disabled={!!attendance}
              singleSelect={true}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <CustomDateInput
              value={formData.date}
              onChange={(value) => handleInputChange('date', value)}
              max={new Date().toISOString().split('T')[0]}
              label=""
              disabled={!!attendance}
            />
          </div>

          {/* Time In */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time In *
            </label>
            <input
              type="time"
              value={formData.timeIn}
              onChange={(e) => handleInputChange('timeIn', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              disabled={!!attendance}
            />
            {!attendance && (
              <p className="text-xs text-gray-500 mt-1">
                Current time: {getCurrentTime()}
              </p>
            )}
          </div>

          {/* Time Out */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Out
            </label>
            <input
              type="time"
              value={formData.timeOut}
              onChange={(e) => handleInputChange('timeOut', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              min={formData.timeIn}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Add any notes about this attendance record (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Add notes about late arrival, early departure, or other relevant information
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : attendance ? 'Update' : 'Clock In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrModifyAttendance;