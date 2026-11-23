import { useMemo, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { FiBarChart2, FiBox, FiChevronRight, FiCreditCard, FiImage, FiUsers } from "react-icons/fi";
import { SearchBox } from "../../ui/Field";
import { EmptyState, PageHeader } from "../../ui/Page";

type Report = { name: string; path: string; about: string };
type Group = { name: string; icon: ComponentType<{ className?: string }>; reports: Report[] };

const GROUPS: Group[] = [
  {
    name: "Sales",
    icon: FiBarChart2,
    reports: [
      { name: "Daily sales summary", path: "/reports/daily-sales-summary", about: "One store, one day: takings, payment methods, every sale." },
      { name: "Period sales summary", path: "/reports/period-sales-summary", about: "Sales for a store over any period, day by day." },
      { name: "Store sales comparison", path: "/reports/store-sales-comparison", about: "How each store did over the same period." },
      { name: "Product performance", path: "/reports/product-performance", about: "Units, revenue and price for one product." },
      { name: "Massage services", path: "/reports/massage-services-report", about: "Service sales and the best-performing services." },
    ],
  },
  {
    name: "Inventory",
    icon: FiBox,
    reports: [
      { name: "Stock levels", path: "/reports/store-stock-level-analysis", about: "Low, healthy and overstocked items in a store." },
      { name: "Stock movement", path: "/reports/store-stock-movement-analysis", about: "Stock in, out, transfers and adjustments." },
      { name: "Suppliers", path: "/reports/supplier-analysis", about: "What each supplier delivered, what's paid and owed." },
    ],
  },
  {
    name: "Expenses",
    icon: FiCreditCard,
    reports: [{ name: "Expense report", path: "/reports/expense-report", about: "Branch spending by category for any period." }],
  },
  {
    name: "Exhibitions",
    icon: FiImage,
    reports: [
      { name: "Exhibition revenue comparison", path: "/reports/exhibition-revenue-comparison", about: "Revenue across exhibitions side by side." },
      { name: "Exhibition sales", path: "/reports/exhibition-sales-summary", about: "Every sale made at an exhibition." },
      { name: "Exhibition expenses", path: "/reports/exhibition-expenses-summary", about: "What an exhibition cost, by category." },
    ],
  },
  {
    name: "People",
    icon: FiUsers,
    reports: [{ name: "Attendance", path: "/hr/attendance", about: "Who was in, late or absent, per day." }],
  },
];

/** All reports, grouped, with search. Every report can be exported as a branded PDF. */
const ReportsComponent = () => {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return GROUPS;
    return GROUPS.map((g) => ({ ...g, reports: g.reports.filter((r) => `${g.name} ${r.name} ${r.about}`.toLowerCase().includes(s)) })).filter((g) => g.reports.length);
  }, [q]);

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader title="Reports" description="Pick a report, set the filters, and export it as a PDF with the company letterhead." actions={<SearchBox value={q} onChange={setQ} placeholder="Find a report" label="Find a report" />} />
      {!groups.length ? (
        <EmptyState title={`No report matches “${q}”`} />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.name} aria-labelledby={`rg-${g.name}`}>
              <h2 id={`rg-${g.name}`} className="m-0 mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">
                <g.icon className="h-4 w-4" aria-hidden="true" /> {g.name}
              </h2>
              <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {g.reports.map((r) => (
                  <li key={r.path}>
                    <Link to={r.path} className="group flex h-full items-start gap-3 rounded-xl border border-line bg-surface p-4 no-underline shadow-card transition-colors hover:border-brand/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-brand-ink">{r.name}</span>
                        <span className="mt-1 block text-sm text-brand-muted">{r.about}</span>
                      </span>
                      <FiChevronRight aria-hidden="true" className="mt-1 flex-none text-brand-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-text" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsComponent;
