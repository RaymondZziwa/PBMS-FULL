import type { IItem, IStore, IUnit } from "./inventory";

type Person = { id: number | string; firstName: string; lastName: string };

export interface ISupplier {
  id: string | number;
  firstName: string;
  lastName: string;
  contact: string;
  address: string | null;
  Supply: ISupply[];
  updatedAt: string;
  createdAt: string;
}

export type SupplyPaymentStatus = "PAID" | "UNPAID" | "PARTIALLY_PAID";

export interface ISupply {
  id: string | number;
  item: IItem | null;
  uom: IUnit | null;
  qty: number;
  /** Decimals from the API arrive as text. */
  value: number | string;
  balance: number | string;
  proofImage?: string | null;
  destinationStore: Pick<IStore, "id" | "name"> | null;
  employee: Person | null;
  paymentStatus: SupplyPaymentStatus;
  SupplyPayments: ISupplyPayments[];
  createdAt: string;
}

export type PaymentKind = "CASH" | "CHEQUE" | "MOBILE_MONEY" | "BARTER_PAYMENT";

export interface ISupplyPayments {
  id: string | number;
  paymentType: PaymentKind;
  barterItemName?: string | null;
  bank?: string | null;
  chequeNumber?: string | null;
  chequeBankingDate?: string | null;
  amount: number | string;
  paidBy: string | number;
  employee: Person | null;
  paymentStatus: SupplyPaymentStatus;
  proofImage?: string | null;
  createdAt: string;
}

/** @deprecated kept for older imports */
export interface IUserAuth {
  id: string;
  name: string;
  email: string;
}
