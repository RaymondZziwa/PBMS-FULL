import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FiLogIn, FiLogOut } from "react-icons/fi";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import Combobox from "../../../ui/Combobox";
import { CONTROL, FieldShell, TextField } from "../../../ui/Field";
import { apiRequest } from "../../../libs/apiConfig";
import { PayrollEndpoints } from "../../../endpoints/humanResource/payroll";
import type { IAttendance, IEmployee } from "../../../redux/types/hr";

/** "HH:MM" now. */
export const nowHHMM = () => new Date().toTimeString().slice(0, 5);
/** "2026-11-23" + "08:30" → ISO time in East Africa Time (UTC+3). */
export const toEAT = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+03:00`).toISOString();
/** ISO → "HH:MM" in EAT. */
export const hhmmEAT = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Kampala" }) : "";

type Props = {
  open: boolean;
  /** The day being recorded (YYYY-MM-DD). */
  date: string;
  /** Set to record a time out for an existing record; empty to clock someone in. */
  record: IAttendance | null;
  /** Preselect someone when clocking in from the "not in yet" list. */
  employeeId?: string;
  employees: IEmployee[];
  /** Employees who already have a record that day (can't be clocked in twice). */
  takenIds: Set<string>;
  onClose: () => void;
  onSaved: () => void;
};

/** Clock someone in (with an optional time out), or clock them out. */
const AddOrModifyAttendance = ({ open, date, record, employeeId, employees, takenIds, onClose, onSaved }: Props) => {
  const isToday = date === new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Kampala" });
  const [emp, setEmp] = useState("");
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (record) {
      setEmp(String(record.employeeId));
      setTimeIn(hhmmEAT(record.timeIn));
      setTimeOut(record.timeOut ? hhmmEAT(record.timeOut) : isToday ? nowHHMM() : "");
      setNotes(record.notes ?? "");
    } else {
      setEmp(employeeId ?? "");
      setTimeIn(isToday ? nowHHMM() : "08:00");
      setTimeOut("");
      setNotes("");
    }
  }, [open, record, employeeId, isToday]);

  const options = useMemo(
    () =>
      employees
        .filter((e) => e.isActive !== false && (!takenIds.has(String(e.id)) || String(e.id) === emp))
        .map((e) => ({ value: String(e.id), label: `${e.firstName} ${e.lastName}`, hint: e.dept?.name ?? undefined })),
    [employees, takenIds, emp],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!record && !emp) er.emp = "Choose who is clocking in.";
    if (!timeIn) er.timeIn = "Enter the time in.";
    if (record && !timeOut) er.timeOut = "Enter the time out.";
    if (timeOut && timeIn && timeOut <= timeIn) er.timeOut = "Time out must be after time in.";
    if (isToday && !record && timeIn > nowHHMM()) er.timeIn = "Time in can't be later than now.";
    setErrors(er);
    if (Object.keys(er).length) return;

    setSaving(true);
    try {
      if (record) {
        await apiRequest(PayrollEndpoints.Attendance.modify(record.id), "PUT", "", { timeOut: toEAT(date, timeOut), notes });
      } else {
        await apiRequest(PayrollEndpoints.Attendance.create, "POST", "", {
          employeeId: emp,
          date,
          timeIn: toEAT(date, timeIn),
          timeOut: timeOut ? toEAT(date, timeOut) : undefined,
          notes: notes.trim() || undefined,
        });
      }
      onSaved();
      onClose();
    } catch {
      // toast shown
    } finally {
      setSaving(false);
    }
  };

  const name = record ? `${record.employee.firstName} ${record.employee.lastName}` : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      size="sm"
      title={record ? (record.timeOut ? `Edit time out · ${name}` : `Clock out ${name}`) : "Clock in"}
      description={new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="attendance-form" loading={saving} icon={record ? <FiLogOut aria-hidden="true" /> : <FiLogIn aria-hidden="true" />}>
            {record ? "Save time out" : "Clock in"}
          </Button>
        </>
      }
    >
      <form id="attendance-form" onSubmit={submit} noValidate className="space-y-4">
        {!record && (
          <Combobox label="Employee" required value={emp} onChange={(v) => { setEmp(v); setErrors((x) => ({ ...x, emp: "" })); }} options={options} placeholder="Choose an employee" searchPlaceholder="Search employees" error={errors.emp} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Time in" type="time" required value={timeIn} onChange={setTimeIn} error={errors.timeIn} disabled={!!record} data-autofocus={!record || undefined} />
          <TextField label="Time out" type="time" required={!!record} value={timeOut} onChange={setTimeOut} error={errors.timeOut} hint={record ? undefined : "Leave empty if still at work"} data-autofocus={record ? true : undefined} />
        </div>
        {isToday && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => (record ? setTimeOut(nowHHMM()) : setTimeIn(nowHHMM()))}>Use current time ({nowHHMM()})</Button>
          </div>
        )}
        <FieldShell label="Notes" id="att-notes" hint="e.g. late because of a clinic visit">
          <textarea id="att-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${CONTROL} h-auto border-line py-2.5`} />
        </FieldShell>
      </form>
    </Modal>
  );
};

export default AddOrModifyAttendance;
