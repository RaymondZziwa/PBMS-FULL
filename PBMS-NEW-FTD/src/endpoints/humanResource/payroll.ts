export const PayrollEndpoints = {
    Attendance: {
        create: '/api/employees/record-attendance',
        modify: (id: string) => `/api/employees/modify-attendance/${id}`,
        get_attendance: (date: string) => `/api/employees/attendance/daily-sheet?date=${date}`
    },
    PAYROLL: {
        create: '/api/employees/save-payroll',
        fetch_all: '/api/employees/payroll-history',
        delete: (id: string) => `/api/employees/delete-payroll/${id}`,
        get_employees: (startDate: string, endDate: string) => `/api/employees/summary?startDate=${startDate}&endDate=${endDate}`,
    }
}