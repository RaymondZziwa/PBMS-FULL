import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiAward, FiChevronRight, FiCreditCard, FiGrid, FiSettings, FiShoppingBag, FiUsers } from "react-icons/fi";
import { apiRequest } from "../../libs/apiConfig";
import { Card, PageHeader, StatTile } from "../../ui/Page";
import { CLUB, fmtPhone, type MemberRow, type MemberStatus } from "./clubApi";
import { Avatar } from "./members";

type Counts = Partial<Record<MemberStatus, number>>;
const money = (n: number) => `UGX ${Math.round(n).toLocaleString("en-US")}`;

const LINKS = [
  { to: "/loyalty/members", icon: FiUsers, title: "Club members", text: "Approve applications, view and edit profiles, suspend or deactivate accounts." },
  { to: "/loyalty/tracker", icon: FiGrid, title: "Performance tracker", text: "Fill in each member's quantities and receipts per lot, month by month." },
  { to: "/loyalty/orders", icon: FiShoppingBag, title: "Club orders", text: "Orders from the members' shop: prepare, dispatch, deliver." },
  { to: "/loyalty/wallet", icon: FiCreditCard, title: "Club wallet", text: "Registration fees and shop payments, and transfers to the company bank." },
  { to: "/loyalty/settings", icon: FiSettings, title: "Club settings", text: "Member discount in the shop and the store it sells from." },
];

/** Monk Loyalty Club at a glance. */
const LoyaltyClub = () => {
  const [counts, setCounts] = useState<Counts>({});
  const [pending, setPending] = useState<MemberRow[]>([]);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    apiRequest<{ data: { rows: MemberRow[]; counts: Counts } }>(`${CLUB.members}?status=PENDING&pageSize=5`)
      .then((r) => { setPending(r.data.rows); setCounts(r.data.counts); })
      .catch(() => undefined);
    apiRequest<{ data: { wallet: { balance: number } } }>(CLUB.wallet)
      .then((r) => setBalance(r.data.wallet.balance))
      .catch(() => undefined);
  }, []);

  const n = (s: MemberStatus) => counts[s] ?? 0;

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader title="Amatugunda Monk Club" description="Members apply in the Monk Club app; you approve them, track their performance and manage the club wallet here." />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Active members" value={n("ACTIVE")} />
        <StatTile label="Waiting for approval" value={n("PENDING")} />
        <StatTile label="Approved, not paid" value={n("AWAITING_PAYMENT")} />
        <StatTile label="Wallet balance" value={balance === null ? "—" : money(balance)} />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="group flex items-start gap-3 rounded-xl border border-line bg-surface p-4 no-underline shadow-card hover:border-brand/50">
            <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-subtle text-brand-text"><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-brand-ink">{title}</span>
              <span className="mt-0.5 block text-sm text-brand-muted">{text}</span>
            </span>
            <FiChevronRight aria-hidden="true" className="mt-1 text-brand-muted group-hover:text-brand-text" />
          </Link>
        ))}
      </div>

      <Card>
        <div className="flex items-center border-b border-line px-4 py-3">
          <h2 className="m-0 text-[15px] font-semibold text-brand-ink">New applications</h2>
          {n("PENDING") > pending.length && <Link to="/loyalty/members?status=PENDING" className="ml-auto text-sm text-brand-text no-underline hover:underline">See all {n("PENDING")}</Link>}
        </div>
        {!pending.length ? (
          <div className="flex items-center gap-3 p-5 text-sm text-brand-muted"><FiAward aria-hidden="true" className="h-5 w-5" /> No applications waiting.</div>
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {pending.map((m) => (
              <li key={m.id}>
                <Link to={`/loyalty/members/${m.id}`} className="flex items-center gap-3 px-4 py-3 text-inherit no-underline hover:bg-surface-2">
                  <Avatar url={m.photoUrl} name={m.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-brand-ink">{m.title} {m.name}</span>
                    <span className="block truncate text-xs text-brand-muted">{[fmtPhone(m.phone1), m.district ?? m.country].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="text-xs text-brand-muted">{new Date(m.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  <FiChevronRight aria-hidden="true" className="text-brand-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default LoyaltyClub;
