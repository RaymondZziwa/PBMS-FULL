import { FiHeart } from "react-icons/fi";
import useServices from "../../../hooks/inventory/useServices";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { IService } from "../../../redux/types/inventory";
import { ugx } from "../../../ui/Page";
import SimpleCatalog from "../SimpleCatalog";

const FIELDS = [
  { key: "name", label: "Service name", required: true, placeholder: "e.g. Full body massage" },
  { key: "price", label: "Price", required: true, kind: "money" as const },
];

/** Services sold at the massage POS. */
const ServicesManagement = () => {
  const list = useServices();
  return (
    <SimpleCatalog<IService & { name: string }>
      title="Services"
      description="Services sold at the massage POS, with their prices."
      noun="service"
      icon={<FiHeart className="h-5 w-5" />}
      list={list}
      endpoints={InventoryEndpoints.SERVICE}
      fields={FIELDS}
      columns={[
        { label: "Service", render: (s) => <span className="font-medium">{s.name}</span> },
        { label: "Price", render: (s) => <span className="tabular-nums">{ugx(s.price)}</span>, className: "w-44" },
      ]}
    />
  );
};

export default ServicesManagement;
