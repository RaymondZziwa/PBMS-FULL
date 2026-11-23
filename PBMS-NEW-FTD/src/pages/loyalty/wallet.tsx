import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertTriangle, FiSend } from "react-icons/fi";
import { apiRequest } from "../../libs/apiConfig";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";
import Combobox from "../../ui/Combobox";
import { MoneyField, TextField } from "../../ui/Field";
import { useConfirm } from "../../ui/ConfirmDialog";
import { Card, EmptyState, PageHeader, SkeletonRows, StatTile } from "../../ui/Page";
import { CLUB, fmtPhone, type Payment } from "./clubApi";

type Channel = { id: number; name: string; bank?: string | null; accountNumber?: string | null };
type Payout = { id: number; amount: number; description?: string | null; status: "PENDING" | "SUCCESSFUL" | "FAILED"; createdAt: string; channel: Channel | null };
type WalletData = {
  wallet: { id: number; name: string; balance: number };
  totals: { received: number; marzFees: number; serviceFees: number; charged: number; successfulPayments: number; paidOut: number };
  fees: { registration: number; marzPercent: number; service: number };
  payments: { rows: Payment[]; total: number; page: number; pageSize: number };
  payouts: Payout[];
  channels: Channel[];
  transfersConfigured: boolean;
};

const money = (n: number) => `UGX ${Math.round(n).toLocaleString("en-US")}`;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const TONE: Record<string, string> = {
  SUCCESSFUL: "bg-[#E7F6EC] text-[#1B7A3D] dark:bg-[#12301D] dark:text-[#7FD89E]",
  PENDING: "bg-[#FFF4E0] text-[#8A5300] dark:bg-[#33240A] dark:text-[#F5C26B]",
  FAILED: "bg-[#FDECEA] text-[#B42318] dark:bg-[#3A1512] dark:text-[#F29A92]",
};
const Pill = ({ s }: { s: string }) => <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TONE[s] ?? ""}`}>{s === "SUCCESSFUL" ? "Paid" : s === "PENDING" ? "Waiting" : "Failed"}</span>;

/** The club wallet: registration fees in, transfers to the company bank out. */
const ClubWallet = () => {
  const confirm = useConfirm();
  const [data, setData] = useState<WalletData | null>(null);
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ amount: "", channelId: "", description: "" });
  const [err, setErr] = useState<{ field?: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiRequest<{ data: WalletData }>(`${CLUB.wallet}?page=${page}`);
      setData(r.data);
    } catch {
      // toast shown
    }
  }, [page]);
  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    if (!data) return;
    const amount = Number(form.amount.replace(/,/g, ""));
    if (!amount || amount < 1000) return setErr({ field: "amount", message: "Enter at least UGX 1,000" });
    if (amount > data.wallet.balance) return setErr({ field: "amount", message: `The wallet has ${money(data.wallet.balance)}` });
    if (!form.channelId) return setErr({ field: "channelId", message: "Choose the bank account" });
    const ch = data.channels.find((c) => String(c.id) === form.channelId);
    const ok = await confirm({
      title: `Send ${money(amount)} to the bank?`,
      message: <>To <strong>{ch?.name}</strong> ({ch?.bank} {ch?.accountNumber}). The money leaves the club wallet now; if the bank transfer fails it comes back.</>,
      confirmLabel: "Send to bank",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await apiRequest(CLUB.payout, "POST", { amount, channelId: Number(form.channelId), description: form.description });
      setSending(false);
      setForm({ amount: "", channelId: "", description: "" });
      await load();
    } catch (e) {
      const d = (e as { response?: { data?: { field?: string; message?: string } } })?.response?.data;
      if (d?.message) setErr({ field: d.field, message: d.message });
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="mx-auto max-w-6xl"><PageHeader title="Club wallet" /><Card><SkeletonRows rows={6} /></Card></div>;
  const pages = Math.max(1, Math.ceil(data.payments.total / data.payments.pageSize));

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader
        title="Club wallet"
        description={`Members pay ${money(data.fees.registration)} + ${data.fees.marzPercent}% MarzPay charge + ${money(data.fees.service)} service charge. Only the ${money(data.fees.registration)} comes into this wallet.`}
        actions={<Button icon={<FiSend aria-hidden="true" />} onClick={() => { setErr(null); setSending(true); }} disabled={data.wallet.balance < 1000}>Send to bank</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Balance" value={money(data.wallet.balance)} hint="Available to send" />
        <StatTile label="Received" value={money(data.totals.received)} hint={`${data.totals.successfulPayments} payment(s)`} />
        <StatTile label="Sent to bank" value={money(data.totals.paidOut)} />
        <StatTile label="Charges paid by members" value={money(data.totals.marzFees + data.totals.serviceFees)} hint={`MarzPay ${money(data.totals.marzFees)} · service ${money(data.totals.serviceFees)}`} />
      </div>

      {!data.transfersConfigured && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-[#F5C26B] bg-[#FFF8EB] px-4 py-3 text-sm text-[#7A4B00] dark:border-[#6B4A12] dark:bg-[#2A2010] dark:text-[#F5C26B]">
          <FiAlertTriangle aria-hidden="true" className="mt-0.5 flex-none" /> Bank transfers aren't set up on the server yet (MarzPay keys). Payments still come in once collection is set up.
        </p>
      )}

      <Card className="mb-4">
        <div className="border-b border-line px-4 py-3"><h2 className="m-0 text-[15px] font-semibold text-brand-ink">Payments in</h2></div>
        {!data.payments.rows.length ? (
          <EmptyState title="No payments yet" message="Registration fees show here as members pay." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Member</th>
                  <th className="px-3 py-2.5 font-semibold">Phone</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Charged</th>
                  <th className="px-3 py-2.5 text-right font-semibold">MarzPay</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Service</th>
                  <th className="px-3 py-2.5 text-right font-semibold">To wallet</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.rows.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{when(p.createdAt)}</td>
                    <td className="px-3 py-2.5">{p.memberId ? <Link to={`/loyalty/members/${p.memberId}`} className="text-brand-text no-underline hover:underline">{p.memberName}</Link> : <span className="text-ink-soft">{p.memberName}</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{fmtPhone(p.phone)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-ink-soft">{money(p.totalCharged)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-brand-muted">{money(p.marzFee)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-brand-muted">{money(p.serviceFee)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums text-brand-ink">{money(p.baseAmount)}</td>
                    <td className="px-3 py-2.5"><Pill s={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-brand-muted">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="border-b border-line px-4 py-3"><h2 className="m-0 text-[15px] font-semibold text-brand-ink">Sent to bank</h2></div>
        {!data.payouts.length ? (
          <EmptyState title="No transfers yet" />
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {data.payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-brand-ink">{money(p.amount)}</span>
                  <span className="block text-xs text-brand-muted">{[p.channel ? `${p.channel.name} · ${p.channel.bank} ${p.channel.accountNumber}` : null, p.description, when(p.createdAt)].filter(Boolean).join(" · ")}</span>
                </span>
                <Pill s={p.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={sending}
        onClose={() => setSending(false)}
        locked={busy}
        size="sm"
        title="Send to the company bank"
        description={`Available: ${money(data.wallet.balance)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSending(false)} disabled={busy}>Cancel</Button>
            <Button loading={busy} onClick={send}>Continue</Button>
          </>
        }
      >
        {!data.channels.length ? (
          <p className="m-0 text-sm text-ink-soft">There's no verified bank account yet. Add and verify one under <Link to="/wallets/withdraw-channels" className="text-brand-text">Finance → Withdraw channels</Link>.</p>
        ) : (
          <div className="space-y-4">
            <MoneyField label="Amount" required value={form.amount} onChange={(v) => { setForm({ ...form, amount: v }); setErr(null); }} error={err?.field === "amount" ? err.message : null} />
            <Combobox label="Bank account" required value={form.channelId} onChange={(v) => { setForm({ ...form, channelId: v }); setErr(null); }} options={data.channels.map((c) => ({ value: String(c.id), label: c.name, hint: `${c.bank ?? ""} ${c.accountNumber ?? ""}` }))} error={err?.field === "channelId" ? err.message : null} />
            <TextField label="Note" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="e.g. November registration fees" maxLength={200} />
            {err && !err.field && <p role="alert" className="m-0 text-sm text-[#C0362C]">{err.message}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClubWallet;
