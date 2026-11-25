import { FiTag } from "react-icons/fi";
import useItemCategories from "../../../hooks/inventory/useItemCategories";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { IItemCategory } from "../../../redux/types/inventory";
import SimpleCatalog from "../SimpleCatalog";

const FIELDS = [{ key: "name", label: "Category name", required: true, placeholder: "e.g. Herbal teas" }];

/** Groups for items (used for filtering and reports). */
const ItemCategoriesManagement = () => {
  const list = useItemCategories();
  return (
    <SimpleCatalog<IItemCategory & { name: string }>
      title="Item categories"
      description="Groups for your items, used when filtering items and in reports."
      noun="category"
      icon={<FiTag className="h-5 w-5" />}
      list={list}
      endpoints={InventoryEndpoints.ITEM_CATEGORIES}
      fields={FIELDS}
      columns={[
        { label: "Category", render: (c) => <span className="font-medium">{c.name}</span> },
        { label: "Items", render: (c) => <span className="tabular-nums">{c._count?.Item ?? "—"}</span>, className: "w-32" },
      ]}
      blockedDelete={(c) => (c._count?.Item ? `It has ${c._count.Item} item(s). Move them to another category first.` : null)}
    />
  );
};

export default ItemCategoriesManagement;
