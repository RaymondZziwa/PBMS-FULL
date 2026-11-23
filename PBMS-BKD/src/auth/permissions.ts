/**
 * Who may do what. Shared by PermissionsGuard (route level) and by services
 * that shape data per user (for example, the staff dashboard).
 *
 * Permission values are the `value` column of the permissions table
 * (prisma/seed/permissions.ts). Keep these constants in sync with it.
 */
export const PERMISSIONS = {
  REPORTS: 'access_reports_module',
  SALES: 'access_sales_module',
  INVENTORY: 'access_inventory_module',
  EXPENSES: 'access_expenses_module',
  FINANCE: 'access_finance_module',
  EXHIBITION: 'access_exhibition_module',
  PROJECTS: 'access_project_module',
  PRESCRIPTIONS: 'prescription_database_module',
  FARM: 'access_farm_module',
  LOYALTY: 'access_loyalty_club_module',

  HR: 'access_hr_module',
  EMPLOYEES: 'register_and_modify_employees',
  PAYROLL: 'assess_payroll',
  ATTENDANCE: 'record_attendance',

  ROLES: 'create_and_modify_roles',
  ASSIGN_PERMISSIONS: 'assign_permissions',
  BRANCHES: 'create_and_modify_branches',
  STORES: 'create_and_modify_stores',
  COMPANY_SETTINGS: 'create_and_modify_company_profile',
} as const;

/**
 * Permissions added after the first seed. PermissionsSyncService creates any
 * that are missing when the API starts, so they can be ticked on a role.
 */
export const LATER_PERMISSIONS = [
  { name: 'Record Attendance', value: PERMISSIONS.ATTENDANCE, module: 'Human Resource' },
  { name: 'Access Farm Module', value: PERMISSIONS.FARM, module: 'Farm' },
  { name: 'Access Monk Loyalty Club', value: PERMISSIONS.LOYALTY, module: 'Monk Loyalty Club' },
];

/**
 * Role names that pass every permission check. The seeded "Administrator"
 * role is created with no permissions, so it needs this to work at all.
 * Compared ignoring case, spaces, "_" and "-" ("Super Admin", "SUPER_ADMIN",
 * "Super Administrator" all match).
 * Must match FULL_ACCESS_ROLES in the frontend (src/layout/navigation.ts).
 */
const FULL_ACCESS_ROLES = [
  'administrator',
  'admin',
  'superadmin',
  'superadministrator',
  'systemadmin',
  'systemadministrator',
];

/** Anyone who can edit roles can grant themselves anything, so they get full access too. */
const FULL_ACCESS_PERMISSIONS = ['create_and_modify_roles', 'assign_permissions'];

const normaliseRoleName = (name?: string) =>
  (name ?? '').toLowerCase().replace(/[\s_-]+/g, '');

/** The shape JwtStrategy.validate() puts on request.user. */
export interface AuthenticatedUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccess: boolean;
  isActive: boolean;
  branchId: number | null;
  deptId: number | null;
  roleId: number | null;
  branch: { id: number; name: string } | null;
  dept: { id: number; name: string } | null;
  role: {
    id: number;
    name: string;
    permissions: Array<{ value: string } | string>;
  } | null;
}

export const permissionValues = (user?: AuthenticatedUser | null): Set<string> =>
  new Set(
    (user?.role?.permissions ?? [])
      .map((p) => (typeof p === 'string' ? p : p?.value))
      .filter((v): v is string => typeof v === 'string'),
  );

/** True for a role that can do everything (admin by name, or able to edit roles). */
export const isFullAccessRole = (
  role?: { name?: string; permissions?: Array<{ value: string } | string> } | null,
): boolean => {
  if (FULL_ACCESS_ROLES.includes(normaliseRoleName(role?.name))) return true;
  const granted = new Set(
    (role?.permissions ?? []).map((p) => (typeof p === 'string' ? p : p?.value)),
  );
  return FULL_ACCESS_PERMISSIONS.some((p) => granted.has(p));
};

export const isFullAccess = (user?: AuthenticatedUser | null): boolean =>
  isFullAccessRole(user?.role);

export const hasPermission = (
  user: AuthenticatedUser | null | undefined,
  permission: string,
): boolean => isFullAccess(user) || permissionValues(user).has(permission);

export const hasAnyPermission = (
  user: AuthenticatedUser | null | undefined,
  ...permissions: string[]
): boolean => permissions.some((p) => hasPermission(user, p));
