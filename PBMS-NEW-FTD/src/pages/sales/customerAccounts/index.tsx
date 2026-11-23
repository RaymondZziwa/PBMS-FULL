import { useMemo, useState } from "react";
import { FiList, FiPlusCircle, FiRefreshCw, FiCreditCard } from "react-icons/fi";
import { apiRequest } from "../../../libs/apiConfig";
import useClientAccounts from "../../../hooks/sales/useClientAccounts";
import { SALESENDPOINTS } from "../../../endpoints/sales/salesEndpoints";
import Button from "../../../ui/Button";
import { SearchBox, Toggle } from "../../../ui/Field";
import { Badge, Card, EmptyState, PageHeader, SkeletonRows, StatTile, ugx } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import DepositModal from "./depositModal";
import TransactionsModal from "./txnModal";
import { accountName, type ClientAccount } from "./types";

/** Prepaid customer accounts: deposit money, see history, switch accounts on or off. */
const ClientAccountsManagement = () => {
  const { data, loading, refresh } = useClientAccounts();
  const accounts = (data ?? []) as unknown as ClientAccount[];
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [deposit, setDeposit] = useState<ClientAccount | null>(null);
  const [history, setHistory] = useState<ClientAccount | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => !q || accountName(a).toLowerCase().includes(q) || (a.client?.phone ?? "").includes(q) || (a.accountNumber ?? "").toLowerCase().includes(q));
  }, [accounts, query]);
  const held = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const active = accounts.filter((a) => a.status === "ACTIVE").length;

  const toggle = (a: ClientAccount) => {
    const on = a.status === "ACTIVE";
    return confirm({
      title: `${on ? "Switch off" : "Switch on"} ${accountName(a)}'s account?`,
      message: on
        ? "They won't be able to pay from it or deposit into it until it's switched on again. Their balance is kept."
        : "They can deposit money and pay for purchases from it again.",
      details: <span>Balance: <strong className="font-semibold text-brand-ink">{ugx(a.balance)}</strong></span>,
      confirmLabel: on ? "Switch off" : "Switch on",
      tone: on ? "danger" : "primary",
      onConfirm: async () => {
        await apiRequest(on ? SALESENDPOINTS.CLIENT_ACCOUNTS.deactivate(a.id) : SALESENDPOINTS.CLIENT_ACCOUNTS.activate(a.id), "PATCH", {});
        await refresh();
      },
    });
  };

  return (
    <div className="mx-auto max-w-7xl font-inter">
      <PageHeader
        title="Customer accounts"
        description="Money customers have paid in advance. They spend it at the till with “Patient Account”. Open new accounts from Customers."
        actions={<Button variant="secondary" icon={<FiRefreshCw aria-hidden="true" />} onClick={() => refresh()}>Refresh</Button>}
      />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Held for customers" value={ugx(held)} />
        <StatTile label="Accounts" value={accounts.length} hint={`${active} switched on`} />
        <StatTile label="Average balance" value={accounts.length ? ugx(held / accounts.length) : "—"} />
      </div>
      <Card>
        <div className="border-b border-line p-3 sm:p-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Search name, phone or account number" label="Search accounts" />
        </div>
        {loading && accounts.length === 0 ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<FiCreditCard className="h-5 w-5" />} title={accounts.length === 0 ? "No accounts yet" : "No one matches"} message={accounts.length === 0 ? "Open an account for a customer from the Customers page." : undefined} />
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {filtered.map((a) => {
              const on = a.status === "ACTIVE";
              return (
                <li key={a.id} className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 flex flex-wrap items-center gap-2 font-medium text-brand-ink">
                      {accountName(a)} {on ? <Badge tone="good">On</Badge> : <Badge>Off</Badge>}
                    </p>
                    <p className="m-0 text-xs text-brand-muted">
                      {[a.accountNumber, a.client?.phone, `${a.PatientAccountTransaction?.length ?? 0} transactions`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
                    <div className="mr-2 text-right">
                      <p className="m-0 text-[11px] uppercase tracking-wide text-brand-muted">Balance</p>
                      <p className="m-0 font-display text-lg font-semibold tabular-nums text-brand-ink">{ugx(a.balance)}</p>
                    </div>
                    <Button size="sm" variant="secondary" icon={<FiList aria-hidden="true" />} onClick={() => setHistory(a)}>History</Button>
                    <Button size="sm" icon={<FiPlusCircle aria-hidden="true" />} onClick={() => setDeposit(a)} disabled={!on} title={on ? undefined : "Switch the account on to deposit"}>Deposit</Button>
                    <div className="w-[150px]">
                      <Toggle label={on ? "Switched on" : "Switched off"} checked={on} onChange={() => toggle(a)} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <DepositModal visible={!!deposit} clientAccount={deposit} onCancel={() => setDeposit(null)} onSuccess={() => { setDeposit(null); refresh(); }} />
      <TransactionsModal visible={!!history} clientAccount={history} onClose={() => setHistory(null)} />
    </div>
  );
};

export default ClientAccountsManagement;
