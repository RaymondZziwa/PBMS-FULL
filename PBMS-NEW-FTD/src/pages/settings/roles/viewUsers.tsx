import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { Badge, EmptyState, initials } from "../../../ui/Page";
import type { IRole } from "../../../redux/types/systemSettings";

type Props = { visible: boolean; onClose: () => void; role: IRole | null };

/** Who has a role. */
const RoleUsersModal = ({ visible, onClose, role }: Props) => {
  const people = role?.Employee ?? [];
  return (
    <Modal open={visible} onClose={onClose} size="md" title={role ? `People with ${role.name}` : ""} description={`${people.length} ${people.length === 1 ? "person" : "people"}`} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {!people.length ? (
        <EmptyState title="Nobody has this role yet" message="Give it to someone from their employee record." />
      ) : (
        <ul className="m-0 list-none divide-y divide-line p-0">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-subtle text-xs font-semibold text-brand-text">{initials(p.firstName, p.lastName)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-brand-ink">{p.firstName} {p.lastName}</span>
                <span className="block truncate text-xs text-brand-muted">{p.email || "Doesn't use the system"}</span>
              </span>
              {p.isActive === false && <Badge tone="neutral">Inactive</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

export default RoleUsersModal;
