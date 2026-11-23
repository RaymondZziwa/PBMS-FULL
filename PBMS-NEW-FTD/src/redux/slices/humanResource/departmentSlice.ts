import { makeListSlice } from "../listSlice";
import type { IDepartment } from "../../types/hr";

const departmentSlice = makeListSlice<IDepartment>("department");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = departmentSlice.actions;
export default departmentSlice.reducer;
