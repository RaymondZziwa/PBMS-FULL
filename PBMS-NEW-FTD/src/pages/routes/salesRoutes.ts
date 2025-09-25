export const SalesRoutes = [
    { name: "POS", path: "/sales/pos", requiredPermission: "access_pos" },
    { name: "Sales History", path: "/sales/history", requiredPermission: "access_sales_records" },
    { name: "Customers", path: "/sales/customers", requiredPermission: "manage_customers" },
]