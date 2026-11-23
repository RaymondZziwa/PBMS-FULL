type Id = string | number;

export const DepartmentEndpoints = {
  getdepartments: '/api/departments/fetch-all',
  getDepartmentById: (id: Id) => `/api/departments/fetch/${id}`,
  createDepartment: '/api/departments/create',
  updateDepartment: (id: Id) => `/api/departments/modify/${id}`,
  deleteDepartment: (id: Id) => `/api/departments/delete/${id}`,
};
