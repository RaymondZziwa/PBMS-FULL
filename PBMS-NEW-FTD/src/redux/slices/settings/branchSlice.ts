import { makeListSlice } from "../listSlice";
import type { IBranch } from "../../types/systemSettings";

const branchSlice = makeListSlice<IBranch>("branch");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = branchSlice.actions;
export default branchSlice.reducer;
