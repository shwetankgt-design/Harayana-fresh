// Browser-local store for captured farmer surveys, captured assets and master-data additions.
// Kept in localStorage so field captures survive a page reload. There is no backend: data stays
// on this device and browser, and "Reset captured data" returns the demo to its seeded state.

import { useSyncExternalStore } from "react";
import type { AssetRecord, FarmerSurvey } from "../data/registry";
import type { MandiMaster, VillageMaster } from "../data/haryanaMaster";

export interface RegistryState {
  surveys: FarmerSurvey[];
  assets: AssetRecord[];
  villages: VillageMaster[];
  mandis: MandiMaster[];
  crops: string[];
}

const KEY = "hf.registry.v1";
const EMPTY: RegistryState = { surveys: [], assets: [], villages: [], mandis: [], crops: [] };

function load(): RegistryState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<RegistryState>;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

let state: RegistryState = load();
let persistError: string | null = null;
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    persistError = null;
  } catch {
    persistError = "Browser storage is full or blocked. Captures are kept for this session only. Remove some photos or reset captured data.";
  }
}

export function updateRegistry(fn: (s: RegistryState) => RegistryState) {
  state = fn(state);
  persist();
  listeners.forEach((l) => l());
}

export function resetRegistry() {
  updateRegistry(() => EMPTY);
}

export function getPersistError() {
  return persistError;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useRegistry(): RegistryState {
  return useSyncExternalStore(subscribe, () => state);
}

export function getRegistry(): RegistryState {
  return state;
}

export function upsertSurvey(survey: FarmerSurvey) {
  updateRegistry((s) => ({
    ...s,
    surveys: s.surveys.some((x) => x.survey_id === survey.survey_id)
      ? s.surveys.map((x) => (x.survey_id === survey.survey_id ? survey : x))
      : [survey, ...s.surveys],
  }));
}

export function deleteSurvey(surveyId: string) {
  updateRegistry((s) => ({ ...s, surveys: s.surveys.filter((x) => x.survey_id !== surveyId) }));
}

export function upsertAsset(asset: AssetRecord) {
  updateRegistry((s) => ({
    ...s,
    assets: s.assets.some((x) => x.asset_id === asset.asset_id)
      ? s.assets.map((x) => (x.asset_id === asset.asset_id ? asset : x))
      : [asset, ...s.assets],
  }));
}

export function deleteAsset(assetId: string) {
  updateRegistry((s) => ({ ...s, assets: s.assets.filter((x) => x.asset_id !== assetId) }));
}
