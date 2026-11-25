import type { IDepartment, IEmployee } from "./hr";
import type { IBranch } from "./systemSettings";

type Person = Pick<IEmployee, "id" | "firstName" | "lastName">;

export interface IItemCategory {
    id: string;
    name: string;
    /** How many items are in it (it can only be deleted when empty). */
    _count?: { Item: number };
    updatedAt: Date;
    createdAt: Date;
}

export interface IItem {
    id: string;
    name: string;
    /** A decimal in the database: the API may send it as text, so wrap it in Number() for sums. */
    price: number;
    barcode: number;
    categoryId?: number | null;
    category: IItemCategory;
    showInPos: boolean;
    _count?: { ProductInventory: number; InventoryRecord: number; Supply: number; ExhibitionInventory: number; ExhibitionInventoryRecords: number };
    updatedAt: Date;
    createdAt: Date;
}

export interface IStore {
    id: number;
    name: string;
    branchId?: number;
    deptId?: number;
    branch: IBranch;
    dept: IDepartment;
    /** Employee ids allowed to move stock in this store. */
    authorizedPersonnel: string[];
    _count?: { ProductInventory: number; fromInventoryRecords: number; toInventoryRecords: number; Sales: number; Supply: number; Manufacturing: number };
    updatedAt: Date;
    createdAt: Date;
}

export interface IService {
    id: string;
    name: string;
    price: number;
    updatedAt: Date;
    createdAt: Date;
}

export interface IUnit {
    id: string;
    name: string;
    abr?: string | null;
    value?: number; // Value in base unit (e.g., ml for volume units, g for weight units)
    _count?: Record<string, number>;
    updatedAt: Date;
    createdAt: Date;
}

export type MovementCategory = "RESTOCK" | "DEPLETION" | "TRANSFER" | "ADJUSTMENT" | "MANUFACTURING";

export interface IStockMovement {
    id: string | number;
    itemId: string | number;
    item: Pick<IItem, "id" | "name"> | null;
    category: MovementCategory | string;
    storeId: string | number;
    toStoreId: string | number | null;
    store: Pick<IStore, "id" | "name"> | null;
    toStore?: Pick<IStore, "id" | "name"> | null;
    qty: number;
    unitId: string | number;
    deliveryNoteId: string | number | null;
    deliveryNote: Pick<IDeliveryNote, "id" | "name" | "deliveryNoteNumber" | "images"> | null;
    initiatedQty: number | null;
    remainingQuantity: number | null;
    transferId?: string | null;
    transferStatus: "PENDING" | "CONFIRMED" | "REJECTED" | string;
    unit: Pick<IUnit, "id" | "name" | "abr"> | null;
    source: string;
    images: string[] | null;
    isResolved?: boolean | null;
    resolveNotes?: string | null;
    extraNote?: string | null;
    description?: string | null;
    recordedBy: string | number;
    employee: Person | null;
    createdAt: string;
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

export interface IDeliveryNote {
    id: string | number;
    name: string;
    deliveryNoteNumber: string;
    images: string[];
    registeredBy: string | number;
    employee: Person | null;
    notes: string | null;
    /** Stock movements that used this note. */
    _count?: { InventoryRecord: number };
    updatedAt: Date;
    createdAt: Date;
}
