import type {
  Advisory,
  AdvisoryTargetAudience,
  Auction,
  BenefitRecord,
  BenefitScheme,
  Bid,
  Buyer,
  BuyerRequirement,
  BuyerType,
  CommunityPost,
  Crop,
  CropPlan,
  DemandForecast,
  District,
  FarmerMember,
  FieldSensorReading,
  ForecastTrend,
  SignalDirection,
  SignalStrength,
  Grade,
  InventoryLot,
  LandParcel,
  Listing,
  LotStage,
  LotStageEvent,
  MarketSignal,
  MemberRole,
  Order,
  OrderStatus,
  OrderStatusEvent,
  Packhouse,
  PostReply,
  PriceObservation,
  ProducerGroup,
  ProgrammeItem,
  FulfilmentCenterStat,
  ReportAccessLogEntry,
  SalesChannel,
  Season,
  SeasonRecommendation,
  SyncLogEntry,
  SyncSystem,
  TransactionRecord,
  TransactionStatus,
  TransactionType,
} from "./types";

// ---------- Deterministic PRNG (mulberry32) ----------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260820);
const rnd = (min: number, max: number) => min + rand() * (max - min);
const rndInt = (min: number, max: number) => Math.floor(rnd(min, max + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

// Fixed "demo today": every seeded date is relative to this, so the UI stays stable run to run.
export const TODAY = new Date("2026-08-20T00:00:00+05:30");
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function dayOffset(n: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d;
}

// ---------- Reference dimensions ----------
export const DISTRICTS: District[] = ["Karnal", "Kurukshetra", "Sirsa", "Ambala", "Hisar", "Panipat"];

const DISTRICT_CROPS: Record<District, Crop[]> = {
  Karnal: ["Tomato", "Potato", "Guava"],
  Kurukshetra: ["Potato", "Onion", "Tomato"],
  Sirsa: ["Kinnow", "Onion"],
  Ambala: ["Guava", "Mango", "Tomato"],
  Hisar: ["Kinnow", "Onion", "Tomato"],
  Panipat: ["Guava", "Potato", "Tomato"],
};

const VILLAGES_BY_DISTRICT: Record<District, string[]> = {
  Karnal: ["Nissing", "Gharaunda", "Assandh"],
  Kurukshetra: ["Pehowa", "Shahabad", "Ladwa"],
  Sirsa: ["Ellenabad", "Dabwali", "Rania"],
  Ambala: ["Naraingarh", "Barara", "Shahzadpur"],
  Hisar: ["Barwala", "Hansi", "Adampur"],
  Panipat: ["Samalkha", "Israna", "Madlauda"],
};

const MALE_NAMES = ["Ramesh", "Suresh", "Rajbir", "Satpal", "Mahender", "Jai Singh", "Balwan", "Dharmender", "Rohtash", "Karambir", "Sandeep", "Vikram", "Naresh", "Baljeet", "Om Parkash"];
const FEMALE_NAMES = ["Sunita", "Kamlesh", "Rekha", "Pushpa", "Sarita", "Usha", "Meena", "Kavita", "Anita", "Neelam"];
const SURNAMES = ["Sharma", "Chaudhary", "Singh", "Yadav", "Kumar", "Dahiya", "Malik", "Rana", "Sangwan", "Hooda"];

const SOIL_TYPES = ["Sandy Loam", "Loamy", "Clay Loam", "Sandy"];
const IRRIGATION: LandParcel["irrigation_source"][] = ["Canal", "Tube Well", "Tube Well", "Rainfed"];

// ---------- Producer Groups (10, ~20 members each => 200+ registered farmers) ----------
const PG_DEFS: { pg_id: string; name: string; district: District }[] = [
  { pg_id: "PG-001", name: "Karnal Kinnow-Vegetable Growers Producer Group", district: "Karnal" },
  { pg_id: "PG-002", name: "Sirsa Kinnow Growers Producer Group", district: "Sirsa" },
  { pg_id: "PG-003", name: "Kurukshetra Vegetable Growers Producer Group", district: "Kurukshetra" },
  { pg_id: "PG-004", name: "Gharaunda Horticulture Producer Group", district: "Karnal" },
  { pg_id: "PG-005", name: "Pehowa Vegetable Growers Producer Group", district: "Kurukshetra" },
  { pg_id: "PG-006", name: "Ambala Guava-Mango Growers Producer Group", district: "Ambala" },
  { pg_id: "PG-007", name: "Naraingarh Fruit Growers Producer Group", district: "Ambala" },
  { pg_id: "PG-008", name: "Hisar Kinnow-Onion Growers Producer Group", district: "Hisar" },
  { pg_id: "PG-009", name: "Barwala Horticulture Producer Group", district: "Hisar" },
  { pg_id: "PG-010", name: "Panipat Guava-Vegetable Growers Producer Group", district: "Panipat" },
];

export const farmerMembers: FarmerMember[] = [];
export const landParcels: LandParcel[] = [];
export const cropPlans: CropPlan[] = [];
export const producerGroups: ProducerGroup[] = [];

let farmerSeq = 1;
let parcelSeq = 1;
let planSeq = 1;

PG_DEFS.forEach((pgDef) => {
  const villages = VILLAGES_BY_DISTRICT[pgDef.district];
  const crops = DISTRICT_CROPS[pgDef.district];
  const memberIds: string[] = [];
  let totalLand = 0;
  const memberCount = 20;

  for (let i = 0; i < memberCount; i++) {
    const farmer_id = `HRF-${String(farmerSeq++).padStart(5, "0")}`;
    const gender: FarmerMember["gender"] = rand() < 0.15 ? "Female" : "Male";
    const first = gender === "Male" ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
    const last = pick(SURNAMES);
    const village = pick(villages);
    const land_holding_acres = Math.round(rnd(1.5, 8) * 10) / 10;
    const role_in_pg: MemberRole = i === 0 ? "PG Manager" : i === 1 && rand() < 0.5 ? "Aggregator" : "Member";
    const affiliation_status: FarmerMember["affiliation_status"] =
      rand() < 0.8 ? "Active" : rand() < 0.6 ? "Pending Verification" : "Inactive";
    const ekyc_verified = affiliation_status === "Active" ? rand() < 0.85 : rand() < 0.3;
    // Farm Trace sync: some farmers not yet linked (realistic partial-adoption story)
    const farm_trace_id = rand() < 0.78 ? `FT-HR-${rndInt(100000, 999999)}` : null;
    const joined_on = isoDate(dayOffset(rndInt(60, 900)));

    // data completeness indicator: composite of profile fields present
    let completeness = 40;
    if (farm_trace_id) completeness += 20;
    if (ekyc_verified) completeness += 15;
    completeness += rndInt(0, 15);
    if (affiliation_status === "Inactive") completeness = Math.min(completeness, 55);
    completeness = Math.min(100, completeness);

    const member: FarmerMember = {
      farmer_id,
      name: `${first} ${last}`,
      father_or_husband_name: `${pick(MALE_NAMES)} ${last}`,
      gender,
      phone: `9${rndInt(100000000, 999999999)}`,
      district: pgDef.district,
      village,
      pg_id: pgDef.pg_id,
      role_in_pg,
      affiliation_status,
      joined_on,
      land_holding_acres,
      farm_trace_id,
      ekyc_verified,
      data_completeness_pct: completeness,
    };
    farmerMembers.push(member);
    memberIds.push(farmer_id);
    totalLand += land_holding_acres;

    // 1-2 land parcels per farmer
    const parcelCount = rand() < 0.4 ? 2 : 1;
    const parcelIdsForFarmer: string[] = [];
    for (let p = 0; p < parcelCount; p++) {
      const parcel_id = `LP-${String(parcelSeq++).padStart(5, "0")}`;
      const area = p === 0 ? Math.round(land_holding_acres * rnd(0.55, 0.75) * 10) / 10 : Math.round(land_holding_acres * rnd(0.25, 0.45) * 10) / 10;
      landParcels.push({
        parcel_id,
        farmer_id,
        district: pgDef.district,
        village,
        survey_no: `${rndInt(10, 400)}/${rndInt(1, 24)}`,
        area_acres: area,
        irrigation_source: pick(IRRIGATION),
        soil_type: pick(SOIL_TYPES),
        geo_tagged: rand() < 0.7,
      });
      parcelIdsForFarmer.push(parcel_id);
    }

    // season-wise crop plans (current Kharif 2026 + one Rabi 2026-27 plan)
    const seasons: { season: Season; year: string; sowMonthOffsetDays: number }[] = [
      { season: "Kharif", year: "2026-27", sowMonthOffsetDays: 75 },
      { season: "Rabi", year: "2026-27", sowMonthOffsetDays: -35 },
    ];
    seasons.forEach((s) => {
      const crop = pick(crops);
      const parcel_id = pick(parcelIdsForFarmer);
      const parcel = landParcels.find((lp) => lp.parcel_id === parcel_id)!;
      const area_acres = Math.round(parcel.area_acres * rnd(0.6, 1) * 10) / 10;
      const yieldPerAcre = crop === "Kinnow" ? 90 : crop === "Guava" ? 70 : crop === "Mango" ? 45 : crop === "Onion" ? 110 : crop === "Potato" ? 130 : 95;
      const sowing = dayOffset(s.sowMonthOffsetDays);
      const harvest = new Date(sowing);
      harvest.setDate(harvest.getDate() + 120);
      const status: CropPlan["status"] = s.sowMonthOffsetDays > 0 ? "Growing" : s.sowMonthOffsetDays > -20 ? "Sown" : "Planned";
      cropPlans.push({
        plan_id: `CP-${String(planSeq++).padStart(5, "0")}`,
        farmer_id,
        parcel_id,
        crop,
        season: s.season,
        year: s.year,
        area_acres,
        expected_yield_qtl: Math.round(area_acres * yieldPerAcre * rnd(0.85, 1.15)),
        sowing_date: isoDate(sowing),
        expected_harvest_date: isoDate(harvest),
        status,
      });
    });
  }

  producerGroups.push({
    pg_id: pgDef.pg_id,
    name: pgDef.name,
    district: pgDef.district,
    registration_no: `HR-PG-${pgDef.district.slice(0, 3).toUpperCase()}-${rndInt(2019, 2023)}-${rndInt(100, 999)}`,
    registered_on: isoDate(dayOffset(rndInt(500, 1800))),
    primary_crops: crops,
    manager_farmer_id: memberIds[0],
    member_count: memberIds.length,
    total_land_acres: Math.round(totalLand * 10) / 10,
  });
});

// ---------- Packhouses (4) ----------
export const packhouses: Packhouse[] = [
  {
    packhouse_id: "PH-01",
    name: "Karnal Integrated Pack House",
    district: "Karnal",
    capacity_mt_per_day: 40,
    linked_pg_ids: ["PG-001", "PG-003", "PG-004", "PG-005"],
  },
  {
    packhouse_id: "PH-02",
    name: "Sirsa Citrus Pack House",
    district: "Sirsa",
    capacity_mt_per_day: 25,
    linked_pg_ids: ["PG-002"],
  },
  {
    packhouse_id: "PH-03",
    name: "Ambala Fruit Pack House",
    district: "Ambala",
    capacity_mt_per_day: 30,
    linked_pg_ids: ["PG-006", "PG-007"],
  },
  {
    packhouse_id: "PH-04",
    name: "Hisar Integrated Pack House",
    district: "Hisar",
    capacity_mt_per_day: 35,
    linked_pg_ids: ["PG-008", "PG-009", "PG-010"],
  },
];

// ---------- Buyers (4, one per type) ----------
const BUYER_DEFS: { name: string; type: BuyerType; hq_city: string; preferred_crops: Crop[] }[] = [
  { name: "FreshMart Retail Chain", type: "Retail Chain", hq_city: "Gurugram", preferred_crops: ["Tomato", "Potato", "Onion", "Guava"] },
  { name: "Hospitality Supply Partners (HORECA)", type: "Institutional / HORECA", hq_city: "Chandigarh", preferred_crops: ["Kinnow", "Mango", "Tomato"] },
  { name: "QuickBasket Digital Commerce", type: "Digital Commerce", hq_city: "Delhi NCR", preferred_crops: ["Tomato", "Potato", "Onion"] },
  { name: "Azadpur Mandi Wholesale Traders Co.", type: "Wholesale / Mandi Trader", hq_city: "Delhi", preferred_crops: ["Kinnow", "Guava", "Mango", "Onion", "Potato", "Tomato"] },
];
export const buyers: Buyer[] = BUYER_DEFS.map((b, i) => ({ buyer_id: `BYR-${String(i + 1).padStart(3, "0")}`, ...b }));

// ---------- Programme data repository (schemes/circulars) ----------
export const programmeItems: ProgrammeItem[] = [
  {
    id: "PRG-001",
    type: "Scheme",
    title: "Mukhya Mantri Bagwani Bima Yojana - Enrolment Window Open",
    issuing_authority: "Department of Horticulture, Haryana",
    issued_on: isoDate(dayOffset(12)),
    summary: "Horticulture crop insurance scheme enrolment for Kharif 2026-27 open till 30 Sep 2026. PG managers to assist member enrolment.",
    visible_to: ["All"],
    reference_no: "DOH/HRY/BBY/2026/041",
    status: "Open",
  },
  {
    id: "PRG-002",
    type: "Circular",
    title: "Revised Kinnow Grading Standards for Packhouse Certification",
    issuing_authority: "PMU - Haryana Horticulture Digital Mission",
    issued_on: isoDate(dayOffset(25)),
    summary: "Updated size/grade standards for kinnow effective this season. Packhouse operators must recalibrate grading lines.",
    visible_to: ["Packhouse/FC Operator", "PG Manager/Aggregator", "DoH/PMU/DPMU Official"],
    reference_no: "PMU/CIR/2026/018",
    status: "Informational",
  },
  {
    id: "PRG-003",
    type: "Advisory",
    title: "Tomato Leaf Curl Virus - Preventive Advisory for Karnal & Panipat",
    issuing_authority: "DPMU Karnal",
    issued_on: isoDate(dayOffset(4)),
    summary: "Recent field surveillance indicates elevated ToLCV risk. Farmers advised to use certified virus-free seedlings and yellow sticky traps.",
    visible_to: ["Farmer/PG Member", "PG Manager/Aggregator", "DoH/PMU/DPMU Official"],
    reference_no: "DPMU/KNL/ADV/2026/07",
    status: "Open",
  },
  {
    id: "PRG-004",
    type: "Scheme",
    title: "Cold Chain & Pack House Capital Subsidy Scheme",
    issuing_authority: "Department of Horticulture, Haryana",
    issued_on: isoDate(dayOffset(60)),
    summary: "35% capital subsidy for new pack house / cold storage infrastructure. Applications via DPMU district offices.",
    visible_to: ["Packhouse/FC Operator", "PG Manager/Aggregator", "DoH/PMU/DPMU Official"],
    reference_no: "DOH/HRY/CCS/2026/009",
    status: "Open",
  },
  {
    id: "PRG-005",
    type: "Circular",
    title: "Data Completeness Compliance - Q2 Review Reminder",
    issuing_authority: "PMU - Haryana Horticulture Digital Mission",
    issued_on: isoDate(dayOffset(2)),
    summary: "DPMU officials to ensure PG-level data completeness above 80% ahead of the quarterly review board meeting.",
    visible_to: ["DoH/PMU/DPMU Official"],
    reference_no: "PMU/CIR/2026/022",
    status: "Open",
  },
  {
    id: "PRG-006",
    type: "Advisory",
    title: "Onion Market Price Outlook - Sirsa & Hisar Belt",
    issuing_authority: "Directorate of Marketing & Inspection (mocked e-Kharid feed)",
    issued_on: isoDate(dayOffset(1)),
    summary: "Wholesale onion prices expected to firm up over the next fortnight on lower arrivals. PGs advised to plan staggered dispatch.",
    visible_to: ["Farmer/PG Member", "PG Manager/Aggregator", "Buyer"],
    reference_no: "DMI/ADV/2026/113",
    status: "Informational",
  },
];

// ---------- Sync log (mocked government adapters) ----------
// Deterministic set of recent sync runs per system, including an occasional simulated failure.
const SYNC_SYSTEMS: SyncSystem[] = ["Farm Trace", "e-Girdwari", "e-Kharid", "MFMB", "AgriStack/InDEA"];
export const syncLog: SyncLogEntry[] = [];
let syncSeq = 1;
SYNC_SYSTEMS.forEach((system) => {
  const runs = rndInt(4, 6);
  for (let i = 0; i < runs; i++) {
    const started = dayOffset(rndInt(0, 20));
    const durationMin = rndInt(2, 18);
    const completed = new Date(started);
    completed.setMinutes(completed.getMinutes() + durationMin);
    // ~15% simulated failure rate so error-handling UI is exercised
    const failed = rand() < 0.15;
    const scopePool = producerGroups.map((p) => p.pg_id);
    syncLog.push({
      id: `SYNC-${String(syncSeq++).padStart(4, "0")}`,
      system,
      scope: pick(scopePool),
      started_at: started.toISOString(),
      completed_at: failed && rand() < 0.3 ? null : completed.toISOString(),
      status: failed ? "Failed" : "Success",
      records_synced: failed ? rndInt(0, 40) : rndInt(80, 620),
      error_message: failed
        ? pick([
            "Timeout connecting to " + system + " gateway (simulated).",
            "Schema validation error on incoming record batch (simulated).",
            system + " service returned HTTP 503 - retry scheduled (simulated).",
            "Partial record mismatch - farmer_id not found in " + system + " index (simulated).",
          ])
        : null,
    });
  }
});
// Sort newest first
syncLog.sort((a, b) => (a.started_at < b.started_at ? 1 : -1));

// ---------- Derived helpers ----------
export function farmersByPg(pg_id: string): FarmerMember[] {
  return farmerMembers.filter((f) => f.pg_id === pg_id);
}
export function parcelsByFarmer(farmer_id: string): LandParcel[] {
  return landParcels.filter((p) => p.farmer_id === farmer_id);
}
export function plansByFarmer(farmer_id: string): CropPlan[] {
  return cropPlans.filter((p) => p.farmer_id === farmer_id);
}
export function pgById(pg_id: string): ProducerGroup | undefined {
  return producerGroups.find((p) => p.pg_id === pg_id);
}
export function farmerById(farmer_id: string): FarmerMember | undefined {
  return farmerMembers.find((f) => f.farmer_id === farmer_id);
}
export function latestSyncBySystem(): { system: SyncSystem; latest: SyncLogEntry }[] {
  return SYNC_SYSTEMS.map((system) => ({
    system,
    latest: syncLog.find((s) => s.system === system)!,
  }));
}

// ==================== Module 2: Unified E-Marketplace & Trading Engine ====================
// Built on top of the same seeded PGs / farmers / packhouses / buyers / crop plans above -
// every listing traces back to a real crop plan and its PG members.

const GRADES: Grade[] = ["Grade A (Premium)", "Grade B (Standard)", "Grade C (Processing)"];
const ALL_CHANNELS: SalesChannel[] = ["Retail", "Institutional", "Digital Commerce", "Wholesale"];

const BASE_PRICE_PER_QTL: Record<Crop, number> = {
  Kinnow: 2200,
  Guava: 1800,
  Tomato: 1200,
  Potato: 950,
  Onion: 1400,
  Mango: 3200,
};

function channelsForCrop(): SalesChannel[] {
  // Every listing carries 1-3 channel tags rather than living in a separate catalogue per channel.
  const count = rndInt(1, 3);
  // Fisher-Yates, not sort(() => rand() - 0.5): that comparator is called a different number of
  // times per JS engine, which would shift the whole random sequence between browsers.
  const shuffled = [...ALL_CHANNELS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// ---------- Listings (from PG / Packhouse crop plans) ----------
export const listings: Listing[] = [];
let listingSeq = 1;

producerGroups.forEach((pg) => {
  const members = farmersByPg(pg.pg_id);
  // Group this PG's "Growing"/"Sown" crop plans by crop to form pooled listings.
  const pgPlans = cropPlans.filter((cp) => members.some((m) => m.farmer_id === cp.farmer_id) && cp.status !== "Planned");
  const byCrop = new Map<Crop, CropPlan[]>();
  pgPlans.forEach((p) => {
    if (!byCrop.has(p.crop)) byCrop.set(p.crop, []);
    byCrop.get(p.crop)!.push(p);
  });

  byCrop.forEach((plans, crop) => {
    const grade = pick(GRADES);
    const totalQtl = Math.round(plans.reduce((sum, p) => sum + p.expected_yield_qtl, 0) * rnd(0.4, 0.7));
    if (totalQtl < 10) return;
    const gradeFactor = grade === "Grade A (Premium)" ? 1.15 : grade === "Grade B (Standard)" ? 1.0 : 0.8;
    const price = Math.round((BASE_PRICE_PER_QTL[crop] * gradeFactor * rnd(0.9, 1.1)) / 5) * 5;
    const isAuctionFormat = crop === "Kinnow" && rand() < 0.7;
    const availFrom = dayOffset(rndInt(-5, 3));
    const availUntil = new Date(availFrom);
    availUntil.setDate(availUntil.getDate() + rndInt(20, 45));
    const linkedFarmerIds = [...new Set(plans.map((p) => p.farmer_id))];

    listings.push({
      listing_id: `LST-${String(listingSeq++).padStart(5, "0")}`,
      source_type: "PG",
      pg_id: pg.pg_id,
      packhouse_id: null,
      crop,
      grade,
      quantity_qtl: totalQtl,
      quantity_available_qtl: totalQtl,
      district: pg.district,
      village: members[0]?.village ?? pg.district,
      available_from: isoDate(availFrom),
      available_until: isoDate(availUntil),
      channels: channelsForCrop(),
      format: isAuctionFormat ? "Auction" : "Fixed Price",
      price_per_qtl: isAuctionFormat ? null : price,
      reserve_price_per_qtl: isAuctionFormat ? Math.round(price * 0.92) : null,
      linked_plan_ids: plans.map((p) => p.plan_id),
      linked_farmer_ids: linkedFarmerIds,
      created_by_farmer_id: pg.manager_farmer_id,
      created_on: isoDate(dayOffset(rndInt(1, 10))),
      status: "Active",
      notes: `Pooled listing from ${linkedFarmerIds.length} member(s) of ${pg.name}.`,
    });
  });
});

// A couple of packhouse-side listings (graded/processed output, not tied 1:1 to a single crop plan).
packhouses.forEach((ph) => {
  const linkedPgs = producerGroups.filter((pg) => ph.linked_pg_ids.includes(pg.pg_id));
  const crop = pick(linkedPgs.flatMap((pg) => pg.primary_crops));
  const grade = "Grade A (Premium)" as Grade;
  const totalQtl = rndInt(80, 220);
  const price = Math.round((BASE_PRICE_PER_QTL[crop] * 1.2 * rnd(0.95, 1.08)) / 5) * 5;
  const availFrom = dayOffset(rndInt(-3, 2));
  const availUntil = new Date(availFrom);
  availUntil.setDate(availUntil.getDate() + rndInt(15, 30));
  const anyMember = farmersByPg(linkedPgs[0]?.pg_id ?? producerGroups[0].pg_id)[0];
  listings.push({
    listing_id: `LST-${String(listingSeq++).padStart(5, "0")}`,
    source_type: "Packhouse",
    pg_id: linkedPgs[0]?.pg_id ?? null,
    packhouse_id: ph.packhouse_id,
    crop,
    grade,
    quantity_qtl: totalQtl,
    quantity_available_qtl: totalQtl,
    district: ph.district,
    village: ph.name,
    available_from: isoDate(availFrom),
    available_until: isoDate(availUntil),
    channels: channelsForCrop(),
    format: "Fixed Price",
    price_per_qtl: price,
    reserve_price_per_qtl: null,
    linked_plan_ids: [],
    linked_farmer_ids: anyMember ? [anyMember.farmer_id] : [],
    created_by_farmer_id: anyMember?.farmer_id ?? "HRF-00001",
    created_on: isoDate(dayOffset(rndInt(1, 8))),
    status: "Active",
    notes: `Graded and sorted output from ${ph.name}, sourced across linked Producer Groups.`,
  });
});

// ---------- Buyer requirements (for rule-based matching) ----------
export const buyerRequirements: BuyerRequirement[] = [];
let reqSeq = 1;
buyers.forEach((b) => {
  const reqCount = rndInt(2, 3);
  for (let i = 0; i < reqCount; i++) {
    const crop = pick(b.preferred_crops);
    const channel: SalesChannel =
      b.type === "Retail Chain" ? "Retail" : b.type === "Institutional / HORECA" ? "Institutional" : b.type === "Digital Commerce" ? "Digital Commerce" : "Wholesale";
    buyerRequirements.push({
      requirement_id: `REQ-${String(reqSeq++).padStart(4, "0")}`,
      buyer_id: b.buyer_id,
      crop,
      min_grade: pick(GRADES),
      quantity_qtl: rndInt(20, 150),
      district_preference: [...new Set([pick(DISTRICTS), pick(DISTRICTS)])],
      channel,
      max_price_per_qtl: rand() < 0.6 ? Math.round((BASE_PRICE_PER_QTL[crop] * rnd(1.05, 1.3)) / 5) * 5 : null,
    });
  }
});

// ---------- Rule-based PG-buyer match score ----------
export interface MatchResult {
  listing: Listing;
  requirement: BuyerRequirement;
  score: number; // 0-100
  tier: "Strong Match" | "Good Match" | "Partial Match";
  reasons: string[];
}

const GRADE_RANK: Record<Grade, number> = { "Grade C (Processing)": 1, "Grade B (Standard)": 2, "Grade A (Premium)": 3 };

export function matchListingsForRequirement(req: BuyerRequirement): MatchResult[] {
  return listings
    .filter((l) => l.crop === req.crop && l.status === "Active" && l.quantity_available_qtl > 0)
    .map((listing) => {
      let score = 0;
      const reasons: string[] = [];
      if (GRADE_RANK[listing.grade] >= GRADE_RANK[req.min_grade]) {
        score += 30;
        reasons.push(`Grade ${listing.grade.split(" ")[1]} meets or exceeds required ${req.min_grade.split(" ")[1]}`);
      } else {
        reasons.push(`Grade below buyer's minimum requirement`);
      }
      if (listing.channels.includes(req.channel)) {
        score += 25;
        reasons.push(`Listed on ${req.channel} channel`);
      } else {
        reasons.push(`Not currently tagged for ${req.channel} channel`);
      }
      if (req.district_preference.includes(listing.district)) {
        score += 20;
        reasons.push(`District (${listing.district}) matches buyer preference`);
      }
      if (listing.quantity_available_qtl >= req.quantity_qtl) {
        score += 15;
        reasons.push(`Available quantity (${listing.quantity_available_qtl} Qtl) covers requirement`);
      } else {
        reasons.push(`Available quantity below requested ${req.quantity_qtl} Qtl`);
      }
      const effectivePrice = listing.price_per_qtl ?? listing.reserve_price_per_qtl ?? 0;
      if (!req.max_price_per_qtl || effectivePrice <= req.max_price_per_qtl) {
        score += 10;
        reasons.push(`Price within buyer's budget`);
      } else {
        reasons.push(`Price above buyer's stated budget`);
      }
      const tier: MatchResult["tier"] = score >= 75 ? "Strong Match" : score >= 50 ? "Good Match" : "Partial Match";
      return { listing, requirement: req, score, tier, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

// ---------- Orders (with full auditable status history) ----------
export const orders: Order[] = [];
let orderSeq = 1;

const ORDER_FLOWS: OrderStatus[][] = [
  ["Placed", "Confirmed", "In Transit", "Delivered"],
  ["Placed", "Confirmed", "In Transit", "Delivered"],
  ["Placed", "Confirmed"],
  ["Placed", "Cancelled"],
  ["Placed", "Confirmed", "In Transit", "Delivered"],
  ["Placed", "Confirmed", "Disputed"],
];

const fixedPriceListings = listings.filter((l) => l.format === "Fixed Price");
fixedPriceListings.forEach((listing, i) => {
  const buyer = pick(buyers.filter((b) => b.preferred_crops.includes(listing.crop)).length ? buyers.filter((b) => b.preferred_crops.includes(listing.crop)) : buyers);
  const channel = listing.channels[0] ?? "Wholesale";
  const qty = Math.min(listing.quantity_available_qtl, rndInt(10, 60));
  const price = listing.price_per_qtl ?? BASE_PRICE_PER_QTL[listing.crop];
  const flow = ORDER_FLOWS[i % ORDER_FLOWS.length];
  const placedAt = dayOffset(rndInt(2, 15));

  const history: OrderStatusEvent[] = [];
  let cursor = new Date(placedAt);
  const actorByStatus: Record<OrderStatus, string> = {
    Placed: buyer.name,
    Confirmed: listing.source_type === "PG" ? "PG Manager" : "Packhouse Operator",
    "In Transit": listing.source_type === "PG" ? "PG Manager" : "Packhouse Operator",
    Delivered: buyer.name,
    Cancelled: rand() < 0.5 ? buyer.name : "PG Manager",
    Disputed: buyer.name,
  };
  const remarkByStatus: Record<OrderStatus, string> = {
    Placed: `Order placed against listing ${listing.listing_id}.`,
    Confirmed: "Order confirmed and accepted for dispatch.",
    "In Transit": "Consignment dispatched from source location.",
    Delivered: "Consignment received and delivery confirmed.",
    Cancelled: "Order cancelled before dispatch.",
    Disputed: "Buyer raised a quality/quantity discrepancy on receipt.",
  };
  flow.forEach((status, idx) => {
    if (idx > 0) cursor = new Date(cursor.getTime() + rndInt(4, 30) * 3600 * 1000);
    history.push({ status, at: cursor.toISOString(), by: actorByStatus[status], remark: remarkByStatus[status] });
  });

  const finalStatus = flow[flow.length - 1];
  orders.push({
    order_id: `ORD-${String(orderSeq++).padStart(5, "0")}`,
    listing_id: listing.listing_id,
    buyer_id: buyer.buyer_id,
    pg_id: listing.pg_id,
    packhouse_id: listing.packhouse_id,
    crop: listing.crop,
    grade: listing.grade,
    quantity_qtl: qty,
    agreed_price_per_qtl: price,
    channel,
    placed_on: isoDate(placedAt),
    status: finalStatus,
    history,
  });

  if (finalStatus !== "Cancelled") {
    listing.quantity_available_qtl = Math.max(0, listing.quantity_available_qtl - qty);
    if (listing.quantity_available_qtl === 0) listing.status = "Fulfilled";
  }
});

// ---------- Auctions (kinnow bulk-bidding format) ----------
export const auctions: Auction[] = [];
let auctionSeq = 1;
let bidSeq = 1;

const auctionListings = listings.filter((l) => l.format === "Auction");
auctionListings.forEach((listing) => {
  // Auctions run 3 days: opening 1-2 days ago leaves them Open, 3-4 days ago leaves them Closed.
  const opensAt = dayOffset(rndInt(1, 4));
  const closesAt = new Date(opensAt);
  closesAt.setDate(closesAt.getDate() + 3);
  const now = TODAY;
  const status: Auction["status"] = now < opensAt ? "Scheduled" : now < closesAt ? "Open" : "Closed";

  const interestedBuyers = buyers.filter((b) => b.preferred_crops.includes(listing.crop));
  const bidders = (interestedBuyers.length ? interestedBuyers : buyers).slice(0, rndInt(2, 4));
  const bids: Bid[] = [];
  let currentHigh = listing.reserve_price_per_qtl ?? Math.round(BASE_PRICE_PER_QTL[listing.crop] * 0.9);
  bidders.forEach((b, idx) => {
    currentHigh = currentHigh + rndInt(20, 90);
    const placedAt = new Date(opensAt.getTime() + (idx + 1) * rndInt(2, 10) * 3600 * 1000);
    bids.push({
      bid_id: `BID-${String(bidSeq++).padStart(5, "0")}`,
      listing_id: listing.listing_id,
      buyer_id: b.buyer_id,
      amount_per_qtl: currentHigh,
      placed_at: placedAt.toISOString(),
      status: "Active",
    });
  });
  // Mark bid statuses relative to the highest.
  if (bids.length) {
    const maxAmount = Math.max(...bids.map((b) => b.amount_per_qtl));
    bids.forEach((b) => {
      if (status === "Closed") {
        b.status = b.amount_per_qtl === maxAmount ? "Won" : "Lost";
      } else {
        b.status = b.amount_per_qtl === maxAmount ? "Winning" : "Outbid";
      }
    });
  }
  const winningBid = status === "Closed" ? bids.find((b) => b.status === "Won") ?? null : null;

  auctions.push({
    auction_id: `AUC-${String(auctionSeq++).padStart(4, "0")}`,
    listing_id: listing.listing_id,
    crop: listing.crop,
    opens_at: opensAt.toISOString(),
    closes_at: closesAt.toISOString(),
    status,
    bids,
    winning_bid_id: winningBid?.bid_id ?? null,
  });

  if (status === "Closed" && winningBid) {
    listing.status = "Matched";
  }
});

// ---------- Price observations (live price view feed, derived from orders + closed auctions) ----------
export const priceObservations: PriceObservation[] = [];
let priceSeq = 1;
orders.forEach((o) => {
  priceObservations.push({
    id: `PRC-${String(priceSeq++).padStart(5, "0")}`,
    crop: o.crop,
    grade: o.grade,
    district: pgById(o.pg_id ?? "")?.district ?? packhouses.find((p) => p.packhouse_id === o.packhouse_id)?.district ?? "Karnal",
    channel: o.channel,
    price_per_qtl: o.agreed_price_per_qtl,
    observed_on: o.placed_on,
    source: "Order",
  });
});
auctions.filter((a) => a.status === "Closed" && a.winning_bid_id).forEach((a) => {
  const bid = a.bids.find((b) => b.bid_id === a.winning_bid_id)!;
  const listing = listings.find((l) => l.listing_id === a.listing_id)!;
  priceObservations.push({
    id: `PRC-${String(priceSeq++).padStart(5, "0")}`,
    crop: a.crop,
    grade: listing.grade,
    district: listing.district,
    channel: listing.channels[0] ?? "Wholesale",
    price_per_qtl: bid.amount_per_qtl,
    observed_on: isoDate(new Date(bid.placed_at)),
    source: "Auction",
  });
});
priceObservations.sort((a, b) => (a.observed_on < b.observed_on ? 1 : -1));

// ---------- Derived marketplace helpers ----------
export function listingsByPg(pg_id: string): Listing[] {
  return listings.filter((l) => l.pg_id === pg_id);
}
export function listingsByPackhouse(packhouse_id: string): Listing[] {
  return listings.filter((l) => l.packhouse_id === packhouse_id);
}
export function ordersByBuyer(buyer_id: string): Order[] {
  return orders.filter((o) => o.buyer_id === buyer_id);
}
export function ordersForListingOwner(pg_id?: string | null, packhouse_id?: string | null): Order[] {
  return orders.filter((o) => (pg_id && o.pg_id === pg_id) || (packhouse_id && o.packhouse_id === packhouse_id));
}
export function auctionByListing(listing_id: string): Auction | undefined {
  return auctions.find((a) => a.listing_id === listing_id);
}
export function listingById(listing_id: string): Listing | undefined {
  return listings.find((l) => l.listing_id === listing_id);
}
export function buyerById(buyer_id: string): Buyer | undefined {
  return buyers.find((b) => b.buyer_id === buyer_id);
}
export function packhouseById(packhouse_id: string): Packhouse | undefined {
  return packhouses.find((p) => p.packhouse_id === packhouse_id);
}

// ==================== Module 3: Inventory, Transaction & Benefit Management ====================
// Built on top of the orders already seeded above - every lot traces back to a real
// crop plan and, where dispatched, a real order.

const LOT_STAGE_SEQUENCE: LotStage[] = ["Harvested", "Received at Packhouse", "Graded", "Packed", "Dispatched", "Delivered to Buyer"];

function stagesReachedFor(order: Order | null): LotStage[] {
  if (!order) return LOT_STAGE_SEQUENCE.slice(0, rndInt(1, 3));
  switch (order.status) {
    case "Placed":
      return LOT_STAGE_SEQUENCE.slice(0, 3); // Harvested, Received, Graded
    case "Confirmed":
      return LOT_STAGE_SEQUENCE.slice(0, 4); // ...Packed
    case "In Transit":
      return LOT_STAGE_SEQUENCE.slice(0, 5); // ...Dispatched
    case "Delivered":
      return LOT_STAGE_SEQUENCE.slice(0, 6); // ...Delivered to Buyer
    case "Cancelled":
    case "Disputed":
      return LOT_STAGE_SEQUENCE.slice(0, 3);
    default:
      return LOT_STAGE_SEQUENCE.slice(0, 2);
  }
}

const STAGE_ACTOR: Record<LotStage, string> = {
  Harvested: "PG Member",
  "Received at Packhouse": "Packhouse Operator",
  Graded: "Packhouse Operator",
  Packed: "Packhouse Operator",
  Dispatched: "Packhouse Operator",
  "Delivered to Buyer": "Buyer",
};
const STAGE_REMARK: Record<LotStage, string> = {
  Harvested: "Produce harvested and pooled at PG collection point.",
  "Received at Packhouse": "Consignment received and logged at packhouse intake.",
  Graded: "Lot graded and sorted as per quality standards.",
  Packed: "Lot packed and staged for dispatch.",
  Dispatched: "Consignment dispatched to buyer destination.",
  "Delivered to Buyer": "Consignment delivered and receipt confirmed by buyer.",
};

export const inventoryLots: InventoryLot[] = [];
let lotSeq = 1;

// One lot per (order) so lots trace directly to real orders/plans/farmers.
orders.forEach((order) => {
  const listing = listingById(order.listing_id);
  if (!listing) return;
  const plan_id = listing.linked_plan_ids[0] ?? cropPlans.find((p) => p.crop === order.crop)?.plan_id ?? cropPlans[0].plan_id;
  const plan = cropPlans.find((p) => p.plan_id === plan_id) ?? cropPlans[0];
  const stages = stagesReachedFor(order);
  const startedAt = dayOffset(rndInt(6, 20));
  let cursor = new Date(startedAt);
  const history: LotStageEvent[] = stages.map((stage, idx) => {
    if (idx > 0) cursor = new Date(cursor.getTime() + rndInt(3, 20) * 3600 * 1000);
    return { stage, at: cursor.toISOString(), by: STAGE_ACTOR[stage], remark: STAGE_REMARK[stage] };
  });
  inventoryLots.push({
    lot_id: `LOT-${String(lotSeq++).padStart(5, "0")}`,
    plan_id: plan.plan_id,
    farmer_id: plan.farmer_id,
    pg_id: listing.pg_id ?? "",
    packhouse_id: listing.packhouse_id,
    listing_id: listing.listing_id,
    order_id: order.order_id,
    crop: order.crop,
    grade: order.grade,
    quantity_qtl: order.quantity_qtl,
    district: listing.district,
    stage: stages[stages.length - 1],
    history,
    created_on: isoDate(startedAt),
    updated_on: history[history.length - 1].at,
  });
});

// A few additional lots still moving through the packhouse with no order yet
// (fresh harvest awaiting listing) so the value-chain view isn't order-only.
cropPlans
  .filter((p) => p.status === "Harvested")
  .slice(0, 40)
  .forEach((plan) => {
    const farmer = farmerById(plan.farmer_id)!;
    const stages = LOT_STAGE_SEQUENCE.slice(0, rndInt(1, 3));
    const startedAt = dayOffset(rndInt(1, 8));
    let cursor = new Date(startedAt);
    const history: LotStageEvent[] = stages.map((stage, idx) => {
      if (idx > 0) cursor = new Date(cursor.getTime() + rndInt(3, 20) * 3600 * 1000);
      return { stage, at: cursor.toISOString(), by: STAGE_ACTOR[stage], remark: STAGE_REMARK[stage] };
    });
    const pg = pgById(farmer.pg_id);
    const linkedPh = packhouses.find((ph) => ph.linked_pg_ids.includes(farmer.pg_id));
    inventoryLots.push({
      lot_id: `LOT-${String(lotSeq++).padStart(5, "0")}`,
      plan_id: plan.plan_id,
      farmer_id: plan.farmer_id,
      pg_id: farmer.pg_id,
      packhouse_id: stages.length > 1 ? linkedPh?.packhouse_id ?? null : null,
      listing_id: null,
      order_id: null,
      crop: plan.crop,
      grade: pick(GRADES),
      quantity_qtl: Math.round(plan.expected_yield_qtl * rnd(0.5, 0.9)),
      district: farmer.district,
      stage: stages[stages.length - 1],
      history,
      created_on: isoDate(startedAt),
      updated_on: history[history.length - 1].at,
    });
    void pg;
  });

export function lotsByPg(pg_id: string): InventoryLot[] {
  return inventoryLots.filter((l) => l.pg_id === pg_id);
}
export function lotsByPackhouse(packhouse_id: string): InventoryLot[] {
  return inventoryLots.filter((l) => l.packhouse_id === packhouse_id);
}
export function lotsByFarmer(farmer_id: string): InventoryLot[] {
  return inventoryLots.filter((l) => l.farmer_id === farmer_id);
}
export function lotsForOrder(order_id: string): InventoryLot | undefined {
  return inventoryLots.find((l) => l.order_id === order_id);
}

// ---------- Financial transaction archive (immutable audit records) ----------
export const transactions: TransactionRecord[] = [];
let txnSeq = 1;

orders
  .filter((o) => o.status !== "Cancelled")
  .forEach((o) => {
    const grossAmount = o.quantity_qtl * o.agreed_price_per_qtl;
    const commissionRate = 0.02;
    const commission = Math.round(grossAmount * commissionRate);
    const payout = grossAmount - commission;
    const recordedAt = o.history[o.history.length - 1]?.at ?? o.placed_on;
    const rows: { type: TransactionType; amount: number }[] = [
      { type: "Sale Proceeds", amount: grossAmount },
      { type: o.pg_id ? "Aggregator Commission" : "Packhouse Service Fee", amount: commission },
      { type: "Farmer Payout", amount: payout },
    ];
    rows.forEach((r) => {
      const status: TransactionStatus = o.status === "Delivered" ? "Reconciled" : o.status === "Disputed" ? "Disputed" : "Recorded";
      transactions.push({
        transaction_id: `TXN-${String(txnSeq++).padStart(5, "0")}`,
        order_id: o.order_id,
        type: r.type,
        pg_id: o.pg_id,
        packhouse_id: o.packhouse_id,
        buyer_id: o.buyer_id,
        amount: r.amount,
        status,
        recorded_on: isoDate(new Date(recordedAt)),
        reference_no: `HRFN/${o.order_id}/${r.type.replace(/\s+/g, "").toUpperCase()}`,
        narrative: `${r.type} for order ${o.order_id} (${o.crop}, ${o.quantity_qtl} Qtl @ Rs ${o.agreed_price_per_qtl}/Qtl).`,
      });
    });
  });

export function transactionsByPg(pg_id: string): TransactionRecord[] {
  return transactions.filter((t) => t.pg_id === pg_id);
}
export function transactionsByPackhouse(packhouse_id: string): TransactionRecord[] {
  return transactions.filter((t) => t.packhouse_id === packhouse_id);
}
export function transactionsByBuyer(buyer_id: string): TransactionRecord[] {
  return transactions.filter((t) => t.buyer_id === buyer_id);
}

// ---------- Benefit / DBT linkage (mocked MFMB adapter) ----------
const BENEFIT_SCHEMES: BenefitScheme[] = ["MFMB Price Deficiency Payment", "MFMB Bhavantar Bharpai", "MFMB Input Subsidy"];

export const benefitRecords: BenefitRecord[] = [];
let benefitSeq = 1;

farmerMembers
  .filter((f) => f.affiliation_status === "Active")
  .forEach((farmer) => {
    if (rand() < 0.35) return; // not every farmer has an active benefit claim
    const scheme = pick(BENEFIT_SCHEMES);
    const linkedOrder = orders.find((o) => {
      const l = listingById(o.listing_id);
      return l?.linked_farmer_ids.includes(farmer.farmer_id);
    });
    const appliedOn = dayOffset(rndInt(10, 60));
    const roll = rand();
    const status: BenefitRecord["status"] =
      roll < 0.15 ? "Applied" : roll < 0.35 ? "Under Verification" : roll < 0.55 ? "Sanctioned" : roll < 0.92 ? "Disbursed" : "Rejected";
    const claimed = rndInt(4000, 22000);
    const sanctioned = status === "Applied" || status === "Under Verification" || status === "Rejected" ? null : Math.round(claimed * rnd(0.85, 1));
    const disbursed = status === "Disbursed" ? sanctioned : null;
    const disbursedOn = disbursed ? isoDate(dayOffset(rndInt(1, 9))) : null;
    benefitRecords.push({
      benefit_id: `BNF-${String(benefitSeq++).padStart(5, "0")}`,
      farmer_id: farmer.farmer_id,
      pg_id: farmer.pg_id,
      district: farmer.district,
      scheme,
      linked_order_id: linkedOrder?.order_id ?? null,
      applied_on: isoDate(appliedOn),
      status,
      amount_claimed: claimed,
      amount_sanctioned: sanctioned,
      amount_disbursed: disbursed,
      disbursed_on: disbursedOn,
      mfmb_reference: `MFMB/HRY/${farmer.district.slice(0, 3).toUpperCase()}/${rndInt(10000, 99999)}`,
      remark:
        status === "Rejected"
          ? "Claim rejected - eligibility mismatch on MFMB registry (simulated)."
          : status === "Disbursed"
            ? "Amount credited to registered bank account via MFMB (simulated)."
            : "Awaiting next MFMB disbursal cycle (simulated).",
    });
  });

export function benefitsByFarmer(farmer_id: string): BenefitRecord[] {
  return benefitRecords.filter((b) => b.farmer_id === farmer_id);
}
export function benefitsByPg(pg_id: string): BenefitRecord[] {
  return benefitRecords.filter((b) => b.pg_id === pg_id);
}
export function benefitsByDistrict(district: District): BenefitRecord[] {
  return benefitRecords.filter((b) => b.district === district);
}

// ==================== Module 4: E-Community & Stakeholder Collaboration ====================

const QUESTION_TEMPLATES: { title: string; body: string; crop: Crop | null }[] = [
  { title: "Yellowing leaves on Kinnow saplings", body: "Several young Kinnow plants in my orchard are showing yellow leaves after the last irrigation cycle. Is this a nutrient deficiency or a watering issue?", crop: "Kinnow" },
  { title: "Best sowing window for Rabi onion this year", body: "With the delayed monsoon withdrawal, should we push the Rabi onion sowing window by a week in the Sirsa belt?", crop: "Onion" },
  { title: "Packhouse grading rejection rate seems high", body: "Our last two lots sent to the packhouse had a higher than usual Grade C rejection rate. Any change in grading calibration we should know about?", crop: "Tomato" },
  { title: "Query on Bhavantar Bharpai eligibility", body: "I sold my potato produce through the PG listing last month - will that automatically be considered for Bhavantar Bharpai, or do I need to apply separately?", crop: "Potato" },
  { title: "Guava fruit fly infestation advisory needed", body: "Seeing early signs of fruit fly damage on Guava in our village. Is there a recommended trap density and spray schedule?", crop: "Guava" },
  { title: "Delay in e-Kharid price feed update", body: "The live price board hasn't reflected this week's mandi rates for Mango. When is the next feed refresh expected?", crop: "Mango" },
];
const DISCUSSION_TEMPLATES: { title: string; body: string; crop: Crop | null }[] = [
  { title: "Sharing our PG's staggered dispatch experience", body: "We tried staggering dispatch across three days last season for tomato and saw better realised prices. Sharing the schedule in case it helps other PGs.", crop: "Tomato" },
  { title: "Cold-chain subsidy application - our experience", body: "Our PG's application for the cold-chain capital subsidy scheme was processed in about six weeks. Happy to share the document checklist that worked for us.", crop: null },
  { title: "Group procurement of grading crates", body: "A few PGs in Karnal are pooling orders for grading crates to get a better rate. Interested members can reach out.", crop: null },
];

const POST_AUTHORS = farmerMembers.filter((f) => f.affiliation_status === "Active");

export const communityPosts: CommunityPost[] = [];
let postSeq = 1;
let replySeq = 1;

QUESTION_TEMPLATES.forEach((t, i) => {
  const author = POST_AUTHORS[i % POST_AUTHORS.length];
  const postedOn = dayOffset(rndInt(2, 25));
  const roll = rand();
  const resolution_status: CommunityPost["resolution_status"] = roll < 0.35 ? "Open" : roll < 0.65 ? "In Progress" : "Resolved";
  const replies: PostReply[] = [];
  if (resolution_status !== "Open") {
    replies.push({
      reply_id: `RPL-${String(replySeq++).padStart(5, "0")}`,
      author_name: "DPMU " + author.district,
      author_role: "DoH/PMU/DPMU Official",
      body:
        resolution_status === "Resolved"
          ? "Reviewed with the field horticulture officer - guidance shared with the PG directly and issue closed."
          : "Field team has been alerted and is looking into this; will update shortly.",
      posted_on: isoDate(dayOffset(rndInt(0, 8))),
    });
  }
  communityPosts.push({
    post_id: `PST-${String(postSeq++).padStart(5, "0")}`,
    type: "Question",
    title: t.title,
    body: t.body,
    crop: t.crop,
    district: author.district,
    pg_id: author.pg_id,
    author_farmer_id: author.farmer_id,
    posted_on: isoDate(postedOn),
    resolution_status,
    moderation_status: i === 1 ? "Flagged" : "Visible",
    flagged_reason: i === 1 ? "Reported by another member as possibly containing a promotional link (simulated flag for demo)." : null,
    replies,
  });
});
DISCUSSION_TEMPLATES.forEach((t, i) => {
  const author = POST_AUTHORS[(i + 3) % POST_AUTHORS.length];
  communityPosts.push({
    post_id: `PST-${String(postSeq++).padStart(5, "0")}`,
    type: "Discussion",
    title: t.title,
    body: t.body,
    crop: t.crop,
    district: author.district,
    pg_id: author.pg_id,
    author_farmer_id: author.farmer_id,
    posted_on: isoDate(dayOffset(rndInt(3, 30))),
    resolution_status: "Resolved",
    moderation_status: "Visible",
    flagged_reason: null,
    replies: [],
  });
});

export function postsVisibleToModeration(): CommunityPost[] {
  return communityPosts;
}
export function postsByFarmer(farmer_id: string): CommunityPost[] {
  return communityPosts.filter((p) => p.author_farmer_id === farmer_id);
}

// ---------- Advisories (targeted, authored by PMU/DPMU) ----------
const ADVISORY_DEFS: { title: string; body: string; target: AdvisoryTargetAudience; target_crop: Crop | null; target_district: District | null; target_pg_id: string | null; issued_by_role: "PMU" | "DPMU" }[] = [
  {
    title: "Preventive spray schedule for Tomato Leaf Curl Virus",
    body: "Field surveillance across Karnal and Panipat shows elevated whitefly activity. Use certified virus-free seedlings and rotate insecticide groups; avoid continuous cropping of tomato in the same block.",
    target: "Specific Crop",
    target_crop: "Tomato",
    target_district: null,
    target_pg_id: null,
    issued_by_role: "DPMU",
  },
  {
    title: "Kinnow harvest-window advisory - Sirsa belt",
    body: "Based on brix readings from sample orchards, optimal harvest window for Kinnow in the Sirsa belt begins in the next 10-14 days. Coordinate with the packhouse to avoid post-harvest quality loss.",
    target: "Specific PG",
    target_crop: "Kinnow",
    target_district: "Sirsa",
    target_pg_id: "PG-002",
    issued_by_role: "DPMU",
  },
  {
    title: "MFMB claim window reminder for this quarter",
    body: "PG managers to remind eligible members that MFMB Bhavantar Bharpai claims for this quarter's sales must be submitted within 30 days of order delivery to remain eligible.",
    target: "All Farmers",
    target_crop: null,
    target_district: null,
    target_pg_id: null,
    issued_by_role: "PMU",
  },
];
export const advisories: Advisory[] = ADVISORY_DEFS.map((a, i) => ({
  advisory_id: `ADV-${String(i + 1).padStart(4, "0")}`,
  title: a.title,
  body: a.body,
  issuing_authority: a.issued_by_role === "PMU" ? "PMU - Haryana Horticulture Digital Mission" : `DPMU ${a.target_district ?? "Haryana"}`,
  issued_by_role: a.issued_by_role,
  issued_on: isoDate(dayOffset(rndInt(1, 15))),
  target: a.target,
  target_crop: a.target_crop,
  target_district: a.target_district,
  target_pg_id: a.target_pg_id,
  moderation_status: "Visible",
}));

export function advisoriesForFarmer(farmer: FarmerMember): Advisory[] {
  return advisories.filter((a) => {
    if (a.moderation_status !== "Visible") return false;
    if (a.target === "All Farmers") return true;
    if (a.target === "Specific Crop") return cropPlans.some((cp) => cp.farmer_id === farmer.farmer_id && cp.crop === a.target_crop);
    if (a.target === "Specific District") return a.target_district === farmer.district;
    if (a.target === "Specific PG") return a.target_pg_id === farmer.pg_id;
    return false;
  });
}

// ==================== Module 5: Market, Field Intelligence & Advisory ====================

// ---------- Simulated field/IoT sensor readings, one latest reading per land parcel ----------
// There is no real sensor hardware behind this - values are deterministically generated
// from the existing seed so every UI surface can clearly label it as simulated data.
export const fieldSensorReadings: FieldSensorReading[] = landParcels.map((parcel, i) => {
  const soil_moisture_pct = Math.round(rnd(parcel.irrigation_source === "Rainfed" ? 18 : 32, parcel.irrigation_source === "Rainfed" ? 45 : 68));
  const ambient_temperature_c = Math.round(rnd(27, 41));
  const soil_temperature_c = Math.round(ambient_temperature_c - rnd(2, 6));
  const humidity_pct = Math.round(rnd(30, 75));
  const rainfall_mm_24h = rand() < 0.2 ? Math.round(rnd(5, 40)) : 0;
  let advisory_flag: FieldSensorReading["advisory_flag"] = "Normal";
  if (soil_moisture_pct < 25) advisory_flag = "Low Moisture";
  else if (ambient_temperature_c >= 38) advisory_flag = "Heat Stress";
  else if (rainfall_mm_24h >= 25) advisory_flag = "Excess Rainfall";
  return {
    reading_id: `FSR-${String(i + 1).padStart(5, "0")}`,
    parcel_id: parcel.parcel_id,
    district: parcel.district,
    recorded_at: new Date(TODAY.getTime() - rndInt(5, 240) * 60000).toISOString(),
    soil_moisture_pct,
    soil_temperature_c,
    ambient_temperature_c,
    humidity_pct,
    rainfall_mm_24h,
    advisory_flag,
  };
});

export function fieldReadingsByFarmer(farmer_id: string): FieldSensorReading[] {
  const parcelIds = parcelsByFarmer(farmer_id).map((p) => p.parcel_id);
  return fieldSensorReadings.filter((r) => parcelIds.includes(r.parcel_id));
}
export function fieldReadingsByDistrict(district: District): FieldSensorReading[] {
  return fieldSensorReadings.filter((r) => r.district === district);
}

// ---------- Pre-market demand/price signals, derived from existing orders + price observations ----------
export const marketSignals: MarketSignal[] = (() => {
  const signals: MarketSignal[] = [];
  let seq = 1;
  DISTRICTS.forEach((district) => {
    (Object.keys(BASE_PRICE_PER_QTL) as Crop[]).forEach((crop) => {
      const obs = priceObservations
        .filter((p) => p.crop === crop && p.district === district)
        .sort((a, b) => (a.observed_on < b.observed_on ? -1 : 1));
      if (obs.length < 2) return;
      const cropOrders = orders.filter((o) => o.crop === crop && o.status !== "Cancelled");
      const districtOrders = cropOrders.filter((o) => {
        const listing = listingById(o.listing_id);
        return listing?.district === district;
      });
      if (districtOrders.length === 0) return;
      const first = obs[0].price_per_qtl;
      const last = obs[obs.length - 1].price_per_qtl;
      const pctChange = Math.round(((last - first) / first) * 1000) / 10;
      const direction: SignalDirection = pctChange > 2 ? "Rising" : pctChange < -2 ? "Falling" : "Stable";
      const strength: SignalStrength = Math.abs(pctChange) > 8 ? "Strong" : Math.abs(pctChange) > 3 ? "Moderate" : "Mild";
      const avgPrice = Math.round(obs.reduce((s, o) => s + o.price_per_qtl, 0) / obs.length);
      const narrative =
        direction === "Rising"
          ? `${crop} demand trending up among ${district} buyers this season - ${districtOrders.length} recent order(s), average realised price up ${pctChange}%.`
          : direction === "Falling"
          ? `${crop} prices softening in ${district} - ${districtOrders.length} recent order(s), average realised price down ${Math.abs(pctChange)}%.`
          : `${crop} demand steady in ${district} - ${districtOrders.length} recent order(s), price broadly stable.`;
      signals.push({
        signal_id: `MS-${String(seq++).padStart(4, "0")}`,
        crop,
        district,
        direction,
        strength,
        narrative,
        order_count: districtOrders.length,
        avg_price_per_qtl: avgPrice,
        price_change_pct: pctChange,
      });
    });
  });
  return signals.sort((a, b) => Math.abs(b.price_change_pct) - Math.abs(a.price_change_pct));
})();

export function marketSignalsForDistrict(district: District): MarketSignal[] {
  return marketSignals.filter((s) => s.district === district);
}
export function marketSignalsForCrops(crops: Crop[]): MarketSignal[] {
  return marketSignals.filter((s) => crops.includes(s.crop));
}

// ---------- Staged/experimental demand forecasts ----------
// Directional only - built purely from seed + demo transaction data. NOT a validated
// statistical model; every UI surface using this must carry a visible disclaimer.
export const demandForecasts: DemandForecast[] = (() => {
  const forecasts: DemandForecast[] = [];
  let seq = 1;
  DISTRICTS.forEach((district) => {
    (Object.keys(BASE_PRICE_PER_QTL) as Crop[]).forEach((crop) => {
      const cropOrders = orders.filter((o) => o.crop === crop && o.status !== "Cancelled").filter((o) => listingById(o.listing_id)?.district === district);
      if (cropOrders.length === 0) return;
      const totalQty = cropOrders.reduce((s, o) => s + o.quantity_qtl, 0);
      const avgPrice = Math.round(cropOrders.reduce((s, o) => s + o.agreed_price_per_qtl, 0) / cropOrders.length);
      const signal = marketSignals.find((s) => s.crop === crop && s.district === district);
      const growthFactor = signal ? 1 + signal.price_change_pct / 200 : 1.03;
      const projectedDemand = Math.round(totalQty * growthFactor * rnd(0.95, 1.15));
      const projectedPrice = Math.round(avgPrice * (1 + rnd(-0.03, 0.06)));
      const trend: ForecastTrend =
        signal && signal.direction === "Falling" ? "Glut Risk" : signal && signal.direction === "Rising" ? "Opportunity" : "Balanced";
      const channelCounts = new Map<SalesChannel, number>();
      cropOrders.forEach((o) => channelCounts.set(o.channel, (channelCounts.get(o.channel) ?? 0) + 1));
      const recommended_channel = [...channelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const narrative =
        trend === "Glut Risk"
          ? `Softening realised prices for ${crop} in ${district} suggest a possible oversupply next season - consider diversifying channels or staggering harvest.`
          : trend === "Opportunity"
          ? `Rising demand for ${crop} in ${district} points to a favourable window next season, particularly via ${recommended_channel ?? "existing"} channel.`
          : `${crop} demand in ${district} looks broadly balanced heading into next season.`;
      forecasts.push({
        forecast_id: `FC-${String(seq++).padStart(4, "0")}`,
        crop,
        district,
        seasons_of_history: 1,
        projected_next_season_demand_qtl: projectedDemand,
        projected_price_per_qtl: projectedPrice,
        trend,
        recommended_channel,
        narrative,
        confidence: cropOrders.length >= 4 ? "Medium" : "Low",
      });
    });
  });
  return forecasts;
})();

// ---------- Season-over-season realisation feedback loop: crop plan -> listing -> order -> realisation -> next-season recommendation ----------
export const seasonRecommendations: SeasonRecommendation[] = (() => {
  const out: SeasonRecommendation[] = [];
  producerGroups.forEach((pg) => {
    const pgListings = listingsByPg(pg.pg_id);
    const byCrop = new Map<Crop, Listing[]>();
    pgListings.forEach((l) => {
      if (!byCrop.has(l.crop)) byCrop.set(l.crop, []);
      byCrop.get(l.crop)!.push(l);
    });
    byCrop.forEach((cropListings, crop) => {
      const listingIds = cropListings.map((l) => l.listing_id);
      const cropOrders = orders.filter((o) => listingIds.includes(o.listing_id));
      if (cropOrders.length === 0) return;
      const nonCancelled = cropOrders.filter((o) => o.status !== "Cancelled");
      const delivered = cropOrders.filter((o) => o.status === "Delivered");
      const avgRealisation = nonCancelled.length ? Math.round(nonCancelled.reduce((s, o) => s + o.agreed_price_per_qtl, 0) / nonCancelled.length) : 0;
      const channelCounts = new Map<SalesChannel, number>();
      nonCancelled.forEach((o) => channelCounts.set(o.channel, (channelCounts.get(o.channel) ?? 0) + 1));
      const best_channel = [...channelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const fulfilment_rate_pct = cropOrders.length ? Math.round((delivered.length / cropOrders.length) * 100) : 0;
      const seasonsAnalysed = new Set(cropListings.flatMap((l) => l.linked_plan_ids.map((pid) => cropPlans.find((cp) => cp.plan_id === pid)?.season).filter(Boolean))).size || 1;
      const recommendation =
        fulfilment_rate_pct >= 70
          ? `Based on your last ${seasonsAnalysed} season(s)' ${crop} orders (avg. Rs ${avgRealisation}/Qtl, ${fulfilment_rate_pct}% fulfilled), continue pooling ${crop} for the ${best_channel ?? "current"} channel next season.`
          : `Based on your last ${seasonsAnalysed} season(s)' ${crop} orders, fulfilment was only ${fulfilment_rate_pct}% - consider tighter grading before listing or exploring the ${best_channel ?? "wholesale"} channel next season.`;
      out.push({
        pg_id: pg.pg_id,
        crop,
        seasons_analysed: seasonsAnalysed,
        orders_analysed: cropOrders.length,
        avg_realisation_per_qtl: avgRealisation,
        best_channel,
        fulfilment_rate_pct,
        recommendation,
      });
    });
  });
  return out;
})();

export function seasonRecommendationsForPg(pg_id: string): SeasonRecommendation[] {
  return seasonRecommendations.filter((r) => r.pg_id === pg_id);
}

// ==================== Module 6: MIS, Dashboards & Reporting ====================

// Audit trail of report access. Mutated at runtime as personas view/export reports in
// this demo session; not persisted across a page reload (in-memory only, by design).
export const reportAccessLog: ReportAccessLogEntry[] = [];
let reportLogSeq = 1;
export function logReportAccess(
  role_id: string,
  role_title: string,
  report: ReportAccessLogEntry["report"],
  district_filter: ReportAccessLogEntry["district_filter"],
  action: ReportAccessLogEntry["action"] = "Viewed"
): void {
  reportAccessLog.unshift({
    log_id: `RAL-${String(reportLogSeq++).padStart(5, "0")}`,
    role_id,
    role_title,
    report,
    district_filter,
    accessed_on: new Date().toISOString(),
    action,
  });
}

// ---------- Fulfilment centres serving out-of-state / metro demand (Chandigarh, Faridabad, Gurugram) ----------
// These are downstream demand hubs for the platform's institutional and digital-commerce buyers
// (e.g. HORECA HQ Chandigarh, QuickBasket / retail demand routed via Gurugram-Faridabad NCR belt),
// not Producer Group districts - fulfilment volume is derived from real platform order value so
// the split is grounded in actual marketplace activity rather than an arbitrary split.
const totalOrderQty = orders.filter((o) => o.status !== "Cancelled").reduce((sum, o) => sum + o.quantity_qtl, 0);

const FULFILMENT_CENTER_SHARE: { center: string; demandShare: number; fulfilmentEfficiency: number }[] = [
  { center: "Chandigarh", demandShare: 0.3, fulfilmentEfficiency: 0.88 },
  { center: "Faridabad", demandShare: 0.34, fulfilmentEfficiency: 0.79 },
  { center: "Gurugram", demandShare: 0.36, fulfilmentEfficiency: 0.92 },
];

export const fulfilmentCenterStats: FulfilmentCenterStat[] = FULFILMENT_CENTER_SHARE.map((c) => {
  const baseDemand = Math.max(40, Math.round((totalOrderQty || 200) * c.demandShare * rnd(0.85, 1.15)));
  const fulfilled = Math.round(baseDemand * c.fulfilmentEfficiency * rnd(0.95, 1.05));
  return {
    center: c.center,
    demand_qtl: baseDemand,
    fulfilled_qtl: Math.min(baseDemand, fulfilled),
    fulfilment_rate_pct: Math.round((Math.min(baseDemand, fulfilled) / baseDemand) * 100),
  };
});
