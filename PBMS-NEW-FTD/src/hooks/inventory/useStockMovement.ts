import * as actions from "../../redux/slices/inventory/stockMovementSlice";
import { InventoryEndpoints } from "../../endpoints/inventory/inventory";
import type { IStockMovement } from "../../redux/types/inventory";
import type { RootState } from "../../redux/store";
import { useListResource } from "../humanResource/useListResource";

const select = (state: RootState) => state.stockMvt;

/** Stock movement history, newest first. Loaded once and shared; upsert/remove update every screen at once. */
const useStockMovement = () => useListResource<IStockMovement>(InventoryEndpoints.STOCK_MVT.fetch_all, select, actions);

export default useStockMovement;
