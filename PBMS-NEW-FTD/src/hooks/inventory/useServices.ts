import * as actions from "../../redux/slices/inventory/serviceSlice";
import { InventoryEndpoints } from "../../endpoints/inventory/inventory";
import type { IService } from "../../redux/types/inventory";
import type { RootState } from "../../redux/store";
import { useListResource } from "../humanResource/useListResource";

const select = (state: RootState) => state.service;

/** Services sold (massage etc.). Loaded once and shared; upsert/remove update every screen at once. */
const useServices = () => useListResource<IService>(InventoryEndpoints.SERVICE.fetch_all, select, actions);

export default useServices;
