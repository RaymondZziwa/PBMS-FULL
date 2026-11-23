import axios from "axios";
import { toast } from "sonner";
import { baseURL } from "../../libs/apiConfig";

export type MemberStatus = "PENDING" | "REJECTED" | "AWAITING_PAYMENT" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export type Kin = { id?: number; position?: number; fullName: string; relationship: string; address?: string | null; phone: string; email?: string | null; profession?: string | null };

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
  statusNote?: string | null;
  cardNumber?: string | null;
  /** Bumped by "Reissue card"; older QR codes stop working. */
  cardVersion?: number;
  /** How often the card's QR code was checked, and when last. */
  cardChecks?: number;
  cardCheckedAt?: string | null;
  mustChangePassword: boolean;
  approvedAt?: string | null;
  activatedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  nextOfKin?: Kin[];
  attachments?: Array<{ id: number; label: string; mimeType: string; size: number; createdAt: string }>;
  payments?: Payment[];
};

export type MemberRow = Pick<Member, "id" | "title" | "name" | "phone1" | "email" | "district" | "country" | "status" | "cardNumber" | "photoUrl" | "createdAt"> & { activatedAt?: string | null };

export type Payment = {
  id: number;
  memberId?: number | null;
  memberName: string;
  purpose: string;
  baseAmount: number;
  marzFee: number;
  serviceFee: number;
  totalCharged: number;
  phone: string;
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  failureNote?: string | null;
  completedAt?: string | null;
  createdAt: string;
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

export const CLUB = {
  members: "/api/club/admin/members",
  member: (id: number | string) => `/api/club/admin/members/${id}`,
  action: (id: number | string, a: string) => `/api/club/admin/members/${id}/${a}`,
  tracker: (id: number | string, year: number) => `/api/club/admin/members/${id}/tracker?year=${year}`,
  saveTracker: (id: number | string) => `/api/club/admin/members/${id}/tracker`,
  wallet: "/api/club/admin/wallet",
  payout: "/api/club/admin/wallet/payout",
  settings: "/api/club/admin/settings",
  orders: "/api/club/admin/orders",
  order: (id: number | string) => `/api/club/admin/orders/${id}`,
};

export type OrderStatus = "AWAITING_PAYMENT" | "PLACED" | "PROCESSING" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
export type ClubOrder = {
  id: number;
  orderNumber: string;
  memberId: number | null;
  memberName: string;
  cardNumber: string | null;
  recipientName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  usedDefaultAddress: boolean;
  paymentMethod: "CASH" | "ON_DELIVERY" | "MOBILE_MONEY";
  status: OrderStatus;
  paid: boolean;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  notes: string | null;
  statusNote: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{ id: number; itemId: number | null; name: string; unitPrice: number; qty: number; lineTotal: number }>;
};

export const ORDER_STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  AWAITING_PAYMENT: { label: "Awaiting payment", cls: "bg-[#FFF4E0] text-[#8A5300] dark:bg-[#33240A] dark:text-[#F5C26B]" },
  PLACED: { label: "New", cls: "bg-[#EAF0FB] text-[#2E4A8C] dark:bg-[#1A2647] dark:text-[#9DB4EE]" },
  PROCESSING: { label: "Preparing", cls: "bg-[#EAF0FB] text-[#2E4A8C] dark:bg-[#1A2647] dark:text-[#9DB4EE]" },
  DISPATCHED: { label: "Dispatched", cls: "bg-[#F1EAFB] text-[#5B2E8C] dark:bg-[#2A1A47] dark:text-[#C4A5EE]" },
  DELIVERED: { label: "Delivered", cls: "bg-[#E7F6EC] text-[#1B7A3D] dark:bg-[#12301D] dark:text-[#7FD89E]" },
  CANCELLED: { label: "Cancelled", cls: "bg-subtle text-brand-muted" },
};
export const PAY_METHOD: Record<ClubOrder["paymentMethod"], string> = { MOBILE_MONEY: "Mobile money", ON_DELIVERY: "Pay on delivery", CASH: "Cash" };
/** Same as the API: where an order can go next. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  AWAITING_PAYMENT: ["CANCELLED"],
  PLACED: ["PROCESSING", "DISPATCHED", "DELIVERED", "CANCELLED"],
  PROCESSING: ["DISPATCHED", "DELIVERED", "CANCELLED"],
  DISPATCHED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const STATUS: Record<MemberStatus, { label: string; cls: string; hint: string }> = {
  PENDING: { label: "Pending approval", cls: "bg-[#FFF4E0] text-[#8A5300] dark:bg-[#33240A] dark:text-[#F5C26B]", hint: "Applied, waiting for a decision" },
  AWAITING_PAYMENT: { label: "Awaiting payment", cls: "bg-[#EAF0FB] text-[#2E4A8C] dark:bg-[#1A2647] dark:text-[#9DB4EE]", hint: "Approved, registration fee not paid yet" },
  ACTIVE: { label: "Active", cls: "bg-[#E7F6EC] text-[#1B7A3D] dark:bg-[#12301D] dark:text-[#7FD89E]", hint: "Paid and active" },
  SUSPENDED: { label: "Suspended", cls: "bg-[#FDECEA] text-[#B42318] dark:bg-[#3A1512] dark:text-[#F29A92]", hint: "Can't sign in until reactivated" },
  DEACTIVATED: { label: "Deactivated", cls: "bg-subtle text-brand-muted", hint: "Membership ended" },
  REJECTED: { label: "Rejected", cls: "bg-subtle text-brand-muted", hint: "Application not approved" },
};

export const TRACKER_TONE: Record<TrackerStatus, { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "bg-[#1B7A3D] text-white" },
  DEFECTIVE: { label: "Defective", cls: "bg-[#C0362C] text-white" },
  DEFAULT: { label: "Default", cls: "bg-subtle text-brand-muted" },
};

/** Same rule as the API (club.constants.ts monthStatus). */
export const monthStatus = (filled: number, lots: number, year: number, month: number, today = new Date()): TrackerStatus => {
  const over = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth() + 1);
  if (filled === 0 && !over) return "DEFAULT";
  if (lots > 0 && filled >= Math.ceil(lots / 2)) return "ACTIVE";
  return "DEFECTIVE";
};

export const photoSrc = (url?: string | null) => (url ? `${baseURL}${url}` : null);
export const fmtPhone = (p?: string | null) => (p ? p.replace(/^\+256(\d{3})(\d{3})(\d{3})$/, "0$1 $2 $3") : "—");

/** Opens a private document (ID copies are never public) in a new tab. */
export const openAttachment = async (memberId: number, attachmentId: number) => {
  const tab = window.open("", "_blank");
  try {
    const res = await axios.get<Blob>(`${baseURL}${CLUB.member(memberId)}/attachments/${attachmentId}`, { responseType: "blob", withCredentials: true });
    const url = URL.createObjectURL(res.data);
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    tab?.close();
    toast.error("Couldn't open the document");
  }
};
