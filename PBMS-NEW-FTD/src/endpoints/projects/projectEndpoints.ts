export const PROJECTENDPOINTS = {
    PROJECTS: {
        create: '/api/projects/create',
        modify: (id: string) => `/api/projects/modify/${id}`,
        fetch_all: '/api/projects/fetch-all',
        delete: (id: string) => `/api/projects/delete/${id}`
    },
    PROJECT_SALES: {
        create: '/api/project-sales/create',
        modify: (id: string) => `/api/project-sales/modify/${id}`,
        fetch_all: '/api/project-sales/fetch-all',
        delete: (id: string) => `/api/project-sales/delete/${id}`
    },
    PROJECT_PAYMENTS: {
        create: '/api/project-payments/create',
        modify: (id: string) => `/api/project-payments/modify/${id}`,
        fetch_all: '/api/project-payments/fetch-all',
        delete: (id: string) => `/api/project-payments/delete/${id}`
    }
}