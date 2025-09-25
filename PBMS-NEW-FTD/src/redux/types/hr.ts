import type { IBranch, IRole } from "./systemSettings";

export interface IDepartment {
    id: string;
    name: string;
    branchId: string;
    branch: IBranch;
    createdAt: string;
}

export interface IEmployee {
    id: string;
    firstName: string;
    lastName: string;
    gender: "MALE" | "FEMALE";
    email?: string | null;
    tel: string;
    password: string;
    salary: number;
    hasAccess: boolean;
    isActive: boolean;
    profileImage?: string | null;
    roleId: string;
    role: IRole;
    branchId?: string | null;
    branch: IBranch;
    deptId?: string | null;
    department: IDepartment;
    updatedAt: Date;
    createdAt: Date;
}