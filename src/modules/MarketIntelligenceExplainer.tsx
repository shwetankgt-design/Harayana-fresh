import { Link } from "react-router-dom";
import { Lightbulb, Layers, Database, Activity, Plug } from "lucide-react";
import { Badge, Card, IllustrativeTag, IndicativeTag, SectionHeader, Table, Td, Th } from "../components/ui";
import { buyerRequirements } from "../data/seed";
import type { MarketSignal } from "../data/types";
import { explainSignal } from "../lib/intelligence";

type InputStatus = "Live in platform" | "Simulated" | "Not connected";

const INPUT_TONE: Record<InputStatus, "good" | "warn" | "neutral"> = {
  "Live in platform": "good",
  Simulated: "warn",
  "Not connected": "neutral",
};

// The inputs the intelligence layer draws on, and whether each is live in this demo.
const INPUTS: { name: string; source: string; status: InputStatus }[] = [
  { name: "Buyer requirements", source: "Buyer requirement capture", status: "Live in platform" },
  { name: "Marketplace transactions", source: "Orders and closed auctions", status: "Live in platform" },
  { name: "Market and mandi price feed", source: "e-Kharid price feed", status: "Simulated" },
  { name: "PG production and harvest plans", source: "Member crop plans", status: "Live in platform" },
  { name: "Packhouse and FC inventory", source: "Inventory lots", status: "Live in platform" },
  { name: "Government datasets", source: "AgriStack / InDEA", status: "Simulated" },
  { name: "Field and IoT data", source: "Simulated sensor readings", status: "Simulated" },
  { name: "Approved external market feeds", source: "Not connected in this demo", status: "Not connected" },
];

export function MarketIntelligenceInputs() {
  return (
    <Card className="mb-4">
      <SectionHeader
        title="Inputs considered"
        subtitle="What the signals are built from, and which inputs are live in this demo. Click any signal row to see why it was raised."
        right={<IndicativeTag />}
      />
      <Table>
        <thead>
          <tr><Th>Input</Th><Th>Source</Th><Th>Status</Th></tr>
        </thead>
        <tbody>
          {INPUTS.map((i) => (
            <tr key={i.name}>
              <Td className="font-medium">{i.name}</Td>
              <Td className="text-xs">{i.source}</Td>
              <Td><Badge tone={INPUT_TONE[i.status]}>{i.status}</Badge></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-border p-3">
          <div className="font-semibold text-ink flex items-center gap-1.5"><Activity size={14} /> Demand forecast</div>
          <p className="subtle text-xs mt-1">Next-season demand by crop and district.</p>
          <Link to="/forecast" className="text-xs font-semibold text-gt-purple hover:underline">Open forecast</Link>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="font-semibold text-ink flex items-center gap-1.5"><Layers size={14} /> Potential glut warning</div>
          <p className="subtle text-xs mt-1">Raised when expected harvest exceeds identified buyer demand.</p>
          <Link to="/production-plan" className="text-xs font-semibold text-gt-purple hover:underline">Open production plan</Link>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="font-semibold text-ink flex items-center gap-1.5"><Lightbulb size={14} /> Buyer and channel recommendation</div>
          <p className="subtle text-xs mt-1">Suggests a channel, and alternate channels when a glut is likely.</p>
          <Link to="/marketplace" className="text-xs font-semibold text-gt-purple hover:underline">Open marketplace</Link>
        </div>
      </div>
      <p className="subtle text-xs mt-3 flex items-center gap-1.5">
        <Database size={12} /> <IllustrativeTag label="Mandi and government inputs are simulated" />
      </p>
    </Card>
  );
}

export function WhySignal({ signal }: { signal: MarketSignal | null }) {
  if (!signal) return null;
  const e = explainSignal(signal);
  const reqs = buyerRequirements.filter((r) => e.requirementIds.includes(r.requirement_id));

  return (
    <Card className="mb-4">
      <SectionHeader
        title={`Why this signal: ${signal.crop} in ${signal.district}`}
        subtitle={signal.narrative}
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={signal.direction === "Rising" ? "good" : signal.direction === "Falling" ? "bad" : "neutral"}>{signal.direction}</Badge>
            <IndicativeTag />
          </div>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
        <div><div className="subtle text-[11px]">Orders in district</div><div className="font-semibold text-ink">{e.orderCount}</div></div>
        <div><div className="subtle text-[11px]">Buyer demand (Qtl)</div><div className="font-semibold text-ink">{e.demandQtl.toLocaleString("en-IN")}</div></div>
        <div><div className="subtle text-[11px]">Expected supply (Qtl)</div><div className="font-semibold text-ink">{e.supplyQtl.toLocaleString("en-IN")}</div></div>
        <div><div className="subtle text-[11px]">Gap / surplus (Qtl)</div><div className={`font-semibold ${e.gapQtl > 0 ? "text-warn" : e.gapQtl < 0 ? "text-good" : "text-ink"}`}>{e.gapQtl > 0 ? "+" : ""}{e.gapQtl.toLocaleString("en-IN")}</div></div>
      </div>

      {e.glutWarning ? (
        <p className="text-sm text-ink mb-3">
          <Badge tone="warn">Potential glut</Badge>{" "}
          Expected harvest is above identified demand. {e.alternateChannels.length
            ? `Suggested: test alternate channels already requested by buyers (${e.alternateChannels.join(", ")}).`
            : "No buyer requirement names an alternate channel yet, so capture one or stagger the harvest."}
        </p>
      ) : (
        <p className="text-sm text-ink mb-3">No glut warning. Expected supply is within the identified demand band.</p>
      )}
      <p className="text-sm text-ink mb-3">
        Recommended channel from order history: <span className="font-semibold">{e.recommendedChannel ?? "not enough order history"}</span>
      </p>

      {reqs.length > 0 && (
        <Table>
          <thead>
            <tr><Th>Buyer requirement</Th><Th>Min grade</Th><Th>Qty (Qtl)</Th><Th>Channel</Th></tr>
          </thead>
          <tbody>
            {reqs.map((r) => (
              <tr key={r.requirement_id}>
                <Td className="text-xs">{r.requirement_id}</Td>
                <Td className="text-xs">{r.min_grade}</Td>
                <Td>{r.quantity_qtl}</Td>
                <Td><Badge>{r.channel}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="subtle text-xs mt-3 flex items-center gap-1.5">
        <Plug size={12} /> Price, government and sensor inputs are simulated in this demo.
      </p>
    </Card>
  );
}
