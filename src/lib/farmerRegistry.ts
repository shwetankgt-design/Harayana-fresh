// One list of farmers for the registry and the map: the 200 seeded farmers (baseline, simulated
// locations) merged with farmers captured through the registration wizard. A captured survey
// for a seeded farmer ID replaces that farmer's baseline row.

import { farmerMembers, parcelsByFarmer, plansByFarmer } from "../data/seed";
import type { FarmerMember } from "../data/types";
import type { FarmerSurvey } from "../data/registry";
import { HARYANA_VILLAGES, type LatLng } from "../data/haryanaMaster";
import { areaInAcres, seededFarmerHome, seededParcelBoundary } from "./geo";

export type RegistryStatus = "Baseline (seeded)" | "Draft" | "Submitted";

export interface RegistryPlot {
  label: string;
  crop: string;
  reported_acres: number | null;
  mapped_acres: number | null;
  boundary: LatLng[];
  simulated: boolean;
}

export interface RegistryRow {
  key: string;
  farmer_id: string;
  name: string;
  mobile: string;
  gender: string;
  district: string;
  block: string;
  village: string;
  pg_id: string;
  status: RegistryStatus;
  survey: FarmerSurvey | null;
  seed: FarmerMember | null;
  home: LatLng | null;
  home_simulated: boolean;
  plots: RegistryPlot[];
  horti_area_acres: number;
  crops: string[];
  updated: string;
}

const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

function blockOf(village: string): string {
  return HARYANA_VILLAGES.find((v) => v.name === village)?.block ?? "";
}

function seedRow(f: FarmerMember): RegistryRow {
  const home = seededFarmerHome(f);
  const parcels = parcelsByFarmer(f.farmer_id);
  const plans = plansByFarmer(f.farmer_id);
  return {
    key: f.farmer_id,
    farmer_id: f.farmer_id,
    name: f.name,
    mobile: f.phone,
    gender: f.gender,
    district: f.district,
    block: blockOf(f.village),
    village: f.village,
    pg_id: f.pg_id,
    status: "Baseline (seeded)",
    survey: null,
    seed: f,
    home,
    home_simulated: true,
    plots: home
      ? parcels.map((p, i) => {
          const boundary = seededParcelBoundary(p, home);
          return { label: `Parcel ${i + 1} (${p.survey_no})`, crop: plans.find((x) => x.parcel_id === p.parcel_id)?.crop ?? "", reported_acres: p.area_acres, mapped_acres: areaInAcres(boundary), boundary, simulated: true };
        })
      : [],
    horti_area_acres: f.land_holding_acres,
    crops: [...new Set(plans.map((p) => p.crop))],
    updated: f.joined_on,
  };
}

export function surveyRow(s: FarmerSurvey, seed: FarmerMember | null): RegistryRow {
  return {
    key: s.survey_id,
    farmer_id: s.farmer_id || "(on submit)",
    name: s.farmer_name || "(unnamed draft)",
    mobile: s.mobile_no,
    gender: s.gender,
    district: s.district,
    block: s.block,
    village: s.village,
    pg_id: s.pg_member === "Yes" ? s.pg_id : "",
    status: s.status,
    survey: s,
    seed,
    home: s.home_location,
    home_simulated: false,
    plots: s.plots
      .filter((p) => p.boundary.length >= 3 || p.reported_area_acres)
      .map((p) => ({
        label: p.label,
        crop: p.crop,
        reported_acres: p.reported_area_acres ? num(p.reported_area_acres) : null,
        mapped_acres: p.boundary.length >= 3 ? areaInAcres(p.boundary) : null,
        boundary: p.boundary,
        simulated: false,
      })),
    horti_area_acres: num(s.horti_area_acres),
    crops: [...new Set(s.crops.map((c) => c.crop).filter(Boolean))],
    updated: s.updated_at,
  };
}

export function registryRows(surveys: FarmerSurvey[]): RegistryRow[] {
  const capturedIds = new Set(surveys.map((s) => s.farmer_id).filter(Boolean));
  const seeded = farmerMembers.filter((f) => !capturedIds.has(f.farmer_id)).map(seedRow);
  const captured = surveys.map((s) => surveyRow(s, farmerMembers.find((f) => f.farmer_id === s.farmer_id) ?? null));
  return [...captured, ...seeded];
}

// Next sequential HRF-xxxxx ID across seeded and captured farmers, assigned only on submit.
export function nextFarmerId(surveys: FarmerSurvey[]): string {
  const ids = [...farmerMembers.map((f) => f.farmer_id), ...surveys.map((s) => s.farmer_id)];
  const max = ids.reduce((m, id) => {
    const n = /^HRF-(\d+)$/.exec(id)?.[1];
    return n ? Math.max(m, Number(n)) : m;
  }, 0);
  return `HRF-${String(max + 1).padStart(5, "0")}`;
}
