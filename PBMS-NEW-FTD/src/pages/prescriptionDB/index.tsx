import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiChevronLeft, FiChevronRight, FiClipboard, FiClock, FiExternalLink, FiImage, FiRefreshCw } from "react-icons/fi";
import useClientPrescription from "../../hooks/sales/usePrescriptions";
import type { IClientPrescription } from "../../redux/types/pbpd";
import { apiRequest, baseURL } from "../../libs/apiConfig";
import { SALESENDPOINTS } from "../../endpoints/sales/salesEndpoints";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";
import { SearchBox } from "../../ui/Field";
import { Badge, Card, EmptyState, initials, PageHeader, SkeletonRows, StatTile } from "../../ui/Page";
import ReviewModal from "./review";

type Filter = "pending" | "reviewed" | "all";
const PAGE = 20;

/** Images are stored as a JSON array of "/uploads/prescription/…" paths. */
const imagesOf = (p: IClientPrescription): string[] => {
  const raw = p.images as unknown;
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? (() => { try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [raw]; } catch { return [raw]; } })() : [];
  return list.filter((x): x is string => typeof x === "string" && !!x).map((u) => (u.startsWith("http") ? u : `${baseURL}${u}`));
};
const clientName = (p: IClientPrescription) => `${p.client?.firstName ?? ""} ${p.client?.lastName ?? ""}`.trim() || "Unknown client";
const byName = (p: IClientPrescription) => `${p.employee?.firstName ?? ""} ${p.employee?.lastName ?? ""}`.trim() || "—";
const fmt = (d: string | Date) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Client prescriptions sent in from the field, waiting for (or after) review. */
const ClientPrescriptionsManagement = () => {
  const { data, loading, refresh } = useClientPrescription();
  const prescriptions: IClientPrescription[] = data ?? [];
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<IClientPrescription | null>(null);
  const [img, setImg] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const pending = prescriptions.filter((p) => !p.isReviewed).length;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prescriptions.filter(
      (p) =>
        (filter === "all" || (filter === "pending" ? !p.isReviewed : p.isReviewed)) &&
        (!q || [clientName(p), p.client?.phone, byName(p), p.notes].some((v) => (v ?? "").toLowerCase().includes(q))),
    );
  }, [prescriptions, filter, query]);
  useEffect(() => setLimit(PAGE), [filter, query]);

  const images = open ? imagesOf(open) : [];

  // ← / → move through the images while the viewer is open.
  useEffect(() => {
    if (!open || reviewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setImg((i) => Math.min(images.length - 1, i + 1));
      if (e.key === "ArrowLeft") setImg((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, reviewing, images.length]);

  const submitReview = async (notes: string) => {
    if (!open) return;
    setSaving(true);
    try {
      await apiRequest(SALESENDPOINTS.CLIENT.review_prescription(String(open.id)), "PUT", "", { reviewNotes: notes });
      await refresh();
      setOpen({ ...open, isReviewed: true, reviewNotes: notes });
      setReviewing(false);
    } catch {
      // error shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl font-inter">
      <PageHeader
        title="Prescription database"
        description="Prescriptions captured for clients. Open one to see every page and record your review."
        actions={<Button variant="secondary" icon={<FiRefreshCw aria-hidden="true" />} onClick={() => refresh()}>Refresh</Button>}
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Waiting for review" value={pending} />
        <StatTile label="Reviewed" value={prescriptions.length - pending} />
        <StatTile label="All prescriptions" value={prescriptions.length} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:p-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Search client, phone or prescriber" label="Search prescriptions" />
          <div role="tablist" aria-label="Review status" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5 sm:ml-auto">
            {([
              ["pending", `Waiting (${pending})`],
              ["reviewed", "Reviewed"],
              ["all", "All"],
            ] as const).map(([v, l]) => (
              <button key={v} type="button" role="tab" aria-selected={filter === v} onClick={() => setFilter(v)} className={`h-10 rounded-md px-3 text-[13px] font-medium ${filter === v ? "bg-surface text-brand-ink shadow-card" : "text-brand-muted hover:text-brand-ink"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading && prescriptions.length === 0 ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<FiClipboard className="h-5 w-5" />} title={filter === "pending" ? "Nothing waiting for review" : "No prescriptions found"} message={filter === "pending" ? "New prescriptions from the field appear here." : "Try another search."} />
        ) : (
          <>
            <ul className="m-0 list-none divide-y divide-line p-0">
              {filtered.slice(0, limit).map((p) => {
                const n = imagesOf(p).length;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(p);
                        setImg(0);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                    >
                      <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-subtle text-[13px] font-semibold text-brand-text">
                        {initials(p.client?.firstName, p.client?.lastName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 font-medium text-brand-ink">
                          {clientName(p)}
                          {p.isReviewed ? <Badge tone="good">Reviewed</Badge> : <Badge tone="warn">Waiting</Badge>}
                        </span>
                        <span className="block truncate text-xs text-brand-muted">
                          {[p.client?.phone, `by ${byName(p)}`, fmt(p.createdAt)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="flex flex-none items-center gap-1 text-xs text-brand-muted">
                        <FiImage aria-hidden="true" /> {n}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {filtered.length > limit && (
              <div className="border-t border-line p-3 text-center">
                <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE)}>Show more ({filtered.length - limit} left)</Button>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        open={!!open && !reviewing}
        onClose={() => setOpen(null)}
        size="xl"
        title={open ? clientName(open) : ""}
        description={open ? [open.client?.phone, `prescribed by ${byName(open)}`, fmt(open.createdAt)].filter(Boolean).join(" · ") : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(null)}>Close</Button>
            <Button icon={<FiCheckCircle aria-hidden="true" />} onClick={() => setReviewing(true)}>
              {open?.isReviewed ? "Update review" : "Review"}
            </Button>
          </>
        }
      >
        {open && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              {images.length === 0 ? (
                <EmptyState icon={<FiImage className="h-5 w-5" />} title="No images attached" />
              ) : (
                <>
                  <div className="relative flex h-[52vh] items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2">
                    <img src={images[img]} alt={`Prescription page ${img + 1} of ${images.length}`} className="max-h-full max-w-full object-contain" />
                    {images.length > 1 && (
                      <>
                        <button type="button" aria-label="Previous page" disabled={img === 0} onClick={() => setImg(img - 1)} className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-brand-ink shadow-card disabled:opacity-30">
                          <FiChevronLeft aria-hidden="true" />
                        </button>
                        <button type="button" aria-label="Next page" disabled={img === images.length - 1} onClick={() => setImg(img + 1)} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-brand-ink shadow-card disabled:opacity-30">
                          <FiChevronRight aria-hidden="true" />
                        </button>
                      </>
                    )}
                    <a href={images[img]} target="_blank" rel="noreferrer" className="absolute right-2 top-2 flex h-9 items-center gap-1.5 rounded-lg bg-surface/90 px-2.5 text-xs font-medium text-brand-ink shadow-card">
                      <FiExternalLink aria-hidden="true" /> Full size
                    </a>
                  </div>
                  {images.length > 1 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {images.map((src, i) => (
                        <button key={src + i} type="button" onClick={() => setImg(i)} aria-label={`Page ${i + 1}`} aria-current={i === img} className={`h-16 w-16 flex-none overflow-hidden rounded-lg border-2 ${i === img ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"}`}>
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <aside className="space-y-4 text-sm">
              <div>
                <p className="m-0 mb-1 text-xs font-semibold uppercase tracking-wider text-brand-muted">Status</p>
                {open.isReviewed ? (
                  <Badge tone="good"><FiCheckCircle aria-hidden="true" /> Reviewed</Badge>
                ) : (
                  <Badge tone="warn"><FiClock aria-hidden="true" /> Waiting for review</Badge>
                )}
              </div>
              <div>
                <p className="m-0 mb-1 text-xs font-semibold uppercase tracking-wider text-brand-muted">Prescriber's notes</p>
                <p className="m-0 whitespace-pre-wrap text-ink-soft">{open.notes || "None"}</p>
              </div>
              <div>
                <p className="m-0 mb-1 text-xs font-semibold uppercase tracking-wider text-brand-muted">Review notes</p>
                <p className="m-0 whitespace-pre-wrap text-ink-soft">{open.reviewNotes || "Not reviewed yet"}</p>
              </div>
            </aside>
          </div>
        )}
      </Modal>

      <ReviewModal
        visible={reviewing}
        title={open ? `Review ${clientName(open)}'s prescription` : "Review prescription"}
        initialNotes={open?.reviewNotes ?? ""}
        onCancel={() => setReviewing(false)}
        onConfirm={submitReview}
        isSubmitting={saving}
      />
    </div>
  );
};

export default ClientPrescriptionsManagement;
