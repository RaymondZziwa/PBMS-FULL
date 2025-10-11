export const BranchExpenseEndpoints = {
    createExpense: "/api/branch-expenses/create",
    modifyExpense: (id: string) => `/api/branch-expenses/modify/${id}`,
    deleteExpense: (id: string) => `/api/branch-expenses/delete/${id}`,
    fetchExpenses: (id: string) =>  `/api/branch-expenses/fetch-all/${id}`,
}