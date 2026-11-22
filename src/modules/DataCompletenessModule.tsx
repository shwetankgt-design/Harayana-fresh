import { Gauge } from "lucide-react";
import { Badge, Card, CompletenessBar, PageHeader, SectionHeader, StatCard, Table, Td, Th } from "../components/ui";
import { farmerMembers, producerGroups } from "../data/seed";

export default function DataCompletenessModule() {
  const avg = Math.round(farmerMembers.reduce((a, m) => a + m.data_completeness_pct, 0) / farmerMembers.length);
  const below60 = farmerMembers.filter((m) => m.data_completeness_pct < 60).length;
  const linkedFarmTrace = farmerMembers.filter((m) => m.farm_trace_id).length;

  const pgStats = producerGroups.map((pg) => {
    const members = farmerMembers.filter((m) => m.pg_id === pg.pg_id);
    const avgPct = Math.round(members.reduce((a, m) => a + m.data_completeness_pct, 0) / members.length);
    const linked = members.filter((m) => m.farm_trace_id).length;
    return { pg, avgPct, linked, total: members.length };
  });

  return (
    <div>
      <PageHeader
        title="Farmer / PG Data-Completeness Indicator"
        subtitle="Composite score across profile, e-KYC and Farm Trace linkage - visible to PMU/DPMU officials"
        icon={<Gauge size={20} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Statewide Avg. Completeness" value={`${avg}%`} tone={avg >= 80 ? "good" : "warn"} />
        <StatCard label="Farmers Below 60%" value={String(below60)} tone={below60 > 0 ? "bad" : "good"} />
        <StatCard label="Farm Trace Linked" value={`${linkedFarmTrace}/${farmerMembers.length}`} />
        <StatCard label="Producer Groups Tracked" value={String(producerGroups.length)} />
      </div>

      <Card className="mb-4">
        <SectionHeader title="By Producer Group" subtitle="Quarterly review threshold: 80% average completeness" />
        <Table>
          <thead>
            <tr>
              <Th>Producer Group</Th>
              <Th>District</Th>
              <Th>Members</Th>
              <Th>Farm Trace Linked</Th>
              <Th>Avg. Completeness</Th>
            </tr>
          </thead>
          <tbody>
            {pgStats.map(({ pg, avgPct, linked, total }) => (
              <tr key={pg.pg_id}>
                <Td className="font-medium">{pg.name}</Td>
                <Td>{pg.district}</Td>
                <Td>{total}</Td>
                <Td>{linked}/{total}</Td>
                <Td className="w-40"><CompletenessBar pct={avgPct} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <SectionHeader title="Farmer-Level Detail" subtitle="Sorted by lowest completeness first - prioritise for field follow-up" />
        <Table>
          <thead>
            <tr>
              <Th>Farmer</Th>
              <Th>Producer Group</Th>
              <Th>Affiliation</Th>
              <Th>Farm Trace</Th>
              <Th>e-KYC</Th>
              <Th>Completeness</Th>
            </tr>
          </thead>
          <tbody>
            {[...farmerMembers]
              .sort((a, b) => a.data_completeness_pct - b.data_completeness_pct)
              .map((m) => (
                <tr key={m.farmer_id}>
                  <Td className="font-medium">{m.name}</Td>
                  <Td>{m.pg_id}</Td>
                  <Td><Badge tone={m.affiliation_status === "Active" ? "good" : "warn"}>{m.affiliation_status}</Badge></Td>
                  <Td>{m.farm_trace_id ? <Badge tone="good">Linked</Badge> : <Badge tone="bad">Not Linked</Badge>}</Td>
                  <Td>{m.ekyc_verified ? <Badge tone="good">Verified</Badge> : <Badge tone="warn">Pending</Badge>}</Td>
                  <Td className="w-40"><CompletenessBar pct={m.data_completeness_pct} /></Td>
                </tr>
              ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
