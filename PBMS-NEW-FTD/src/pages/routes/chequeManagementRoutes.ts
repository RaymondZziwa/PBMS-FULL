export const ChequeManagementRoutes = [
    { name: "Cheques", path: "/cheque-management", requiredPermission: "manage_cheque_management" },
    { name: "Cheque History", path: "/cheque-management/history", requiredPermission: "access_cheque_history" },
    { name: "Banks", path: "/cheque-management/banks", requiredPermission: "manage_banks" },
]