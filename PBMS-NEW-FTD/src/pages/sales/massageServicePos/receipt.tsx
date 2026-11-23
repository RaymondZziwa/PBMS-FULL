import React from "react";
import type { ICartItem } from "../../../redux/types/sales";
import Receipt from "../../../custom/receipt/Receipt";

interface PrintableContentProps {
  client_names: string;
  cart: ICartItem[];
  total: number;
  branch?: string;
  department?: string;
  user?: string;
  paymentMethod: string;
  transactionId?: string;
  status: string;
  balance: number;
}

/** Massage services receipt. */
export class PrintableContent extends React.Component<PrintableContentProps> {
  render() {
    const p = this.props;
    return (
      <Receipt
        title="Services receipt"
        subtitle={[p.branch, p.department].filter(Boolean).join(" · ") || undefined}
        client={p.client_names}
        lines={p.cart.map((i) => ({ id: i.id, name: i.name, price: Number(i.price) || 0, quantity: Number(i.quantity) || 0, discount: Number(i.discount) || 0 }))}
        total={p.total}
        paymentMethod={p.paymentMethod}
        transactionId={p.transactionId}
        status={p.status}
        balance={p.balance}
        servedBy={p.user}
      />
    );
  }
}
