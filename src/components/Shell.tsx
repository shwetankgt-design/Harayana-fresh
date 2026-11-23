import { NavLink } from "react-router-dom";
import { LayoutDashboard, UserCircle2, Users, Sprout, BookOpen, RefreshCw, Gauge, Menu, X, ChevronDown, Check, PackageSearch, Search, ClipboardList, Gavel, Activity, Boxes, Receipt, HandCoins, Landmark, MessagesSquare, Megaphone, ShieldAlert, TrendingUp, Satellite, Sparkles, FileBarChart, Target, Layers, BadgeCheck, UserPlus, Map as MapIcon, Warehouse, Database } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ROLES, useRole } from "../lib/role";

const ALL_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["farmer", "pg_manager", "packhouse", "buyer", "pmu", "admin"] },
  { to: "/shep-plan", label: "SHEP Market & Business Plan", icon: Target, roles: ["farmer", "pg_manager", "buyer", "pmu", "admin"] },
  { to: "/geo-view", label: "Geo Single View (Map)", icon: MapIcon, roles: ["pmu", "admin"] },
  { to: "/farmer-registry", label: "Farmer Registry", icon: UserPlus, roles: ["pg_manager", "pmu", "admin"] },
  { to: "/assets", label: "Asset Registry", icon: Warehouse, roles: ["packhouse", "pmu", "admin"] },
  { to: "/profile", label: "Farmer / PG Profile", icon: UserCircle2, roles: ["farmer", "pg_manager", "pmu", "admin"] },
  { to: "/members", label: "PG Member Management", icon: Users, roles: ["pg_manager", "pmu", "admin"] },
  { to: "/crop-plans", label: "Crop Plans", icon: Sprout, roles: ["farmer", "pg_manager", "pmu", "admin"] },
  { to: "/production-plan", label: "PG Production & Marketing Plan", icon: Layers, roles: ["pg_manager", "pmu", "admin"] },
  { to: "/listings", label: "Marketplace Listings", icon: PackageSearch, roles: ["pg_manager", "packhouse", "pmu", "admin"] },
  { to: "/quality-check", label: "Haryana Fresh Quality Check", icon: BadgeCheck, roles: ["packhouse", "pmu", "admin"] },
  { to: "/marketplace", label: "Marketplace Discovery", icon: Search, roles: ["buyer", "pmu", "admin"] },
  { to: "/auctions", label: "Auctions & Bulk Bidding", icon: Gavel, roles: ["pg_manager", "packhouse", "buyer", "pmu", "admin"] },
  { to: "/orders", label: "Orders & Fulfilment", icon: ClipboardList, roles: ["pg_manager", "packhouse", "buyer", "pmu", "admin"] },
  { to: "/price-board", label: "Live Price & Order Board", icon: Activity, roles: ["pg_manager", "packhouse", "buyer", "pmu", "admin"] },
  { to: "/market-signals", label: "Market Signals & Advisory", icon: TrendingUp, roles: ["farmer", "pg_manager", "buyer", "pmu", "admin"] },
  { to: "/field-data", label: "Field Data (Simulated)", icon: Satellite, roles: ["farmer", "pg_manager", "pmu", "admin"] },
  { to: "/forecast", label: "Demand Forecast & Next Season", icon: Sparkles, roles: ["farmer", "pg_manager", "pmu", "admin"] },
  { to: "/inventory", label: "Inventory & Lot Tracking", icon: Boxes, roles: ["farmer", "pg_manager", "packhouse", "buyer", "pmu", "admin"] },
  { to: "/transactions", label: "Transaction Archive", icon: Receipt, roles: ["pg_manager", "packhouse", "buyer", "pmu", "admin"] },
  { to: "/benefits", label: "Benefit / DBT Status", icon: HandCoins, roles: ["farmer", "pg_manager"] },
  { to: "/benefit-disbursal", label: "Benefit Disbursal - Consolidated", icon: Landmark, roles: ["pmu", "admin"] },
  { to: "/community", label: "E-Community", icon: MessagesSquare, roles: ["farmer", "pg_manager", "packhouse", "buyer", "pmu", "admin"] },
  { to: "/advisories", label: "Advisories & Notices", icon: Megaphone, roles: ["farmer", "pg_manager", "packhouse", "buyer", "pmu", "admin"] },
  { to: "/moderation", label: "Content Moderation", icon: ShieldAlert, roles: ["pmu", "admin"] },
  { to: "/programmes", label: "Programme Repository", icon: BookOpen, roles: ["farmer", "pg_manager", "packhouse", "buyer", "pmu", "admin"] },
  { to: "/mis-dashboard", label: "MIS Dashboard", icon: LayoutDashboard, roles: ["pmu", "admin"] },
  { to: "/reports", label: "Reports & Export", icon: FileBarChart, roles: ["pmu", "admin"] },
  { to: "/data-quality", label: "Data Completeness", icon: Gauge, roles: ["pmu", "admin"] },
  { to: "/sync-status", label: "Integration Sync Status", icon: RefreshCw, roles: ["pmu", "admin"] },
  { to: "/master-data", label: "Haryana Master Data", icon: Database, roles: ["pmu", "admin"] },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-4">
      <div className="grid place-items-center w-9 h-9 rounded-lg bg-gt-orange text-white font-bold text-lg shadow">
        H
      </div>
      <div className="leading-tight">
        <div className="text-white font-bold text-sm">Haryana Fresh</div>
        <div className="text-white/60 text-[10px] font-medium tracking-wide">DIGITAL PLATFORM</div>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useRole();
  const items = ALL_NAV.filter((n) => n.roles.includes(role.id));
  return (
    <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "bg-white text-gt-purple shadow" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`
          }
        >
          <item.icon size={18} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function RoleSwitcher() {
  const { role, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-lg pl-2 pr-3 py-1.5 border border-black/10 bg-white hover:bg-gt-purple/5 transition-colors"
      >
        <div className="grid place-items-center w-7 h-7 rounded-full bg-gt-purple text-white text-xs font-semibold shrink-0">
          {role.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        <div className="text-left leading-tight hidden sm:block">
          <div className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">{role.name}</div>
          <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{role.title}</div>
        </div>
        <ChevronDown size={16} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-black/10 bg-white shadow-lg z-40 overflow-hidden">
          <div className="px-3 py-2 border-b border-black/5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Switch Role
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRole(r);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gt-purple/5 transition-colors"
              >
                <div className="grid place-items-center w-7 h-7 rounded-full bg-gt-purple/10 text-gt-purple text-xs font-semibold shrink-0">
                  {r.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{r.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{r.title}</div>
                </div>
                {r.id === role.id && <Check size={16} className="text-gt-orange shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-gradient-to-b from-gt-purple-dark to-gt-purple flex-col fixed inset-y-0 z-10">
        <Logo />
        <NavList />
        <div className="p-3 border-t border-white/10">
          <div className="text-white/30 text-[10px] text-center">Prepared by Grant Thornton Bharat</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-20 bg-gt-purple flex items-center justify-between px-3 py-2.5 shadow">
        <Logo />
        <div className="flex items-center gap-1.5">
          <RoleSwitcher />
          <button onClick={() => setMobileOpen(true)} className="text-white p-2">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-gradient-to-b from-gt-purple-dark to-gt-purple flex flex-col h-full">
            <div className="flex items-center justify-between">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="text-white p-2 mr-2">
                <X size={20} />
              </button>
            </div>
            <NavList onNavigate={() => setMobileOpen(false)} />
            <div className="p-3 border-t border-white/10">
              <div className="text-white/30 text-[10px] text-center">Prepared by Grant Thornton Bharat</div>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 lg:ml-64 min-w-0 pt-16 lg:pt-0">
        {/* Desktop top bar with role switcher */}
        <div className="hidden lg:flex items-center justify-end px-6 py-3 border-b border-black/5 bg-white/60 backdrop-blur">
          <RoleSwitcher />
        </div>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
