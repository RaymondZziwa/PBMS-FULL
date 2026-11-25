import { makeListSlice } from "../listSlice";
import type { IStockMovement } from "../../types/inventory";

const slice = makeListSlice<IStockMovement>("stockMvt");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = slice.actions;
export default slice.reducer;
