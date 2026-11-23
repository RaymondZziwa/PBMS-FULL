import * as actions from "../../redux/slices/humanResource/payrollSlice";
import { PayrollEndpoints } from "../../endpoints/humanResource/payroll";
import type { IPayrollPeriod } from "../../redux/types/hr";
import type { RootState } from "../../redux/store";
import { useListResource } from "./useListResource";

const select = (state: RootState) => state.payroll;

/** Saved payroll periods, newest first. */
const usePayroll = () => useListResource<IPayrollPeriod>(PayrollEndpoints.PAYROLL.fetch_all, select, actions);

export default usePayroll;
