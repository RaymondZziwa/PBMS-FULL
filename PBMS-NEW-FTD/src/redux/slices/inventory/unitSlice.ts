import { makeListSlice } from "../listSlice";
import type { IUnit } from "../../types/inventory";

const slice = makeListSlice<IUnit>("units");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = slice.actions;
export default slice.reducer;
