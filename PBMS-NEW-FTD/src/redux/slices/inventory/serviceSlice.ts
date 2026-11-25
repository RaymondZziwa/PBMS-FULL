import { makeListSlice } from "../listSlice";
import type { IService } from "../../types/inventory";

const slice = makeListSlice<IService>("service");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = slice.actions;
export default slice.reducer;
