import { Fragment, useMemo, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { SearchBox } from "../../../ui/Field";
import { StatTile } from "../../../ui/Page";
import { count, day, money, num, ReportPage, ReportState, Section, Stats, Status, usePdfExport, useReport } from "../kit";

type Supply = { id: number; itemName?: string; qty: number; uom?: string; value: number; balance: number; paymentStatus: string; receivedBy?: string; createdAt: string };
type SupplierRow = { supplierId: number; supplierName: string; contact: string; address?: string | null; totalSupplied: number; totalPaid: number; balance: number; supplies: Supply[] };
type Data = { suppliers: SupplierRow[]; summary: { totalSuppliers: number; overallTotalSupplied: number; overallTotalPaid: number; overallBalance: number } };

/** What each supplier delivered, what's been paid and what's still owed. */
const SuppliersReport = () => {
  const { data, loading, error, reload } = useReport<Data>("/api/suppliers/report");
  const { exporting, exportPdf } = usePdfExport();
  const [q, setQ] = useState("");
  const [owing, setOwing] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const s = data?.summary;

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.suppliers ?? [])
      .filter((r) => (!owing || num(r.balance) > 0) && (!t || `${r.supplierName} ${r.contact}`.toLowerCase().includes(t)))
      .sort((a, b) => num(b.balance) - num(a.balance));
  }, [data, q, owing]);

  return (
    <ReportPage
      title="Suppliers"
      description="Deliveries, payments and balances owed, per supplier."
      onRefresh={reload}
      loading={loading}
      onExport={() => exportPdf("/api/suppliers/report/export", {}, "suppliers.pdf")}
      exporting={exporting}
      canExport={!!data}
    >
      <ReportState loading={loading} error={error} onRetry={reload} hasData={!!data && (data.suppliers?.length ?? 0) > 0} empty={{ title: "No suppliers yet" }}>
        {s && (
          <>
            <Stats>
              <StatTile label="Suppliers" value={s.totalSuppliers} />
              <StatTile label="Supplied" value={money(s.overallTotalSupplied)} />
              <StatTile label="Paid" value={money(s.overallTotalPaid)} />
              <StatTile label="Owed" value={money(s.overallBalance)} hint={`${(data?.suppliers ?? []).filter((r) => num(r.balance) > 0).length} supplier(s)`} />
            </Stats>
            <Section
              title="Suppliers"
              meta={`${rows.length}`}
              flush
              actions={
                <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={owing} onChange={(e) => setOwing(e.target.checked)} className="h-4 w-4 accent-[#3959A5]" /> Only those we owe
                </label>
              }
            >
              <div className="border-b border-line p-3">
                <SearchBox value={q} onChange={setQ} placeholder="Search name or phone" label="Search suppliers" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-brand-muted">
                      <th scope="col" className="px-3 py-2.5 text-left font-semibold">Supplier</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">Deliveries</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">Supplied</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">Paid</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">Owed</th>
                      <th scope="col"><span className="sr-only">Details</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const isOpen = open === r.supplierId;
                      return (
                        <Fragment key={r.supplierId}>
                          <tr className="border-b border-line hover:bg-surface-2/60">
                            <td className="px-3 py-2.5">
                              <span className="block font-medium text-brand-ink">{r.supplierName}</span>
                              <span className="block text-xs text-brand-muted">{[r.contact, r.address].filter(Boolean).join(" · ")}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{r.supplies.length}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-ink-soft">{money(r.totalSupplied)}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-ink-soft">{money(r.totalPaid)}</td>
                            <td className={`whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums ${num(r.balance) > 0 ? "text-[#B42318] dark:text-[#F29A92]" : "text-ink-soft"}`}>{money(r.balance)}</td>
                            <td className="px-2 py-2.5 text-right">
                              <button type="button" aria-expanded={isOpen} aria-label={`${isOpen ? "Hide" : "Show"} deliveries from ${r.supplierName}`} onClick={() => setOpen(isOpen ? null : r.supplierId)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted hover:bg-surface-2 hover:text-brand-ink" disabled={!r.supplies.length}>
                                <FiChevronDown aria-hidden="true" className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-line bg-surface-2/50">
                              <td colSpan={6} className="px-3 py-3">
                                <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line bg-surface p-0">
                                  {r.supplies.map((x) => (
                                    <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
                                      <span className="min-w-[160px] flex-1 font-medium text-brand-ink">{x.itemName ?? "Item"}</span>
                                      <span className="text-brand-muted">{count(x.qty)} {x.uom ?? ""}</span>
                                      <span className="text-brand-muted">{day(x.createdAt)}</span>
                                      <span className="tabular-nums text-ink-soft">{money(x.value)}</span>
                                      <Status value={x.paymentStatus} />
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                {!rows.length && <p className="m-0 px-4 py-8 text-center text-sm text-brand-muted">No supplier matches.</p>}
              </div>
            </Section>
          </>
        )}
      </ReportState>
    </ReportPage>
  );
};

export default SuppliersReport;
