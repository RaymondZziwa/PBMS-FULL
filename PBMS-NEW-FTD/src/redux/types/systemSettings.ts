import type { IEmployee } from "./hr";

export interface IBranch {
    id: string | number;
    name: string;
    location: string;
    /** How many people, stores and departments the branch has (from the list endpoint). */
    _count?: { Employee: number; Store: number; Department: number };
    updatedAt: Date;
    createdAt: Date;
}

export interface IPermission {
    id: string | number;
    name: string;
    value: string;
    module?: string;
}

/** Permissions arrive as objects from the API; older cached sessions may hold strings. */
export interface IRole {
    id: string | number;
    name: string;
    Employee?: Array<Pick<IEmployee, "id" | "firstName" | "lastName"> & { email?: string | null; isActive?: boolean }>;
    permissions: Array<IPermission | string>;
}

/** Permissions grouped by module, as GET /api/roles/permissions returns them. */
export interface IPermissionGroup {
    id: string;
    module: string;
    permissions: IPermission[];
}

export type UtilityType = 'LIGHT' | 'NWSC';
export interface IBillingChannel {
  id: number;
  utility: UtilityType;
  name: string | null;
  meterNumber: string;
  isVerified: boolean;
  area: string | null;
  updatedAt: Date;
  createdAt: Date;
}