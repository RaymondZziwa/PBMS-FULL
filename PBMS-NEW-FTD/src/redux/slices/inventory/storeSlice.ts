import { makeListSlice } from "../listSlice";
import type { IStore } from "../../types/inventory";

const slice = makeListSlice<IStore>("store");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = slice.actions;
export default slice.reducer;
