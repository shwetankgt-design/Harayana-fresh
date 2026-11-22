import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Building2, PlusCircle } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, StatCard, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import {
  marketSignals,
  marketSignalsForDistrict,
  marketSignalsForCrops,
  buyers,
  buyerRequirements as seedBuyerRequirements,
  cropPlans,
  producerGroups,
  pgById,
  inventoryLots,
  DISTRICTS,
} from "../data/seed";
import type { BuyerRequirement, Crop, District, Grade, SalesChannel } from "../data/types";

const CROPS: Crop[] = ["Kinnow", "Guava", "Tomato", "Potato", "Onion", "Mango"];
const GRADES: Grade[] = ["Grade A (Premium)", "Grade B (Standard)", "Grade C (Processing)"];
const CHANNELS: SalesChannel[] = ["Retail", "Institutional", "Digital Commerce", "Wholesale"];

function directionTone(direction: string): "good" | "bad" | "neutral" {
  if (direction === "Rising") return "good";
  if (direction === "Falling") return "bad";
  return "neutral";
}
function DirectionIcon({ direction }: { direction: string }) {
  if (direction === "Rising") return <TrendingUp size={14} />;
  if (direction === "Falling") return <TrendingDown size={14} />;
  return <Minus size={14} />;
}

export default function MarketSignalsModule() {
  const { role } = useRole();

  // ---------- Farmer / PG Manager: plain-language advisory view ----------
  if (role.id === "farmer" || role.id === "pg_manager") {
    const pg = pgById(role.scopedPgId!)!;
    const relevant = marketSignalsForCrops(pg.primary_crops).filter((s) => s.district === pg.district);
    return (
      <div>
        <PageHeader
          title="Market Signals for Your Producer Group"
          subtitle="Plain-language demand and price pointers, drawn from recent orders and prices in your district"
          icon={<TrendingUp size={20} />}
        />
        {relevant.length === 0 ? (
          <Card>
            <EmptyState
              icon={<TrendingUp size={20} />}
              title="No signal yet for your crops"
              body="Signals build up once there is enough recent order and price history for your Producer Group's crops in your district."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relevant.map((s) => (
              <Card key={s.signal_id}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="font-semibold text-ink">{s.crop}</div>
                  <Badge tone={directionTone(s.direction)}>
                    <DirectionIcon direction={s.direction} /> {s.direction}
                  </Badge>
                </div>
                <p className="text-sm text-ink leading-relaxed">{s.narrative}</p>
                <div className="subtle mt-2">Average recent price: Rs {s.avg_price_per_qtl.toLocaleString("en-IN")}/Qtl</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- Buyer: requirement capture, feeds PG crop planning ----------
  if (role.id === "buyer") {
    return <BuyerRequirementView />;
  }

  // ---------- PMU / DPMU / Admin: analytical view ----------
  return <SignalsAnalyticalView />;
}

function BuyerRequirementView() {
  const { role } = useRole();
  const buyer = buyers.find((b) => b.buyer_id === role.scopedBuyerId)!;
  const [requirements, setRequirements] = useState<BuyerRequirement[]>(() => seedBuyerRequirements.filter((r) => r.buyer_id === buyer.buyer_id));
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({
    crop: buyer.preferred_crops[0] ?? "Kinnow",
    min_grade: "Grade B (Standard)" as Grade,
    quantity_qtl: 50,
    channel: "Retail" as SalesChannel,
    district_preference: [] as District[],
    max_price_per_qtl: "" as string,
  });

  const relevantPgs = producerGroups.filter((pg) => pg.primary_crops.some((c) => requirements.some((r) => r.crop === c)));

  function submit() {
    const req: BuyerRequirement = {
      requirement_id: `REQ-${String(seedBuyerRequirements.length + 1).padStart(4, "0")}`,
      buyer_id: buyer.buyer_id,
      crop: form.crop as Crop,
      min_grade: form.min_grade,
      quantity_qtl: form.quantity_qtl,
      district_preference: form.district_preference.length ? form.district_preference : [...DISTRICTS],
      channel: form.channel,
      max_price_per_qtl: form.max_price_per_qtl ? Number(form.max_price_per_qtl) : null,
    };
    seedBuyerRequirements.push(req);
    setRequirements((prev) => [req, ...prev]);
    setShowForm(false);
    setToast("Requirement saved. It now drives your match scores in Marketplace Discovery.");
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div>
      <PageHeader
        title="Buyer Requirement Capture"
        subtitle="State your upcoming produce needs - Producer Groups see these against their crop plans"
        icon={<PlusCircle size={20} />}
      />
      {toast && <div className="mb-4 rounded-lg bg-good/10 text-good text-sm font-medium px-4 py-2.5">{toast}</div>}

      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
          {showForm ? "Cancel" : "Capture New Requirement"}
        </button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <SectionHeader title="New Produce Requirement" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="text-sm">
              <span className="subtle block mb-1">Crop</span>
              <select className="input" value={form.crop} onChange={(e) => setForm((f) => ({ ...f, crop: e.target.value as Crop }))}>
                {CROPS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="subtle block mb-1">Minimum Grade</span>
              <select className="input" value={form.min_grade} onChange={(e) => setForm((f) => ({ ...f, min_grade: e.target.value as Grade }))}>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="subtle block mb-1">Quantity Required (Qtl)</span>
              <input className="input" type="number" min={1} value={form.quantity_qtl} onChange={(e) => setForm((f) => ({ ...f, quantity_qtl: Number(e.target.value) }))} />
            </label>
            <label className="text-sm">
              <span className="subtle block mb-1">Sales Channel</span>
              <select className="input" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as SalesChannel }))}>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="subtle block mb-1">Max Price/Qtl (optional)</span>
              <input className="input" type="number" min={0} value={form.max_price_per_qtl} onChange={(e) => setForm((f) => ({ ...f, max_price_per_qtl: e.target.value }))} placeholder="No cap" />
            </label>
            <label className="text-sm">
              <span className="subtle block mb-1">Preferred Districts (optional)</span>
              <select
                className="input"
                multiple
                value={form.district_preference}
                onChange={(e) => setForm((f) => ({ ...f, district_preference: Array.from(e.target.selectedOptions, (o) => o.value as District) }))}
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3">
            <button onClick={submit} className="btn-primary">Submit Requirement</button>
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <SectionHeader title="Your Captured Requirements" subtitle={`${requirements.length} requirement(s) visible to matching Producer Groups`} />
        {requirements.length === 0 ? (
          <EmptyState icon={<PlusCircle size={20} />} title="No requirements yet" body="Capture a requirement above to signal upcoming demand to Producer Groups." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Requirement</Th><Th>Crop</Th><Th>Min Grade</Th><Th>Quantity</Th><Th>Channel</Th><Th>Districts</Th><Th>Max Price</Th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((r) => (
                <tr key={r.requirement_id}>
                  <Td className="text-xs">{r.requirement_id}</Td>
                  <Td className="font-medium">{r.crop}</Td>
                  <Td>{r.min_grade}</Td>
                  <Td>{r.quantity_qtl} Qtl</Td>
                  <Td><Badge>{r.channel}</Badge></Td>
                  <Td className="text-xs">{r.district_preference.join(", ")}</Td>
                  <Td>{r.max_price_per_qtl ? `Rs ${r.max_price_per_qtl}` : "No cap"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <SectionHeader title="Producer Groups Growing Matching Crops" subtitle="Visible against their current crop plans" />
        {relevantPgs.length === 0 ? (
          <EmptyState icon={<Building2 size={20} />} title="No matching Producer Groups yet" body="Once you capture a requirement, matching Producer Groups appear here." />
        ) : (
          <div className="space-y-2">
            {relevantPgs.map((pg) => {
              const pgPlans = cropPlans.filter((cp) => requirements.some((r) => r.crop === cp.crop) && pg.primary_crops.includes(cp.crop));
              return (
                <div key={pg.pg_id} className="flex items-center justify-between py-2 border-b border-border/70 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-ink">{pg.name}</div>
                    <div className="subtle">{pg.district} district · {pgPlans.length} matching crop plan(s)</div>
                  </div>
                  <Badge tone="orange">{pg.primary_crops.filter((c) => requirements.some((r) => r.crop === c)).join(", ")}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function SignalsAnalyticalView() {
  const [district, setDistrict] = useState<District | "All Districts">("All Districts");
  const filtered = useMemo(
    () => (district === "All Districts" ? marketSignals : marketSignalsForDistrict(district)),
    [district]
  );
  const rising = filtered.filter((s) => s.direction === "Rising").length;
  const falling = filtered.filter((s) => s.direction === "Falling").length;

  const inventoryByCrop = useMemo(() => {
    const map = new Map<Crop, { crop: Crop; lots: number; qty: number }>();
    inventoryLots.forEach((l) => {
      const entry = map.get(l.crop) ?? { crop: l.crop, lots: 0, qty: 0 };
      entry.lots += 1;
      entry.qty += l.quantity_qtl;
      map.set(l.crop, entry);
    });
    return [...map.values()].sort((a, b) => b.qty - a.qty);
  }, []);

  return (
    <div>
      <PageHeader
        title="Market & Field Intelligence - Analytical View"
        subtitle="Pre-market demand/price signals plus production and inventory aggregates, statewide"
        icon={<TrendingUp size={20} />}
      />

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm">
          <span className="subtle block mb-1">Filter by District</span>
          <select className="input" value={district} onChange={(e) => setDistrict(e.target.value as District | "All Districts")}>
            <option>All Districts</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Active Signals" value={String(filtered.length)} />
        <StatCard label="Rising Demand" value={String(rising)} tone="good" />
        <StatCard label="Softening Demand" value={String(falling)} tone={falling > 0 ? "bad" : "neutral"} />
        <StatCard label="Inventory Lots Tracked" value={String(inventoryLots.length)} />
      </div>

      <Card className="mb-4">
        <SectionHeader title="Pre-Market Demand / Price Signals" subtitle="Derived from recent orders and price observations, by crop and district" />
        {filtered.length === 0 ? (
          <EmptyState icon={<TrendingUp size={20} />} title="No signals for this filter" body="Try a different district or check back once more orders are recorded." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Crop</Th><Th>District</Th><Th>Direction</Th><Th>Strength</Th><Th>Orders</Th><Th>Avg Price</Th><Th>Change</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.signal_id}>
                  <Td className="font-medium">{s.crop}</Td>
                  <Td>{s.district}</Td>
                  <Td><Badge tone={directionTone(s.direction)}><DirectionIcon direction={s.direction} /> {s.direction}</Badge></Td>
                  <Td>{s.strength}</Td>
                  <Td>{s.order_count}</Td>
                  <Td>Rs {s.avg_price_per_qtl.toLocaleString("en-IN")}</Td>
                  <Td className={s.price_change_pct > 0 ? "text-good font-semibold" : s.price_change_pct < 0 ? "text-bad font-semibold" : ""}>
                    {s.price_change_pct > 0 ? "+" : ""}{s.price_change_pct}%
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <SectionHeader title="Production / Inventory Aggregate, by Crop" subtitle="Rolled up from inventory lots across all Producer Groups and Pack Houses" />
        <Table>
          <thead>
            <tr><Th>Crop</Th><Th>Lots</Th><Th>Total Quantity</Th></tr>
          </thead>
          <tbody>
            {inventoryByCrop.map((r) => (
              <tr key={r.crop}>
                <Td className="font-medium">{r.crop}</Td>
                <Td>{r.lots}</Td>
                <Td>{r.qty.toLocaleString("en-IN")} Qtl</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
