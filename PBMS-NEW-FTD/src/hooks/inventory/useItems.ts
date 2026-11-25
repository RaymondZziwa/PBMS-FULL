import * as actions from "../../redux/slices/inventory/itemSlice";
import { InventoryEndpoints } from "../../endpoints/inventory/inventory";
import type { IItem } from "../../redux/types/inventory";
import type { RootState } from "../../redux/store";
import { useListResource } from "../humanResource/useListResource";

const select = (state: RootState) => state.item;

/** Items, shared by inventory, POS and reports. Loaded once and shared; upsert/remove update every screen at once. */
const useItems = () => useListResource<IItem>(InventoryEndpoints.ITEM.fetch_all, select, actions);

export default useItems;
