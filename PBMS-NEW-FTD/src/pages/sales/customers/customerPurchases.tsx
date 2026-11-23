import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiChevronDown, FiEye, FiFileText, FiShoppingBag, FiUser } from "react-icons/fi";
import ImagePreviewModal from "../../../custom/modals/imagePreviewModal";
import useClients from "../../../hooks/sales/useClients";
import { apiRequest } from "../../../libs/apiConfig";
import type { IClient } from "../../../redux/types/sales";
import Combobox from "../../../ui/Combobox";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { SearchBox } from "../../../ui/Field";
import { Card, EmptyState, PageHeader, SkeletonRows, StatTile, ugx } from "../../../ui/Page";
import { StatusBadge } from "../shared/CheckoutParts";

interface ProjectPurchase {
  id: number;
  clientId: number;
  projectId: number;
  status: string;
  saleTotal: number;
  downPayment: number;
  numberOfInstallments: number;
  installmentAmount: number;
  deliveryNoteImage: string | null;
  cashierId: number;
  updatedAt: string;
  createdAt: string;
  client: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
  };
  project: {
    id: number;
    name: string;
    price: number;
  };
  employee: {
    id: number;
    firstName: string;
    lastName: string;
  };
  ProjectPayments: Array<{
    id: number;
    saleId: number;
    amount: number;
    exhibitionId: number | null;
    paymentMethod: string;
    referenceId: string | null;
    notes: string | null;
    receiptImage: string | null;
    bankDepositSlipImage: string | null;
    cashierId: number;
    updatedAt: string;
    createdAt: string;
    employee: {
      firstName: string;
      lastName: string;
    };
  }>;
}

interface ShopPurchase {
  id: number;
  clientId: number | null;
  items: any[]; // JSON field from database
  servedBy: number;
  storeId: number;
  status: string;
  total: number;
  balance: number;
  paymentMethods: any[]; // JSON field from database
  notes: string | null;
  updatedAt: string;
  createdAt: string;
  store: {
    id: number;
    name: string;
    branchId: number | null;
    deptId: number | null;
    authorizedPersonnel: number[];
    updatedAt: string;
    createdAt: string;
  };
  employee: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface ClientPurchasesResponse {
  projectPurchases: ProjectPurchase[];
  shopPurchases: ShopPurchase[];
}

const num = (v: unknown) => (typeof v === "string" ? parseFloat(v) : Number(v ?? 0)) || 0;
const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const METHOD: Record<string, string> = { CASH: "Cash", MTN_MOMO: "MTN MoMo", AIRTEL_MOMO: "Airtel Money", CARD: "Card", PROF_MOMO: "Prof MoMo", PATIENT_ACCOUNT: "Patient account" };


const paidOf = (p: ProjectPurchase) => (p.ProjectPayments ?? []).reduce((a, x) => a + num(x.amount), 0);

/** Everything one customer has bought: shop sales and project (instalment) sales. */
const ClientPurchases = () => {
  const { data: clients, loading: clientsLoading } = useClients();
  const { search } = useLocation();
  const [clientId, setClientId] = useState(() => new URLSearchParams(search).get("client") ?? "");
  const [purchases, setPurchases] = useState<ClientPurchasesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"shop" | "projects">("shop");
  const [open, setOpen] = useState<number | null>(null);
  const [payment, setPayment] = useState<ProjectPurchase["ProjectPayments"][0] | null>(null);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);

  const client: IClient | undefined = (clients ?? []).find((c: IClient) => String(c.id) === clientId);

  useEffect(() => {
    if (!clientId) {
      setPurchases(null);
      return;
    }
    let live = true;
    setLoading(true);
    apiRequest<{ data?: ClientPurchasesResponse }>(`/api/clients/fetch-purchases/${clientId}`, "GET")
      .then((res) => {
        if (!live) return;
        const data = res?.data ?? null;
        setPurchases(data);
        // open the tab that has something in it
        if (data && !(data.shopPurchases?.length) && data.projectPurchases?.length) setTab("projects");
      })
      .catch(() => live && setPurchases(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [clientId]);

  const shop = purchases?.shopPurchases ?? [];
  const projects = purchases?.projectPurchases ?? [];
  const shopTotal = shop.reduce((a, s) => a + num(s.total), 0);
  const shopPaid = shop.reduce((a, s) => a + num(s.total) - num(s.balance), 0);
  const projectTotal = projects.reduce((a, p) => a + num(p.saleTotal), 0);
  const projectPaid = projects.reduce((a, p) => a + paidOf(p), 0);

  const q = query.trim().toLowerCase();
  const shopRows = useMemo(
    () => shop.filter((s) => !q || s.items?.some((i: { name?: string }) => (i.name ?? "").toLowerCase().includes(q)) || (s.store?.name ?? "").toLowerCase().includes(q)),
    [shop, q],
  );
  const projectRows = useMemo(() => projects.filter((p) => !q || (p.project?.name ?? "").toLowerCase().includes(q)), [projects, q]);

  return (
    <div className="mx-auto max-w-7xl font-inter">
      <PageHeader title="Client purchases" description="Everything a customer has bought, what they've paid and what they still owe." />

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Combobox
            label="Customer"
            className="w-full sm:max-w-md"
            value={clientId}
            onChange={setClientId}
            options={(clients ?? []).map((c: IClient) => ({ value: String(c.id), label: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(), hint: c.phone || undefined }))}
            placeholder={clientsLoading ? "Loading customers…" : "Search name or phone"}
            searchPlaceholder="Name or phone number"
          />
          {client && (
            <div className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 sm:ml-auto">
              <FiUser aria-hidden="true" className="text-brand-muted" />
              <span className="text-sm">
                <span className="font-medium text-brand-ink">{client.firstName} {client.lastName}</span>
                {client.phone && <span className="text-brand-muted"> · {client.phone}</span>}
              </span>
            </div>
          )}
        </div>
      </Card>

      {!clientId ? (
        <Card>
          <EmptyState icon={<FiShoppingBag className="h-5 w-5" />} title="Choose a customer" message="Pick someone above to see their purchases and balances." />
        </Card>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Shop purchases" value={shop.length} hint={ugx(shopTotal)} />
            <StatTile label="Project purchases" value={projects.length} hint={ugx(projectTotal)} />
            <StatTile label="Paid so far" value={ugx(shopPaid + projectPaid, { compact: true })} hint={ugx(shopPaid + projectPaid)} />
            <StatTile label="Still owed" value={ugx(shopTotal + projectTotal - shopPaid - projectPaid, { compact: true })} hint={ugx(shopTotal + projectTotal - shopPaid - projectPaid)} />
          </div>

          <Card>
            <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:p-4">
              <div role="tablist" aria-label="Purchase type" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
                {([
                  ["shop", `Shop (${shop.length})`],
                  ["projects", `Projects (${projects.length})`],
                ] as const).map(([v, l]) => (
                  <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={`h-10 rounded-md px-4 text-[13px] font-medium ${tab === v ? "bg-surface text-brand-ink shadow-card" : "text-brand-muted hover:text-brand-ink"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="sm:ml-auto sm:w-72">
                <SearchBox value={query} onChange={setQuery} placeholder={tab === "shop" ? "Search item or store" : "Search project"} label="Search purchases" className="" />
              </div>
            </div>

            {loading ? (
              <SkeletonRows rows={4} />
            ) : tab === "shop" ? (
              shopRows.length === 0 ? (
                <EmptyState icon={<FiShoppingBag className="h-5 w-5" />} title="No shop purchases" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs uppercase tracking-wide text-brand-muted">
                        <th scope="col" className="w-10 px-2 py-3" />
                        <th scope="col" className="px-3 py-3 font-medium">Date</th>
                        <th scope="col" className="px-3 py-3 font-medium">Items</th>
                        <th scope="col" className="px-3 py-3 font-medium">Store</th>
                        <th scope="col" className="px-3 py-3 text-right font-medium">Total</th>
                        <th scope="col" className="px-3 py-3 text-right font-medium">Owed</th>
                        <th scope="col" className="px-3 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {shopRows.map((s) => {
                        const expanded = open === s.id;
                        const items = s.items ?? [];
                        return (
                          <Fragment key={s.id}>
                            <tr className="cursor-pointer hover:bg-surface-2" onClick={() => setOpen(expanded ? null : s.id)}>
                              <td className="px-2 py-3">
                                <button type="button" aria-expanded={expanded} aria-label={expanded ? "Hide items" : "Show items"} onClick={(e) => { e.stopPropagation(); setOpen(expanded ? null : s.id); }} className="flex h-8 w-8 items-center justify-center rounded-md text-brand-muted hover:bg-subtle">
                                  <FiChevronDown aria-hidden="true" className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                                </button>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{fmt(s.createdAt)}</td>
                              <td className="px-3 py-3 text-brand-ink">
                                {items.slice(0, 2).map((i: { name?: string }) => i.name).join(", ")}
                                {items.length > 2 && <span className="text-brand-muted"> +{items.length - 2} more</span>}
                              </td>
                              <td className="px-3 py-3 text-ink-soft">{s.store?.name ?? "—"}</td>
                              <td className="px-3 py-3 text-right font-medium tabular-nums text-brand-ink">{ugx(s.total)}</td>
                              <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{num(s.balance) > 0 ? ugx(s.balance) : "—"}</td>
                              <td className="px-3 py-3"><StatusBadge status={s.status} /></td>
                            </tr>
                            {expanded && (
                              <tr className="bg-surface-2">
                                <td />
                                <td colSpan={6} className="px-3 pb-4 pt-1">
                                  <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line bg-surface p-0">
                                    {items.map((i: { id?: string | number; name?: string; quantity?: number | string; price?: number | string; total?: number | string; discount?: number | string }, n: number) => (
                                      <li key={`${i.id}-${n}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                                        <span className="w-12 text-xs font-semibold tabular-nums text-ink-soft">{num(i.quantity).toLocaleString("en-UG")}×</span>
                                        <span className="flex-1 text-brand-ink">{i.name}</span>
                                        <span className="text-xs text-brand-muted">{ugx(i.price)} each</span>
                                        <span className="w-28 text-right font-medium tabular-nums text-brand-ink">{ugx(i.total ?? num(i.price) * num(i.quantity))}</span>
                                      </li>
                                    ))}
                                  </ul>
                                  <p className="m-0 mt-2 text-xs text-brand-muted">
                                    Served by {s.employee?.firstName} {s.employee?.lastName}
                                    {s.paymentMethods?.length ? ` · ${s.paymentMethods.map((m: { type?: string; amount?: number }) => `${METHOD[m.type ?? ""] ?? m.type} ${ugx(m.amount)}`).join(" + ")}` : ""}
                                    {s.notes ? ` · ${s.notes}` : ""}
                                  </p>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : projectRows.length === 0 ? (
              <EmptyState icon={<FiFileText className="h-5 w-5" />} title="No project purchases" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wide text-brand-muted">
                      <th scope="col" className="px-4 py-3 font-medium">Project</th>
                      <th scope="col" className="px-3 py-3 font-medium">Date</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Total</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Paid</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Owed</th>
                      <th scope="col" className="px-3 py-3 font-medium">Instalments</th>
                      <th scope="col" className="px-3 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {projectRows.map((p) => {
                      const paid = paidOf(p);
                      return (
                        <tr key={p.id} className="hover:bg-surface-2">
                          <td className="px-4 py-3">
                            <span className="block font-medium text-brand-ink">{p.project?.name ?? "—"}</span>
                            <span className="text-xs">{p.deliveryNoteImage ? <span className="text-[#1E7B43] dark:text-[#8FD6A8]">Delivery note on file</span> : <span className="text-[#93600A] dark:text-[#F0CF85]">No delivery note</span>}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{fmt(p.createdAt)}</td>
                          <td className="px-3 py-3 text-right font-medium tabular-nums text-brand-ink">{ugx(p.saleTotal)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{ugx(paid)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{ugx(num(p.saleTotal) - paid)}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="mr-1 text-xs text-brand-muted">{p.ProjectPayments?.length ?? 0}/{p.numberOfInstallments ?? 0}</span>
                              {(p.ProjectPayments ?? []).map((pay, i) => (
                                <button key={pay.id} type="button" onClick={() => setPayment(pay)} title={`${ugx(pay.amount)} on ${fmt(pay.createdAt)}`} className="h-7 min-w-[28px] rounded-md border border-line bg-surface px-1.5 text-xs font-medium text-brand-text hover:bg-subtle">
                                  {i + 1}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <Modal open={!!payment} onClose={() => setPayment(null)} size="sm" title="Instalment payment" footer={<Button variant="secondary" onClick={() => setPayment(null)}>Close</Button>}>
        {payment && (
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
            <dt className="text-brand-muted">Amount</dt>
            <dd className="m-0 text-right font-display text-lg font-semibold tabular-nums text-brand-ink">{ugx(payment.amount)}</dd>
            <dt className="text-brand-muted">Method</dt>
            <dd className="m-0 text-right text-brand-ink">{METHOD[payment.paymentMethod] ?? payment.paymentMethod ?? "—"}</dd>
            <dt className="text-brand-muted">Date</dt>
            <dd className="m-0 text-right text-brand-ink">{fmt(payment.createdAt)}</dd>
            <dt className="text-brand-muted">Received by</dt>
            <dd className="m-0 text-right text-brand-ink">{payment.employee?.firstName} {payment.employee?.lastName}</dd>
            {payment.referenceId && (
              <>
                <dt className="text-brand-muted">Reference</dt>
                <dd className="m-0 text-right font-mono text-xs text-brand-ink">{payment.referenceId}</dd>
              </>
            )}
            {payment.notes && (
              <>
                <dt className="text-brand-muted">Notes</dt>
                <dd className="m-0 text-right text-brand-ink">{payment.notes}</dd>
              </>
            )}
            {(payment.receiptImage || payment.bankDepositSlipImage) && (
              <dd className="col-span-2 m-0 flex flex-wrap gap-2 pt-2">
                {payment.receiptImage && (
                  <Button size="sm" variant="secondary" icon={<FiEye aria-hidden="true" />} onClick={() => { setPreview({ url: payment.receiptImage!, title: "Payment receipt" }); setPayment(null); }}>
                    Receipt
                  </Button>
                )}
                {payment.bankDepositSlipImage && (
                  <Button size="sm" variant="secondary" icon={<FiEye aria-hidden="true" />} onClick={() => { setPreview({ url: payment.bankDepositSlipImage!, title: "Bank deposit slip" }); setPayment(null); }}>
                    Deposit slip
                  </Button>
                )}
              </dd>
            )}
          </dl>
        )}
      </Modal>

      {preview && <ImagePreviewModal imageUrl={preview.url} title={preview.title} onClose={() => setPreview(null)} />}
    </div>
  );
};

export default ClientPurchases;
