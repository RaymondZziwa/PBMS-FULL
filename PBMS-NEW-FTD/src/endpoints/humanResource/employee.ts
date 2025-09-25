export const EmployeeEndpoints = {
  getEmployees: '/api/employees/fetch-all',
  getEmployeeById: (branchId: string) => `/api/employees/${branchId}`,
  createEmployee: '/api/employees/create',
  updateEmployee: (branchId: string) => `/api/employees/modify/${branchId}`,
  deleteEmployee: (branchId: string) => `/api/employees/delete/${branchId}`,
};