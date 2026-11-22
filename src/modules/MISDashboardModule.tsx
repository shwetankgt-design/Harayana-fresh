import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { LayoutDashboard, Boxes, HandCoins, MessagesSquare, PackageSearch } from "lucide-react";
import { Card, PageHeader, SectionHeader, StatCard } from "../components/ui";
import { useRole } from "../lib/role";
import {
  DISTRICTS,
  orders,
  listings,
  inventoryLots,
  benefitRecords,
  communityPosts,
  farmerMembers,
  producerGroups,
  listingById,
  logReportAccess,
} from "../data/seed";
import type { District, LotStage } from "../data/types";

const STAGE_COLORS: Record<LotStage, string> = {
  Harvested: "#a78bfa",
  "Received at Packhouse": "#f59e0b",
  Graded: "#38bdf8",
  Packed: "#7c3aed",
  Dispatched: "#fb923c",
  "Delivered to Buyer": "#16a34a",
};

export default function MISDashboardModule() {
  const { role } = useRole();
  const [district, setDistrict] = useState<District | "All Districts">("All Districts");

  useEffect(() => {
    logReportAccess(role.id, role.title, "overview", district, "Viewed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district]);

  const inDistrict = (d: District) => district === "All Districts" || d === district;

  const scoped = useMemo(() => {
    const districtOrders = orders.filter((o) => {
      const l = listingById(o.listing_id);
      return l && inDistrict(l.district) && o.status !== "Cancelled";
    });
    const districtListings = listings.filter((l) => inDistrict(l.district));
    const districtLots = inventoryLots.filter((l) => inDistrict(l.district));
    const districtBenefits = benefitRecords.filter((b) => inDistrict(b.district));
    const districtPosts = communityPosts.filter((p) => inDistrict(p.district));
    const districtFarmers = farmerMembers.filter((f) => inDistrict(f.district));
    const districtPgs = producerGroups.filter((p) => inDistrict(p.district));
    return { districtOrders, districtListings, districtLots, districtBenefits, districtPosts, districtFarmers, districtPgs };
  }, [district]);

  const orderValueByDistrict = useMemo(() => {
    const scope = DISTRICTS.filter(inDistrict);
    return scope.map((d) => {
      const value = orders
        .filter((o) => o.status !== "Cancelled" && listingById(o.listing_id)?.district === d)
        .reduce((s, o) => s + o.quantity_qtl * o.agreed_price_per_qtl, 0);
      return { district: d, value: Math.round(value / 1000) };
    });
  }, [district]);

  const lotStageData = useMemo(() => {
    const map = new Map<LotStage, number>();
    scoped.districtLots.forEach((l) => map.set(l.stage, (map.get(l.stage) ?? 0) + 1));
    return [...map.entries()].map(([stage, count]) => ({ stage, count }));
  }, [scoped]);

  const disbursedAmount = scoped.districtBenefits.reduce((s, b) => s + (b.amount_disbursed ?? 0), 0);
  const openPosts = scoped.districtPosts.filter((p) => p.resolution_status !== "Resolved").length;

  return (
    <div>
      <PageHeader
        title="MIS Dashboard - PMU / DPMU"
        subtitle="Jurisdiction-configurable view across marketplace, inventory, benefit and community activity"
        icon={<LayoutDashboard size={20} />}
      />

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm">
          <span className="subtle block mb-1">Jurisdiction (District)</span>
          <select className="input" value={district} onChange={(e) => setDistrict(e.target.value as District | "All Districts")}>
            <option>All Districts</option>
            {DISTRICTS.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Producer Groups" value={String(scoped.districtPgs.length)} sub={`${scoped.districtFarmers.length} farmers`} />
        <StatCard label="Marketplace Orders" value={String(scoped.districtOrders.length)} sub={`${scoped.districtListings.length} listings`} />
        <StatCard label="Benefit Disbursed" value={`Rs ${(disbursedAmount / 100000).toFixed(1)} L`} />
        <StatCard label="Open Community Threads" value={String(openPosts)} tone={openPosts > 0 ? "warn" : "good"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <SectionHeader title="Order Value by District" subtitle="Gross realised order value, Rs '000" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={orderValueByDistrict}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="district" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`Rs ${v}K`, "Value"]} />
              <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHeader title="Inventory Lots by Stage" subtitle="Current distribution across the traceability pipeline" />
          {lotStageData.length === 0 ? (
            <div className="subtle py-10 text-center">No inventory lots in this jurisdiction.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={lotStageData} dataKey="count" nameKey="stage" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {lotStageData.map((d) => (
                    <Cell key={d.stage} fill={STAGE_COLORS[d.stage]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionHeader title="Benefit / DBT Snapshot" />
          <div className="space-y-1.5 text-sm text-ink">
            <div className="flex justify-between"><span className="subtle">Claims</span><span className="font-medium">{scoped.districtBenefits.length}</span></div>
            <div className="flex justify-between"><span className="subtle">Amount Claimed</span><span className="font-medium">Rs {scoped.districtBenefits.reduce((s, b) => s + b.amount_claimed, 0).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span className="subtle">Amount Disbursed</span><span className="font-medium text-good">Rs {disbursedAmount.toLocaleString("en-IN")}</span></div>
          </div>
        </Card>
        <Card>
          <SectionHeader title="Community Engagement" />
          <div className="space-y-1.5 text-sm text-ink">
            <div className="flex justify-between"><span className="subtle">Total Threads</span><span className="font-medium">{scoped.districtPosts.length}</span></div>
            <div className="flex justify-between"><span className="subtle">Open / In Progress</span><span className="font-medium">{openPosts}</span></div>
            <div className="flex justify-between"><span className="subtle">Resolved</span><span className="font-medium text-good">{scoped.districtPosts.length - openPosts}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
