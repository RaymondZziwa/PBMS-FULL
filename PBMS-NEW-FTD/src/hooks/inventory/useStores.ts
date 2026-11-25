import * as actions from "../../redux/slices/inventory/storeSlice";
import { InventoryEndpoints } from "../../endpoints/inventory/inventory";
import type { IStore } from "../../redux/types/inventory";
import type { RootState } from "../../redux/store";
import { useListResource } from "../humanResource/useListResource";

const select = (state: RootState) => state.store;

/** Stores, with the people allowed to work in each. Loaded once and shared; upsert/remove update every screen at once. */
const useStores = () => useListResource<IStore>(InventoryEndpoints.STORE.fetch_all, select, actions);

export default useStores;
