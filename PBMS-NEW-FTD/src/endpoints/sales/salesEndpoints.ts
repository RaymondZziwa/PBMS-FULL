export const SALESENDPOINTS = {
    CLIENT: {
        create: '/api/clients/create',
        modify:(id: string) => `/api/clients/modify/${id}`,
        delete:(id: string) => `/api/clients/delete/${id}`,
        fetch_all: '/api/clients/fetch-all',
    },
    POS: {
        complete_sale: '/api/sales/create',
        modify:(id: string) => `/api/sales/modify/${id}`,
        delete:(id: string) => `/api/sales/delete/${id}`,
        fetch_all: '/api/sales/fetch-all',
        get_credit_sales: '/api/sales/credit-sales',
    }
}