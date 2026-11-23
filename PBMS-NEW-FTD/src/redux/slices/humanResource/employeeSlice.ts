import { makeListSlice } from "../listSlice";
import type { IEmployee } from "../../types/hr";

const employeeSlice = makeListSlice<IEmployee>("employee");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = employeeSlice.actions;
export default employeeSlice.reducer;
