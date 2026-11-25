import type { IconType } from "react-icons";
import {
  FiArchive,
  FiAward,
  FiBarChart2,
  FiBriefcase,
  FiClock,
  FiClipboard,
  FiCreditCard,
  FiFileText,
  FiFlag,
  FiGrid,
  FiPackage,
  FiSettings,
  FiShoppingCart,
  FiTool,
  FiUsers,
} from "react-icons/fi";
import { FaSeedling } from "react-icons/fa";

/**
 * The side menu, in one place.
 *
 * Every `permission` below is a value that exists in the permissions table
 * (PBMS-BKD/prisma/seed/permissions.ts). The menu only hides what a role can't
 * use; the backend must still refuse the API calls (see the security review).
 *
 * Set to false to show every module to everyone again (the old behaviour).
 */
export const ENFORCE_MENU_PERMISSIONS = true;

/**
 * Role names that always see the whole menu (the seeded admin role has no permissions).
 * Compared ignoring case, spaces, "_" and "-": "Super Admin", "SUPER_ADMIN" and
 * "Super Administrator" all match. Keep in sync with PBMS-BKD/src/auth/permissions.ts.
 */
const FULL_ACCESS_ROLES = ["administrator", "admin", "superadmin", "superadministrator", "systemadmin", "systemadministrator"];

/** Anyone who can edit roles can grant themselves anything, so they get full access too. */
const FULL_ACCESS_PERMISSIONS = ["create_and_modify_roles", "assign_permissions"];

const normaliseRoleName = (name?: string) => (name ?? "").toLowerCase().replace(/[\s_-]+/g, "");

/** One permission, or several (any one of them is enough). */
export type NavPermission = string | string[];

export type NavLink = { label: string; path: string; permission?: NavPermission };

export type NavItem = {
  id: string;
  label: string;
  icon: IconType;
  /** A direct link. Items with `children` are expandable groups instead. */
  path?: string;
  permission?: NavPermission;
  children?: NavLink[];
};

export type NavSection = { id: string; label: string; items: NavItem[] };

export const NAVIGATION: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: FiGrid, path: "/dashboard" },
      { id: "reports", label: "Reports", icon: FiBarChart2, path: "/reports", permission: "access_reports_module" },
    ],
  },
  {
    id: "sales",
    label: "Sales & Clients",
    items: [
      {
        id: "sales",
        label: "Sales",
        icon: FiShoppingCart,
        permission: "access_sales_module",
        children: [
          { label: "Point of Sale", path: "/sales/pos" },
          { label: "Massage Service POS", path: "/sales/service-pos" },
          { label: "Credit Sales", path: "/sales/credit-sales" },
          { label: "Client Purchases", path: "/sales/client-purchases" },
          { label: "Customers", path: "/sales/customers" },
          { label: "Customer Accounts", path: "/sales/customers/accounts" },
        ],
      },
      {
        id: "exhibition",
        label: "Exhibitions",
        icon: FiFlag,
        permission: "access_exhibition_module",
        children: [
          { label: "Exhibitions", path: "/exhibitions" },
          { label: "Exhibition Inventory", path: "/exhibitions/stores/inventory" },
          { label: "Exhibition POS", path: "/exhibitions/pos" },
          { label: "Exhibition Expenses", path: "/exhibitions/expenses" },
        ],
      },
      {
        id: "prescriptions",
        label: "Prescription Database",
        icon: FiClipboard,
        path: "/client-prescriptions",
        permission: "prescription_database_module",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        id: "inventory",
        label: "Inventory",
        icon: FiPackage,
        permission: "access_inventory_module",
        children: [
          { label: "Stock Levels", path: "/inventory/stock-levels" },
          { label: "Stock Movement", path: "/inventory/stock-movement" },
          { label: "Items", path: "/inventory/items" },
          { label: "Item Categories", path: "/inventory/items-categories" },
          { label: "Units", path: "/inventory/units" },
          { label: "Services", path: "/inventory/services" },
          { label: "Delivery Notes", path: "/inventory/delivery-notes" },
          { label: "Suppliers", path: "/inventory/suppliers" },
          { label: "Stores", path: "/inventory/stores", permission: "create_and_modify_stores" },
        ],
      },
      {
        id: "manufacturing",
        label: "Manufacturing",
        icon: FiTool,
        path: "/manufacturing",
        // No manufacturing permission is seeded yet; it travels with inventory.
        permission: "access_inventory_module",
      },
      {
        id: "farm",
        label: "Farm",
        icon: FaSeedling,
        permission: "access_farm_module",
        children: [
          { label: "Seedling Batches", path: "/farms/batches" },
          { label: "Seedling Stages", path: "/farms/seedlings-stages" },
        ],
      },
      {
        id: "projects",
        label: "Projects",
        icon: FiBriefcase,
        permission: "access_project_module",
        children: [
          { label: "Projects", path: "/projects" },
          { label: "Project Sales", path: "/projects/sales" },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { id: "expenses", label: "Expenses", icon: FiFileText, path: "/expenses", permission: "access_expenses_module" },
      {
        id: "wallets",
        label: "Wallets",
        icon: FiCreditCard,
        permission: "access_finance_module",
        children: [
          { label: "Wallets", path: "/wallets" },
          { label: "Withdraw Channels", path: "/wallets/withdraw-channels" },
          { label: "Transactions", path: "/transactions" },
        ],
      },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      {
        id: "hr",
        label: "Human Resource",
        icon: FiUsers,
        // Each link has its own rule; the group shows when any link is allowed.
        children: [
          { label: "Employees", path: "/hr/employees", permission: ["access_hr_module", "register_and_modify_employees"] },
          { label: "Departments", path: "/hr/departments", permission: ["access_hr_module", "register_and_modify_employees"] },
          { label: "Payroll", path: "/hr/payroll", permission: ["access_hr_module", "assess_payroll"] },
        ],
      },
      // Clock-in/out has its own permission, so supervisors don't need HR access.
      {
        id: "attendance",
        label: "Attendance",
        icon: FiClock,
        path: "/hr/attendance",
        permission: ["record_attendance", "access_hr_module"],
      },
    ],
  },
  {
    id: "loyalty",
    label: "Amatugunda Monk Club",
    items: [
      {
        id: "loyalty-club",
        label: "Amatugunda Monk Club",
        icon: FiAward,
        permission: "access_loyalty_club_module",
        children: [
          { label: "Overview", path: "/loyalty" },
          { label: "Club Members", path: "/loyalty/members" },
          { label: "Performance Tracker", path: "/loyalty/tracker" },
          { label: "Club Orders", path: "/loyalty/orders" },
          { label: "Club Wallet", path: "/loyalty/wallet" },
          { label: "Club Settings", path: "/loyalty/settings" },
        ],
      },
    ],
  },
  {
    id: "records",
    label: "Records",
    items: [
      {
        id: "archives",
        label: "Archives",
        icon: FiArchive,
        // Legacy sales and expense data: treated like reports.
        permission: "access_reports_module",
        children: [
          { label: "Legacy Sales", path: "/archives/sales" },
          { label: "Legacy Expenses", path: "/archives/expenses" },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      {
        id: "settings",
        label: "System Settings",
        icon: FiSettings,
        children: [
          { label: "Roles & Permissions", path: "/settings/roles", permission: "create_and_modify_roles" },
          { label: "Branches", path: "/settings/branches", permission: "create_and_modify_branches" },
          { label: "Company Profile", path: "/settings/company", permission: "create_and_modify_company_profile" },
          { label: "Billing Channels", path: "/settings/billing-channels", permission: "create_and_modify_company_profile" },
        ],
      },
    ],
  },
];

type RoleLike = { name?: string; permissions?: unknown } | null | undefined;

/** Permissions arrive as objects ({ value }) from the API; older cached sessions may hold strings. */
const permissionValues = (role: RoleLike): Set<string> => {
  const list = Array.isArray(role?.permissions) ? role.permissions : [];
  const values = list
    .map((p: unknown) => (typeof p === "string" ? p : (p as { value?: unknown })?.value))
    .filter((v): v is string => typeof v === "string");
  return new Set(values);
};

/** Admin-type roles that pass every check (matches FULL_ACCESS_ROLES in the backend). */
export const isFullAccessRole = (role: RoleLike): boolean => {
  if (FULL_ACCESS_ROLES.includes(normaliseRoleName(role?.name))) return true;
  const granted = permissionValues(role);
  return FULL_ACCESS_PERMISSIONS.some((p) => granted.has(p));
};

/** Same rule the backend's PermissionsGuard applies. */
export const roleHasPermission = (role: RoleLike, permission: string): boolean =>
  isFullAccessRole(role) || permissionValues(role).has(permission);

/** The menu this role may see: groups keep only the links the role can use. */
export const visibleNavigation = (role: RoleLike): NavSection[] => {
  const fullAccess = !ENFORCE_MENU_PERMISSIONS || isFullAccessRole(role);
  const granted = permissionValues(role);
  const allowed = (permission?: NavPermission) =>
    fullAccess || !permission || (Array.isArray(permission) ? permission.some((p) => granted.has(p)) : granted.has(permission));

  return NAVIGATION.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => allowed(item.permission))
      .map((item) => (item.children ? { ...item, children: item.children.filter((c) => allowed(c.permission)) } : item))
      .filter((item) => !item.children || item.children.length > 0),
  })).filter((section) => section.items.length > 0);
};

const matches = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

/** The menu link the current page belongs to: the longest path that matches wins. */
export const findActivePath = (sections: NavSection[], pathname: string): string | null => {
  let best: string | null = null;
  for (const section of sections) {
    for (const item of section.items) {
      const paths = item.children ? item.children.map((c) => c.path) : item.path ? [item.path] : [];
      for (const p of paths) {
        if (matches(pathname, p) && (!best || p.length > best.length)) best = p;
      }
    }
  }
  return best;
};

/** "Inventory › Items" for the top bar; uses the full menu so it works for any page. */
export const findBreadcrumb = (pathname: string): { group?: string; page: string } | null => {
  const active = findActivePath(NAVIGATION, pathname);
  if (!active) return null;
  for (const section of NAVIGATION) {
    for (const item of section.items) {
      if (item.path === active) return { page: item.label };
      const child = item.children?.find((c) => c.path === active);
      if (child) return { group: item.label, page: child.label };
    }
  }
  return null;
};
