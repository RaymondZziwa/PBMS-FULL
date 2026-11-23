import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FiCreditCard, FiEdit2, FiPlus, FiRefreshCw, FiShoppingBag, FiTrash2, FiUsers } from "react-icons/fi";
import Button from "../../../ui/Button";
import { SearchBox } from "../../../ui/Field";
import { Badge, Card, EmptyState, initials, PageHeader, SkeletonRows, StatTile } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiRequest } from "../../../libs/apiConfig";
import useClients from "../../../hooks/sales/useClients";
import type { IClient } from "../../../redux/types/sales";
import { SALESENDPOINTS } from "../../../endpoints/sales/salesEndpoints";
import AddOrModifyClient from "./AddorModify";

const PAGE = 25;
const fullName = (c: IClient) => `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unnamed";
const fmt = (d: string | Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const ActionButton = ({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
      danger ? "hover:bg-[#FDECEA] hover:text-[#B42318] dark:hover:bg-[#381B19]" : "hover:bg-subtle hover:text-brand-text"
    }`}
  >
    {children}
  </button>
);

/** Customers: everyone the business sells to, with prepaid account status. */
const ClientsManagement = () => {
  const { data, loading, refresh } = useClients();
  const clients: IClient[] = data ?? [];
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "account" | "none">("all");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ open: boolean; client: IClient | null }>({ open: false, client: null });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter(
      (c) =>
        (filter === "all" || (filter === "account" ? c.hasAccount : !c.hasAccount)) &&
        (!q || [fullName(c), c.phone, c.address].some((v) => (v ?? "").toLowerCase().includes(q))),
    );
  }, [clients, query, filter]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE, current * PAGE);
  const withAccount = clients.filter((c) => c.hasAccount).length;

  const askDelete = (c: IClient) =>
    confirm({
      title: `Delete ${fullName(c)}?`,
      message: "Their customer record is removed. Past sales stay in the reports. This can't be undone.",
      tone: "danger",
      confirmLabel: "Delete customer",
      onConfirm: async () => {
        await apiRequest(SALESENDPOINTS.CLIENT.delete(c.id), "DELETE", "");
        await refresh();
      },
    });

  const askAccount = (c: IClient) =>
    confirm({
      title: `Open a prepaid account for ${fullName(c)}?`,
      message: "They get an account number. Money they deposit can then pay for purchases at the till.",
      details: (
        <span>
          {fullName(c)}
          {c.phone ? ` · ${c.phone}` : ""}
        </span>
      ),
      confirmLabel: "Open account",
      tone: "primary",
      onConfirm: async () => {
        await apiRequest(SALESENDPOINTS.CLIENT_ACCOUNTS.create, "POST", "", { clientId: c.id });
        await refresh();
      },
    });

  const actions = (c: IClient) => (
    <>
      <ActionButton label={`Purchases by ${fullName(c)}`} onClick={() => navigate(`/sales/client-purchases?client=${c.id}`)}>
        <FiShoppingBag aria-hidden="true" />
      </ActionButton>
      {!c.hasAccount && (
        <ActionButton label={`Open an account for ${fullName(c)}`} onClick={() => askAccount(c)}>
          <FiCreditCard aria-hidden="true" />
        </ActionButton>
      )}
      <ActionButton label={`Edit ${fullName(c)}`} onClick={() => setForm({ open: true, client: c })}>
        <FiEdit2 aria-hidden="true" />
      </ActionButton>
      <ActionButton danger label={`Delete ${fullName(c)}`} onClick={() => askDelete(c)}>
        <FiTrash2 aria-hidden="true" />
      </ActionButton>
    </>
  );

  return (
    <div className="mx-auto max-w-7xl font-inter">
      <PageHeader
        title="Customers"
        description="People you sell to. Open a prepaid account for anyone who deposits money in advance."
        actions={
          <>
            <Button variant="secondary" icon={<FiRefreshCw aria-hidden="true" />} onClick={() => refresh()}>
              Refresh
            </Button>
            <Button icon={<FiPlus aria-hidden="true" />} onClick={() => setForm({ open: true, client: null })}>
              Add customer
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Customers" value={clients.length.toLocaleString("en-UG")} />
        <StatTile label="With an account" value={withAccount.toLocaleString("en-UG")} />
        <StatTile label="Added this month" value={clients.filter((c) => new Date(c.createdAt).getMonth() === new Date().getMonth() && new Date(c.createdAt).getFullYear() === new Date().getFullYear()).length} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:p-4">
          <SearchBox value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search name, phone or address" label="Search customers" />
          <div role="radiogroup" aria-label="Account" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5 sm:ml-auto">
            {([
              ["all", "All"],
              ["account", "With account"],
              ["none", "No account"],
            ] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={filter === v} onClick={() => { setFilter(v); setPage(1); }} className={`h-10 rounded-md px-3 text-[13px] font-medium ${filter === v ? "bg-surface text-brand-ink shadow-card" : "text-brand-muted hover:text-brand-ink"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading && clients.length === 0 ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FiUsers className="h-5 w-5" />}
            title={clients.length === 0 ? "No customers yet" : "No one matches"}
            message={clients.length === 0 ? "Customers you add here (or at the till) appear in this list." : "Try another name or phone number."}
            action={clients.length === 0 ? <Button icon={<FiPlus aria-hidden="true" />} onClick={() => setForm({ open: true, client: null })}>Add customer</Button> : undefined}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-brand-muted">
                    <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                    <th scope="col" className="px-4 py-3 font-medium">Phone</th>
                    <th scope="col" className="px-4 py-3 font-medium">Address</th>
                    <th scope="col" className="px-4 py-3 font-medium">Account</th>
                    <th scope="col" className="px-4 py-3 font-medium">Added</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-subtle text-[13px] font-semibold text-brand-text">{initials(c.firstName, c.lastName)}</span>
                          <span className="font-medium text-brand-ink">{fullName(c)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink-soft">{c.phone || "—"}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-ink-soft">{c.address || "—"}</td>
                      <td className="px-4 py-3">{c.hasAccount ? <Badge tone="good">Has account</Badge> : <Badge>None</Badge>}</td>
                      <td className="px-4 py-3 text-ink-soft">{fmt(c.createdAt)}</td>
                      <td className="px-2 py-3">
                        <div className="flex justify-end gap-0.5">{actions(c)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="m-0 list-none divide-y divide-line p-0 md:hidden">
              {rows.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-3">
                  <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-subtle text-[13px] font-semibold text-brand-text">{initials(c.firstName, c.lastName)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate font-medium text-brand-ink">{fullName(c)}</p>
                    <p className="m-0 truncate text-xs text-brand-muted">{[c.phone, c.hasAccount ? "Has account" : null].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex flex-none">{actions(c)}</div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-brand-muted">
              <span>
                {(current - 1) * PAGE + 1}–{Math.min(current * PAGE, filtered.length)} of {filtered.length}
              </span>
              {pages > 1 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</Button>
                  <Button size="sm" variant="secondary" disabled={current === pages} onClick={() => setPage(current + 1)}>Next</Button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <AddOrModifyClient visible={form.open} client={form.client} onCancel={() => setForm({ open: false, client: null })} />
    </div>
  );
};

export default ClientsManagement;
