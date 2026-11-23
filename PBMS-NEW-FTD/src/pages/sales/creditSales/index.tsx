import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FiCreditCard, FiEye, FiMapPin, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { apiRequest } from "../../../libs/apiConfig";
import { SALESENDPOINTS } from "../../../endpoints/sales/salesEndpoints";
import useCreditSale from "../../../hooks/sales/useCreditSales";
import useStores from "../../../hooks/inventory/useStores";
import type { ISale } from "../../../redux/types/sales";
import type { RootState } from "../../../redux/store";
import Button from "../../../ui/Button";
import Modal from "../../../ui/Modal";
import { SearchBox } from "../../../ui/Field";
import { Card, EmptyState, PageHeader, SkeletonRows, StatTile, ugx } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import StorePicker from "../shared/StorePicker";
import { StatusBadge } from "../shared/CheckoutParts";
import CollectCreditPaymentModal from "./collectPayments";

const STORE_KEY = "posStore";
const DAY = 24 * 60 * 60 * 1000;
type SavedStore = { storeId: string | number; storeName: string; timestamp: number };
const readStore = (): SavedStore | null => {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null") as SavedStore | null;
    return s && Date.now() - s.timestamp < DAY ? s : null;
  } catch {
    return null;
  }
};
const fmt = (d: string | Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const who = (s: ISale) => (s.client ? `${s.client.firstName} ${s.client.lastName}` : "Unknown customer");
const daysAgo = (d: string | Date) => Math.floor((Date.now() - new Date(d).getTime()) / DAY);

/** Sales not yet fully paid, for one store: collect payments or look at what was bought. */
const CreditSalesManagement = () => {
  const user = useSelector((state: RootState) => state.userAuth.data);
  const { data: stores } = useStores();
  const [store, setStore] = useState<SavedStore | null>(readStore);
  const [pickStore, setPickStore] = useState(() => !readStore());
  const { data, loading, refresh } = useCreditSale(store ? String(store.storeId) : "");
  const sales: ISale[] = data ?? [];
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [collect, setCollect] = useState<ISale | null>(null);
  const [view, setView] = useState<ISale | null>(null);

  const myStores = useMemo(() => (stores ?? []).filter((s) => (s.authorizedPersonnel ?? []).map(Number).includes(Number(user?.id))), [stores, user?.id]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sales.filter((s) => !q || who(s).toLowerCase().includes(q) || (s.client?.phone ?? "").includes(q));
  }, [sales, query]);
  const owed = sales.reduce((a, s) => a + Number(s.balance || 0), 0);
  const oldest = sales.reduce((a, s) => Math.max(a, daysAgo(s.createdAt)), 0);

  const reload = () => store && refresh(String(store.storeId));

  const askDelete = (s: ISale) =>
    confirm({
      title: `Delete this sale to ${who(s)}?`,
      message: `${ugx(s.total)} sale from ${fmt(s.createdAt)}, with ${ugx(s.balance)} still owed. The sale and its debt are removed. This can't be undone.`,
      tone: "danger",
      confirmLabel: "Delete sale",
      onConfirm: async () => {
        await apiRequest(SALESENDPOINTS.POS.delete(s.id), "DELETE", "");
        await reload();
      },
    });

  return (
    <div className="mx-auto max-w-7xl font-inter">
      <PageHeader
        title="Credit sales"
        description={store ? `Customers who still owe money at ${store.storeName}.` : "Choose a store to see who owes money there."}
        actions={
          <>
            <Button variant="secondary" icon={<FiMapPin aria-hidden="true" />} onClick={() => setPickStore(true)}>
              {store ? "Change store" : "Choose store"}
            </Button>
            <Button variant="secondary" icon={<FiRefreshCw aria-hidden="true" />} onClick={reload} disabled={!store}>
              Refresh
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Owed in total" value={ugx(owed)} />
        <StatTile label="Sales on credit" value={sales.length} />
        <StatTile label="Oldest debt" value={sales.length ? `${oldest} ${oldest === 1 ? "day" : "days"}` : "—"} />
      </div>

      <Card>
        <div className="border-b border-line p-3 sm:p-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Search customer name or phone" label="Search credit sales" />
        </div>
        {!store ? (
          <EmptyState icon={<FiMapPin className="h-5 w-5" />} title="Choose a store" action={<Button onClick={() => setPickStore(true)}>Choose store</Button>} />
        ) : loading && sales.length === 0 ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<FiCreditCard className="h-5 w-5" />} title={sales.length === 0 ? "Nobody owes anything here" : "No one matches"} message={sales.length === 0 ? "Sales made on credit or part payment appear here until they're paid." : undefined} />
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {filtered.map((s) => {
              const age = daysAgo(s.createdAt);
              return (
                <li key={s.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 flex flex-wrap items-center gap-2 font-medium text-brand-ink">
                      {who(s)} <StatusBadge status={s.status} />
                    </p>
                    <p className="m-0 text-xs text-brand-muted">
                      {fmt(s.createdAt)} · {age === 0 ? "today" : `${age} ${age === 1 ? "day" : "days"} ago`}
                      {s.client?.phone ? ` · ${s.client.phone}` : ""} · sale {ugx(s.total)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-right">
                      <p className="m-0 text-[11px] uppercase tracking-wide text-brand-muted">Owes</p>
                      <p className="m-0 font-display text-lg font-semibold tabular-nums text-brand-ink">{ugx(s.balance)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setView(s)} aria-label={`View sale to ${who(s)}`} title="View items" className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted hover:bg-subtle hover:text-brand-text">
                        <FiEye aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => askDelete(s)} aria-label={`Delete sale to ${who(s)}`} title="Delete" className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted hover:bg-[#FDECEA] hover:text-[#B42318] dark:hover:bg-[#381B19]">
                        <FiTrash2 aria-hidden="true" />
                      </button>
                      <Button size="sm" onClick={() => setCollect(s)}>
                        Collect
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <StorePicker open={pickStore} stores={myStores} currentId={store?.storeId} onPick={(s) => {
        const saved = { storeId: s.id, storeName: s.name, timestamp: Date.now() };
        localStorage.setItem(STORE_KEY, JSON.stringify(saved));
        setStore(saved);
        setPickStore(false);
      }} onClose={store ? () => setPickStore(false) : undefined} />

      {collect && user && (
        <CollectCreditPaymentModal
          visible
          sale={collect}
          onClose={() => setCollect(null)}
          onPaymentCollected={reload}
          currentUser={{ id: user.id, name: `${user.firstName} ${user.lastName}` }}
        />
      )}

      <Modal
        open={!!view}
        onClose={() => setView(null)}
        size="lg"
        title={view ? `Sale to ${who(view)}` : ""}
        description={view ? `${fmt(view.createdAt)} · ${view.store?.name ?? ""} · served by ${view.employee?.firstName ?? ""} ${view.employee?.lastName ?? ""}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setView(null)}>Close</Button>
            {view && <Button onClick={() => { setCollect(view); setView(null); }}>Collect payment</Button>}
          </>
        }
      >
        {view && (
          <>
            <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">
              {view.items.map((i, n) => (
                <li key={`${i.id}-${n}`} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="w-14 text-xs font-semibold tabular-nums text-ink-soft">{Number(i.quantity).toLocaleString("en-UG")}×</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-brand-ink">{i.name}</span>
                    <span className="block text-xs text-brand-muted">
                      {ugx(i.price)} each{Number(i.discount) > 0 ? ` · −${ugx(i.discount)}` : ""}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums text-brand-ink">{ugx(i.total)}</span>
                </li>
              ))}
            </ul>
            <dl className="m-0 mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-brand-muted">Total</dt><dd className="m-0 font-medium tabular-nums text-brand-ink">{ugx(view.total)}</dd></div>
              <div className="flex justify-between"><dt className="text-brand-muted">Paid</dt><dd className="m-0 font-medium tabular-nums text-brand-ink">{ugx(Number(view.total) - Number(view.balance))}</dd></div>
              <div className="flex justify-between"><dt className="font-medium text-brand-ink">Owed</dt><dd className="m-0 font-display text-lg font-semibold tabular-nums text-brand-ink">{ugx(view.balance)}</dd></div>
            </dl>
            {view.notes && <p className="m-0 mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-soft">{view.notes}</p>}
          </>
        )}
      </Modal>
    </div>
  );
};

export default CreditSalesManagement;
