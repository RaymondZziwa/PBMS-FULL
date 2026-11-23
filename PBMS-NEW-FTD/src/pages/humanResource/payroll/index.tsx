import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiCalendar, FiEye, FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import Button from "../../../ui/Button";
import { Badge, Card, EmptyState, PageHeader, SkeletonRows, StatTile, ugx } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiRequest } from "../../../libs/apiConfig";
import { PayrollEndpoints } from "../../../endpoints/humanResource/payroll";
import usePayroll from "../../../hooks/humanResource/usePayroll";
import type { IPayrollPeriod } from "../../../redux/types/hr";
import PayrollDetailsModal from "./modal";
import { monthLabel, monthsBetween } from "./payrollMath";

const ym = (d: string) => String(d).slice(0, 7);
const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** "May – Jul 2026" / "Jul 2026" */
const periodName = (p: IPayrollPeriod) => {
  const a = ym(p.periodStart);
  const b = ym(p.periodEnd);
  return a === b ? monthLabel(a, "long") : `${monthLabel(a)} – ${monthLabel(b)}`;
};
const monthCount = (p: IPayrollPeriod) => monthsBetween(ym(p.periodStart), ym(p.periodEnd)).length;

const PayrollManagement = () => {
  const { data: periods, loading, error, refresh, remove } = usePayroll();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { search } = useLocation();
  const [viewing, setViewing] = useState<IPayrollPeriod | null>(null);
  const run = () => navigate("/hr/payroll/run");

  // Coming back from Run payroll: open the one just saved.
  useEffect(() => {
    const id = new URLSearchParams(search).get("view");
    if (!id) return;
    const found = (periods ?? []).find((p) => String(p.id) === id);
    if (found) {
      setViewing(found);
      navigate("/hr/payroll", { replace: true });
    }
  }, [search, periods, navigate]);

  const sorted = useMemo(
    () => [...(periods ?? [])].sort((a, b) => String(b.periodEnd).localeCompare(String(a.periodEnd)) || b.id - a.id),
    [periods],
  );
  const latest = sorted[0];
  const year = new Date().getFullYear();
  const paidThisYear = sorted.filter((p) => new Date(p.payDate).getFullYear() === year).reduce((a, p) => a + Number(p.totalSpent || 0), 0);

  const askDelete = (p: IPayrollPeriod) =>
    confirm({
      title: `Delete the ${periodName(p)} payroll?`,
      message: "Everyone's pay record in it is deleted, and those months can be paid again in a new payroll. This can't be undone.",
      details: (
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-brand-muted">People</dt>
          <dd className="m-0 text-right font-medium text-brand-ink">{p.payrolls?.length ?? 0}</dd>
          <dt className="text-brand-muted">Pay date</dt>
          <dd className="m-0 text-right font-medium text-brand-ink">{fmt(p.payDate)}</dd>
          <dt className="text-brand-muted">Total</dt>
          <dd className="m-0 text-right font-semibold tabular-nums text-brand-ink">{ugx(p.totalSpent)}</dd>
        </dl>
      ),
      tone: "danger",
      confirmLabel: "Delete payroll",
      onConfirm: async () => {
        await apiRequest(PayrollEndpoints.PAYROLL.delete(p.id), "DELETE");
        remove(p.id);
        if (viewing?.id === p.id) setViewing(null);
      },
    });

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader
        title="Payroll"
        description="Run payroll for one or more months, paying each person only for the months they're owed."
        actions={
          <>
            <Button variant="secondary" icon={<FiRefreshCw aria-hidden="true" />} onClick={() => refresh()}>
              Refresh
            </Button>
            <Button icon={<FiPlus aria-hidden="true" />} onClick={run}>
              Run payroll
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Latest payroll" value={latest ? ugx(latest.totalSpent) : "—"} hint={latest ? `${periodName(latest)} · ${latest.payrolls?.length ?? 0} people` : "None yet"} />
        <StatTile label={`Paid in ${year}`} value={ugx(paidThisYear)} />
        <StatTile label="Payrolls saved" value={sorted.length} />
      </div>

      <Card>
        {loading && sorted.length === 0 ? (
          <SkeletonRows rows={4} />
        ) : error && sorted.length === 0 ? (
          <EmptyState icon={<FiCalendar className="h-5 w-5" />} title="Couldn't load payrolls" message={error} action={<Button onClick={() => refresh()}>Try again</Button>} />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<FiCalendar className="h-5 w-5" />}
            title="No payrolls yet"
            message="Run your first payroll: pick the months, tick who's paid for which month, add allowances and deductions."
            action={<Button icon={<FiPlus aria-hidden="true" />} onClick={run}>Run payroll</Button>}
          />
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {sorted.map((p) => {
              const n = monthCount(p);
              return (
                <li key={p.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span aria-hidden="true" className="flex h-11 w-11 flex-none flex-col items-center justify-center rounded-lg bg-subtle text-brand-text">
                      <span className="text-[10px] font-semibold uppercase leading-none">{monthLabel(ym(p.periodEnd)).split(" ")[0]}</span>
                      <span className="font-display text-sm font-semibold leading-tight">{ym(p.periodEnd).slice(2, 4)}</span>
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 flex flex-wrap items-center gap-2 font-medium text-brand-ink">
                        {periodName(p)}
                        <Badge tone="brand">
                          {n} {n === 1 ? "month" : "months"}
                        </Badge>
                      </p>
                      <p className="m-0 text-xs text-brand-muted">
                        Paid {fmt(p.payDate)} · {p.payrolls?.length ?? 0} {(p.payrolls?.length ?? 0) === 1 ? "person" : "people"} · #{p.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="font-display text-lg font-semibold tabular-nums text-brand-ink">{ugx(p.totalSpent)}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" icon={<FiEye aria-hidden="true" />} onClick={() => setViewing(p)}>
                        View
                      </Button>
                      <button
                        type="button"
                        onClick={() => askDelete(p)}
                        aria-label={`Delete the ${periodName(p)} payroll`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted hover:bg-[#FDECEA] hover:text-[#B42318] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:hover:bg-[#381B19]"
                      >
                        <FiTrash2 aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>


      <PayrollDetailsModal visible={!!viewing} payrollPeriod={viewing} onClose={() => setViewing(null)} />
    </div>
  );
};

export default PayrollManagement;
