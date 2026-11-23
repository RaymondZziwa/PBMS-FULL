import { Link } from "react-router-dom";
import { FiAward, FiBarChart2, FiChevronRight, FiPackage, FiShoppingBag, FiUser } from "react-icons/fi";
import AppShell from "../components/AppShell";
import MemberCard from "../components/MemberCard";
import { Alert } from "../components/ui";
import { useAuth } from "../lib/auth";
import { phone } from "../lib/format";

const Home = () => {
  const { member } = useAuth();
  if (!member) return null;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      <p className="m-0 text-ink-muted">{greet},</p>
      <h1 className="m-0 font-display text-2xl font-semibold sm:text-3xl">{member.title} {member.firstName}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,440px)_1fr] lg:items-start">
        <div>
          <MemberCard m={member} />
          {member.cardNumber && <p className="m-0 mt-2 text-xs text-ink-muted">Show the QR code to Prof Bioresearch staff to check your membership.</p>}
        </div>
        <div className="space-y-3">
          {member.status === "AWAITING_PAYMENT" && (
            <Alert tone="warning" title="One step left">
              Pay the registration fee to activate your membership. <Link to="/pay" className="font-semibold text-inherit underline">Pay now</Link>
            </Alert>
          )}
          {[
            { to: "/shop", icon: FiShoppingBag, title: "Shop", text: "Prof Bioresearch products at the club price" },
            { to: "/leaderboard", icon: FiAward, title: "Leaderboard", text: "See where you rank this month and all time" },
            { to: "/tracker", icon: FiBarChart2, title: "Performance tracker", text: "Your monthly supplies and status" },
            { to: "/orders", icon: FiPackage, title: "My orders", text: "Follow your orders and payments" },
            { to: "/settings", icon: FiUser, title: "My details", text: `${phone(member.phone1)}${member.email ? ` · ${member.email}` : ""}` },
          ].map((l) => (
            <Link key={l.to} to={l.to} className="card flex items-center gap-4 p-4 text-ink no-underline transition hover:border-brand/50">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-subtle text-brand-text"><l.icon aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{l.title}</span>
                <span className="block truncate text-sm text-ink-muted">{l.text}</span>
              </span>
              <FiChevronRight className="text-ink-muted" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
};

export default Home;
