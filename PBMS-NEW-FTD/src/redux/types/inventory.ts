import type { IDepartment, IEmployee } from "./hr";
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

export interface IUnit {
    id: string;
    name: string;
    abr?: string;
    updatedAt: Date
    createdAt: Date
}

export interface IStockMovement {
    id: string;
    itemId: string;
    item: IItem;
    category: string;
    storeId: string;
    store: IStore;
    qty: number;
    unitId: string;
    unit: IUnit;
    source: string;
    description?: string;
    recordedBy : string;
    employee: IEmployee;
}

export interface IStockStore {
  id: string;
  itemId: string;
  storeId: string;
  qty: number;
  unitId: string;
  createdAt: string;
  updatedAt: string;
  item: IItem;
  store: IStore;
  unit: IUnit;
}