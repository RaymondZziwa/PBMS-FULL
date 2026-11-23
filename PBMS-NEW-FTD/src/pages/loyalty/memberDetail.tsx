import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiCopy, FiEdit2, FiFileText, FiKey, FiPauseCircle, FiPlayCircle, FiSlash, FiTrash2, FiX, FiGrid, FiRefreshCw } from "react-icons/fi";
import { toast } from "sonner";
import { apiRequest } from "../../libs/apiConfig";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";
import { useConfirm } from "../../ui/ConfirmDialog";
import { Card, EmptyState, SkeletonRows } from "../../ui/Page";
import { CLUB, fmtPhone, openAttachment, STATUS, type Member } from "./clubApi";
import { Avatar, StatusBadge } from "./members";
import MemberForm from "./memberForm";

const money = (n: number) => `UGX ${Math.round(n).toLocaleString("en-US")}`;
const date = (d?: string | null) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[140px_1fr] gap-3 py-2 text-sm">
    <dt className="text-brand-muted">{label}</dt>
    <dd className="m-0 min-w-0 break-words text-brand-ink">{children || "—"}</dd>
  </div>
);

type Credentials = { title: string; password: string; notified?: { channel: string; sent: boolean }; signIn: string };

/** One member: profile, documents, payments and the decisions staff can make. */
const ClubMemberDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [m, setM] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState<{ action: "reject" | "suspend" | "deactivate"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiRequest<{ data: Member }>(CLUB.member(id!));
      setM(r.data);
    } catch {
      setM(null);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !m) return <div className="mx-auto max-w-5xl"><Card><SkeletonRows rows={8} /></Card></div>;
  if (!m) return <div className="mx-auto max-w-5xl"><Card><EmptyState title="Member not found" action={<Link to="/loyalty/members"><Button variant="secondary">Back to members</Button></Link>} /></Card></div>;

  const signIn = m.email ?? fmtPhone(m.phone1);

  const approve = () =>
    confirm({
      title: `Approve ${m.name}?`,
      message: "They get a card number and a temporary password by email or SMS, then pay the registration fee in the app to activate.",
      confirmLabel: "Approve",
      onConfirm: async () => {
        const r = await apiRequest<{ data: { member: Member; temporaryPassword: string; notified: { channel: string; sent: boolean } } }>(CLUB.action(m.id, "approve"), "POST");
        setM({ ...m, ...r.data.member });
        setCreds({ title: "Application approved", password: r.data.temporaryPassword, notified: r.data.notified, signIn });
      },
    });

  const resetPassword = () =>
    confirm({
      title: `Reset ${m.firstName}'s password?`,
      message: "Their current password stops working and they're signed out. They'll get a temporary one.",
      confirmLabel: "Reset password",
      onConfirm: async () => {
        const r = await apiRequest<{ data: { temporaryPassword: string; notified: { channel: string; sent: boolean } } }>(CLUB.action(m.id, "reset-password"), "POST");
        setCreds({ title: "Password reset", password: r.data.temporaryPassword, notified: r.data.notified, signIn });
      },
    });

  const reissueCard = () =>
    confirm({
      title: `Issue a new card code for ${m.firstName}?`,
      message: "Use this if the card was lost, copied or shared. The card number stays the same, but every older QR code (screenshots, printouts, other phones) stops working at once. The member's app shows the new code next time it opens.",
      tone: "danger",
      confirmLabel: "Issue new code",
      onConfirm: async () => {
        const r = await apiRequest<{ data: Member }>(CLUB.action(m.id, "reissue-card"), "POST");
        setM({ ...m, ...r.data });
      },
    });

  const reactivate = () =>
    confirm({
      title: `Reactivate ${m.name}?`,
      message: "They can sign in again.",
      confirmLabel: "Reactivate",
      onConfirm: async () => {
        const r = await apiRequest<{ data: Member }>(CLUB.action(m.id, "reactivate"), "POST", {});
        setM({ ...m, ...r.data });
      },
    });

  const remove = () =>
    confirm({
      title: `Delete ${m.name}?`,
      message: "Their profile, documents and tracker are deleted permanently. Payments stay in the wallet history.",
      tone: "danger",
      confirmLabel: "Delete member",
      onConfirm: async () => {
        await apiRequest(CLUB.member(m.id), "DELETE");
        navigate("/loyalty/members", { replace: true });
      },
    });

  const submitReason = async () => {
    if (!reason) return;
    if (reason.action === "reject" && !reason.text.trim()) return toast.error("Give a reason so the applicant knows what to fix");
    setBusy(true);
    try {
      const r = await apiRequest<{ data: Member | { member: Member } }>(CLUB.action(m.id, reason.action), "POST", { reason: reason.text.trim() });
      const updated = "member" in r.data ? r.data.member : r.data;
      setM({ ...m, ...updated });
      setReason(null);
    } catch {
      // toast shown
    } finally {
      setBusy(false);
    }
  };

  const actions: ReactNode[] = [];
  if (m.status === "PENDING") {
    actions.push(<Button key="a" icon={<FiCheck aria-hidden="true" />} onClick={approve}>Approve</Button>);
    actions.push(<Button key="r" variant="secondary" icon={<FiX aria-hidden="true" />} onClick={() => setReason({ action: "reject", text: "" })}>Reject</Button>);
  }
  if (m.status === "REJECTED") actions.push(<Button key="a" icon={<FiCheck aria-hidden="true" />} onClick={approve}>Approve after all</Button>);
  if (m.status === "ACTIVE" || m.status === "AWAITING_PAYMENT") {
    actions.push(<Button key="s" variant="secondary" icon={<FiPauseCircle aria-hidden="true" />} onClick={() => setReason({ action: "suspend", text: "" })}>Suspend</Button>);
    actions.push(<Button key="p" variant="secondary" icon={<FiKey aria-hidden="true" />} onClick={resetPassword}>Reset password</Button>);
    if (m.cardNumber) actions.push(<Button key="c" variant="secondary" icon={<FiRefreshCw aria-hidden="true" />} onClick={reissueCard}>Reissue card</Button>);
  }
  if (m.status === "SUSPENDED" || m.status === "DEACTIVATED") actions.push(<Button key="re" icon={<FiPlayCircle aria-hidden="true" />} onClick={reactivate}>Reactivate</Button>);
  if (!["PENDING", "REJECTED", "DEACTIVATED"].includes(m.status)) actions.push(<Button key="d" variant="secondary" icon={<FiSlash aria-hidden="true" />} onClick={() => setReason({ action: "deactivate", text: "" })}>Deactivate</Button>);

  return (
    <div className="mx-auto max-w-5xl font-inter">
      <Link to="/loyalty/members" className="mb-2 inline-flex min-h-[32px] items-center gap-1.5 text-sm text-brand-muted no-underline hover:text-brand-ink">
        <FiArrowLeft aria-hidden="true" /> Club members
      </Link>

      <Card className="mb-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar url={m.photoUrl} name={m.name} size="h-20 w-20" />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 font-display text-2xl font-semibold text-brand-ink">{m.title} {m.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-muted">
              <StatusBadge status={m.status} />
              {m.cardNumber && <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[13px] text-brand-ink">{m.cardNumber}</span>}
              <span>{STATUS[m.status].hint}</span>
            </div>
            {m.statusNote && <p className="m-0 mt-2 text-sm text-ink-soft">Note: {m.statusNote}</p>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {actions}
          <Button variant="secondary" icon={<FiEdit2 aria-hidden="true" />} onClick={() => setEditing(true)}>Edit details</Button>
          {(m.status === "ACTIVE" || m.status === "AWAITING_PAYMENT" || m.status === "SUSPENDED") && (
            <Link to={`/loyalty/tracker?member=${m.id}`}><Button variant="secondary" icon={<FiGrid aria-hidden="true" />}>Tracker</Button></Link>
          )}
          <Button variant="ghost" className="text-[#C0362C] sm:ml-auto" icon={<FiTrash2 aria-hidden="true" />} onClick={remove}>Delete</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h2 className="m-0 mb-2 text-base font-semibold text-brand-ink">Bio data</h2>
          <dl className="m-0 divide-y divide-line">
            <Row label={m.idType === "PASSPORT" ? "Passport" : "NIN"}><span className="font-mono">{m.idNumber}</span></Row>
            <Row label="Profession">{m.profession}</Row>
            <Row label="Telephone">{[fmtPhone(m.phone1), m.phone2 && fmtPhone(m.phone2)].filter(Boolean).join(" · ")}</Row>
            <Row label="Email">{m.email}</Row>
            <Row label="Country">{m.country}</Row>
            {m.country === "Uganda" && <Row label="District">{[m.district, m.county, m.subCounty].filter(Boolean).join(" › ")}</Row>}
            <Row label={m.country === "Uganda" ? "Village / street" : "Location"}>{m.address}</Row>
          </dl>
        </Card>
        <Card className="p-4 sm:p-5">
          <h2 className="m-0 mb-2 text-base font-semibold text-brand-ink">Membership</h2>
          <dl className="m-0 divide-y divide-line">
            <Row label="Applied">{date(m.createdAt)}</Row>
            <Row label="Approved">{date(m.approvedAt)}</Row>
            <Row label="Activated">{date(m.activatedAt)}</Row>
            <Row label="Last sign-in">{date(m.lastLoginAt)}</Row>
            <Row label="Signs in with">{signIn}</Row>
            {m.cardNumber && <Row label="Card QR checks">{m.cardChecks ? `${m.cardChecks} · last ${date(m.cardCheckedAt)}` : "Never scanned"}{(m.cardVersion ?? 1) > 1 ? ` · code reissued ${(m.cardVersion ?? 1) - 1}×` : ""}</Row>}
            {(m.status === "ACTIVE" || m.status === "AWAITING_PAYMENT") && <Row label="Password">{m.mustChangePassword ? "Temporary (not changed yet)" : "Set by the member"}</Row>}
          </dl>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="m-0 mb-3 text-base font-semibold text-brand-ink">Next of kin</h2>
          {!m.nextOfKin?.length ? (
            <p className="m-0 text-sm text-brand-muted">None recorded.</p>
          ) : (
            <ol className="m-0 list-none space-y-3 p-0">
              {m.nextOfKin.map((k) => (
                <li key={k.id ?? k.position} className="rounded-lg bg-surface-2 p-3 text-sm">
                  <p className="m-0 font-medium text-brand-ink">{k.fullName} <span className="font-normal text-brand-muted">· {k.relationship}</span></p>
                  <p className="m-0 mt-0.5 text-ink-soft">{[fmtPhone(k.phone), k.email, k.profession, k.address].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="m-0 mb-3 text-base font-semibold text-brand-ink">Documents</h2>
          {!m.attachments?.length ? (
            <p className="m-0 text-sm text-brand-muted">No documents attached.</p>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {m.attachments.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => openAttachment(m.id, a.id)} className="flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left text-sm hover:bg-surface-2">
                    <FiFileText aria-hidden="true" className="flex-none text-brand-text" />
                    <span className="min-w-0 flex-1 truncate text-brand-ink">{a.label}</span>
                    <span className="text-xs text-brand-muted">{a.mimeType === "application/pdf" ? "PDF" : "Image"} · {(a.size / 1024).toFixed(0)} KB</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 sm:p-5 lg:col-span-2">
          <h2 className="m-0 mb-3 text-base font-semibold text-brand-ink">Payments</h2>
          {!m.payments?.length ? (
            <p className="m-0 text-sm text-brand-muted">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-brand-muted">
                    <th className="py-2 pr-3 font-semibold">Date</th>
                    <th className="py-2 pr-3 font-semibold">For</th>
                    <th className="py-2 pr-3 font-semibold">Phone</th>
                    <th className="py-2 pr-3 text-right font-semibold">Charged</th>
                    <th className="py-2 pr-3 text-right font-semibold">To wallet</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {m.payments.map((p) => (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="py-2 pr-3 text-ink-soft">{date(p.createdAt)}</td>
                      <td className="py-2 pr-3 text-ink-soft">{p.purpose === "REGISTRATION" ? "Registration fee" : p.purpose}</td>
                      <td className="py-2 pr-3 text-ink-soft">{fmtPhone(p.phone)}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-ink-soft">{money(Number(p.totalCharged))}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-brand-ink">{money(Number(p.baseAmount))}</td>
                      <td className="py-2 text-ink-soft">{p.status === "SUCCESSFUL" ? "Paid" : p.status === "FAILED" ? "Failed" : "Waiting"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <MemberForm open={editing} member={m} onClose={() => setEditing(false)} onSaved={(u) => setM({ ...m, ...u })} />

      <Modal
        open={!!reason}
        onClose={() => setReason(null)}
        locked={busy}
        size="sm"
        title={reason?.action === "reject" ? "Reject application" : reason?.action === "suspend" ? `Suspend ${m.firstName}` : `Deactivate ${m.firstName}`}
        description={reason?.action === "reject" ? "The applicant is told the reason." : reason?.action === "suspend" ? "They're signed out and can't sign in until reactivated." : "Ends the membership. You can reactivate it later."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReason(null)} disabled={busy}>Cancel</Button>
            <Button variant={reason?.action === "suspend" ? "primary" : "danger"} loading={busy} onClick={submitReason}>
              {reason?.action === "reject" ? "Reject" : reason?.action === "suspend" ? "Suspend" : "Deactivate"}
            </Button>
          </>
        }
      >
        <label htmlFor="club-reason" className="mb-1.5 block text-[13px] font-medium text-ink-soft">
          Reason {reason?.action === "reject" ? <span className="text-[#C0362C]">*</span> : <span className="font-normal text-brand-muted">(optional)</span>}
        </label>
        <textarea id="club-reason" data-autofocus rows={4} value={reason?.text ?? ""} onChange={(e) => setReason((r) => (r ? { ...r, text: e.target.value } : r))} className="themed w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-brand-ink outline-none focus:border-brand" />
      </Modal>

      <Modal
        open={!!creds}
        onClose={() => setCreds(null)}
        size="sm"
        title={creds?.title ?? ""}
        description={creds?.notified?.sent ? `Sign-in details were sent by ${creds.notified.channel}.` : "The message could not be sent. Give the member these details yourself."}
        footer={<Button onClick={() => setCreds(null)}>Done</Button>}
      >
        <dl className="m-0 space-y-3 text-sm">
          <div>
            <dt className="text-brand-muted">Signs in with</dt>
            <dd className="m-0 font-medium text-brand-ink">{creds?.signIn}</dd>
          </div>
          <div>
            <dt className="text-brand-muted">Temporary password</dt>
            <dd className="m-0 mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-surface-2 px-3 py-2 font-mono text-lg tracking-wider text-brand-ink">{creds?.password}</code>
              <Button variant="secondary" icon={<FiCopy aria-hidden="true" />} onClick={() => { void navigator.clipboard?.writeText(creds?.password ?? ""); toast.success("Copied"); }} aria-label="Copy password" />
            </dd>
          </div>
          <p className="m-0 text-xs text-brand-muted">This password is shown only now. The member must change it when they first sign in.</p>
        </dl>
      </Modal>
    </div>
  );
};

export default ClubMemberDetail;
