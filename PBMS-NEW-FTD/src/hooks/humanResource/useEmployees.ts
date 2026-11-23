import * as actions from "../../redux/slices/humanResource/employeeSlice";
import { EmployeeEndpoints } from "../../endpoints/humanResource/employee";
import type { IEmployee } from "../../redux/types/hr";
import type { RootState } from "../../redux/store";
import { useListResource } from "./useListResource";

const select = (state: RootState) => state.employee;

/** Employees list (shared by HR screens, attendance and payroll). */
const useEmployees = () => useListResource<IEmployee>(EmployeeEndpoints.getEmployees, select, actions);

export default useEmployees;
