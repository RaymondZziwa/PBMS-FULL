import type { CSSProperties } from "react";
import DefaultLogo from "../../assets/logo.png";
import { numberToWords } from "../../libs/numberToWords";
import useCompany, { companyLogoUrl } from "../../hooks/settings/useCompany";

export type ReceiptLine = { id: string | number; name: string; price: number; quantity: number; discount?: number };

type Props = {
  /** e.g. "Sales receipt", "Massage receipt", "Exhibition receipt" */
  title: string;
  subtitle?: string;
  client: string;
  lines: ReceiptLine[];
  total: number;
  paymentMethod: string;
  transactionId?: string;
  status?: string;
  balance?: number;
  servedBy?: string;
};

const ugx = (n: number) => new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(Number(n) || 0);
const human = (s?: string) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) : "");

// Inline styles only: receipts are printed on 58–80 mm thermal paper where
// app styles (dark mode, Tailwind) must not apply.
const S: Record<string, CSSProperties> = {
  page: { width: "100%", maxWidth: 302, margin: "0 auto", padding: "8px 6px", color: "#000", background: "#fff", font: "11px/1.4 'Helvetica Neue', Arial, sans-serif" },
  center: { textAlign: "center" },
  name: { margin: "4px 0 0", fontSize: 14, fontWeight: 700, letterSpacing: 0.2 },
  small: { margin: 0, fontSize: 10 },
  rule: { border: 0, borderTop: "1px dashed #000", margin: "8px 0" },
  title: { margin: "0 0 6px", textAlign: "center", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  row: { display: "flex", justifyContent: "space-between", gap: 8, margin: "1px 0" },
  th: { textAlign: "left", fontSize: 10, fontWeight: 700, borderBottom: "1px solid #000", padding: "2px 0" },
  td: { fontSize: 10.5, padding: "3px 0", verticalAlign: "top" },
  total: { display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, margin: "6px 0 2px" },
};

/** A printable receipt with the company's own name, logo and contacts. */
const Receipt = ({ title, subtitle, client, lines, total, paymentMethod, transactionId, status, balance, servedBy }: Props) => {
  const c = useCompany();
  const now = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const words = `${numberToWords(Math.round(total))} shillings only`;

  return (
    <div style={S.page}>
      <div style={S.center}>
        <img src={companyLogoUrl(c) ?? DefaultLogo} alt="" style={{ height: 44, maxWidth: 160, objectFit: "contain" }} />
        <p style={S.name}>{c?.name ?? "Prof Bioresearch"}</p>
        {c?.address && <p style={S.small}>{c.address}</p>}
        {(c?.tel1 || c?.tel2) && <p style={S.small}>{[c?.tel1, c?.tel2].filter(Boolean).join(" / ")}</p>}
        {(c?.email || c?.website) && <p style={S.small}>{[c?.website, c?.email].filter(Boolean).join(" · ")}</p>}
        {c?.tinNumber && <p style={S.small}>TIN: {c.tinNumber}</p>}
      </div>
      <hr style={S.rule} />
      <p style={S.title}>{title}</p>
      {subtitle && <p style={{ ...S.small, ...S.center, marginTop: -4, marginBottom: 6 }}>{subtitle}</p>}
      <div style={S.row}><span>Date</span><span>{now}</span></div>
      <div style={S.row}><span>Client</span><span>{client || "Walk-in"}</span></div>
      <div style={S.row}><span>Payment</span><span>{paymentMethod}</span></div>
      {transactionId && <div style={S.row}><span>Transaction ID</span><span>{transactionId}</span></div>}
      {status && <div style={S.row}><span>Status</span><span>{human(status)}</span></div>}
      <hr style={S.rule} />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={S.th}>Item</th>
            <th style={{ ...S.th, textAlign: "right" }}>Qty</th>
            <th style={{ ...S.th, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr><td colSpan={3} style={{ ...S.td, textAlign: "center" }}>No items</td></tr>
          ) : (
            lines.map((l) => {
              const amount = l.price * l.quantity - (l.discount ?? 0);
              return (
                <tr key={l.id}>
                  <td style={S.td}>
                    {l.name}
                    <div style={{ fontSize: 9.5, color: "#333" }}>
                      @ {ugx(l.price)}{l.discount ? ` · less ${ugx(l.discount)}` : ""}
                    </div>
                  </td>
                  <td style={{ ...S.td, textAlign: "right" }}>{l.quantity}</td>
                  <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>{ugx(amount)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <hr style={S.rule} />
      <div style={S.total}><span>TOTAL</span><span>UGX {ugx(total)}</span></div>
      {balance !== undefined && Number(balance) > 0 && <div style={S.row}><span>Balance due</span><span>UGX {ugx(balance)}</span></div>}
      <p style={{ ...S.small, fontStyle: "italic", marginTop: 4 }}>{words.charAt(0).toUpperCase() + words.slice(1)}</p>
      <hr style={S.rule} />
      <div style={S.row}><span>Served by</span><span>{servedBy || "—"}</span></div>
      <p style={{ ...S.small, ...S.center, marginTop: 8 }}>Goods sold are not refundable, returnable or exchangeable.</p>
      <p style={{ ...S.small, ...S.center, marginTop: 4, fontWeight: 700 }}>Thank you!</p>
    </div>
  );
};

export default Receipt;
