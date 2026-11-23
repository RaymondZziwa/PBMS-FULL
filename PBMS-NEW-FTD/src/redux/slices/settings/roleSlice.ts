import { makeListSlice } from "../listSlice";
import type { IRole } from "../../types/systemSettings";

const roleSlice = makeListSlice<IRole>("role");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = roleSlice.actions;
export default roleSlice.reducer;
