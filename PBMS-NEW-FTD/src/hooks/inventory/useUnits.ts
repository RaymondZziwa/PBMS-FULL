import * as actions from "../../redux/slices/inventory/unitSlice";
import { InventoryEndpoints } from "../../endpoints/inventory/inventory";
import type { IUnit } from "../../redux/types/inventory";
import type { RootState } from "../../redux/store";
import { useListResource } from "../humanResource/useListResource";

const select = (state: RootState) => state.units;

/** Units of measure (pieces, boxes, litres…). Loaded once and shared; upsert/remove update every screen at once. */
const useUnits = () => useListResource<IUnit>(InventoryEndpoints.UNITS.fetch_all, select, actions);

export default useUnits;
