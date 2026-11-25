import { makeListSlice } from "../listSlice";
import type { ISupplier } from "../../types/supplyMgt";

const slice = makeListSlice<ISupplier>("supplier");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = slice.actions;
export default slice.reducer;
