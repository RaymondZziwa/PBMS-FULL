import { FiBox } from "react-icons/fi";
import useUnits from "../../../hooks/inventory/useUnits";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { IUnit } from "../../../redux/types/inventory";
import SimpleCatalog from "../SimpleCatalog";

const FIELDS = [
  { key: "name", label: "Unit name", required: true, placeholder: "e.g. Box of 12" },
  { key: "abr", label: "Short form", placeholder: "e.g. box", maxLength: 12 },
];

/** How stock is counted: pieces, boxes, litres… Every stock line has a unit. */
const UnitsManagement = () => {
  const list = useUnits();
  return (
    <SimpleCatalog<IUnit & { name: string }>
      title="Units"
      description="How stock is counted (pieces, boxes, bottles…). Every restock, transfer and supply uses a unit."
      noun="unit"
      icon={<FiBox className="h-5 w-5" />}
      list={list}
      endpoints={InventoryEndpoints.UNITS}
      fields={FIELDS}
      columns={[
        { label: "Unit", render: (u) => <span className="font-medium">{u.name}</span> },
        { label: "Short form", render: (u) => u.abr || "—", className: "w-40" },
      ]}
      blockedDelete={(u) => (u._count && Object.values(u._count).some((n) => n > 0) ? "Stock records use this unit, so it can't be deleted." : null)}
    />
  );
};

export default UnitsManagement;
