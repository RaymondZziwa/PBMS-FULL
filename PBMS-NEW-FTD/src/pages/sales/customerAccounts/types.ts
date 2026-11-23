/** A customer's prepaid account, as the accounts API returns it. */
export type AccountTxn = { id: number | string; type: "DEPOSIT" | "WITHDRAWAL" | "PURCHASE" | "REFUND" | string; amount: number | string; notes?: string | null; createdAt: string };

export type ClientAccount = {
  id: number;
  accountName?: string;
  accountNumber?: string;
  balance: number | string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string;
  createdAt: string;
  client: { id?: number | string; firstName: string; lastName: string; phone?: string };
  PatientAccountTransaction?: AccountTxn[];
};

export const accountName = (a: ClientAccount) => a.accountName || `${a.client?.firstName ?? ""} ${a.client?.lastName ?? ""}`.trim();
