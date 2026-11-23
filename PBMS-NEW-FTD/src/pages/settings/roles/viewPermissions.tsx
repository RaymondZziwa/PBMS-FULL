import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { EmptyState } from "../../../ui/Page";
import type { IPermission, IRole } from "../../../redux/types/systemSettings";
import { moduleLabel, permLabel } from "./permissionUtils";

type Props = { visible: boolean; onClose: () => void; role: IRole | null; onEdit?: () => void };

/** Read-only list of what a role can do, grouped by module. */
const RolePermissionsModal = ({ visible, onClose, role, onEdit }: Props) => {
  const perms = (role?.permissions ?? []).filter((p): p is IPermission => typeof p !== "string");
  const groups = perms.reduce<Record<string, IPermission[]>>((acc, p) => {
    (acc[p.module ?? "other"] ??= []).push(p);
    return acc;
  }, {});
  return (
    <Modal
      open={visible}
      onClose={onClose}
      size="lg"
      title={role ? `${role.name}: permissions` : ""}
      description={`${perms.length} permission(s)`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {onEdit && <Button onClick={onEdit}>Edit role</Button>}
        </>
      }
    >
      {!perms.length ? (
        <EmptyState title="No permissions yet" message="People with this role can only see their own dashboard." />
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([m, list]) => (
            <section key={m}>
              <h3 className="m-0 mb-1.5 text-xs font-semibold uppercase tracking-wider text-brand-muted">{moduleLabel(m)}</h3>
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {list.map((p) => (
                  <li key={p.value} className="rounded-full bg-subtle px-2.5 py-1 text-xs text-brand-text first-letter:uppercase">{permLabel(p)}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default RolePermissionsModal;
