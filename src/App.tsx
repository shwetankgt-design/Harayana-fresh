import { useContext, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { ExecutiveShell } from "./components/ExecutiveShell";
import { ROLES, RoleContext, type Role } from "./lib/role";
import Home from "./modules/Home";
import Dashboard from "./modules/Dashboard";
import ExecutiveLogin from "./modules/ExecutiveLogin";
import ExecutiveDashboard from "./modules/ExecutiveDashboard";
import ProfileModule from "./modules/ProfileModule";
import MembersModule from "./modules/MembersModule";
import CropPlanModule from "./modules/CropPlanModule";
import ProgrammeModule from "./modules/ProgrammeModule";
import DataCompletenessModule from "./modules/DataCompletenessModule";
import SyncStatusModule from "./modules/SyncStatusModule";
import ListingsModule from "./modules/ListingsModule";
import MarketplaceModule from "./modules/MarketplaceModule";
import AuctionModule from "./modules/AuctionModule";
import OrdersModule from "./modules/OrdersModule";
import PriceBoardModule from "./modules/PriceBoardModule";
import InventoryModule from "./modules/InventoryModule";
import TransactionsModule from "./modules/TransactionsModule";
import BenefitsModule from "./modules/BenefitsModule";
import BenefitDisbursalModule from "./modules/BenefitDisbursalModule";
import CommunityModule from "./modules/CommunityModule";
import AdvisoryModule from "./modules/AdvisoryModule";
import ModerationModule from "./modules/ModerationModule";
import MarketSignalsModule from "./modules/MarketSignalsModule";
import FieldDataModule from "./modules/FieldDataModule";
import ForecastModule from "./modules/ForecastModule";
import MISDashboardModule from "./modules/MISDashboardModule";
import ReportsModule from "./modules/ReportsModule";
import ShepPlanModule from "./modules/ShepPlanModule";
import PgProductionPlanModule from "./modules/PgProductionPlanModule";
import QualityCheckModule from "./modules/QualityCheckModule";

function Protected({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}

const PMU_ROLE = ROLES.find((r) => r.id === "pmu")!;

function ExecutiveProtected({ children }: { children: React.ReactNode }) {
  const { setRole } = useContext(RoleContext);
  const authed = sessionStorage.getItem("hf_exec_auth") === "true";

  useEffect(() => {
    if (authed) setRole(PMU_ROLE);
  }, [authed, setRole]);

  if (!authed) return <Navigate to="/executive-login" replace />;
  return <ExecutiveShell>{children}</ExecutiveShell>;
}

export default function App() {
  const [role, setRole] = useState<Role>(ROLES[0]);
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/executive-login" element={<ExecutiveLogin />} />
        <Route path="/executive" element={<ExecutiveProtected><ExecutiveDashboard /></ExecutiveProtected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/profile" element={<Protected><ProfileModule /></Protected>} />
        <Route path="/members" element={<Protected><MembersModule /></Protected>} />
        <Route path="/crop-plans" element={<Protected><CropPlanModule /></Protected>} />
        <Route path="/programmes" element={<Protected><ProgrammeModule /></Protected>} />
        <Route path="/listings" element={<Protected><ListingsModule /></Protected>} />
        <Route path="/marketplace" element={<Protected><MarketplaceModule /></Protected>} />
        <Route path="/auctions" element={<Protected><AuctionModule /></Protected>} />
        <Route path="/orders" element={<Protected><OrdersModule /></Protected>} />
        <Route path="/price-board" element={<Protected><PriceBoardModule /></Protected>} />
        <Route path="/inventory" element={<Protected><InventoryModule /></Protected>} />
        <Route path="/transactions" element={<Protected><TransactionsModule /></Protected>} />
        <Route path="/benefits" element={<Protected><BenefitsModule /></Protected>} />
        <Route path="/benefit-disbursal" element={<Protected><BenefitDisbursalModule /></Protected>} />
        <Route path="/community" element={<Protected><CommunityModule /></Protected>} />
        <Route path="/advisories" element={<Protected><AdvisoryModule /></Protected>} />
        <Route path="/moderation" element={<Protected><ModerationModule /></Protected>} />
        <Route path="/market-signals" element={<Protected><MarketSignalsModule /></Protected>} />
        <Route path="/field-data" element={<Protected><FieldDataModule /></Protected>} />
        <Route path="/forecast" element={<Protected><ForecastModule /></Protected>} />
        <Route path="/mis-dashboard" element={<Protected><MISDashboardModule /></Protected>} />
        <Route path="/reports" element={<Protected><ReportsModule /></Protected>} />
        <Route path="/shep-plan" element={<Protected><ShepPlanModule /></Protected>} />
        <Route path="/production-plan" element={<Protected><PgProductionPlanModule /></Protected>} />
        <Route path="/quality-check" element={<Protected><QualityCheckModule /></Protected>} />
        <Route path="/data-quality" element={<Protected><DataCompletenessModule /></Protected>} />
        <Route path="/sync-status" element={<Protected><SyncStatusModule /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RoleContext.Provider>
  );
}
