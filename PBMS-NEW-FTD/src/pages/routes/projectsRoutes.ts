export const ProjectsRoutes = [
    { name: "Projects", path: "/projects", requiredPermission: "manage_projects" },
    { name: "Project Sales", path: "/projects/sales", requiredPermission: "manage_projects_sales" },
    { name: "Project Payments", path: "/projects/payments", requiredPermission: "manage_project_payments" },
];