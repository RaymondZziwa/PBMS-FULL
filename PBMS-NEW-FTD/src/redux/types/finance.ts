export interface IChannel {
  id: number;
  type: 'BANK_TRANSFER' | 'MOBILE_MONEY';
  name: string;
  phoneNumber: string | null;
  bank: string | null;
  accountNumber: string | null;
  isVerified: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
//   // Optional relations if needed
//   Wallet?: IWallet[];
//   WithdrawHistory?: IWithdrawHistory[];
}

export interface ISupportedBanks {
    code: string;
    name: string;
    aliases: string[];
}

export interface IWallet {
  id: number;
  name: string;
  purpose?: string | null;
  balance: number;
  createdAt: string;
  isForSales: boolean;
  isForTickets: boolean;
  canBeDeleted: boolean;
  updatedAt: string;

//   Withdraw?: Withdraw[];
//   Event?: Event[];
}