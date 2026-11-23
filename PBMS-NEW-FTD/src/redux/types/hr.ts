import type { IBranch, IRole } from "./systemSettings";

export interface IDepartment {
    id: number;
    name: string;
    branchId: string | number;
    branch: Pick<IBranch, "id" | "name"> & { location?: string };
    /** How many people and stores belong to it. */
    _count?: { Employee: number; Store: number };
    createdAt: string;
    updatedAt?: string;
}

export interface IEmployee {
    id: number;
    firstName: string;
    lastName: string;
    gender: "MALE" | "FEMALE";
    email?: string | null;
    tel: string;
    /** Never sent by the API any more; kept optional for older screens. */
    password?: string;
    /** Whether a password is set (people who don't sign in have none). */
    hasPassword?: boolean;
    /** null when the viewer may see names but not pay (attendance-only users). */
    salary: number | string | null;
    hasAccess: boolean;
    hasPrescriptionAccess: boolean;
    isActive: boolean;
    profileImage?: string | null;
    roleId: string | number;
    role: Pick<IRole, "id" | "name">;
    branchId?: string | number | null;
    branch: Pick<IBranch, "id" | "name"> | null;
    deptId?: string | number | null;
    dept?: { id: number; name: string } | null;
    /** @deprecated the API returns `dept` */
    department?: IDepartment;
    updatedAt: Date;
    createdAt: Date;
}

export interface IAttendance {
    id: number;
    employeeId: string;
    employee: IEmployee;
    date: string;
    timeIn: string;
    timeOut?: string | null;
    notes?: string | null;
    updatedAt: Date;
    createdAt: Date;
}

export interface IPayrollRecord {
    id: number;
    payrollPeriodId: number;
    /** Everything about one person's pay (built by the payroll screen). */
    paymentStructure: Record<string, unknown>;
}

export interface IPayrollPeriod {
    id: number;
    periodStart: string;
    periodEnd: string;
    payDate: string;
    totalSpent: number | string;
    payrolls: IPayrollRecord[];
    createdAt: string;
    updatedAt: string;
    /** @deprecated older shape */
    startDate?: string;
    /** @deprecated older shape */
    endDate?: string;
}

export interface IPayrollDetail {
    id: number;
  payrollPeriodId: string;
  employeeId: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    department: string;
  };
}

export interface IPayrollEmployee {
    id: number;
  firstName: string;
  lastName: string;
  branch: string;
  department: string;
  baseSalary: string; // Add this
  deductions: { name: string; value: string }[];
  allowances: { name: string; value: string }[];
  grossPay: string;
  netPay: string;
}