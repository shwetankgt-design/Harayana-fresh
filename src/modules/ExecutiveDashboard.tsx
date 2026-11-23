import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Activity,
  Sparkles,
  HandCoins,
  Boxes,
  TrendingUp,
  Map as MapIcon,
} from "lucide-react";
import GeoSingleViewModule from "./GeoSingleViewModule";
import { RoleContext, ROLES } from "../lib/role";
import Dashboard from "./Dashboard";
import PriceBoardModule from "./PriceBoardModule";
import ForecastModule from "./ForecastModule";
import BenefitsModule from "./BenefitsModule";
import InventoryModule from "./InventoryModule";

const PMU_ROLE = ROLES.find((r) => r.id === "pmu")!;
const KARNAL_PG_ROLE = ROLES.find((r) => r.id === "pg_manager")!; // scoped to PG-001, Karnal Kinnow-Vegetable Growers PG

const TABS = [
  {
    key: "overview",
    label: "Statewide Overview",
    icon: LayoutDashboard,
    role: PMU_ROLE,
    render: () => <Dashboard />,
  },
  {
    key: "geo",
    label: "Geo Single View",
    icon: MapIcon,
    role: PMU_ROLE,
    render: () => <GeoSingleViewModule />,
  },
  {
    key: "karnal-pg",
    label: "Karnal Kinnow-Vegetable Growers PG",
    icon: Users,
    role: KARNAL_PG_ROLE,
    render: () => <Dashboard />,
  },
  {
    key: "price-board",
    label: "Live Price & Order Status Board",
    icon: Activity,
    role: KARNAL_PG_ROLE,
    render: () => <PriceBoardModule />,
  },
  {
    key: "next-season",
    label: "Next Season Recommendation",
    icon: Sparkles,
    role: KARNAL_PG_ROLE,
    render: () => <ForecastModule />,
  },
  {
    key: "benefits",
    label: "Member Benefit / DBT Status",
    icon: HandCoins,
    role: KARNAL_PG_ROLE,
    render: () => <BenefitsModule />,
  },
  {
    key: "demand-forecast",
    label: "Demand Forecasting",
    icon: TrendingUp,
    role: PMU_ROLE,
    render: () => <ForecastModule />,
  },
  {
    key: "inventory",
    label: "Inventory & Lot Tracking",
    icon: Boxes,
    role: PMU_ROLE,
    render: () => <InventoryModule />,
  },
];

export default function ExecutiveDashboard() {
  const [active, setActive] = useState(TABS[0].key);
  const tab = TABS.find((t) => t.key === active)!;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              active === t.key
                ? "bg-gt-purple text-white shadow"
                : "bg-white text-slate-600 border border-border hover:border-gt-purple/40 hover:text-gt-purple"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <RoleContext.Provider value={{ role: tab.role, setRole: () => {} }}>
        {tab.render()}
      </RoleContext.Provider>
    </div>
  );
}
