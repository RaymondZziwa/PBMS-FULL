import { useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiClock, FiEdit2, FiLogIn, FiLogOut, FiTrash2, FiUserX } from "react-icons/fi";
import useAttendance, { localToday } from "../../../hooks/humanResource/useAttendance";
import useEmployees from "../../../hooks/humanResource/useEmployees";
import useCompany from "../../../hooks/settings/useCompany";
import { apiRequest } from "../../../libs/apiConfig";
import { PayrollEndpoints } from "../../../endpoints/humanResource/payroll";
import type { IAttendance, IEmployee } from "../../../redux/types/hr";
import Button from "../../../ui/Button";
import { DatePicker } from "../../../ui/DateFields";
import { SearchBox } from "../../../ui/Field";
import { Card, EmptyState, initials, PageHeader, SkeletonRows, StatTile } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import AddOrModifyAttendance, { hhmmEAT, nowHHMM, toEAT } from "./AddorModify";

type Row = IAttendance & { hoursWorked?: number | null };

const shiftDay = (iso: string, by: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + by);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const hoursBetween = (a: string, b?: string | null) => (b ? (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000 : null);
const fmtHours = (h: number) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}m`;
const nameOf = (e?: Pick<IEmployee, "firstName" | "lastName"> | null) => `${e?.firstName ?? ""} ${e?.lastName ?? ""}`.trim();

/** Daily attendance: who is in, who has left, who hasn't come yet. */
const AttendanceManagement = () => {
  const today = localToday();
  const [date, setDate] = useState(today);
  const isToday = date === today;
  const { data, loading, refresh } = useAttendance(date);
  const { data: employees = [] } = useEmployees();
  const company = useCompany() as { workHours?: number | string } | null;
  const workHours = Number(company?.workHours) || 8;
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ open: boolean; record: Row | null; employeeId?: string }>({ open: false, record: null });
  const [busyId, setBusyId] = useState<string | null>(null);

  const records = (data ?? []) as Row[];
  const takenIds = useMemo(() => new Set(records.map((r) => String(r.employeeId))), [records]);
  const notIn = useMemo(
    () => (employees as IEmployee[]).filter((e) => e.isActive !== false && !takenIds.has(String(e.id))),
    [employees, takenIds],
  );

  const s = q.trim().toLowerCase();
  const match = (name: string, dept?: string | null) => !s || `${name} ${dept ?? ""}`.toLowerCase().includes(s);
  const shown = records.filter((r) => match(nameOf(r.employee), (r.employee as IEmployee).dept?.name));
  const shownNotIn = notIn.filter((e) => match(nameOf(e), e.dept?.name));

  const atWork = records.filter((r) => !r.timeOut).length;
  const done = records.filter((r) => r.timeOut);
  const avg = done.length ? done.reduce((a, r) => a + (hoursBetween(r.timeIn, r.timeOut) ?? 0), 0) / done.length : 0;

  /** One tap: clock out now (today only). */
  const quickOut = async (r: Row) => {
    setBusyId(String(r.id));
    try {
      await apiRequest(PayrollEndpoints.Attendance.modify(r.id), "PUT", "", { timeOut: toEAT(date, nowHHMM()) });
      await refresh();
    } catch {
      // toast shown
    } finally {
      setBusyId(null);
    }
  };

  /** One tap: clock in now (today only). */
  const quickIn = async (e: IEmployee) => {
    setBusyId(`e${e.id}`);
    try {
      await apiRequest(PayrollEndpoints.Attendance.create, "POST", "", { employeeId: String(e.id), date, timeIn: toEAT(date, nowHHMM()) });
      await refresh();
    } catch {
      // toast shown
    } finally {
      setBusyId(null);
    }
  };

  const remove = (r: Row) =>
    confirm({
      title: `Delete ${nameOf(r.employee)}'s record?`,
      message: `Their time in and out for ${new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" })} will be removed. This can't be undone.`,
      tone: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await apiRequest(PayrollEndpoints.Attendance.remove(r.id), "DELETE");
        await refresh();
      },
    });

  const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader
        title="Attendance"
        description={isToday ? `Today · ${dayLabel}` : dayLabel}
        actions={<Button icon={<FiLogIn aria-hidden="true" />} onClick={() => setModal({ open: true, record: null })}>Clock in</Button>}
      />

      <Card className="mb-4 p-3 sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex items-end gap-2">
            <Button variant="secondary" aria-label="Previous day" icon={<FiChevronLeft aria-hidden="true" />} onClick={() => setDate(shiftDay(date, -1))} />
            <div className="w-48"><DatePicker label="Day" value={date} max={today} onChange={(v: string) => v && setDate(v)} /></div>
            <Button variant="secondary" aria-label="Next day" icon={<FiChevronRight aria-hidden="true" />} onClick={() => setDate(shiftDay(date, 1))} disabled={isToday} />
            {!isToday && <Button variant="ghost" onClick={() => setDate(today)}>Today</Button>}
          </div>
          <div className="md:ml-auto md:w-72"><SearchBox value={q} onChange={setQ} placeholder="Search name or department" label="Search people" /></div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Present" value={records.length} hint={`of ${(employees as IEmployee[]).filter((e) => e.isActive !== false).length} staff`} />
        <StatTile label={isToday ? "At work now" : "No time out"} value={atWork} />
        <StatTile label={isToday ? "Not in yet" : "Absent"} value={notIn.length} />
        <StatTile label="Average day" value={done.length ? fmtHours(avg) : "—"} hint={`Expected ${workHours}h`} />
      </div>

      <Card className="mb-4">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <FiClock aria-hidden="true" className="text-brand-muted" />
          <h2 className="m-0 text-[15px] font-semibold text-brand-ink">Clocked in</h2>
          <span className="text-sm text-brand-muted">{shown.length}</span>
        </div>
        {loading && !records.length ? (
          <SkeletonRows rows={5} />
        ) : !shown.length ? (
          <EmptyState
            icon={<FiLogIn className="h-5 w-5" />}
            title={records.length ? "Nobody matches your search" : isToday ? "Nobody has clocked in yet" : "No attendance recorded for this day"}
            action={!records.length && <Button icon={<FiLogIn aria-hidden="true" />} onClick={() => setModal({ open: true, record: null })}>Clock someone in</Button>}
          />
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {shown.map((r) => {
              const h = hoursBetween(r.timeIn, r.timeOut);
              const live = !r.timeOut && isToday ? hoursBetween(r.timeIn, new Date().toISOString()) : null;
              const worked = h ?? live ?? 0;
              const short = h !== null && h < workHours;
              const pct = Math.min(100, (worked / workHours) * 100);
              const dept = (r.employee as IEmployee).dept?.name;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="flex min-w-[200px] flex-1 items-center gap-3">
                    <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-subtle text-[13px] font-semibold text-brand-text">
                      {initials(r.employee?.firstName, r.employee?.lastName)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-brand-ink">{nameOf(r.employee)}</span>
                      <span className="block truncate text-xs text-brand-muted">{[dept, r.notes].filter(Boolean).join(" · ") || "—"}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm tabular-nums">
                    <span><span className="block text-[11px] uppercase tracking-wide text-brand-muted">In</span><span className="font-medium text-brand-ink">{hhmmEAT(r.timeIn)}</span></span>
                    <span><span className="block text-[11px] uppercase tracking-wide text-brand-muted">Out</span><span className="font-medium text-brand-ink">{r.timeOut ? hhmmEAT(r.timeOut) : "—"}</span></span>
                  </div>

                  <div className="w-36">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className={`font-medium ${short ? "text-[#B54708] dark:text-[#F5C26B]" : "text-brand-ink"}`}>{worked ? fmtHours(worked) : "—"}</span>
                      <span className="text-brand-muted">{!r.timeOut ? (isToday ? "At work" : "No time out") : short ? `${fmtHours(workHours - (h ?? 0))} short` : "Full day"}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                      <div className={`h-full rounded-full ${!r.timeOut ? "bg-brand/60" : short ? "bg-[#F79009]" : "bg-[#12B76A]"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="ml-auto flex items-center gap-1.5">
                    {!r.timeOut && isToday ? (
                      <Button size="sm" icon={<FiLogOut aria-hidden="true" />} loading={busyId === String(r.id)} onClick={() => quickOut(r)}>Clock out</Button>
                    ) : (
                      <Button size="sm" variant="secondary" icon={r.timeOut ? <FiEdit2 aria-hidden="true" /> : <FiLogOut aria-hidden="true" />} onClick={() => setModal({ open: true, record: r })}>
                        {r.timeOut ? "Edit" : "Add time out"}
                      </Button>
                    )}
                    {!r.timeOut && isToday && (
                      <Button size="sm" variant="ghost" aria-label={`Choose ${nameOf(r.employee)}'s time out`} icon={<FiEdit2 aria-hidden="true" />} onClick={() => setModal({ open: true, record: r })} />
                    )}
                    <Button size="sm" variant="ghost" aria-label={`Delete ${nameOf(r.employee)}'s record`} icon={<FiTrash2 aria-hidden="true" />} onClick={() => remove(r)} className="text-[#C0362C]" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <FiUserX aria-hidden="true" className="text-brand-muted" />
          <h2 className="m-0 text-[15px] font-semibold text-brand-ink">{isToday ? "Not in yet" : "No record"}</h2>
          <span className="text-sm text-brand-muted">{shownNotIn.length}</span>
        </div>
        {!shownNotIn.length ? (
          <p className="m-0 px-4 py-6 text-center text-sm text-brand-muted">{notIn.length ? "Nobody matches your search." : "Everyone has a record for this day."}</p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-px bg-line p-0 sm:grid-cols-2 lg:grid-cols-3">
            {shownNotIn.map((e) => (
              <li key={e.id} className="flex items-center gap-3 bg-surface px-4 py-3">
                <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-brand-muted">{initials(e.firstName, e.lastName)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-brand-ink">{nameOf(e)}</span>
                  <span className="block truncate text-xs text-brand-muted">{e.dept?.name ?? "—"}</span>
                </span>
                {isToday ? (
                  <Button size="sm" variant="secondary" icon={<FiLogIn aria-hidden="true" />} loading={busyId === `e${e.id}`} onClick={() => quickIn(e)} aria-label={`Clock in ${nameOf(e)} now`}>In</Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setModal({ open: true, record: null, employeeId: String(e.id) })}>Record</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AddOrModifyAttendance
        open={modal.open}
        date={date}
        record={modal.record}
        employeeId={modal.employeeId}
        employees={employees as IEmployee[]}
        takenIds={takenIds}
        onClose={() => setModal({ open: false, record: null })}
        onSaved={() => void refresh()}
      />
    </div>
  );
};

export default AttendanceManagement;
