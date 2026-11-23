import * as actions from "../../redux/slices/humanResource/departmentSlice";
import { DepartmentEndpoints } from "../../endpoints/humanResource/department";
import type { IDepartment } from "../../redux/types/hr";
import type { RootState } from "../../redux/store";
import { useListResource } from "./useListResource";

const select = (state: RootState) => state.department;

const useDepartments = () => useListResource<IDepartment>(DepartmentEndpoints.getdepartments, select, actions);

export default useDepartments;
