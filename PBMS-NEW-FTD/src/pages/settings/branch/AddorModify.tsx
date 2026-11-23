import { useEffect, useState, type FormEvent } from "react";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { TextField } from "../../../ui/Field";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiRequest } from "../../../libs/apiConfig";
import { branchEndpoints } from "../../../endpoints/settings/branch/branchEndpoints";
import type { IBranch } from "../../../redux/types/systemSettings";

type Props = {
  open: boolean;
  branch: IBranch | null;
  onClose: () => void;
  onSaved: (branch: IBranch) => void;
};

/** Add a branch, or rename / move one (with a confirmation listing the change). */
const AddorModifyBranch = ({ open, branch, onClose, onSaved }: Props) => {
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<{ name?: string; location?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(branch?.name ?? "");
    setLocation(branch?.location ?? "");
    setErrors({});
  }, [open, branch]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const l = location.trim();
    const errs = { name: n ? undefined : "Enter the branch name.", location: l ? undefined : "Enter where the branch is." };
    setErrors(errs);
    if (errs.name || errs.location) return;

    if (branch) {
      const changes = [
        n !== branch.name && `Name: ${branch.name} → ${n}`,
        l !== branch.location && `Location: ${branch.location} → ${l}`,
      ].filter(Boolean) as string[];
      if (!changes.length) return onClose();
      const ok = await confirm({ title: "Save branch?", message: "Receipts and reports will show the new details.", details: <ul className="m-0 list-disc pl-5">{changes.map((c) => <li key={c}>{c}</li>)}</ul>, confirmLabel: "Save" });
      if (!ok) return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<{ data: IBranch }>(
        branch ? branchEndpoints.updateBranch(String(branch.id)) : branchEndpoints.createBranch,
        branch ? "PATCH" : "POST",
        { name: n, location: l },
      );
      onSaved(res.data);
      onClose();
    } catch {
      // toast shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      size="sm"
      title={branch ? "Edit branch" : "Add branch"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="branch-form" loading={saving}>{branch ? "Save" : "Add branch"}</Button>
        </>
      }
    >
      <form id="branch-form" onSubmit={submit} noValidate className="space-y-4">
        <TextField label="Branch name" required data-autofocus value={name} onChange={(v) => { setName(v); setErrors((x) => ({ ...x, name: undefined })); }} error={errors.name} placeholder="e.g. Kampala Main" maxLength={120} />
        <TextField label="Location" required value={location} onChange={(v) => { setLocation(v); setErrors((x) => ({ ...x, location: undefined })); }} error={errors.location} placeholder="e.g. Plot 12, Kampala Road" maxLength={120} />
      </form>
    </Modal>
  );
};

export default AddorModifyBranch;
