import { makeListSlice } from "../listSlice";
import type { IItem } from "../../types/inventory";

const slice = makeListSlice<IItem>("item");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = slice.actions;
export default slice.reducer;
