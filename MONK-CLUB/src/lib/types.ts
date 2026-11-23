export type MemberStatus = "PENDING" | "REJECTED" | "AWAITING_PAYMENT" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export type NextOfKin = { position?: number; fullName: string; relationship: string; address?: string | null; phone: string; email?: string | null; profession?: string | null };

export type Member = {
  id: number;
  title: string;
  surname: string;
  firstName: string;
  otherName?: string | null;
  name: string;
  idType: "NATIONAL_ID" | "PASSPORT";
  idNumber: string;
  country: string;
  district?: string | null;
  county?: string | null;
  subCounty?: string | null;
  address?: string | null;
  phone1: string;
  phone2?: string | null;
  email?: string | null;
  profession?: string | null;
  photoUrl?: string | null;
  status: MemberStatus;
  cardNumber?: string | null;
  /** Signed code for the card's QR, checked by the server when scanned. */
  cardCode?: string | null;
  mustChangePassword: boolean;
  activatedAt?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  nextOfKin?: NextOfKin[];
  registrationCharge?: Charge;
};

export type Charge = { base: number; marzFee: number; serviceFee: number; total: number };

export type Payment = {
  id: number;
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  totalCharged: number;
  baseAmount: number;
  marzFee: number;
  serviceFee: number;
  phone: string;
  createdAt: string;
  completedAt?: string | null;
  failureNote?: string | null;
  purpose?: string;
};

export type TrackerStatus = "DEFAULT" | "ACTIVE" | "DEFECTIVE";
export type Tracker = {
  year: number;
  lots: number;
  months: Array<{ month: number; name: string; cells: Array<{ lot: number; quantity: number | null; receiptNo: string | null }>; filled: number; status: TrackerStatus }>;
  totals: number[];
  summary: { active: number; defective: number; pending: number; totalQuantity: number };
  years: number[];
};

export type ShopItem = { id: number; name: string; category: { id: number; name: string } | null; price: number; clubPrice: number; inStock: boolean };
export type Shop = {
  discountPercent: number;
  items: ShopItem[];
  categories: Array<{ id: number; name: string }>;
  defaultAddress: { recipientName: string; phone: string; address: string };
  mobileMoneyCharge: { percent: number; fixed: number };
};
export type PaymentMethod = "CASH" | "ON_DELIVERY" | "MOBILE_MONEY";
export type OrderStatus = "AWAITING_PAYMENT" | "PLACED" | "PROCESSING" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
export type Order = {
  id: number;
  orderNumber: string;
  recipientName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  paid: boolean;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  notes?: string | null;
  statusNote?: string | null;
  createdAt: string;
  items: Array<{ id: number; itemId: number | null; name: string; unitPrice: number; qty: number; lineTotal: number }>;
};
export type LeaderRow = { rank: number; memberId: number; name: string; place: string | null; photoUrl: string | null; total: number; deliveries: number; isMe: boolean };
export type Leaderboard = { period: "all" | "month"; year: number; month: number; rows: LeaderRow[]; me: LeaderRow | null; participants: number };
