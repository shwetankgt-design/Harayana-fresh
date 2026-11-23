// Derived intelligence for Round 2: PG production & marketing plan, market-signal explanations,
// leadership outcome KPIs and packhouse quality status. Pure functions over the seeded data.
// Nothing here draws random numbers, so it never shifts the seeded dataset.

import {
  BASE_PRICE_PER_QTL,
  buyerRequirements,
  cropPlans,
  demandForecasts,
  farmersByPg,
  listingById,
  listings,
  orders,
  producerGroups,
} from "../data/seed";
import type { Crop, District, LotStage, MarketSignal, PlanSignal, SalesChannel } from "../data/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

export const ALL_CHANNELS: SalesChannel[] = ["Retail", "Institutional", "Digital Commerce", "Wholesale"];

// A plan is "On Track" while expected supply is within this band of identified buyer demand.
const SIGNAL_BAND = 0.1;

export function harvestWindow(isoDates: string[]): string {
  if (isoDates.length === 0) return "-";
  const sorted = [...isoDates].sort();
  const first = dayMonth(sorted[0]);
  const last = dayMonth(sorted[sorted.length - 1]);
  return first === last ? first : `${first} to ${last}`;
}

export function planSignal(expectedQtl: number, demandQtl: number): PlanSignal {
  if (demandQtl === 0) return "Potential Surplus"; // supply with no identified buyer
  if (expectedQtl > demandQtl * (1 + SIGNAL_BAND)) return "Potential Surplus";
  if (expectedQtl < demandQtl * (1 - SIGNAL_BAND)) return "Demand Gap / Buyer Opportunity";
  return "On Track";
}

export interface PgProductionRow {
  key: string;
  pg_id: string;
  pg_name: string;
  district: District;
  crop: Crop;
  harvest_window: string;
  expected_qtl: number;
  demand_qtl: number;
  gap_qtl: number;
  channels: SalesChannel[];
  signal: PlanSignal;
  plan_ids: string[];
  requirement_ids: string[];
}

// One row per PG x crop: aggregated member crop plans against buyer requirements for that district.
export function productionPlanRows(pgId?: string): PgProductionRow[] {
  const groups = pgId ? producerGroups.filter((p) => p.pg_id === pgId) : producerGroups;
  return groups.flatMap((pg) => {
    const memberIds = new Set(farmersByPg(pg.pg_id).map((f) => f.farmer_id));
    const pgPlans = cropPlans.filter((p) => memberIds.has(p.farmer_id));
    const crops = [...new Set(pgPlans.map((p) => p.crop))];
    return crops.map((crop) => {
      const plans = pgPlans.filter((p) => p.crop === crop);
      const reqs = buyerRequirements.filter((r) => r.crop === crop && r.district_preference.includes(pg.district));
      const expected = sum(plans, (p) => p.expected_yield_qtl);
      const demand = sum(reqs, (r) => r.quantity_qtl);
      const pgListings = listings.filter((l) => l.pg_id === pg.pg_id && l.crop === crop);
      const channels = [...new Set([...pgListings.flatMap((l) => l.channels), ...reqs.map((r) => r.channel)])];
      return {
        key: `${pg.pg_id}-${crop}`,
        pg_id: pg.pg_id,
        pg_name: pg.name,
        district: pg.district,
        crop,
        harvest_window: harvestWindow(plans.map((p) => p.expected_harvest_date)),
        expected_qtl: expected,
        demand_qtl: demand,
        gap_qtl: expected - demand,
        channels,
        signal: planSignal(expected, demand),
        plan_ids: plans.map((p) => p.plan_id),
        requirement_ids: reqs.map((r) => r.requirement_id),
      };
    });
  });
}

export function channelsNotUsed(channels: SalesChannel[]): SalesChannel[] {
  return ALL_CHANNELS.filter((c) => !channels.includes(c));
}

// ---------- Market signal explanation ("Why this signal?") ----------

export interface SignalExplanation {
  orderCount: number;
  requirementIds: string[];
  demandQtl: number;
  supplyQtl: number;
  gapQtl: number;
  glutWarning: boolean;
  recommendedChannel: SalesChannel | null;
  alternateChannels: SalesChannel[];
}

export function explainSignal(signal: MarketSignal): SignalExplanation {
  const { crop, district } = signal;
  const orderCount = orders.filter(
    (o) => o.crop === crop && o.status !== "Cancelled" && listingById(o.listing_id)?.district === district
  ).length;
  const reqs = buyerRequirements.filter((r) => r.crop === crop && r.district_preference.includes(district));
  const demandQtl = sum(reqs, (r) => r.quantity_qtl);
  const supplyQtl = sum(
    productionPlanRows().filter((r) => r.crop === crop && r.district === district),
    (r) => r.expected_qtl
  );
  const forecast = demandForecasts.find((f) => f.crop === crop && f.district === district);
  const usedChannels = listings.filter((l) => l.crop === crop && l.district === district).flatMap((l) => l.channels);
  const alternateChannels = [...new Set(reqs.map((r) => r.channel))].filter((c) => !usedChannels.includes(c));
  return {
    orderCount,
    requirementIds: reqs.map((r) => r.requirement_id),
    demandQtl,
    supplyQtl,
    gapQtl: supplyQtl - demandQtl,
    glutWarning: supplyQtl > 0 && planSignal(supplyQtl, demandQtl) === "Potential Surplus",
    recommendedChannel: forecast?.recommended_channel ?? null,
    alternateChannels,
  };
}

// ---------- Leadership outcome KPIs ----------

export interface OutcomeKpi {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: "good" | "warn" | "bad" | "neutral";
  basis: string;
}

// Computed from the seeded marketplace where the platform holds the data; otherwise labelled illustrative.
export function outcomeKpis(): OutcomeKpi[] {
  const live = orders.filter((o) => o.status !== "Cancelled");
  const volume = sum(live, (o) => o.quantity_qtl);
  const priced = sum(live, (o) => o.quantity_qtl * o.agreed_price_per_qtl);
  const benchmark = sum(live, (o) => o.quantity_qtl * BASE_PRICE_PER_QTL[o.crop]);
  const realisation = volume ? priced / volume : 0;
  const benchAvg = volume ? benchmark / volume : 0;
  const realisationDiff = benchAvg ? ((realisation - benchAvg) / benchAvg) * 100 : 0;
  const listedQty = sum(listings, (l) => l.quantity_qtl);
  const soldShare = listedQty ? Math.round((volume / listedQty) * 100) : 0;
  const linkedPgs = new Set(live.map((o) => o.pg_id).filter(Boolean)).size;
  const pgTotal = producerGroups.length;
  const pgPct = pgTotal ? Math.round((linkedPgs / pgTotal) * 100) : 0;
  const sign = realisationDiff > 0 ? "+" : "";

  return [
    {
      key: "volume",
      label: "Volume digitally market-linked",
      value: `${volume.toLocaleString("en-IN")} Qtl market-linked`,
      detail: "Non-cancelled orders, all PGs",
      tone: "neutral",
      basis: "Computed from seeded orders",
    },
    {
      key: "realisation",
      label: "Farmer price realisation vs benchmark",
      value: `Rs ${Math.round(realisation).toLocaleString("en-IN")}/Qtl vs Rs ${Math.round(benchAvg).toLocaleString("en-IN")} benchmark`,
      detail: `${sign}${realisationDiff.toFixed(1)}%`,
      tone: realisationDiff >= 0 ? "good" : "bad",
      basis: "Quantity-weighted; benchmark = reference price per crop",
    },
    {
      key: "channel-share",
      label: "Produce sold through identified market channels",
      value: `${soldShare}% through identified channels`,
      detail: `${volume.toLocaleString("en-IN")} of ${listedQty.toLocaleString("en-IN")} Qtl listed`,
      tone: "neutral",
      basis: "Ordered quantity / listed quantity",
    },
    {
      key: "loss",
      label: "Post-harvest loss / rejection trend",
      value: "6.8% to 4.9%",
      detail: "Illustrative trend, no loss records yet",
      tone: "warn",
      basis: "Illustrative value, not computed",
    },
    {
      key: "utilisation",
      label: "Packhouse / fulfilment centre utilisation",
      value: "Karnal 78% | Faridabad 61%",
      detail: "Illustrative utilisation, no capacity logs yet",
      tone: "neutral",
      basis: "Illustrative value, not computed",
    },
    {
      key: "pg-linkage",
      label: "PGs with confirmed buyer linkage",
      value: `${linkedPgs} of ${pgTotal} PGs`,
      detail: `${pgPct}% of PGs with at least one order`,
      tone: pgPct >= 50 ? "good" : "warn",
      basis: "Computed from seeded orders",
    },
  ];
}

// ---------- Packhouse quality & traceability ----------

export interface QualityStatus {
  qc: string;
  packaging: string;
  dispatch: string;
}

export function qualityStatus(stage: LotStage): QualityStatus {
  switch (stage) {
    case "Harvested":
      return { qc: "Not yet received", packaging: "Not packed", dispatch: "Not ready" };
    case "Received at Packhouse":
      return { qc: "QC pending", packaging: "Not packed", dispatch: "Not ready" };
    case "Graded":
      return { qc: "QC passed", packaging: "Awaiting packing", dispatch: "Not ready" };
    case "Packed":
      return { qc: "QC passed", packaging: "Haryana Fresh Packed", dispatch: "Ready for dispatch" };
    case "Dispatched":
      return { qc: "QC passed", packaging: "Haryana Fresh Packed", dispatch: "Dispatched" };
    case "Delivered to Buyer":
      return { qc: "QC passed", packaging: "Haryana Fresh Packed", dispatch: "Delivered" };
  }
}
