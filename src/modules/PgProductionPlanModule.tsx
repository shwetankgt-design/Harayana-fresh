import { useState } from "react";
import { Layers, Scale } from "lucide-react";
import { Badge, Card, EmptyState, IndicativeTag, PageHeader, SectionHeader, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import { buyerById, cropPlans, farmerById, producerGroups, buyerRequirements } from "../data/seed";
import { channelsNotUsed, productionPlanRows, type PgProductionRow } from "../lib/intelligence";
import type { PlanSignal } from "../data/types";

const SIGNAL_TONE: Record<PlanSignal, "warn" | "good" | "neutral"> = {
  "Potential Surplus": "warn",
  "Demand Gap / Buyer Opportunity": "good",
  "On Track": "neutral",
};

const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString("en-IN")}`;

// PG Production & Marketing Plan: the bridge between member crop plans and marketplace listings.
export default function PgProductionPlanModule() {
  const { role } = useRole();
  const pgScoped = role.id === "pg_manager";
  const [pgFilter, setPgFilter] = useState<string>(pgScoped ? role.scopedPgId ?? "All" : "All");
  const [selected, setSelected] = useState<string | null>(null);

  const rows = productionPlanRows(pgFilter === "All" ? undefined : pgFilter);
  const active = rows.find((r) => r.key === selected) ?? null;
  const counts = (s: PlanSignal) => rows.filter((r) => r.signal === s).length;

  return (
    <div>
      <PageHeader
        title="PG Production & Marketing Plan"
        subtitle="Member crop plans rolled up per Producer Group and crop, set against buyer demand, with a gap or surplus signal"
        icon={<Layers size={20} />}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <IndicativeTag />
        {!pgScoped && (
          <select className="input !w-auto text-xs" value={pgFilter} onChange={(e) => { setPgFilter(e.target.value); setSelected(null); }}>
            <option value="All">All Producer Groups</option>
            {producerGroups.map((p) => (
              <option key={p.pg_id} value={p.pg_id}>{p.name}</option>
            ))}
          </select>
        )}
        <span className="subtle text-xs">Quantities in Qtl. Click a row to see the crop plans and buyer requirements behind it.</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card><div className="subtle">Potential Surplus</div><div className="text-xl font-bold text-warn mt-1">{counts("Potential Surplus")}</div></Card>
        <Card><div className="subtle">Demand Gap / Buyer Opportunity</div><div className="text-xl font-bold text-good mt-1">{counts("Demand Gap / Buyer Opportunity")}</div></Card>
        <Card><div className="subtle">On Track</div><div className="text-xl font-bold text-ink mt-1">{counts("On Track")}</div></Card>
      </div>

      <Card className="mb-4">
        <SectionHeader title="Production and marketing plan" subtitle="Expected harvest vs identified buyer demand, per Producer Group and crop" />
        {rows.length === 0 ? (
          <EmptyState icon={<Layers size={20} />} title="No production plan yet" body="Rows appear once member crop plans exist for this Producer Group." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Producer Group</Th>
                <Th>Crop</Th>
                <Th>Expected harvest</Th>
                <Th>Expected qty (Qtl)</Th>
                <Th>Buyer demand (Qtl)</Th>
                <Th>Gap / surplus (Qtl)</Th>
                <Th>Planned channel</Th>
                <Th>Signal</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  onClick={() => setSelected(r.key)}
                  className={`cursor-pointer hover:bg-gt-purple/5 ${selected === r.key ? "bg-gt-purple/5" : ""}`}
                >
                  <Td className="font-medium text-xs">{r.pg_name}<div className="subtle text-[11px]">{r.district}</div></Td>
                  <Td>{r.crop}</Td>
                  <Td className="text-xs">{r.harvest_window}</Td>
                  <Td>{r.expected_qtl.toLocaleString("en-IN")}</Td>
                  <Td>{r.demand_qtl.toLocaleString("en-IN")}</Td>
                  <Td className={r.gap_qtl > 0 ? "font-semibold text-warn" : r.gap_qtl < 0 ? "font-semibold text-good" : ""}>{signed(r.gap_qtl)}</Td>
                  <Td className="text-xs">{r.channels.length ? r.channels.join(" + ") : "-"}</Td>
                  <Td><Badge tone={SIGNAL_TONE[r.signal]}>{r.signal}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="subtle text-xs mt-3 flex items-start gap-1.5">
          <Scale size={12} className="mt-0.5 shrink-0" />
          Rule: a surplus is flagged when expected quantity exceeds buyer demand by more than 10%, a gap when it falls short by more than 10%, otherwise on track. A PG crop with no identified buyer is flagged as surplus.
        </p>
      </Card>

      {active && <PlanDetail row={active} />}
    </div>
  );
}

function PlanDetail({ row }: { row: PgProductionRow }) {
  const plans = cropPlans.filter((cp) => row.plan_ids.includes(cp.plan_id));
  const reqs = buyerRequirements.filter((r) => row.requirement_ids.includes(r.requirement_id));
  const missing = channelsNotUsed(row.channels);

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader
          title={`Why this signal: ${row.crop} · ${row.pg_name}`}
          subtitle={`Expected ${row.expected_qtl.toLocaleString("en-IN")} Qtl vs buyer demand ${row.demand_qtl.toLocaleString("en-IN")} Qtl in ${row.district}`}
          right={<Badge tone={SIGNAL_TONE[row.signal]}>{row.signal}</Badge>}
        />
        {row.signal === "Potential Surplus" && (
          <p className="text-sm text-ink">
            {row.demand_qtl === 0
              ? `No buyer has a ${row.crop} requirement for ${row.district} yet. Capture one, or route the supply through another channel.`
              : `Supply exceeds identified demand by ${signed(row.gap_qtl)} Qtl. Suggested: place this volume with buyers on ${missing.length ? missing.join(", ") : "other channels"}, or stagger the harvest window.`}
          </p>
        )}
        {row.signal === "Demand Gap / Buyer Opportunity" && (
          <p className="text-sm text-ink">
            Identified demand is {Math.abs(row.gap_qtl).toLocaleString("en-IN")} Qtl above expected supply. Encourage more {row.crop} members to plan for this window.
          </p>
        )}
        {row.signal === "On Track" && <p className="text-sm text-ink">Expected supply is within 10% of identified buyer demand for this window.</p>}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionHeader title="Contributing farmer crop plans" subtitle={`${plans.length} plan(s) rolled up into this row`} />
          {plans.length === 0 ? (
            <EmptyState icon={<Layers size={20} />} title="No crop plans" body="No member has a plan for this crop." />
          ) : (
            <Table>
              <thead>
                <tr><Th>Farmer</Th><Th>Season</Th><Th>Area (acres)</Th><Th>Yield (Qtl)</Th><Th>Harvest</Th></tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.plan_id}>
                    <Td className="text-xs font-medium">{farmerById(p.farmer_id)?.name ?? p.farmer_id}</Td>
                    <Td className="text-xs">{p.season} {p.year}</Td>
                    <Td>{p.area_acres}</Td>
                    <Td>{p.expected_yield_qtl.toLocaleString("en-IN")}</Td>
                    <Td className="text-xs">{p.expected_harvest_date}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <SectionHeader title="Buyer requirements behind the demand" subtitle="Requirements that name this crop and district" />
          {reqs.length === 0 ? (
            <EmptyState icon={<Layers size={20} />} title="No buyer requirement" body="Buyers capture requirements in Market Signals & Advisory." />
          ) : (
            <Table>
              <thead>
                <tr><Th>Buyer</Th><Th>Min grade</Th><Th>Qty (Qtl)</Th><Th>Channel</Th></tr>
              </thead>
              <tbody>
                {reqs.map((r) => (
                  <tr key={r.requirement_id}>
                    <Td className="text-xs font-medium">{buyerById(r.buyer_id)?.name ?? r.buyer_id}</Td>
                    <Td className="text-xs">{r.min_grade}</Td>
                    <Td>{r.quantity_qtl}</Td>
                    <Td><Badge>{r.channel}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
