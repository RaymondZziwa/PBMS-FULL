export const ReportRoutes = [
    { name: "Sales Reports", path: "/reports/sales", requiredPermission: "view_sales_reports" },
    { name: "Inventory Reports", path: "/reports/inventory", requiredPermission: "view_inventory_reports" },
    { name: "Expenses Reports", path: "/reports/expenses", requiredPermission: "view_expenses_reports" },
    { name: "Exhibition Reports", path: "/reports/exhibitions", requiredPermission: "view_exhibition_reports" },
    // { name: "Human Resource Reports", path: "/reports/human-resources", requiredPermission: "view_exhibition_reports" },
];