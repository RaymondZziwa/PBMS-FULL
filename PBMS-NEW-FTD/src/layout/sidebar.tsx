import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
import { Routes } from "../pages/routes/routes";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import type { IPermission } from "../redux/types/systemSettings";

// Mocked permission check — replace with your real auth
 const hasPermission = (permission?: string) => {
  if (!permission) return true;
  const userPermissions = [
    "view_dashboard",
    "access_reports_module",
    "access_inventory_module",
    "access_requisitions_module",
    "access_budget_module",
    "access_procurement_module",
    "access_sales_module",
    "access_farm_module",
    "access_project_module",
    "access_hr_module",
    "access_assets_module",
    "access_cheque_management_module",
    "access_exhibition_module",
    "access_ticket_module",
    "view_sales_reports",
    "create_and_modify_roles",
    "view_event_tickets",
    "create_and_modify_event_tickets",
    "manage_exhibition_stores",
    "manage_exhibition_inventory",
    "manage_exhibitions",
    "access_exhibition_pos",
    "access_exhibition_sales",
    "manage_inventory_item_categories",
    "manage_inventory_items",
    "manage_stock_movement",
    "manage_budgets",
    "create_and_modify_permissions",
    "create_and_modify_branches",
    "create_and_modify_company_profile",
    "manage_requisitions",
    "access_pos",
    "access_sales_records",
    "manage_customers",
    "manage_cheque_management",
    "access_cheque_history",
    "manage_banks",
    "manage_assets",
    "manage_asset_categories",
    "manage_payroll",
    "manage_employees",
    "manage_departments",
    "manage_payroll_history",
    "manage_allowances",
    "manage_deductions",
    "manage_loans",
    "manage_advance_salaries",
    "view_hr_reports",
    "manage_event_tickets",
    "view_event_ticket_sales",
    "view_event_attendees",
    "manage_tickets",
    "access_ticket_history",
    "manage_attendance",
    "manage_employee_leave_applications",
    "manage_leave_types",
    "manage_designations",
    "manage_employee_loans",
    "manage_asset_assignment",
    "manage_asset_maintenance",
    "manage_purchase_requests",
    "manage_quotations",
    "manage_purchase_orders",
    "manage_goods_received",
    "manage_suppliers",
    "manage_projects",
    "manage_projects_sales",
    "manage_project_payments",
    "manage_farm_inventory",
    "manage_seedlings",
    "manage_poultry",
  ];
  return userPermissions.includes(permission);
};

const SidebarItem = ({ route, level = 0 }: { route: any; level?: number }) => {
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState(false);
  const permissions = useSelector((state: RootState) => state.userAuth.data.role.permissions)

  const checkPermission = (permission?: string) => {
    if (!permission) return true;
    return permissions.some(p => p.value === permission);
  }

  const hasChildren = route.routes && route.routes.length > 0;
  const isActive = pathname === route.path;

  if (!checkPermission (route.requiredPermission)) return null;

  return (
    <div>
      {/* Parent item */}
      <div
        onClick={() => hasChildren && setExpanded((prev) => !prev)}
        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
          isActive ? "bg-gray-700" : "hover:bg-gray-700"
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        <Link
          to={route.path || "#"}
          className={`flex items-center flex-grow ${
            hasChildren ? "pointer-events-none" : ""
          }`}
          onClick={(e) => {
            if (hasChildren) e.preventDefault();
          }}
        >
          {route.icon && <route.icon className="mr-3" />}
          <span>{route.name}</span>
        </Link>

        {hasChildren && (
          <FaChevronDown
            className={`ml-2 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        )}
      </div>

      {/* Child routes */}
      {hasChildren && expanded && (
        <ul className="ml-2">
          {route.routes.map((child: any) => (
            <li key={child.name} className="text-sm">
              <SidebarItem route={child} level={level + 1} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const SidebarNavigation = () => {
  return (
    <nav className="w-64 bg-gray-800 text-white h-[calc(100vh-4rem)] overflow-y-auto p-4">
      <ul>
        {Routes.map((route) => (
          <li key={route.name} className="mb-2">
            <SidebarItem route={route} />
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SidebarNavigation;
