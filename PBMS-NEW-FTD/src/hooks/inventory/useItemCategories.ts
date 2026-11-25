import * as actions from "../../redux/slices/inventory/itemCategorySlice";
import { InventoryEndpoints } from "../../endpoints/inventory/inventory";
import type { IItemCategory } from "../../redux/types/inventory";
import type { RootState } from "../../redux/store";
import { useListResource } from "../humanResource/useListResource";

const select = (state: RootState) => state.itemCategory;

/** Item categories. Loaded once and shared; upsert/remove update every screen at once. */
const useItemCategories = () => useListResource<IItemCategory>(InventoryEndpoints.ITEM_CATEGORIES.fetch_all, select, actions);

export default useItemCategories;
