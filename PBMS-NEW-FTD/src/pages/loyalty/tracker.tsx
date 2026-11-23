import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiMinus, FiPlus, FiRotateCcw, FiSave, FiSearch, FiX } from "react-icons/fi";
import { apiRequest } from "../../libs/apiConfig";
import Button from "../../ui/Button";
import { Card, EmptyState, PageHeader, SkeletonRows } from "../../ui/Page";
import { useConfirm } from "../../ui/ConfirmDialog";
import { CLUB, fmtPhone, monthStatus, TRACKER_TONE, type MemberRow, type Tracker } from "./clubApi";
import { Avatar, StatusBadge } from "./members";

type Cell = { q: string; r: string };
const key = (m: number, l: number) => `${m}-${l}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const THIS_YEAR = new Date().getFullYear();

/** Find a member by name, phone or card number. */
const MemberSearch = ({ onPick }: { onPick: (m: MemberRow) => void }) => {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (q.trim().length < 2) return setRows([]);
    const t = setTimeout(() => {
      apiRequest<{ data: { rows: MemberRow[] } }>(`${CLUB.members}?status=ALL&pageSize=8&search=${encodeURIComponent(q.trim())}`)
        .then((r) => {
          setRows(r.data.rows.filter((x) => !["PENDING", "REJECTED"].includes(x.status)));
          setActive(0);
          setOpen(true);
        })
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const pick = (m: MemberRow) => {
    onPick(m);
    setQ("");
    setOpen(false);
  };
  return (
    <div className="relative w-full sm:max-w-md">
      <FiSearch aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="tracker-member-results"
        aria-label="Find a member"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => rows.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(rows.length - 1, a + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          if (e.key === "Enter" && rows[active]) { e.preventDefault(); pick(rows[active]); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Find a member: name, phone or card number"
        className="themed h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-brand-ink outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgb(57_89_165/0.18)]"
      />
      {open && q.trim().length >= 2 && (
        <ul id="tracker-member-results" role="listbox" className="absolute z-30 mt-1 max-h-80 w-full list-none overflow-auto rounded-xl border border-line bg-surface p-1 shadow-pop">
          {!rows.length && <li className="px-3 py-2.5 text-sm text-brand-muted">No approved member matches.</li>}
          {rows.map((m, i) => (
            <li key={m.id} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(m)} className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left ${i === active ? "bg-surface-2" : ""}`}>
                <Avatar url={m.photoUrl} name={m.name} size="h-8 w-8" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-brand-ink">{m.name}</span>
                  <span className="block truncate text-xs text-brand-muted">{[m.cardNumber, fmtPhone(m.phone1)].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Staff fill in each member's yearly performance tracker here. */
const ClubTracker = () => {
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const memberId = params.get("member");
  const year = Number(params.get("year")) || THIS_YEAR;
  const [member, setMember] = useState<MemberRow | null>(null);
  const [saved, setSaved] = useState<Tracker | null>(null);
  const [lots, setLots] = useState(4);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromTracker = (t: Tracker) => {
    const c: Record<string, Cell> = {};
    t.months.forEach((m) => m.cells.forEach((x) => { c[key(m.month, x.lot)] = { q: x.quantity == null ? "" : String(x.quantity), r: x.receiptNo ?? "" }; }));
    setCells(c);
    setLots(t.lots);
    setSaved(t);
  };

  const load = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    setError(null);
    try {
      const [t, m] = await Promise.all([
        apiRequest<{ data: Tracker }>(CLUB.tracker(memberId, year)),
        member && String(member.id) === memberId ? Promise.resolve(null) : apiRequest<{ data: MemberRow }>(CLUB.member(memberId)),
      ]);
      fromTracker(t.data);
      if (m) setMember(m.data);
    } catch {
      setSaved(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, year]);
  useEffect(() => { void load(); }, [load]);

  const dirty = useMemo(() => {
    if (!saved) return false;
    if (lots !== saved.lots) return true;
    return saved.months.some((m) => Array.from({ length: Math.max(lots, saved.lots) }, (_, j) => j + 1).some((l) => {
      const was = m.cells.find((x) => x.lot === l);
      const now = cells[key(m.month, l)] ?? { q: "", r: "" };
      return (was?.quantity == null ? "" : String(was.quantity)) !== now.q || (was?.receiptNo ?? "") !== now.r;
    }));
  }, [saved, cells, lots]);

  // Leaving with unsaved changes asks first.
  const guard = async (go: () => void) => {
    if (!dirty) return go();
    const ok = await confirm({ title: "Discard unsaved changes?", message: "The tracker has changes that aren't saved.", tone: "danger", confirmLabel: "Discard" });
    if (ok) go();
  };
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next);
  };

  const setCell = (m: number, l: number, part: "q" | "r", v: string) => {
    setError(null);
    setCells((c) => ({ ...c, [key(m, l)]: { ...(c[key(m, l)] ?? { q: "", r: "" }), [part]: part === "q" ? v.replace(/[^\d.]/g, "") : v } }));
  };

  const removeLot = async () => {
    const hasData = Array.from({ length: 12 }, (_, i) => cells[key(i + 1, lots)]).some((c) => c && (c.q || c.r));
    if (hasData && !(await confirm({ title: `Remove lot ${lots}?`, message: "It has values in some months. They'll be removed when you save.", tone: "danger", confirmLabel: "Remove lot" }))) return;
    setLots((n) => Math.max(1, n - 1));
  };

  const save = async () => {
    if (!memberId) return;
    for (let m = 1; m <= 12; m++) {
      for (let l = 1; l <= lots; l++) {
        const c = cells[key(m, l)];
        if (c && Number(c.q) > 0 && !c.r.trim()) return setError(`Add the receipt number for ${MONTHS[m - 1]}, lot ${l}.`);
      }
    }
    setSaving(true);
    try {
      const payload = { year, lots, cells: Object.entries(cells).map(([k, c]) => { const [month, lot] = k.split("-").map(Number); return { month, lot, quantity: c.q === "" ? null : Number(c.q), receiptNo: c.r.trim() || null }; }).filter((c) => c.lot <= lots) };
      const r = await apiRequest<{ data: Tracker }>(CLUB.saveTracker(memberId), "PUT", payload);
      fromTracker(r.data);
    } catch {
      // toast shown
    } finally {
      setSaving(false);
    }
  };

  const years = useMemo(() => Array.from(new Set([THIS_YEAR + 1, THIS_YEAR, ...(saved?.years ?? []), year])).sort((a, b) => b - a), [saved, year]);
  const live = Array.from({ length: 12 }, (_, i) => {
    const filled = Array.from({ length: lots }, (_, j) => Number(cells[key(i + 1, j + 1)]?.q) > 0).filter(Boolean).length;
    return monthStatus(filled, lots, year, i + 1);
  });
  const totals = Array.from({ length: lots }, (_, j) => Array.from({ length: 12 }, (_, i) => Number(cells[key(i + 1, j + 1)]?.q) || 0).reduce((a, b) => a + b, 0));

  return (
    <div className="mx-auto max-w-7xl font-inter">
      <PageHeader title="Performance tracker" description="Record each member's quantities and receipts per lot, month by month. Members see their tracker in the Monk Club app." />

      <Card className="mb-4 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <MemberSearch onPick={(m) => guard(() => { setMember(m); setParam("member", String(m.id)); })} />
          {member && (
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
              <Avatar url={member.photoUrl} name={member.name} size="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <Link to={`/loyalty/members/${member.id}`} className="block truncate text-sm font-semibold text-brand-ink no-underline hover:underline">{member.name}</Link>
                <span className="block truncate text-xs text-brand-muted">{[member.cardNumber, fmtPhone(member.phone1)].filter(Boolean).join(" · ")}</span>
              </div>
              <StatusBadge status={member.status} />
              <button type="button" aria-label="Choose another member" onClick={() => guard(() => { setMember(null); setSaved(null); setParam("member", null); })} className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-muted hover:bg-surface hover:text-brand-ink"><FiX aria-hidden="true" /></button>
            </div>
          )}
        </div>
      </Card>

      {!memberId ? (
        <Card><EmptyState icon={<FiSearch className="h-5 w-5" />} title="Find a member to open their tracker" message="Search by name, phone number or loyalty card number." /></Card>
      ) : loading && !saved ? (
        <Card><SkeletonRows rows={8} /></Card>
      ) : !saved ? (
        <Card><EmptyState title="The tracker didn't load" action={<Button variant="secondary" onClick={() => load()}>Try again</Button>} /></Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-3 sm:p-4">
            <div role="tablist" aria-label="Year" className="flex gap-1 overflow-x-auto">
              {years.map((y) => (
                <button key={y} type="button" role="tab" aria-selected={y === year} onClick={() => guard(() => setParam("year", String(y)))} className={`h-9 flex-none rounded-lg px-3 text-[13px] font-medium ${y === year ? "bg-brand text-white" : "text-brand-muted hover:bg-surface-2 hover:text-brand-ink"}`}>{y}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <span className="text-sm text-brand-muted">Lots</span>
              <Button size="sm" variant="secondary" aria-label="Remove a lot" icon={<FiMinus aria-hidden="true" />} onClick={removeLot} disabled={lots <= 1} />
              <span className="w-6 text-center text-sm font-semibold tabular-nums text-brand-ink">{lots}</span>
              <Button size="sm" variant="secondary" aria-label="Add a lot" icon={<FiPlus aria-hidden="true" />} onClick={() => setLots((n) => Math.min(20, n + 1))} disabled={lots >= 20} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface-2 text-xs uppercase tracking-wide text-brand-muted">
                  <th scope="col" className="sticky left-0 z-10 bg-surface-2 px-3 py-2.5 text-left font-semibold">Month</th>
                  {Array.from({ length: lots }, (_, j) => (
                    <th key={j} scope="col" className="min-w-[170px] border-l border-line px-2 py-2.5 text-left font-semibold">
                      Lot {j + 1}
                      <span className="mt-0.5 flex gap-1 text-[10px] font-normal normal-case tracking-normal"><span className="w-[64px]">Quantity</span><span>Receipt no.</span></span>
                    </th>
                  ))}
                  <th scope="col" className="border-l border-line px-3 py-2.5 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS.map((name, i) => {
                  const m = i + 1;
                  const st = TRACKER_TONE[live[i]];
                  return (
                    <tr key={name} className="border-t border-line">
                      <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-left font-medium text-brand-ink">{name}</th>
                      {Array.from({ length: lots }, (_, j) => {
                        const c = cells[key(m, j + 1)] ?? { q: "", r: "" };
                        const missingReceipt = Number(c.q) > 0 && !c.r.trim();
                        return (
                          <td key={j} className="border-l border-line px-2 py-1.5">
                            <div className="flex gap-1">
                              <input inputMode="decimal" aria-label={`${name} lot ${j + 1} quantity`} value={c.q} onChange={(e) => setCell(m, j + 1, "q", e.target.value)} placeholder="0" className="themed h-9 w-[64px] rounded-md border border-line bg-surface px-2 text-right tabular-nums text-brand-ink outline-none focus:border-brand" />
                              <input aria-label={`${name} lot ${j + 1} receipt number`} value={c.r} onChange={(e) => setCell(m, j + 1, "r", e.target.value)} placeholder="Receipt" className={`themed h-9 w-full min-w-[90px] rounded-md border bg-surface px-2 text-brand-ink outline-none focus:border-brand ${missingReceipt ? "border-[#D92D20]" : "border-line"}`} />
                            </div>
                          </td>
                        );
                      })}
                      <td className="border-l border-line px-3 py-1.5">
                        <span className={`inline-flex min-w-[84px] justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line bg-surface-2 font-semibold text-brand-ink">
                  <th scope="row" className="sticky left-0 z-10 bg-surface-2 px-3 py-2.5 text-left">Total</th>
                  {totals.map((t, j) => <td key={j} className="border-l border-line px-3 py-2.5 tabular-nums">{t.toLocaleString("en-US")}</td>)}
                  <td className="border-l border-line px-3 py-2.5 text-xs font-normal text-brand-muted">
                    {live.filter((s) => s === "ACTIVE").length} active · {live.filter((s) => s === "DEFECTIVE").length} defective
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="sticky bottom-0 z-20 flex flex-wrap items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
            <p className="m-0 min-w-0 flex-1 text-xs text-brand-muted">
              {error ? <span className="text-sm text-[#C0362C]">{error}</span> : <>A month is <b className="text-[#1B7A3D]">active</b> when at least half its lots have a quantity, <b className="text-[#C0362C]">defective</b> when fewer do (or none once the month is over), and <b>default</b> until then.</>}
            </p>
            <Button variant="secondary" icon={<FiRotateCcw aria-hidden="true" />} disabled={!dirty || saving} onClick={() => saved && fromTracker(saved)}>Discard</Button>
            <Button icon={<FiSave aria-hidden="true" />} loading={saving} disabled={!dirty} onClick={save}>Save {year}</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ClubTracker;
