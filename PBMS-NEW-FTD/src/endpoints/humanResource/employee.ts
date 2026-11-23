type Id = string | number;

export const EmployeeEndpoints = {
  getEmployees: '/api/employees/fetch-all',
  getEmployeeById: (id: Id) => `/api/employees/fetch/${id}`,
  createEmployee: '/api/employees/create',
  updateEmployee: (id: Id) => `/api/employees/modify/${id}`,
  deleteEmployee: (id: Id) => `/api/employees/delete/${id}`,

  EMPLOYEE_PROFILE: {
    UPDATE_PROFILE: (id: Id) => `/api/employees/update-profile/${id}`,
    UPLOAD_PROFILE_PICTURE: (id: Id) => `/api/employees/upload-profile-picture/${id}`,
    DISABLE: (id: Id) => `/api/employees/disable/${id}`,
  }
};
