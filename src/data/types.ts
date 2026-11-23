// Data model - Foundation phase (Module 1: Crops E-Market & Data Community Hub)
// Entities per FRS Section 9, scoped to what Phase P0 needs.

export type District =
  | "Karnal"
  | "Kurukshetra"
  | "Sirsa"
  | "Ambala"
  | "Hisar"
  | "Panipat";

export type Crop =
  | "Kinnow"
  | "Guava"
  | "Tomato"
  | "Potato"
  | "Onion"
  | "Mango";

export type Season = "Kharif" | "Rabi" | "Zaid";

export type AffiliationStatus = "Active" | "Pending Verification" | "Inactive";

export type MemberRole = "Member" | "PG Manager" | "Aggregator";

export interface LandParcel {
  parcel_id: string;
  farmer_id: string;
  district: District;
  village: string;
  survey_no: string;
  area_acres: number;
  irrigation_source: "Canal" | "Tube Well" | "Rainfed";
  soil_type: string;
  geo_tagged: boolean;
}

export interface CropPlan {
  plan_id: string;
  farmer_id: string;
  parcel_id: string;
  crop: Crop;
  season: Season;
  year: string; // e.g. "2026-27"
  area_acres: number;
  expected_yield_qtl: number;
  sowing_date: string;
  expected_harvest_date: string;
  status: "Planned" | "Sown" | "Growing" | "Harvested";
}

export interface FarmerMember {
  farmer_id: string;
  name: string;
  father_or_husband_name: string;
  gender: "Male" | "Female";
  phone: string;
  district: District;
  village: string;
  pg_id: string;
  role_in_pg: MemberRole;
  affiliation_status: AffiliationStatus;
  joined_on: string;
  land_holding_acres: number;
  farm_trace_id: string | null; // mocked govt system id, null if not yet synced
  ekyc_verified: boolean;
  data_completeness_pct: number; // derived indicator for PMU/DPMU view
}

export interface ProducerGroup {
  pg_id: string;
  name: string;
  district: District;
  registration_no: string;
  registered_on: string;
  primary_crops: Crop[];
  manager_farmer_id: string;
  member_count: number;
  total_land_acres: number;
}

export type ProgrammeAudience =
  | "All"
  | "Farmer/PG Member"
  | "PG Manager/Aggregator"
  | "Packhouse/FC Operator"
  | "Buyer"
  | "DoH/PMU/DPMU Official";

export interface ProgrammeItem {
  id: string;
  type: "Scheme" | "Circular" | "Advisory";
  title: string;
  issuing_authority: string;
  issued_on: string;
  summary: string;
  visible_to: ProgrammeAudience[];
  reference_no: string;
  status: "Open" | "Closed" | "Informational";
}

export type SyncSystem = "Farm Trace" | "e-Girdwari" | "e-Kharid" | "MFMB" | "AgriStack/InDEA";

export interface SyncLogEntry {
  id: string;
  system: SyncSystem;
  scope: string; // e.g. farmer_id or pg_id this sync run touched
  started_at: string;
  completed_at: string | null;
  status: "Success" | "Failed" | "In Progress";
  records_synced: number;
  error_message: string | null;
}

export interface Packhouse {
  packhouse_id: string;
  name: string;
  district: District;
  capacity_mt_per_day: number;
  linked_pg_ids: string[];
}

export type BuyerType = "Retail Chain" | "Institutional / HORECA" | "Digital Commerce" | "Wholesale / Mandi Trader";

export interface Buyer {
  buyer_id: string;
  name: string;
  type: BuyerType;
  hq_city: string;
  preferred_crops: Crop[];
}

// ---------- Module 2: Unified E-Marketplace & Trading Engine ----------

export type Grade = "Grade A (Premium)" | "Grade B (Standard)" | "Grade C (Processing)";

// Multi-channel catalogue: a listing carries one or more channel tags rather than
// living in a separate per-channel catalogue.
export type SalesChannel = "Retail" | "Institutional" | "Digital Commerce" | "Wholesale";

// Documented extension point for future channels (quick-commerce, interoperable
// marketplaces, etc.). Not implemented in this phase - listed here so the
// listing.channels field and matching logic have a stable place to grow into.
export type FutureSalesChannel = "Quick Commerce" | "Interoperable Marketplace (ONDC-style)";

export interface ChannelExtension {
  channel: FutureSalesChannel;
  description: string;
  status: "Planned" | "Not Implemented";
}

export type ListingSource = "PG" | "Packhouse";
export type ListingFormat = "Fixed Price" | "Auction";
export type ListingStatus = "Active" | "Matched" | "Fulfilled" | "Closed" | "Expired";

export interface Listing {
  listing_id: string;
  source_type: ListingSource;
  pg_id: string | null;
  packhouse_id: string | null;
  crop: Crop;
  grade: Grade;
  quantity_qtl: number;
  quantity_available_qtl: number;
  district: District;
  village: string;
  available_from: string;
  available_until: string;
  channels: SalesChannel[];
  format: ListingFormat;
  price_per_qtl: number | null; // set for Fixed Price; null for Auction (reserve used instead)
  reserve_price_per_qtl: number | null; // Auction floor
  linked_plan_ids: string[]; // traceability back to Phase P0 crop plans
  linked_farmer_ids: string[]; // members whose produce is pooled in this listing
  created_by_farmer_id: string;
  created_on: string;
  status: ListingStatus;
  notes: string;
}

export type MatchTier = "Strong Match" | "Good Match" | "Partial Match";

export interface BuyerRequirement {
  requirement_id: string;
  buyer_id: string;
  crop: Crop;
  min_grade: Grade;
  quantity_qtl: number;
  district_preference: District[];
  channel: SalesChannel;
  max_price_per_qtl: number | null;
}

export type OrderStatus =
  | "Placed"
  | "Confirmed"
  | "In Transit"
  | "Delivered"
  | "Cancelled"
  | "Disputed";

export interface OrderStatusEvent {
  status: OrderStatus;
  at: string;
  by: string; // role/persona label who made the change
  remark: string;
}

export interface Order {
  order_id: string;
  listing_id: string;
  buyer_id: string;
  pg_id: string | null;
  packhouse_id: string | null;
  crop: Crop;
  grade: Grade;
  quantity_qtl: number;
  agreed_price_per_qtl: number;
  channel: SalesChannel;
  placed_on: string;
  status: OrderStatus;
  history: OrderStatusEvent[];
}

export interface Bid {
  bid_id: string;
  listing_id: string;
  buyer_id: string;
  amount_per_qtl: number;
  placed_at: string;
  status: "Active" | "Outbid" | "Winning" | "Won" | "Lost";
}

export interface Auction {
  auction_id: string;
  listing_id: string;
  crop: Crop;
  opens_at: string;
  closes_at: string;
  status: "Scheduled" | "Open" | "Closed";
  bids: Bid[];
  winning_bid_id: string | null;
}

export interface PriceObservation {
  id: string;
  crop: Crop;
  grade: Grade;
  district: District;
  channel: SalesChannel;
  price_per_qtl: number;
  observed_on: string;
  source: "Order" | "Auction" | "Market Feed (e-Kharid, mocked)";
}

// ==================== Module 3: Inventory, Transaction & Benefit Management ====================

export type LotStage =
  | "Harvested"
  | "Received at Packhouse"
  | "Graded"
  | "Packed"
  | "Dispatched"
  | "Delivered to Buyer";

export interface LotStageEvent {
  stage: LotStage;
  at: string;
  by: string;
  remark: string;
}

export interface InventoryLot {
  lot_id: string;
  plan_id: string; // traceability back to Module 1 crop plan
  farmer_id: string;
  pg_id: string;
  packhouse_id: string | null;
  listing_id: string | null;
  order_id: string | null;
  crop: Crop;
  grade: Grade;
  quantity_qtl: number;
  district: District;
  stage: LotStage;
  history: LotStageEvent[];
  created_on: string;
  updated_on: string;
}

export type TransactionType = "Sale Proceeds" | "Aggregator Commission" | "Farmer Payout" | "Packhouse Service Fee";
export type TransactionStatus = "Recorded" | "Reconciled" | "Disputed";

export interface TransactionRecord {
  transaction_id: string;
  order_id: string;
  type: TransactionType;
  pg_id: string | null;
  packhouse_id: string | null;
  buyer_id: string;
  amount: number;
  status: TransactionStatus;
  recorded_on: string;
  reference_no: string;
  narrative: string;
}

export type BenefitScheme = "MFMB Price Deficiency Payment" | "MFMB Bhavantar Bharpai" | "MFMB Input Subsidy";
export type BenefitStatus = "Applied" | "Under Verification" | "Sanctioned" | "Disbursed" | "Rejected";

export interface BenefitRecord {
  benefit_id: string;
  farmer_id: string;
  pg_id: string;
  district: District;
  scheme: BenefitScheme;
  linked_order_id: string | null;
  applied_on: string;
  status: BenefitStatus;
  amount_claimed: number;
  amount_sanctioned: number | null;
  amount_disbursed: number | null;
  disbursed_on: string | null;
  mfmb_reference: string;
  remark: string;
}

// ==================== Module 4: E-Community & Stakeholder Collaboration ====================

export type PostType = "Question" | "Discussion";
export type ResolutionStatus = "Open" | "In Progress" | "Resolved";
export type ModerationStatus = "Visible" | "Flagged" | "Removed";

export interface PostReply {
  reply_id: string;
  author_name: string;
  author_role: ProgrammeAudience;
  body: string;
  posted_on: string;
}

export interface CommunityPost {
  post_id: string;
  type: PostType;
  title: string;
  body: string;
  crop: Crop | null;
  district: District;
  pg_id: string | null;
  author_farmer_id: string;
  posted_on: string;
  resolution_status: ResolutionStatus;
  moderation_status: ModerationStatus;
  flagged_reason: string | null;
  replies: PostReply[];
}

export type AdvisoryTargetAudience = "All Farmers" | "Specific Crop" | "Specific District" | "Specific PG";

export interface Advisory {
  advisory_id: string;
  title: string;
  body: string;
  issuing_authority: string;
  issued_by_role: "PMU" | "DPMU";
  issued_on: string;
  target: AdvisoryTargetAudience;
  target_crop: Crop | null;
  target_district: District | null;
  target_pg_id: string | null;
  moderation_status: ModerationStatus;
}

// ==================== Module 5: Market, Field Intelligence & Advisory ====================

// Simulated IoT/field sensor reading for a land parcel. Clearly labeled as
// simulated in every UI surface that displays it - there is no real sensor hardware.
export interface FieldSensorReading {
  reading_id: string;
  parcel_id: string;
  district: District;
  recorded_at: string;
  soil_moisture_pct: number;
  soil_temperature_c: number;
  ambient_temperature_c: number;
  humidity_pct: number;
  rainfall_mm_24h: number;
  advisory_flag: "Normal" | "Low Moisture" | "Heat Stress" | "Excess Rainfall";
}

export type SignalDirection = "Rising" | "Falling" | "Stable";
export type SignalStrength = "Strong" | "Moderate" | "Mild";

// Pre-market demand/price signal, derived from existing orders + price observations.
export interface MarketSignal {
  signal_id: string;
  crop: Crop;
  district: District;
  direction: SignalDirection;
  strength: SignalStrength;
  narrative: string;
  order_count: number;
  avg_price_per_qtl: number;
  price_change_pct: number;
}

export type ForecastTrend = "Glut Risk" | "Opportunity" | "Balanced";

// Staged/experimental demand forecast. Derived entirely from seed + demo
// transaction data - directional only, not a validated statistical model.
export interface DemandForecast {
  forecast_id: string;
  crop: Crop;
  district: District;
  seasons_of_history: number;
  projected_next_season_demand_qtl: number;
  projected_price_per_qtl: number;
  trend: ForecastTrend;
  recommended_channel: SalesChannel | null;
  narrative: string;
  confidence: "Low" | "Medium";
}

// Season-over-season realisation feedback loop: crop plan -> listing -> order ->
// realisation -> back into next season's recommendation for the PG/farmer.
export interface SeasonRecommendation {
  pg_id: string;
  crop: Crop;
  seasons_analysed: number;
  orders_analysed: number;
  avg_realisation_per_qtl: number;
  best_channel: SalesChannel | null;
  fulfilment_rate_pct: number;
  recommendation: string;
}

// ==================== Module 6: MIS, Dashboards & Reporting ====================

export type ReportKey = "overview" | "marketplace" | "inventory" | "benefits" | "community";

export interface ReportAccessLogEntry {
  log_id: string;
  role_id: string;
  role_title: string;
  report: ReportKey;
  district_filter: District | "All Districts";
  accessed_on: string;
  action: "Viewed" | "Exported CSV" | "Exported JSON";
}

// ==================== Round 2: SHEP pre-market, PG production plan, outcome KPIs, QC ====================

export type ShepPlanStatus = "Draft" | "Agreed" | "Under Execution";

// SHEP (pre-market) business plan: built from buyer demand and market survey before any crop is sown.
export interface ShepPlan {
  shep_plan_id: string;
  pg_id: string;
  crop: Crop;
  variety: string;
  target_market: string;
  buyer_id: string | null;
  buyer_requirement: string;
  indicative_demand_qtl: number;
  indicative_price_range_per_qtl: { min: number; max: number };
  market_window: string;
  planned_acreage: number;
  expected_production_qtl: number;
  preferred_channel: SalesChannel;
  status: ShepPlanStatus;
}

// Gap/surplus flag on a PG x crop production plan.
export type PlanSignal = "Potential Surplus" | "Demand Gap / Buyer Opportunity" | "On Track";

export interface FulfilmentCenterStat {
  center: string;
  demand_qtl: number;
  fulfilled_qtl: number;
  fulfilment_rate_pct: number;
}
