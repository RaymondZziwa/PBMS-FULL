import { useMemo, useState } from "react";
import { FiCheckCircle, FiEdit2, FiPlus, FiRefreshCw, FiSearch, FiTrash2 } from "react-icons/fi";
import { apiRequest } from "../../../libs/apiConfig";
import type { IBillingChannel } from "../../../redux/types/systemSettings";
import useBillingChannels from "../../../hooks/settings/useBillingChannels";
import { BILLING_CHANNELS } from "../../../endpoints/expense/expenseEndpoints";
import AddOrModifyBillingChannel from "./AddorModify";
import VerifyMeterModal from "./verifyChannelModal";
import { apiErrorMessage, btn, Modal, Spinner, UtilityBadge, VerifiedBadge } from "./billingShared";

type Filter = "all" | "verified" | "unverified";

const iconBtn =
  "inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand-muted hover:bg-[#EEF1F8] hover:text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand";

const formatDate = (d: string | Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const BillingChannelsManagement = () => {
  const { data, loading, error, refresh } = useBillingChannels();
  const channels: IBillingChannel[] = Array.isArray(data) ? data : [];

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [formChannel, setFormChannel] = useState<IBillingChannel | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [verifyChannel, setVerifyChannel] = useState<IBillingChannel | null>(null);
  const [deleteChannel, setDeleteChannel] = useState<IBillingChannel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: channels.length,
      verified: channels.filter((c) => c.isVerified).length,
      unverified: channels.filter((c) => !c.isVerified).length,
    }),
    [channels]
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return channels.filter((c) => {
      if (filter === "verified" && !c.isVerified) return false;
      if (filter === "unverified" && c.isVerified) return false;
      if (!q) return true;
      return [c.meterNumber, c.name ?? "", c.area ?? "", c.utility === "NWSC" ? "nwsc water" : "uedcl electricity light yaka"]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [channels, query, filter]);

  const openCreate = () => {
    setFormChannel(null);
    setFormOpen(true);
  };
  const openEdit = (c: IBillingChannel) => {
    setFormChannel(c);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteChannel || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiRequest(BILLING_CHANNELS.DELETE(deleteChannel.id), "DELETE");
      setDeleteChannel(null);
      refresh();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "Couldn't delete the billing channel."));
    } finally {
      setDeleting(false);
    }
  };

  const actions = (c: IBillingChannel) => (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => setVerifyChannel(c)}
        className={c.isVerified ? iconBtn : "inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#EEF2FA] px-3 text-sm font-semibold text-brand hover:bg-[#E2E9F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"}
        aria-label={c.isVerified ? `Verify ${c.meterNumber} again` : `Verify ${c.meterNumber}`}
        title={c.isVerified ? "Verify again" : "Verify"}
      >
        <FiCheckCircle aria-hidden="true" className="h-[18px] w-[18px]" />
        {!c.isVerified && <span>Verify</span>}
      </button>
      <button type="button" onClick={() => openEdit(c)} className={iconBtn} aria-label={`Edit ${c.meterNumber}`} title="Edit">
        <FiEdit2 aria-hidden="true" className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        onClick={() => {
          setDeleteError(null);
          setDeleteChannel(c);
        }}
        className={`${iconBtn} hover:bg-[#FDF0EE] hover:text-[#B42318]`}
        aria-label={`Delete ${c.meterNumber}`}
        title="Delete"
      >
        <FiTrash2 aria-hidden="true" className="h-[18px] w-[18px]" />
      </button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] font-inter">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 font-display text-2xl font-semibold text-brand-ink">Billing channels</h1>
          <p className="m-0 mt-1 text-sm text-brand-muted">Water and electricity accounts the company pays. Verify each one before paying bills to it.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => refresh()} className={btn.secondary} aria-label="Refresh list">
            <FiRefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button type="button" onClick={openCreate} className={btn.primary}>
            <FiPlus aria-hidden="true" className="h-4 w-4" />
            Add channel
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Show" className="flex h-10 w-fit items-center rounded-lg border border-[#DDE1EA] bg-white p-1">
          {(["all", "unverified", "verified"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`h-8 rounded-md px-3 text-sm ${filter === f ? "bg-brand font-semibold text-white" : "font-medium text-brand-muted hover:text-brand-ink"}`}
            >
              {f === "all" ? "All" : f === "verified" ? "Verified" : "Not verified"} <span className="tabular-nums opacity-80">({counts[f]})</span>
            </button>
          ))}
        </div>
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-[#DDE1EA] bg-white px-3 md:w-72 focus-within:border-brand">
          <FiSearch aria-hidden="true" className="h-4 w-4 text-brand-muted" />
          <span className="sr-only">Search billing channels</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number, name, area"
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {error && !loading && channels.length === 0 && (
        <div role="alert" className="mb-4 rounded-xl border border-[#F3C9C2] bg-[#FDF0EE] px-4 py-3 text-sm text-[#8A2A1C]">
          Couldn't load billing channels.{" "}
          <button type="button" onClick={() => refresh()} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white">
        {loading && channels.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-brand-muted">
            <Spinner /> Loading billing channels…
          </div>
        ) : shown.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="m-0 text-sm font-medium text-brand-ink">{channels.length === 0 ? "No billing channels yet" : "Nothing matches"}</p>
            <p className="m-0 mt-1 text-sm text-brand-muted">
              {channels.length === 0 ? "Add the company's water and electricity accounts to pay their bills from PBMS." : "Try a different search or filter."}
            </p>
            {channels.length === 0 && (
              <button type="button" onClick={openCreate} className={`${btn.primary} mt-4`}>
                <FiPlus aria-hidden="true" className="h-4 w-4" /> Add channel
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / tablet table */}
            <table className="hidden w-full text-sm md:table">
              <thead className="bg-[#F7F8FB] text-left text-xs text-brand-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Utility</th>
                  <th className="px-3 py-3 font-semibold">Number</th>
                  <th className="px-3 py-3 font-semibold">Account holder / label</th>
                  <th className="px-3 py-3 font-semibold">Area</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Added</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id} className="border-t border-[#EEF0F5]">
                    <td className="px-5 py-3">
                      <UtilityBadge utility={c.utility} />
                    </td>
                    <td className="px-3 py-3 font-mono text-[13px] tracking-wide text-brand-ink">{c.meterNumber}</td>
                    <td className="max-w-[220px] truncate px-3 py-3">{c.name || <span className="text-brand-muted">—</span>}</td>
                    <td className="px-3 py-3">{c.area || <span className="text-brand-muted">—</span>}</td>
                    <td className="px-3 py-3">
                      <VerifiedBadge verified={c.isVerified} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-brand-muted">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-2">{actions(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phone cards */}
            <ul className="m-0 list-none divide-y divide-[#EEF0F5] p-0 md:hidden">
              {shown.map((c) => (
                <li key={c.id} className="flex flex-col gap-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <UtilityBadge utility={c.utility} />
                    <VerifiedBadge verified={c.isVerified} />
                  </div>
                  <div>
                    <p className="m-0 font-mono text-[15px] tracking-wide text-brand-ink">{c.meterNumber}</p>
                    <p className="m-0 mt-0.5 text-sm text-brand-muted">
                      {[c.name, c.area].filter(Boolean).join(" · ") || "No name yet"}
                    </p>
                  </div>
                  {actions(c)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <AddOrModifyBillingChannel
        visible={formOpen}
        channel={formChannel}
        onCancel={() => setFormOpen(false)}
        onSuccess={() => {
          setFormOpen(false);
          refresh();
        }}
      />

      <VerifyMeterModal visible={!!verifyChannel} channel={verifyChannel} onClose={() => setVerifyChannel(null)} onSuccess={() => refresh()} />

      {deleteChannel && (
        <Modal
          title="Delete billing channel?"
          onClose={() => setDeleteChannel(null)}
          busy={deleting}
          footer={
            <>
              <button type="button" className={btn.secondary} onClick={() => setDeleteChannel(null)} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className={btn.danger} onClick={confirmDelete} disabled={deleting}>
                {deleting && <Spinner />}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </>
          }
        >
          <p className="m-0 text-sm text-[#2B3240]">
            <strong>{deleteChannel.name || deleteChannel.meterNumber}</strong> ({deleteChannel.utility === "NWSC" ? "water" : "electricity"},{" "}
            {deleteChannel.meterNumber}) will be removed. Bills can no longer be paid to it from PBMS. This can't be undone.
          </p>
          {deleteError && (
            <div role="alert" className="mt-4 rounded-lg border border-[#F3C9C2] bg-[#FDF0EE] px-3.5 py-2.5 text-sm text-[#8A2A1C]">
              {deleteError}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default BillingChannelsManagement;
