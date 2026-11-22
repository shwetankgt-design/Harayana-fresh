import { Link } from "react-router-dom";
import {
  ArrowRight,
  Users,
  Sprout,
  Building2,
  Package,
  ShoppingCart,
  HandCoins,
  MessagesSquare,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  producerGroups,
  farmerMembers,
  packhouses,
  buyers,
  orders,
  listings,
  transactions,
  benefitRecords,
  communityPosts,
  DISTRICTS,
} from "../data/seed";
import { formatINR } from "../lib/format";

const MODULES = [
  {
    icon: Sprout,
    title: "Crops E-Market & Data Community Hub",
    body: "Unified farmer/PG profiles, crop plans and programme data, synced from Farm Trace and e-Girdwari.",
  },
  {
    icon: ShoppingCart,
    title: "Unified E-Marketplace & Trading Engine",
    body: "Listings, buyer discovery, matching, orders and auctions across retail, institutional and digital channels.",
  },
  {
    icon: Package,
    title: "Inventory, Transaction & Benefit Management",
    body: "Lot tracking from farm to dispatch, an auditable transaction archive, and DBT/benefit visibility via MFMB.",
  },
  {
    icon: MessagesSquare,
    title: "E-Community & Stakeholder Collaboration",
    body: "Moderated advisory space connecting farmers, PGs and the Department of Horticulture.",
  },
  {
    icon: Sparkles,
    title: "Market, Field Intelligence & Advisory",
    body: "Pre-market demand signals and a market feedback loop that informs next season's crop planning.",
  },
  {
    icon: ShieldCheck,
    title: "MIS, Dashboards & Reporting",
    body: "Jurisdiction-configurable dashboards and exportable reporting for PMU/DPMU oversight.",
  },
];

function Stat({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-white px-4 py-3.5 shadow-sm">
      <div className="grid place-items-center w-10 h-10 rounded-lg bg-gt-purple/10 text-gt-purple shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-xl font-bold text-ink leading-tight">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const totalGmv = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((a, o) => a + o.agreed_price_per_qtl * o.quantity_qtl, 0);
  const activeFarmers = farmerMembers.filter((f) => f.affiliation_status === "Active").length;
  const openListings = listings.filter((l) => l.status === "Active").length;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-gradient-to-b from-gt-purple-dark to-gt-purple">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid place-items-center w-9 h-9 rounded-lg bg-gt-orange text-white font-bold text-lg shadow">
              H
            </div>
            <div className="leading-tight">
              <div className="text-white font-bold text-sm">Haryana Fresh</div>
              <div className="text-white/60 text-[10px] font-medium tracking-wide">DIGITAL PLATFORM</div>
            </div>
          </div>
          <div className="text-white/50 text-xs font-medium hidden sm:block">Prepared by Grant Thornton Bharat</div>
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-8 pb-14">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-gt-orange bg-white/10 rounded-full px-3 py-1 mb-4">
            Department of Horticulture, Haryana
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-white max-w-2xl leading-tight">
            One connected platform for Haryana's horticulture value chain
          </h1>
          <p className="text-white/70 text-base max-w-xl mt-4 leading-relaxed">
            Producer Groups plan against real market demand, sell through a unified marketplace, and government sees
            the full value chain — farmer to buyer — in one place.
          </p>
          <div className="flex items-center flex-wrap gap-4 mt-7">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-gt-purple font-semibold text-sm rounded-lg px-5 py-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Open Application <ArrowRight size={16} />
            </Link>
            <Link
              to="/executive-login"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium underline underline-offset-4 decoration-white/30 hover:decoration-white/60 transition-colors"
            >
              Senior Leadership Access
            </Link>
          </div>
        </div>
      </header>

      {/* Live stats strip */}
      <div className="max-w-6xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={Users} value={String(activeFarmers)} label="Active Farmers / PG Members" />
          <Stat icon={Sprout} value={String(producerGroups.length)} label="Producer Groups" />
          <Stat icon={Building2} value={String(buyers.length)} label="Registered Buyers" />
          <Stat icon={Package} value={String(packhouses.length)} label="Linked Packhouses" />
        </div>
      </div>

      {/* Platform activity */}
      <div className="max-w-6xl mx-auto px-6 mt-10">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-bold text-ink">Platform activity to date</h2>
          <span className="text-xs text-slate-500">Across {DISTRICTS.length} Haryana districts</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={ShoppingCart} value={String(openListings)} label="Open Marketplace Listings" />
          <Stat icon={ShoppingCart} value={String(orders.length)} label="Orders Placed" />
          <Stat icon={HandCoins} value={formatINR(totalGmv)} label="Marketplace Transaction Value" />
          <Stat icon={MessagesSquare} value={String(communityPosts.length)} label="Community Posts & Advisories" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Stat icon={Package} value={String(transactions.length)} label="Audited Transaction Records" />
          <Stat icon={HandCoins} value={String(benefitRecords.length)} label="Benefit / DBT Records Linked" />
        </div>
      </div>

      {/* Modules */}
      <div className="max-w-6xl mx-auto px-6 mt-12 pb-16">
        <h2 className="text-base font-bold text-ink mb-4">Six modules, one connected value chain</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((m) => (
            <div key={m.title} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-gt-orange/10 text-gt-orange-dark mb-3">
                <m.icon size={17} />
              </div>
              <div className="text-sm font-semibold text-ink mb-1">{m.title}</div>
              <p className="text-xs text-slate-500 leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between flex-wrap gap-4 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
          <div>
            <div className="text-sm font-semibold text-ink">Ready to explore the platform</div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter the application and switch between all six personas from the top-right role switcher.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-gt-purple text-white font-semibold text-sm rounded-lg px-5 py-2.5 shadow hover:bg-gt-purple-dark transition-colors"
          >
            Open Application <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
