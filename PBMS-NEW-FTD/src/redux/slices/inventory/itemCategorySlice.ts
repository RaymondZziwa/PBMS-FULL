import { makeListSlice } from "../listSlice";
import type { IItemCategory } from "../../types/inventory";

const slice = makeListSlice<IItemCategory>("itemCategory");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = slice.actions;
export default slice.reducer;
