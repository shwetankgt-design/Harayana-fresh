// Mocked adapters for external government systems of record.
//
// These functions simulate calls to Farm Trace, e-Girdwari, e-Kharid, MFMB and
// AgriStack/InDEA. In a live deployment, each function body would be replaced
// with a real integration call behind the same interface — the rest of the
// application only depends on these typed signatures, never on the transport.
// All data returned here is deterministic seed data, not a live network call.

import { benefitsByFarmer, benefitsByPg, benefitRecords, farmerById, latestSyncBySystem, syncLog } from "../data/seed";
import type { BenefitRecord, District, SyncLogEntry, SyncSystem } from "../data/types";

export interface AdapterStatus {
  system: SyncSystem;
  status: "Success" | "Failed" | "In Progress";
  lastSyncedAt: string | null;
  recordsSynced: number;
  errorMessage: string | null;
}

// Simulated call: fetch current sync status for every mocked government system.
export function getAdapterStatuses(): AdapterStatus[] {
  return latestSyncBySystem().map(({ system, latest }) => ({
    system,
    status: latest.status,
    lastSyncedAt: latest.completed_at ?? latest.started_at,
    recordsSynced: latest.records_synced,
    errorMessage: latest.error_message,
  }));
}

// Simulated call: fetch the full sync history for one system (for the error/log drill-down view).
export function getSyncHistory(system: SyncSystem): SyncLogEntry[] {
  return syncLog.filter((s) => s.system === system);
}

// Simulated call: pull a farmer's Farm Trace record (mocked government farmer registry).
export function fetchFarmTraceRecord(farmer_id: string): {
  found: boolean;
  farm_trace_id: string | null;
  status: string;
} {
  const farmer = farmerById(farmer_id);
  if (!farmer || !farmer.farm_trace_id) {
    return { found: false, farm_trace_id: null, status: "Not linked - awaiting farmer consent / field verification" };
  }
  return { found: true, farm_trace_id: farmer.farm_trace_id, status: "Linked and verified" };
}

// Simulated call: pull land-record confirmation from e-Girdwari (mocked).
export function fetchEGirdwariConfirmation(parcel_id: string): { confirmed: boolean; jamabandi_year: string } {
  // Deterministic based on parcel id so results are reproducible across renders.
  const hash = parcel_id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return { confirmed: hash % 5 !== 0, jamabandi_year: "2025-26" };
}

// ---------- MFMB (Meri Fasal Mera Byora) benefit/DBT adapter, mocked ----------
// In a live deployment this would call the MFMB benefit-disbursal API. Here it reads
// the deterministic seed data so the UI always has stable, reproducible responses.

export interface DistrictBenefitSummary {
  district: District;
  claimCount: number;
  farmersCovered: number;
  amountClaimed: number;
  amountSanctioned: number;
  amountDisbursed: number;
  pendingCount: number;
}

// Simulated call: fetch a single farmer's benefit/DBT status from MFMB.
export function fetchFarmerBenefitStatus(farmer_id: string): BenefitRecord[] {
  return benefitsByFarmer(farmer_id);
}

// Simulated call: fetch benefit/DBT status for every member of a PG (for PG Manager view).
export function fetchPgBenefitStatus(pg_id: string): BenefitRecord[] {
  return benefitsByPg(pg_id);
}

// Simulated call: PMU/DPMU consolidated benefit-disbursal view, aggregated by district.
export function fetchDistrictBenefitSummaries(): DistrictBenefitSummary[] {
  const byDistrict = new Map<District, BenefitRecord[]>();
  benefitRecords.forEach((b) => {
    if (!byDistrict.has(b.district)) byDistrict.set(b.district, []);
    byDistrict.get(b.district)!.push(b);
  });
  return [...byDistrict.entries()]
    .map(([district, records]) => ({
      district,
      claimCount: records.length,
      farmersCovered: new Set(records.map((r) => r.farmer_id)).size,
      amountClaimed: records.reduce((s, r) => s + r.amount_claimed, 0),
      amountSanctioned: records.reduce((s, r) => s + (r.amount_sanctioned ?? 0), 0),
      amountDisbursed: records.reduce((s, r) => s + (r.amount_disbursed ?? 0), 0),
      pendingCount: records.filter((r) => r.status === "Applied" || r.status === "Under Verification").length,
    }))
    .sort((a, b) => b.amountDisbursed - a.amountDisbursed);
}
