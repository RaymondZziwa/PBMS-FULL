import * as actions from "../../redux/slices/inventory/deliveryNoteSlice";
import { InventoryEndpoints } from "../../endpoints/inventory/inventory";
import type { IDeliveryNote } from "../../redux/types/inventory";
import type { RootState } from "../../redux/store";
import { useListResource } from "../humanResource/useListResource";

const select = (state: RootState) => state.deliveryNotes;

/** Delivery notes. Loaded once and shared; upsert/remove update every screen at once. */
const useDeliveryNotes = () => useListResource<IDeliveryNote>(InventoryEndpoints.STOCK_MVT.get_all_dns, select, actions);

export default useDeliveryNotes;
