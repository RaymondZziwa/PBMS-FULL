import { makeListSlice } from "../listSlice";
import type { IPayrollPeriod } from "../../types/hr";

const payrollSlice = makeListSlice<IPayrollPeriod>("payroll");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = payrollSlice.actions;
export default payrollSlice.reducer;
