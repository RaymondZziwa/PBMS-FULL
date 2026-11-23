import { useEffect, useState } from "react";
import { FiAward, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import AppShell from "../components/AppShell";
import { Alert, Spinner, cx } from "../components/ui";
import { api, fileUrl } from "../lib/api";
import { initials, qty } from "../lib/format";
import type { Leaderboard as LB, LeaderRow } from "../lib/types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MEDAL = ["bg-[#F5C542] text-[#5C4300]", "bg-[#C9D1DB] text-[#2F3946]", "bg-[#D9A273] text-[#4A2A10]"];

const Avatar = ({ r, big }: { r: LeaderRow; big?: boolean }) => {
  const src = fileUrl(r.photoUrl);
  return (
    <span className={cx("flex flex-none items-center justify-center overflow-hidden rounded-full bg-subtle font-semibold text-brand-text", big ? "h-16 w-16 text-lg ring-4 ring-surface" : "h-10 w-10 text-sm")}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials(r.name)}
    </span>
  );
};

/** Members ranked by what they supplied: all time, or month by month. */
const Leaderboard = () => {
  const now = new Date();
  const [period, setPeriod] = useState<"all" | "month">("month");
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [data, setData] = useState<LB | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api<LB>(`/api/club/me/leaderboard?period=${period}&year=${ym.y}&month=${ym.m}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period, ym]);

  const shift = (by: number) => setYm(({ y, m }) => {
    const d = new Date(y, m - 1 + by, 1);
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  });
  const isCurrent = ym.y === now.getFullYear() && ym.m === now.getMonth() + 1;
  const top3 = data?.rows.slice(0, 3) ?? [];
  const rest = data?.rows.slice(3) ?? [];
  const meVisible = data?.rows.some((r) => r.isMe);

  return (
    <AppShell title="Leaderboard">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Period" className="inline-flex rounded-xl border border-line bg-surface p-1">
          {([["month", "Monthly"], ["all", "All time"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={period === v} onClick={() => setPeriod(v)} className={cx("h-9 rounded-lg px-4 text-sm font-semibold", period === v ? "bg-brand text-white" : "text-ink-muted")}>{l}</button>
          ))}
        </div>
        {period === "month" && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2"><FiChevronLeft aria-hidden="true" /></button>
            <span className="min-w-[130px] text-center font-semibold">{MONTHS[ym.m - 1]} {ym.y}</span>
            <button type="button" onClick={() => shift(1)} disabled={isCurrent} aria-label="Next month" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-30"><FiChevronRight aria-hidden="true" /></button>
          </div>
        )}
      </div>

      {error ? (
        <Alert tone="error">{error}</Alert>
      ) : loading && !data ? (
        <div className="flex justify-center py-16 text-brand"><Spinner className="h-8 w-8" /></div>
      ) : !data?.rows.length ? (
        <div className="card flex flex-col items-center p-10 text-center">
          <FiAward className="h-10 w-10 text-ink-muted" aria-hidden="true" />
          <p className="m-0 mt-3 font-semibold">No supplies recorded {period === "month" ? `in ${MONTHS[ym.m - 1]}` : "yet"}</p>
          <p className="m-0 mt-1 text-sm text-ink-muted">Rankings appear once Prof Bioresearch records deliveries in the tracker.</p>
        </div>
      ) : (
        <div className={loading ? "opacity-60" : ""}>
          {/* Podium */}
          <div className="mb-5 grid grid-cols-3 items-end gap-2 sm:gap-4">
            {[top3[1], top3[0], top3[2]].map((r, i) =>
              r ? (
                <div key={r.memberId} className={cx("flex flex-col items-center rounded-2xl border p-3 text-center", r.isMe ? "border-brand bg-subtle" : "border-line bg-surface", i === 1 ? "pb-6 pt-4" : "")}>
                  <div className="relative">
                    <Avatar r={r} big />
                    <span className={cx("absolute -bottom-1 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full text-sm font-bold shadow", MEDAL[r.rank - 1] ?? "bg-surface-2")}>{r.rank}</span>
                  </div>
                  <p className="m-0 mt-3 w-full truncate font-semibold">{r.isMe ? "You" : r.name}</p>
                  <p className="m-0 w-full truncate text-xs text-ink-muted">{r.place ?? ""}</p>
                  <p className="m-0 mt-1 font-display text-lg font-semibold tabular-nums text-brand-text">{qty(r.total)}</p>
                </div>
              ) : (
                <div key={i} />
              ),
            )}
          </div>

          {rest.length > 0 && (
            <ol className="card m-0 list-none divide-y divide-line p-0">
              {rest.map((r) => <Row key={r.memberId} r={r} />)}
            </ol>
          )}

          {data.me && !meVisible && (
            <div className="mt-4">
              <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Your position</p>
              <ol className="card m-0 list-none p-0"><Row r={data.me} /></ol>
            </div>
          )}
          {!data.me && <p className="m-0 mt-4 text-center text-sm text-ink-muted">You're not on the board {period === "month" ? "this month" : "yet"}. Deliveries recorded in your tracker count.</p>}
          <p className="m-0 mt-4 text-center text-xs text-ink-muted">{data.participants} member(s) ranked by total quantity supplied.</p>
        </div>
      )}
    </AppShell>
  );
};

const Row = ({ r }: { r: LeaderRow }) => (
  <li className={cx("flex items-center gap-3 px-4 py-3", r.isMe && "bg-subtle")}>
    <span className="w-8 text-center font-display text-lg font-semibold tabular-nums text-ink-muted">{r.rank}</span>
    <Avatar r={r} />
    <span className="min-w-0 flex-1">
      <span className="block truncate font-semibold">{r.isMe ? `${r.name} (you)` : r.name}</span>
      <span className="block truncate text-xs text-ink-muted">{[r.place, `${r.deliveries} deliver${r.deliveries === 1 ? "y" : "ies"}`].filter(Boolean).join(" · ")}</span>
    </span>
    <span className="font-semibold tabular-nums">{qty(r.total)}</span>
  </li>
);

export default Leaderboard;
