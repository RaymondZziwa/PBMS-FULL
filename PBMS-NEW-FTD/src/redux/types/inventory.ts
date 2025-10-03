import type { IDepartment } from "./hr";
import type { IBranch } from "./systemSettings";

export interface IItemCategory {
    id: string
    name: string
    updatedAt: Date;
    createdAt: Date;
}

export interface IItem {
    id: string
    name: string
    price: number
    barcode: number
    category: IItemCategory
    updatedAt: Date
    createdAt: Date
}

export interface IStore {
    id: string;
    name: string;
    branch: IBranch;
    dept: IDepartment;
    authorizedPersonnel: string[]
    updatedAt: Date
    createdAt: Date
}

export interface IService {
    id: string;
    name: string;
    price: number;
    updatedAt: Date
    createdAt: Date
}