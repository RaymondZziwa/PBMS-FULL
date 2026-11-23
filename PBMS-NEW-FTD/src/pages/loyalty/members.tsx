import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiCopy, FiUserPlus, FiUsers } from "react-icons/fi";
import { toast } from "sonner";
import Modal from "../../ui/Modal";
import MemberForm, { type CreatedMember } from "./memberForm";
import { apiRequest } from "../../libs/apiConfig";
import Button from "../../ui/Button";
import { SearchBox } from "../../ui/Field";
import { Card, EmptyState, initials, PageHeader, SkeletonRows } from "../../ui/Page";
import { CLUB, fmtPhone, photoSrc, STATUS, type MemberRow, type MemberStatus } from "./clubApi";

type ListData = { rows: MemberRow[]; total: number; page: number; pageSize: number; counts: Partial<Record<MemberStatus, number>> };
const TABS: Array<{ value: MemberStatus | ""; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DEACTIVATED", label: "Deactivated" },
  { value: "REJECTED", label: "Rejected" },
  { value: "", label: "All" },
];

export const StatusBadge = ({ status }: { status: MemberStatus }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[status].cls}`}>{STATUS[status].label}</span>
);

export const Avatar = ({ url, name, size = "h-10 w-10" }: { url?: string | null; name: string; size?: string }) => {
  const src = photoSrc(url);
  const [first, ...rest] = name.split(" ");
  return src ? (
    <img src={src} alt="" className={`${size} flex-none rounded-full object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${size} flex flex-none items-center justify-center rounded-full bg-subtle text-[13px] font-semibold text-brand-text`}>{initials(first, rest.pop())}</span>
  );
};

/** Club members and applications. */
const ClubMembers = () => {
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get("status");
  const status = (rawStatus === "ALL" ? "" : rawStatus ?? "PENDING") as MemberStatus | "";
  const page = Number(params.get("page") ?? 1);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [data, setData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<CreatedMember | null>(null);
  const navigate = useNavigate();

  // Search as you type, a moment after typing stops.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (search) next.set("q", search);
      else next.delete("q");
      next.delete("page");
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const q = new URLSearchParams({ status, page: String(page), pageSize: "25", search: params.get("q") ?? "" });
    apiRequest<{ data: ListData }>(`${CLUB.members}?${q}`)
      .then((r) => alive && setData(r.data))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [status, page, params]);

  const go = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next);
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader
        title="Club members"
        description="Applications, members and their accounts."
        actions={<Button icon={<FiUserPlus aria-hidden="true" />} onClick={() => setAdding(true)}>Add member</Button>}
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:p-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Name, phone, card number or NIN" label="Search members" className="sm:max-w-md" />
          <div role="tablist" aria-label="Member status" className="-mx-1 flex gap-1 overflow-x-auto px-1">
            {TABS.map((t) => {
              const n = t.value ? data?.counts[t.value] : undefined;
              const on = status === t.value;
              return (
                <button key={t.label} type="button" role="tab" aria-selected={on} onClick={() => go("status", t.value || "ALL")} className={`flex h-9 flex-none items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium ${on ? "bg-brand text-white" : "text-brand-muted hover:bg-surface-2 hover:text-brand-ink"}`}>
                  {t.label}
                  {n ? <span className={`rounded-full px-1.5 text-[11px] ${on ? "bg-white/20" : "bg-subtle text-brand-text"}`}>{n}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        {loading && !data ? (
          <SkeletonRows />
        ) : !data?.rows.length ? (
          <EmptyState icon={<FiUsers className="h-5 w-5" />} title={params.get("q") ? "No member matches your search" : status === "PENDING" ? "No applications waiting" : "No members here"} message={status === "PENDING" ? "New applications from the Monk Club app appear here." : undefined} />
        ) : (
          <>
            <ul className={`m-0 list-none divide-y divide-line p-0 ${loading ? "opacity-60" : ""}`}>
              {data.rows.map((m) => (
                <li key={m.id}>
                  <Link to={`/loyalty/members/${m.id}`} className="flex items-center gap-3 px-4 py-3 text-inherit no-underline hover:bg-surface-2">
                    <Avatar url={m.photoUrl} name={m.name} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-medium text-brand-ink">
                        {m.title} {m.name}
                        <StatusBadge status={m.status} />
                      </span>
                      <span className="block truncate text-xs text-brand-muted">
                        {[m.cardNumber, fmtPhone(m.phone1), m.email, m.district ?? m.country].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="hidden flex-none text-xs text-brand-muted sm:block">Applied {new Date(m.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <FiChevronRight aria-hidden="true" className="flex-none text-brand-muted" />
                  </Link>
                </li>
              ))}
            </ul>
            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-brand-muted">
                <span>Page {page} of {pages} · {data.total} members</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" icon={<FiChevronLeft aria-hidden="true" />} disabled={page <= 1} onClick={() => go("page", String(page - 1))}>Previous</Button>
                  <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => go("page", String(page + 1))}>Next <FiChevronRight aria-hidden="true" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
      <MemberForm
        open={adding}
        member={null}
        onClose={() => setAdding(false)}
        onSaved={() => undefined}
        onCreated={(r) => { setCreated(r); go("status", r.member.status); }}
      />

      <Modal
        open={!!created}
        onClose={() => setCreated(null)}
        size="sm"
        title="Member added"
        description={created ? `${created.member.name} · ${created.member.cardNumber ?? ""}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreated(null)}>Done</Button>
            <Button onClick={() => { const id = created?.member.id; setCreated(null); if (id) navigate(`/loyalty/members/${id}`); }}>Open member</Button>
          </>
        }
      >
        {created && (
          <div className="space-y-3 text-sm">
            <p className="m-0 text-ink-soft">
              {created.notified.sent
                ? `Their sign-in details were sent by ${created.notified.channel === "email" ? "email" : "SMS"}.`
                : "The message couldn't be sent. Give them these details yourself:"}
            </p>
            <dl className="m-0 space-y-2 rounded-lg bg-surface-2 p-3">
              <div className="flex justify-between gap-3"><dt className="text-brand-muted">Sign in with</dt><dd className="m-0 font-medium text-brand-ink">{created.member.email || fmtPhone(created.member.phone1)}</dd></div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-brand-muted">Temporary password</dt>
                <dd className="m-0 flex items-center gap-2 font-mono font-semibold text-brand-ink">
                  {created.temporaryPassword}
                  <button type="button" aria-label="Copy password" onClick={() => { void navigator.clipboard?.writeText(created.temporaryPassword); toast.success("Copied"); }} className="text-brand-muted hover:text-brand-ink"><FiCopy aria-hidden="true" /></button>
                </dd>
              </div>
            </dl>
            <p className="m-0 text-xs text-brand-muted">It's shown only once. They choose their own password at first sign-in.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClubMembers;
