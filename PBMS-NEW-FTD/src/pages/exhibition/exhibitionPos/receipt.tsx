import React from "react";
import type { ICartItem } from "../../../redux/types/sales";
import Receipt from "../../../custom/receipt/Receipt";

interface PrintableContentProps {
  client_names: string;
  cart: ICartItem[];
  total: number;
  paymentMethod: string;
  transactionId?: string;
}

/** Exhibition stand receipt. */
export class PrintableContent extends React.Component<PrintableContentProps> {
  render() {
    const p = this.props;
    return (
      <Receipt
        title="Exhibition receipt"
        client={p.client_names}
        lines={p.cart.map((i) => ({ id: i.id, name: i.name, price: Number(i.price) || 0, quantity: Number(i.quantity) || 0, discount: Number(i.discount) || 0 }))}
        total={p.total}
        paymentMethod={p.paymentMethod}
        transactionId={p.transactionId}
        servedBy={localStorage.getItem("name") ?? undefined}
      />
    );
  }
}
