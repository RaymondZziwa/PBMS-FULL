
import React from 'react';
import Logo from '../../../assets/logo.png';
import { numberToWords } from '../../../libs/numberToWords';
import type { ICartItem } from '../../../redux/types/sales';

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

export class PrintableContent extends React.Component<PrintableContentProps> {
  render() {
    const { client_names, cart, total, paymentMethod, transactionId, branch, department, user, status, balance } = this.props;
    const today = new Date();

    const formattedDateTime = today.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const totalInWords = numberToWords(total) + " Shillings";

    return (
      <div style={{ color: "black", padding: "10px", fontSize: "10px" }}>
        <div style={{ textAlign: "center", marginBottom: "5px" }}>
          <img src={Logo} alt="receipt-logo" height="30px" />
          <h4>
            Prof-bioresearch{" "}
            {branch ?? "N/A"}{" "}
            {department} Receipt
          </h4>
        </div>
        <div
          style={{
            textAlign: "center",
            borderBottom: "1px dashed black",
            marginBottom: "10px",
          }}
        >
          <p>Equatorial near Bank of Africa</p>
          <p>Masanafu near Padre Pio Vocational School</p>
          <p>www.profbioresearch.net | profbioresearch@gmail.com</p>
          <p>0702061652 / 0779519652</p>
        </div>
        <div>
          <p>Date: {formattedDateTime}</p>
          <p>Client: {client_names}</p>
          <p>Payment Method: {paymentMethod}</p>
          <p>Status: {status}</p>
          <p>Total: UGX {total.toLocaleString()}</p>
          <p>Balance: {balance}</p>
          {(paymentMethod == "MTN mobile money" || paymentMethod == "Airtel money") && (
            <p>Transaction Id: {transactionId}</p>
          )}
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "5px",
          }}
        >
          <thead>
            <tr>
              <th style={{ border: "1px solid black", padding: "2px" }}>
                Item
              </th>
              <th
                style={{
                  border: "1px solid black",
                  padding: "2px",
                  textAlign: "right",
                }}
              >
                U/C
              </th>
              <th
                style={{
                  border: "1px solid black",
                  padding: "2px",
                  textAlign: "right",
                }}
              >
                Disc
              </th>
              <th
                style={{
                  border: "1px solid black",
                  padding: "2px",
                  textAlign: "right",
                }}
              >
                Qty
              </th>
              <th
                style={{
                  border: "1px solid black",
                  padding: "2px",
                  textAlign: "right",
                }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    border: "1px solid black",
                    padding: "2px",
                  }}
                >
                  No items in cart
                </td>
              </tr>
            ) : (
              cart.map((item: ICartItem) => {
                const unitPrice = item.price || 0;
                const quantity = item.quantity || 0;
                const discount = item.discount|| 0;
                const itemTotal = (unitPrice * quantity) - discount;

                return (
                  <tr key={item.id}>
                    <td style={{ border: "1px solid black", padding: "2px" }}>{item.name}</td>
                    <td style={{ border: "1px solid black", padding: "2px", textAlign: "right" }}>
                      {unitPrice.toLocaleString()}
                    </td>
                    <td style={{ border: "1px solid black", padding: "2px", textAlign: "right" }}>
                      {discount.toLocaleString()}
                    </td>
                    <td style={{ border: "1px solid black", padding: "2px", textAlign: "right" }}>
                      {quantity}
                    </td>
                    <td style={{ border: "1px solid black", padding: "2px", textAlign: "right" }}>
                      {itemTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div style={{ marginTop: "10px", float: "right" }}>
          <p>Total: UGX {total.toLocaleString()}</p>
        </div>
        <div style={{ marginTop: "10px", textAlign: "left" }}>
          <p>Total in Words: {totalInWords}</p>
        </div>
        <div style={{ marginTop: "10px", textAlign: "left" }}>
          <p>Served By: {user ?? "N/A"}</p>
        </div>

        <div
          style={{
            marginTop: "10px",
            textAlign: "center",
            borderTop: "1px solid black",
          }}
        >
          <p>
            "All goods/products sold are non-refundable, non-returnable and
            non-exchangeable"
          </p>
        </div>
      </div>
    );
  }
}