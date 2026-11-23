type Id = string | number;

export const PayrollEndpoints = {
    Attendance: {
        create: '/api/employees/record-attendance',
        modify: (id: Id) => `/api/employees/modify-attendance/${id}`,
        get_attendance: (date: string) => `/api/employees/attendance/daily-sheet?date=${date}`
    },
    PAYROLL: {
        create: '/api/employees/save-payroll',
        fetch_all: '/api/employees/payroll-history',
        get_one: (id: Id) => `/api/employees/period/${id}`,
        replace_people: (id: Id) => `/api/employees/period/${id}/payrolls`,
        delete: (id: Id) => `/api/employees/delete-payroll/${id}`,
        get_employees: (startDate: string, endDate: string) =>
            `/api/employees/summary?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    }
}
