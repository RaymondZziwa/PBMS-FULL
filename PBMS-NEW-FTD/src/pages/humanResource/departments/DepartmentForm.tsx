import { useEffect, useState, type FormEvent } from "react";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { TextField } from "../../../ui/Field";
import Combobox from "../../../ui/Combobox";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiRequest } from "../../../libs/apiConfig";
import { DepartmentEndpoints } from "../../../endpoints/humanResource/department";
import type { IDepartment } from "../../../redux/types/hr";
import useBranches from "../../../hooks/settings/useBranches";

type Props = {
  open: boolean;
  department: IDepartment | null;
  onClose: () => void;
  onSaved: (department: IDepartment) => void;
};

const DepartmentForm = ({ open, department, onClose, onSaved }: Props) => {
  const editing = !!department;
  const confirm = useConfirm();
  const { data: branches } = useBranches();
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [errors, setErrors] = useState<{ name?: string; branchId?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(department?.name ?? "");
    setBranchId(department?.branchId != null ? String(department.branchId) : "");
    setErrors({});
  }, [open, department]);

  const branchName = (id: string) => (branches ?? []).find((b) => String(b.id) === id)?.name ?? "—";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!name.trim()) found.name = "Enter a name";
    if (!branchId) found.branchId = "Choose a branch";
    setErrors(found);
    if (Object.keys(found).length) return;

    if (editing) {
      const lines: string[] = [];
      if (department!.name.trim() !== name.trim()) lines.push(`Name: ${department!.name} → ${name.trim()}`);
      if (String(department!.branchId) !== branchId) lines.push(`Branch: ${branchName(String(department!.branchId))} → ${branchName(branchId)}`);
      if (lines.length === 0) return onClose();
      const people = department!._count?.Employee ?? 0;
      const ok = await confirm({
        title: `Save changes to ${department!.name}?`,
        message: people > 0 && String(department!.branchId) !== branchId
          ? `The ${people} people in this department stay in it; check their branch afterwards.`
          : "The change shows everywhere this department is used.",
        details: (
          <ul className="m-0 list-disc space-y-1 pl-4">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ),
        confirmLabel: "Save changes",
        tone: "primary",
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<{ data?: IDepartment }>(
        editing ? DepartmentEndpoints.updateDepartment(department!.id) : DepartmentEndpoints.createDepartment,
        editing ? "PATCH" : "POST",
        { name: name.trim(), branchId: Number(branchId) },
      );
      if (res?.data && typeof res.data === "object" && "id" in res.data) onSaved(res.data);
      onClose();
    } catch {
      // error already shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      size="md"
      title={editing ? `Edit ${department!.name}` : "Add department"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="department-form" loading={saving}>
            {editing ? "Save changes" : "Add department"}
          </Button>
        </>
      }
    >
      <form id="department-form" onSubmit={submit} noValidate className="space-y-4">
        <TextField label="Name" required value={name} onChange={(v) => { setName(v); setErrors((x) => ({ ...x, name: undefined })); }} error={errors.name} placeholder="e.g. Sales, Clinic, Stores" data-autofocus />
        <Combobox
          label="Branch"
          required
          value={branchId}
          onChange={(v) => { setBranchId(v); setErrors((x) => ({ ...x, branchId: undefined })); }}
          error={errors.branchId}
          options={(branches ?? []).map((b) => ({ value: String(b.id), label: b.name, hint: b.location || undefined }))}
          placeholder="Choose a branch"
          searchPlaceholder="Search branches"
        />
      </form>
    </Modal>
  );
};

export default DepartmentForm;
