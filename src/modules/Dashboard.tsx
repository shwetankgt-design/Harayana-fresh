import { LayoutDashboard, Users, Sprout, Building2, Package, ShieldAlert, Truck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { Badge, Card, PageHeader, SectionHeader, StatCard, SyncStatusBadge } from "../components/ui";
import { useRole } from "../lib/role";
import {
  buyers,
  cropPlans,
  DISTRICTS,
  farmerMembers,
  farmersByPg,
  fulfilmentCenterStats,
  packhouses,
  pgById,
  producerGroups,
  programmeItems,
} from "../data/seed";
import { getAdapterStatuses } from "../lib/adapters";
import { formatDate } from "../lib/format";

export default function Dashboard() {
  const { role } = useRole();
  const adapters = getAdapterStatuses();

  if (role.id === "farmer") {
    const farmer = farmerMembers.find((f) => f.farmer_id === role.scopedFarmerId)!;
    const myPlans = cropPlans.filter((p) => p.farmer_id === farmer.farmer_id);
    return (
      <div>
        <PageHeader title={`Welcome, ${farmer.name}`} subtitle={`${farmer.village}, ${farmer.district} district`} icon={<LayoutDashboard size={20} />} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard label="Land Holding" value={`${farmer.land_holding_acres} acres`} />
          <StatCard label="Active Crop Plans" value={String(myPlans.length)} />
          <StatCard label="Affiliation" value={farmer.affiliation_status} tone={farmer.affiliation_status === "Active" ? "good" : "warn"} />
          <StatCard label="Profile Completeness" value={`${farmer.data_completeness_pct}%`} tone={farmer.data_completeness_pct >= 80 ? "good" : "warn"} />
        </div>
        <Card>
          <SectionHeader title="My Producer Group" />
          <p className="text-sm text-ink">{pgById(farmer.pg_id)?.name}</p>
          <p className="subtle mt-1">Registration {pgById(farmer.pg_id)?.registration_no}</p>
        </Card>
      </div>
    );
  }

  if (role.id === "pg_manager") {
    const pg = pgById(role.scopedPgId!)!;
    const members = farmersByPg(pg.pg_id);
    const activeMembers = members.filter((m) => m.affiliation_status === "Active").length;
    const avgCompleteness = Math.round(members.reduce((a, m) => a + m.data_completeness_pct, 0) / members.length);
    return (
      <div>
        <PageHeader title={pg.name} subtitle={`${pg.district} district · Registration ${pg.registration_no}`} icon={<Users size={20} />} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total Members" value={String(members.length)} sub={`${activeMembers} active`} />
          <StatCard label="Total Land" value={`${pg.total_land_acres} acres`} />
          <StatCard label="Primary Crops" value={pg.primary_crops.join(", ")} />
          <StatCard label="Avg. Data Completeness" value={`${avgCompleteness}%`} tone={avgCompleteness >= 80 ? "good" : "warn"} />
        </div>
        <Card>
          <SectionHeader title="Recent Programme Updates" subtitle="Schemes and circulars visible to your PG" />
          <div className="space-y-2">
            {programmeItems.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 py-2 border-b border-border/70 last:border-0">
                <div>
                  <div className="text-sm font-medium text-ink">{p.title}</div>
                  <div className="subtle">{p.issuing_authority} · {formatDate(p.issued_on)}</div>
                </div>
                <Badge tone={p.type === "Advisory" ? "warn" : "neutral"}>{p.type}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (role.id === "packhouse") {
    const ph = packhouses.find((p) => p.packhouse_id === role.scopedPackhouseId)!;
    const linkedPgs = producerGroups.filter((p) => ph.linked_pg_ids.includes(p.pg_id));
    const linkedFarmers = linkedPgs.flatMap((p) => farmersByPg(p.pg_id));
    const linkedPlans = cropPlans.filter((cp) => linkedFarmers.some((f) => f.farmer_id === cp.farmer_id));
    return (
      <div>
        <PageHeader title={ph.name} subtitle={`${ph.district} district · ${ph.capacity_mt_per_day} MT/day capacity`} icon={<Package size={20} />} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard label="Linked Producer Groups" value={String(linkedPgs.length)} />
          <StatCard label="Linked Farmers" value={String(linkedFarmers.length)} />
          <StatCard label="Crop Plans in Pipeline" value={String(linkedPlans.length)} />
          <StatCard label="Expected Volume (Qtl)" value={linkedPlans.reduce((a, p) => a + p.expected_yield_qtl, 0).toLocaleString("en-IN")} />
        </div>
        <Card>
          <SectionHeader title="Linked Producer Groups" />
          <div className="space-y-2">
            {linkedPgs.map((p) => (
              <div key={p.pg_id} className="flex items-center justify-between py-2 border-b border-border/70 last:border-0">
                <div>
                  <div className="text-sm font-medium text-ink">{p.name}</div>
                  <div className="subtle">{p.member_count} members · {p.total_land_acres} acres</div>
                </div>
                <Badge>{p.primary_crops.join(", ")}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (role.id === "buyer") {
    const buyer = buyers.find((b) => b.buyer_id === role.scopedBuyerId)!;
    const relevantPlans = cropPlans.filter((cp) => buyer.preferred_crops.includes(cp.crop));
    const relevantPgs = producerGroups.filter((p) => p.primary_crops.some((c) => buyer.preferred_crops.includes(c)));
    return (
      <div>
        <PageHeader title={buyer.name} subtitle={`${buyer.type} · ${buyer.hq_city}`} icon={<Building2 size={20} />} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard label="Preferred Crops" value={buyer.preferred_crops.join(", ")} />
          <StatCard label="Matching Producer Groups" value={String(relevantPgs.length)} />
          <StatCard label="Matching Crop Plans" value={String(relevantPlans.length)} />
          <StatCard label="Projected Volume (Qtl)" value={relevantPlans.reduce((a, p) => a + p.expected_yield_qtl, 0).toLocaleString("en-IN")} />
        </div>
        <Card>
          <SectionHeader title="Producer Groups Growing Your Preferred Crops" />
          <div className="space-y-2">
            {relevantPgs.map((p) => (
              <div key={p.pg_id} className="flex items-center justify-between py-2 border-b border-border/70 last:border-0">
                <div>
                  <div className="text-sm font-medium text-ink">{p.name}</div>
                  <div className="subtle">{p.district} district · {p.member_count} members</div>
                </div>
                <Badge tone="orange">{p.primary_crops.join(", ")}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // pmu / admin
  const failedAdapters = adapters.filter((a) => a.status === "Failed").length;
  const avgCompleteness = Math.round(farmerMembers.reduce((a, m) => a + m.data_completeness_pct, 0) / farmerMembers.length);
  const groupsByDistrict = DISTRICTS.map((d) => ({
    district: d,
    groups: producerGroups.filter((p) => p.district === d).length,
    members: producerGroups.filter((p) => p.district === d).reduce((a, p) => a + p.member_count, 0),
  })).filter((d) => d.groups > 0);
  return (
    <div>
      <PageHeader
        title="Programme Management Unit Overview"
        subtitle="Statewide view across Producer Groups, farmers and integration health"
        icon={<LayoutDashboard size={20} />}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Producer Groups" value={String(producerGroups.length)} />
        <StatCard label="Registered Farmers" value={String(farmerMembers.length)} />
        <StatCard label="Avg. Data Completeness" value={`${avgCompleteness}%`} tone={avgCompleteness >= 80 ? "good" : "warn"} />
        <StatCard label="Integration Alerts" value={String(failedAdapters)} tone={failedAdapters > 0 ? "bad" : "good"} sub={failedAdapters > 0 ? "systems need attention" : "all systems nominal"} />
      </div>

      <Card className="mb-4">
        <SectionHeader
          title="Fulfilment vs Demand - Fulfilment Centres"
          subtitle="Chandigarh, Faridabad and Gurugram - institutional and digital-commerce demand hubs, derived from live marketplace order volume"
          right={<Badge tone="orange"><Truck size={12} /> Metro / NCR Demand Hubs</Badge>}
        />
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={fulfilmentCenterStats} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="center" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: "Qtl", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <Tooltip formatter={(v: number, name: string) => [`${v.toLocaleString("en-IN")} Qtl`, name]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="demand_qtl" name="Demand (Qtl)" fill="#7B5AA6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="fulfilled_qtl" name="Fulfilled (Qtl)" fill="#EC6B24" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {fulfilmentCenterStats.map((c) => (
            <div key={c.center} className="rounded-lg border border-border px-3 py-2.5">
              <div className="text-sm font-semibold text-ink">{c.center}</div>
              <div className="subtle mt-0.5">
                {c.fulfilled_qtl.toLocaleString("en-IN")} / {c.demand_qtl.toLocaleString("en-IN")} Qtl
              </div>
              <Badge tone={c.fulfilment_rate_pct >= 85 ? "good" : c.fulfilment_rate_pct >= 70 ? "warn" : "bad"}>
                {c.fulfilment_rate_pct}% fulfilled
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionHeader title="Government Integration Status" subtitle="Simulated adapters - see Integration Sync Status for detail" />
          <div className="space-y-2">
            {adapters.map((a) => (
              <div key={a.system} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-ink">{a.system}</span>
                <SyncStatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Producer Groups by District" subtitle="Groups and registered members per district" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={groupsByDistrict} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="district" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="groups" name="Producer Groups" fill="#4E2A84" radius={[4, 4, 0, 0]} />
              <Bar dataKey="members" name="Registered Members" fill="#F5A623" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {failedAdapters > 0 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-bad/5 border border-bad/20 p-3.5">
          <ShieldAlert size={18} className="text-bad shrink-0 mt-0.5" />
          <div className="text-sm text-ink">
            <span className="font-semibold">{failedAdapters} integration(s)</span> reported a failed sync in the most
            recent run. Review the Integration Sync Status module for error detail and retry options.
          </div>
        </div>
      )}
    </div>
  );
}
