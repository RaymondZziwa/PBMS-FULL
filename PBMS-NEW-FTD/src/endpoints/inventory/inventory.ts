export const InventoryEndpoints = {
    ITEM_CATEGORIES: {
        create: '/api/item-categories/create',
        modify: (id: string) => `/api/item-categories/modify/${id}`,
        fetch_all: '/api/item-categories/fetch-all',
        delete: (id: string) => `/api/item-categories/delete/${id}`
    },
    ITEM: {
        create: '/api/item/create',
        modify: (id: string) => `/api/item/modify/${id}`,
        fetch_all: '/api/item/fetch-all',
        delete: (id: string) => `/api/item/delete/${id}`
    },
    STORE: {
        create: '/api/store/create',
        modify: (id: string) => `/api/store/modify/${id}`,
        fetch_all: '/api/store/fetch-all',
        delete: (id: string) => `/api/store/delete/${id}`
    },
    SERVICE: {
        create: '/api/services/create',
        modify: (id: string) => `/api/services/modify/${id}`,
        fetch_all: '/api/services/fetch-all',
        delete: (id: string) => `/api/services/delete/${id}`
    },
}