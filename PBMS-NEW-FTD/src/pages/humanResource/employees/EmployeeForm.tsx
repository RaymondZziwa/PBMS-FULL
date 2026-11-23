import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { MoneyField, Segmented, TextField, Toggle } from "../../../ui/Field";
import Combobox from "../../../ui/Combobox";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { ugx } from "../../../ui/Page";
import { apiRequest } from "../../../libs/apiConfig";
import { EmployeeEndpoints } from "../../../endpoints/humanResource/employee";
import type { IEmployee } from "../../../redux/types/hr";
import useBranches from "../../../hooks/settings/useBranches";
import useDepartments from "../../../hooks/humanResource/useDepartments";
import useRoles from "../../../hooks/settings/useRoles";

type Props = {
  open: boolean;
  employee: IEmployee | null;
  onClose: () => void;
  /** Called with the saved record so the list updates straight away. */
  onSaved: (employee: IEmployee) => void;
};

type FormState = {
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  tel: string;
  salary: string;
  roleId: string;
  branchId: string;
  deptId: string;
  password: string;
  hasAccess: boolean;
  hasPrescriptionAccess: boolean;
  isActive: boolean;
};

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  gender: "",
  email: "",
  tel: "",
  salary: "",
  roleId: "",
  branchId: "",
  deptId: "",
  password: "",
  hasAccess: false,
  hasPrescriptionAccess: false,
  isActive: true,
};

const fromEmployee = (e: IEmployee): FormState => ({
  firstName: e.firstName ?? "",
  lastName: e.lastName ?? "",
  gender: e.gender ?? "",
  email: e.email ?? "",
  tel: e.tel ?? "",
  salary: e.salary === null || e.salary === undefined ? "" : String(Number(e.salary)),
  roleId: e.roleId != null ? String(e.roleId) : "",
  branchId: e.branchId != null ? String(e.branchId) : "",
  deptId: e.deptId != null ? String(e.deptId) : "",
  password: "",
  hasAccess: !!e.hasAccess,
  hasPrescriptionAccess: !!e.hasPrescriptionAccess,
  isActive: e.isActive !== false,
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A titled group of fields in a two-column grid (one column on phones). */
const Section = ({ title, children, columns = 2 }: { title: string; children: ReactNode; columns?: 1 | 2 }) => (
  <fieldset className="m-0 min-w-0 border-0 p-0">
    <legend className="mb-3 w-full border-b border-line pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-muted">{title}</legend>
    <div className={`grid grid-cols-1 gap-x-4 gap-y-4 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>{children}</div>
  </fieldset>
);
const digits = (v: string) => v.replace(/[^\d]/g, "");

type Errors = Partial<Record<keyof FormState, string>>;

const validate = (f: FormState, editing: boolean, hasPassword: boolean): Errors => {
  const e: Errors = {};
  if (!f.firstName.trim()) e.firstName = "Enter a first name";
  if (!f.lastName.trim()) e.lastName = "Enter a last name";
  if (!f.gender) e.gender = "Choose one";
  if (!f.tel.trim()) e.tel = "Enter a phone number";
  else if (digits(f.tel).length < 9) e.tel = "That phone number looks too short";
  // Email and password only matter for people who sign in.
  if (f.email.trim() && !EMAIL.test(f.email.trim())) e.email = "That email doesn't look right";
  else if (f.hasAccess && !f.email.trim()) e.email = "Needed so they can sign in";
  if (!f.branchId) e.branchId = "Choose a branch";
  if (!f.deptId) e.deptId = "Choose a department";
  if (!f.roleId) e.roleId = "Choose a role";
  if (!f.salary || Number(f.salary) <= 0) e.salary = "Enter the monthly salary";
  const needsPassword = f.hasAccess && (!editing || !hasPassword);
  if (needsPassword && !f.password) e.password = "Set a password so they can sign in";
  else if (f.password && f.password.length < 8) e.password = "At least 8 characters";
  return e;
};

const EmployeeForm = ({ open, employee, onClose, onSaved }: Props) => {
  const editing = !!employee;
  const confirm = useConfirm();
  const { data: branches } = useBranches();
  const { data: departments } = useDepartments();
  const { data: roles } = useRoles();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(employee ? fromEmployee(employee) : EMPTY);
    setErrors({});
    setShowPassword(false);
  }, [open, employee]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: String(b.id), label: b.name, hint: b.location || undefined })),
    [branches],
  );
  // Only the chosen branch's departments.
  const departmentOptions = useMemo(
    () =>
      (departments ?? [])
        .filter((d) => !form.branchId || String(d.branchId) === form.branchId)
        .map((d) => ({ value: String(d.id), label: d.name, hint: d._count ? `${d._count.Employee} ${d._count.Employee === 1 ? "person" : "people"}` : undefined })),
    [departments, form.branchId],
  );
  const roleOptions = useMemo(
    () => (roles ?? []).map((r: { id: string | number; name: string }) => ({ value: String(r.id), label: r.name })),
    [roles],
  );

  const labelOf = (options: { value: string; label: string }[], v: string) => options.find((o) => o.value === v)?.label ?? "—";

  /** "What changes" list for the confirmation. */
  const changes = (): string[] => {
    if (!employee) return [];
    const before = fromEmployee(employee);
    const list: string[] = [];
    const text = (k: keyof FormState, label: string) => {
      if (String(before[k]).trim() !== String(form[k]).trim()) list.push(`${label}: ${before[k] || "—"} → ${form[k] || "—"}`);
    };
    text("firstName", "First name");
    text("lastName", "Last name");
    text("gender", "Gender");
    text("tel", "Phone");
    text("email", "Email");
    if (before.salary !== form.salary) list.push(`Salary: ${ugx(before.salary)} → ${ugx(form.salary)}`);
    if (before.roleId !== form.roleId) list.push(`Role: ${labelOf(roleOptions, before.roleId)} → ${labelOf(roleOptions, form.roleId)}`);
    if (before.branchId !== form.branchId) list.push(`Branch: ${labelOf(branchOptions, before.branchId)} → ${labelOf(branchOptions, form.branchId)}`);
    if (before.deptId !== form.deptId) {
      const allDepts = (departments ?? []).map((d) => ({ value: String(d.id), label: d.name }));
      list.push(`Department: ${labelOf(allDepts, before.deptId)} → ${labelOf(allDepts, form.deptId)}`);
    }
    const flag = (k: "hasAccess" | "hasPrescriptionAccess" | "isActive", label: string) => {
      if (before[k] !== form[k]) list.push(`${label}: ${before[k] ? "Yes" : "No"} → ${form[k] ? "Yes" : "No"}`);
    };
    flag("hasAccess", "Can sign in");
    flag("hasPrescriptionAccess", "Prescription database");
    flag("isActive", "Active");
    if (form.password && form.hasAccess) list.push("Password: a new password will be set");
    return list;
  };

  const payload = () => {
    const body: Record<string, unknown> = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender,
      email: form.email.trim() || null,
      tel: form.tel.trim(),
      salary: Number(form.salary),
      roleId: Number(form.roleId),
      branchId: Number(form.branchId),
      deptId: Number(form.deptId),
      hasAccess: form.hasAccess,
      hasPrescriptionAccess: form.hasPrescriptionAccess,
      isActive: form.isActive,
    };
    if (form.password && form.hasAccess) body.password = form.password;
    return body;
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiRequest<{ data?: IEmployee }>(
        editing ? EmployeeEndpoints.updateEmployee(employee!.id) : EmployeeEndpoints.createEmployee,
        editing ? "PATCH" : "POST",
        payload(),
      );
      if (res?.data && typeof res.data === "object" && "id" in res.data) onSaved(res.data);
      onClose();
    } catch {
      // apiRequest already showed the reason (e.g. email in use)
    } finally {
      setSaving(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(form, editing, !!employee?.hasPassword);
    setErrors(found);
    if (Object.keys(found).length) {
      // take them to the first problem
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('#employee-form [aria-invalid="true"]');
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
        el?.focus({ preventScroll: true });
      });
      return;
    }

    if (editing) {
      const list = changes();
      if (list.length === 0) {
        onClose();
        return;
      }
      const ok = await confirm({
        title: `Save changes to ${employee!.firstName} ${employee!.lastName}?`,
        message: "These details will be updated straight away.",
        details: (
          <ul className="m-0 list-disc space-y-1 pl-4">
            {list.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ),
        confirmLabel: "Save changes",
        tone: "primary",
      });
      if (!ok) return;
    }
    await save();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      size="lg"
      title={editing ? `Edit ${employee!.firstName} ${employee!.lastName}` : "Add employee"}
      description={editing ? "Change their details, role or access." : "Email and password are only needed if they'll use the system."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="employee-form" loading={saving}>
            {editing ? "Save changes" : "Add employee"}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={submit} noValidate className="space-y-7">
        <Section title="Personal details">
          <TextField label="First name" required value={form.firstName} onChange={(v) => set("firstName", v)} error={errors.firstName} autoComplete="given-name" placeholder="e.g. Sarah" data-autofocus />
          <TextField label="Last name" required value={form.lastName} onChange={(v) => set("lastName", v)} error={errors.lastName} autoComplete="family-name" placeholder="e.g. Nakato" />
          <Segmented
            label="Gender"
            required
            value={form.gender as "MALE" | "FEMALE" | ""}
            onChange={(v) => set("gender", v)}
            error={errors.gender}
            options={[
              { value: "MALE", label: "Male" },
              { value: "FEMALE", label: "Female" },
            ]}
          />
          <TextField label="Phone" required type="tel" inputMode="tel" value={form.tel} onChange={(v) => set("tel", v)} error={errors.tel} placeholder="07XX XXX XXX" autoComplete="tel" />
          <TextField
            label="Email"
            required={form.hasAccess}
            type="email"
            value={form.email}
            onChange={(v) => set("email", v)}
            error={errors.email}
            autoComplete="email"
            placeholder="name@profbioresearch.com"
            className="sm:col-span-2"
            hint={form.hasAccess ? "They sign in with this and get password resets here." : "Optional. Needed only if they will use the system."}
          />
        </Section>

        <Section title="Work">
          <Combobox
            label="Branch"
            required
            value={form.branchId}
            onChange={(v) => {
              set("branchId", v);
              // a department from another branch no longer fits
              const dept = (departments ?? []).find((d) => String(d.id) === form.deptId);
              if (dept && String(dept.branchId) !== v) set("deptId", "");
            }}
            error={errors.branchId}
            options={branchOptions}
            placeholder="Choose a branch"
            searchPlaceholder="Search branches"
          />
          <Combobox
            label="Department"
            required
            value={form.deptId}
            onChange={(v) => set("deptId", v)}
            error={errors.deptId}
            options={departmentOptions}
            disabled={!form.branchId}
            placeholder={!form.branchId ? "Choose a branch first" : "Choose a department"}
            searchPlaceholder="Search departments"
            emptyText="No departments in this branch yet"
          />
          <Combobox
            label="Role"
            required
            value={form.roleId}
            onChange={(v) => set("roleId", v)}
            error={errors.roleId}
            options={roleOptions}
            placeholder="Choose a role"
            searchPlaceholder="Search roles"
            hint="Decides what they can open in the system."
          />
          <MoneyField label="Monthly salary" required value={form.salary} onChange={(v) => set("salary", v)} error={errors.salary} placeholder="0" />
        </Section>

        <Section title="System access" columns={1}>
          <Toggle
            label="Uses the system"
            description="Turn on if they will sign in to PBMS. Then an email and password are needed."
            checked={form.hasAccess}
            onChange={(v) => {
              set("hasAccess", v);
              if (!v) {
                set("password", "");
                setErrors((x) => ({ ...x, email: undefined, password: undefined }));
              }
            }}
          />
          {form.hasAccess && (
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface-2 p-4 sm:grid-cols-2">
              <TextField
                label={editing && employee?.hasPassword ? "New password" : "Password"}
                required={!editing || !employee?.hasPassword}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(v) => set("password", v)}
                error={errors.password}
                autoComplete="new-password"
                placeholder={editing && employee?.hasPassword ? "Leave empty to keep it" : "At least 8 characters"}
                hint={editing && employee?.hasPassword ? "Leave empty to keep their current password." : "Share it with them privately."}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-brand-muted hover:text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                  </button>
                }
              />
              <div className="self-start sm:pt-6">
                <p className="m-0 text-xs leading-relaxed text-brand-muted">
                  They sign in with <strong className="font-medium text-ink-soft">{form.email.trim() || "the email above"}</strong> or their phone number.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Toggle label="Prescriptions" description="Can open client prescriptions." checked={form.hasPrescriptionAccess} onChange={(v) => set("hasPrescriptionAccess", v)} />
            <Toggle label="Active" description="Inactive people skip attendance and payroll." checked={form.isActive} onChange={(v) => set("isActive", v)} />
          </div>
        </Section>
      </form>
    </Modal>
  );
};

export default EmployeeForm;
