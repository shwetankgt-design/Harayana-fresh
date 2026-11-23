// Farmer registration (survey) and asset records, plus the seeded asset list.
// The survey shape follows the arecanut farmer survey, adapted to Haryana horticulture.

import { HARYANA_MANDIS, PG_LOCATIONS, type AssetStatus, type AssetType, type LatLng } from "./haryanaMaster";
import { packhouses, producerGroups } from "./seed";

export type YesNo = "Yes" | "No";
export type CaptureMethod = "draw" | "gps-corners" | "gps-walk" | "file";

export interface PlotRecord {
  plot_id: string;
  label: string;
  crop: string;
  reported_area_acres: string;
  boundary: LatLng[];
  capture_method: CaptureMethod | null;
}

export interface CropLine {
  crop: string;
  variety: string;
  season: string;
  area_acres: string;
  expected_yield_qtl: string;
  sowing_month: string;
}

export interface FarmerSurvey {
  survey_id: string;
  farmer_id: string; // empty until first submit, then HRF-xxxxx
  status: "Draft" | "Submitted";
  created_at: string;
  updated_at: string;
  captured_by: string;

  // 1. Farmer & location
  farmer_name: string;
  mobile_no: string;
  mobile_verified: boolean;
  aadhaar_last4: string;
  gender: string;
  age: string;
  guardian_name: string;
  survey_year: string;
  district: string;
  block: string;
  village: string;
  pg_member: YesNo;
  pg_id: string;
  pg_since_year: string;
  pg_benefits: string[];

  // 2. Land & production
  land_own_acres: string;
  land_leased_acres: string;
  horti_area_acres: string;
  crops: CropLine[];
  organic_farming: YesNo;
  organic_certified: YesNo;

  // 3. Sales & logistics
  marketing_channel: string;
  marketing_channel_other: string;
  mandi_name: string;
  rate_inr_per_qtl: string;
  sale_month: string;
  storage_source: string;
  storage_duration_months: string;
  logistics_provider: string;
  logistics_cost_inr_per_qtl: string;

  // 4. Challenges
  challenges: string[];
  challenges_other: string;
  machinery_waiting_days: string;

  // 5. Mechanisation & inputs
  mech_owned: string[];
  mech_rented: string[];
  mech_financed: YesNo;
  input_source: string[];
  input_distance_km: string;
  input_challenges: string[];
  tech_adoption: YesNo;
  tech_adoption_detail: string;

  // 6. Finance & schemes
  income_bracket: string;
  non_farm_income: string[];
  bank_account: YesNo;
  credit_linkage: YesNo;
  credit_source: string;
  credit_amount_inr: string;
  credit_interest_pct: string;
  loan_outcome: string;
  loan_rejection_reason: string;
  kcc_account: YesNo;
  kcc_limit_inr_lakh: string;
  scheme_availed: YesNo;
  schemes: string[];

  // 7. Irrigation & sustainability
  irrigation_source: string[];
  irrigation_challenges: string;
  soil_health_card: YesNo;
  crop_insurance: YesNo;
  crop_insurance_detail: string;
  natural_calamity_5yr: YesNo;

  // 8. Geo-tag & review
  home_location: LatLng | null;
  home_location_accuracy_m: number | null;
  field_photo: string | null;
  plots: PlotRecord[];
}

export function newPlot(index: number): PlotRecord {
  return { plot_id: `PLOT-${Date.now()}-${index}`, label: `Plot ${index + 1}`, crop: "", reported_area_acres: "", boundary: [], capture_method: null };
}

export function emptySurvey(capturedBy: string): FarmerSurvey {
  const now = new Date().toISOString();
  return {
    survey_id: `SRV-${Date.now()}`,
    farmer_id: "",
    status: "Draft",
    created_at: now,
    updated_at: now,
    captured_by: capturedBy,
    farmer_name: "",
    mobile_no: "",
    mobile_verified: false,
    aadhaar_last4: "",
    gender: "Male",
    age: "",
    guardian_name: "",
    survey_year: "2026-27",
    district: "",
    block: "",
    village: "",
    pg_member: "No",
    pg_id: "",
    pg_since_year: "",
    pg_benefits: [],
    land_own_acres: "",
    land_leased_acres: "",
    horti_area_acres: "",
    crops: [{ crop: "", variety: "", season: "Kharif", area_acres: "", expected_yield_qtl: "", sowing_month: "Jul" }],
    organic_farming: "No",
    organic_certified: "No",
    marketing_channel: "Producer Group (PG) / FPO",
    marketing_channel_other: "",
    mandi_name: "",
    rate_inr_per_qtl: "",
    sale_month: "Jan",
    storage_source: "No storage",
    storage_duration_months: "",
    logistics_provider: "",
    logistics_cost_inr_per_qtl: "",
    challenges: [],
    challenges_other: "",
    machinery_waiting_days: "",
    mech_owned: [],
    mech_rented: [],
    mech_financed: "No",
    input_source: [],
    input_distance_km: "",
    input_challenges: [],
    tech_adoption: "No",
    tech_adoption_detail: "",
    income_bracket: "",
    non_farm_income: [],
    bank_account: "Yes",
    credit_linkage: "No",
    credit_source: "",
    credit_amount_inr: "",
    credit_interest_pct: "",
    loan_outcome: "Never applied",
    loan_rejection_reason: "",
    kcc_account: "No",
    kcc_limit_inr_lakh: "",
    scheme_availed: "No",
    schemes: [],
    irrigation_source: [],
    irrigation_challenges: "",
    soil_health_card: "No",
    crop_insurance: "No",
    crop_insurance_detail: "",
    natural_calamity_5yr: "No",
    home_location: null,
    home_location_accuracy_m: null,
    field_photo: null,
    plots: [newPlot(0)],
  };
}

// ---------- Assets ----------

export interface AssetRecord extends LatLng {
  asset_id: string;
  name: string;
  type: AssetType;
  district: string;
  block: string;
  owner: string;
  status: AssetStatus;
  capacity_mt: string; // per day for pack houses and centres, total for storage
  commissioned_year: string;
  linked_pg_ids: string[];
  scheme: string;
  photo: string | null;
  source: "seeded" | "captured";
  location_simulated: boolean;
}

const PACKHOUSE_COORDS: Record<string, LatLng> = {
  "PH-01": { lat: 29.69, lng: 76.995 },
  "PH-02": { lat: 29.54, lng: 75.035 },
  "PH-03": { lat: 30.37, lng: 76.785 },
  "PH-04": { lat: 29.155, lng: 75.73 },
};

const seededAsset = (a: Omit<AssetRecord, "source" | "location_simulated" | "photo" | "scheme" | "block"> & Partial<AssetRecord>): AssetRecord => ({
  block: "",
  scheme: "",
  photo: null,
  source: "seeded",
  location_simulated: true,
  ...a,
});

// Illustrative asset base for the demo. Locations are approximate town centres.
export const SEEDED_ASSETS: AssetRecord[] = [
  ...packhouses.map((ph) =>
    seededAsset({
      asset_id: `AST-${ph.packhouse_id}`,
      name: ph.name,
      type: "Integrated Pack House (Hub)",
      district: ph.district,
      owner: "HSAMB",
      status: "Operational",
      capacity_mt: String(ph.capacity_mt_per_day),
      commissioned_year: "2021",
      linked_pg_ids: ph.linked_pg_ids,
      scheme: "MIDH",
      ...PACKHOUSE_COORDS[ph.packhouse_id],
    })
  ),
  ...producerGroups.map((pg, i) =>
    seededAsset({
      asset_id: `AST-CC-${pg.pg_id}`,
      name: `${PG_LOCATIONS[pg.pg_id].town} Collection Centre`,
      type: "Collection Centre (Spoke)",
      district: pg.district,
      owner: "Producer Group",
      status: i % 4 === 3 ? "Under construction" : "Operational",
      capacity_mt: String(8 + (i % 3) * 4),
      commissioned_year: String(2022 + (i % 3)),
      linked_pg_ids: [pg.pg_id],
      lat: PG_LOCATIONS[pg.pg_id].lat + 0.006,
      lng: PG_LOCATIONS[pg.pg_id].lng + 0.006,
    })
  ),
  seededAsset({ asset_id: "AST-CS-01", name: "Taraori Cold Storage", type: "Cold Storage", district: "Karnal", owner: "Private", status: "Operational", capacity_mt: "5000", commissioned_year: "2016", linked_pg_ids: ["PG-001", "PG-004"], lat: 29.805, lng: 76.925 }),
  seededAsset({ asset_id: "AST-CS-02", name: "Pipli Cold Storage", type: "Cold Storage", district: "Kurukshetra", owner: "Private", status: "Operational", capacity_mt: "3500", commissioned_year: "2018", linked_pg_ids: ["PG-003", "PG-005"], lat: 30.065, lng: 76.885 }),
  seededAsset({ asset_id: "AST-CS-03", name: "Hisar Cold Storage", type: "Cold Storage", district: "Hisar", owner: "Cooperative", status: "Operational", capacity_mt: "2500", commissioned_year: "2019", linked_pg_ids: ["PG-008", "PG-009"], lat: 29.16, lng: 75.705 }),
  seededAsset({ asset_id: "AST-CS-04", name: "Samalkha Cold Storage", type: "Cold Storage", district: "Panipat", owner: "Department of Horticulture", status: "Planned", capacity_mt: "2000", commissioned_year: "", linked_pg_ids: ["PG-010"], lat: 29.24, lng: 77.02 }),
  seededAsset({ asset_id: "AST-RC-01", name: "Panipat Ripening Chamber", type: "Ripening Chamber", district: "Panipat", owner: "Private", status: "Operational", capacity_mt: "60", commissioned_year: "2023", linked_pg_ids: ["PG-010"], lat: 29.385, lng: 76.955 }),
  seededAsset({ asset_id: "AST-RC-02", name: "Ambala Ripening Chamber", type: "Ripening Chamber", district: "Ambala", owner: "Producer Group", status: "Under construction", capacity_mt: "40", commissioned_year: "", linked_pg_ids: ["PG-006", "PG-007"], lat: 30.385, lng: 76.79 }),
  seededAsset({ asset_id: "AST-PU-01", name: "Sirsa Kinnow Processing Unit", type: "Processing Unit", district: "Sirsa", owner: "Private", status: "Operational", capacity_mt: "30", commissioned_year: "2020", linked_pg_ids: ["PG-002"], lat: 29.545, lng: 75.015 }),
  seededAsset({ asset_id: "AST-FC-01", name: "Chandigarh Fulfilment Centre", type: "Fulfilment Centre", district: "Panchkula", owner: "HSAMB", status: "Operational", capacity_mt: "25", commissioned_year: "2024", linked_pg_ids: [], lat: 30.7333, lng: 76.7794 }),
  seededAsset({ asset_id: "AST-FC-02", name: "Faridabad Fulfilment Centre", type: "Fulfilment Centre", district: "Faridabad", owner: "HSAMB", status: "Operational", capacity_mt: "30", commissioned_year: "2024", linked_pg_ids: [], lat: 28.4089, lng: 77.3178 }),
  seededAsset({ asset_id: "AST-FC-03", name: "Gurugram Fulfilment Centre", type: "Fulfilment Centre", district: "Gurugram", owner: "HSAMB", status: "Operational", capacity_mt: "35", commissioned_year: "2024", linked_pg_ids: [], lat: 28.4595, lng: 77.0266 }),
  ...HARYANA_MANDIS.map((m, i) =>
    seededAsset({
      asset_id: `AST-MD-${String(i + 1).padStart(2, "0")}`,
      name: m.name,
      type: "APMC Mandi",
      district: m.district,
      owner: "HSAMB",
      status: "Operational",
      capacity_mt: "",
      commissioned_year: "",
      linked_pg_ids: [],
      lat: m.lat,
      lng: m.lng,
    })
  ),
];
