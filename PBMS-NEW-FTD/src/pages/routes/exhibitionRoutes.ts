export const ExhibitionRoutes = [
    { name: "Manage Stores", path: "/exhibitions/stores", requiredPermission: "manage_exhibition_stores" },
    { name: "Manage Inventory", path: "/exhibitions/stores/inventory", requiredPermission: "manage_exhibition_inventory" },
    { name: "Manage Exhibitions", path: "/exhibitions", requiredPermission: "manage_exhibitions" },
    { name: "Exhibition POS", path: "/exhibitions/pos", requiredPermission: "access_exhibition_pos" },
    { name: "Exhibition Sales", path: "/exhibitions/sales", requiredPermission: "access_exhibition_sales" },
];