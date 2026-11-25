import * as actions from "../../redux/slices/inventory/supplierSlice";
import { InventoryEndpoints } from "../../endpoints/inventory/inventory";
import type { ISupplier } from "../../redux/types/supplyMgt";
import type { RootState } from "../../redux/store";
import { useListResource } from "../humanResource/useListResource";

const select = (state: RootState) => state.supplier;

/** Suppliers with their supplies and payments. Loaded once and shared; upsert/remove update every screen at once. */
const useSupplier = () => useListResource<ISupplier>(InventoryEndpoints.SUPPLY.SUPPLIER.fetch_all, select, actions);

export default useSupplier;
