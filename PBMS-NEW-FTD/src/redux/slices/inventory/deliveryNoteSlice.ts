import { makeListSlice } from "../listSlice";
import type { IDeliveryNote } from "../../types/inventory";

const slice = makeListSlice<IDeliveryNote>("deliveryNotes");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = slice.actions;
export default slice.reducer;
