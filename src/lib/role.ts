import { createContext, useContext } from "react";
import type { ProgrammeAudience } from "../data/types";
import { farmerMembers } from "../data/seed";

const farmerName = (id: string) => farmerMembers.find((f) => f.farmer_id === id)?.name ?? "Unknown Farmer";

export type RoleId = "farmer" | "pg_manager" | "packhouse" | "buyer" | "pmu" | "admin";

export interface Role {
  id: RoleId;
  name: string;
  title: string;
  audience: ProgrammeAudience;
  scopedPgId?: string; // for farmer / pg_manager demo accounts
  scopedFarmerId?: string; // for farmer demo account
  scopedPackhouseId?: string;
  scopedBuyerId?: string;
}

export const ROLES: Role[] = [
  {
    id: "farmer",
    name: farmerName("HRF-00001"),
    title: "Farmer / PG Member - Karnal",
    audience: "Farmer/PG Member",
    scopedPgId: "PG-001",
    scopedFarmerId: "HRF-00001",
  },
  {
    id: "pg_manager",
    name: farmerName("HRF-00001"),
    title: "PG Manager - Karnal Kinnow-Vegetable Growers PG",
    audience: "PG Manager/Aggregator",
    scopedPgId: "PG-001",
    scopedFarmerId: "HRF-00001",
  },
  {
    id: "packhouse",
    name: "Vinod Kumar",
    title: "Pack House Operator - Karnal Integrated Pack House",
    audience: "Packhouse/FC Operator",
    scopedPackhouseId: "PH-01",
  },
  {
    id: "buyer",
    name: "Anjali Mehta",
    title: "Procurement Lead - FreshMart Retail Chain",
    audience: "Buyer",
    scopedBuyerId: "BYR-001",
  },
  {
    id: "pmu",
    name: "Dr. Rajeev Malhotra",
    title: "DPMU Official - Department of Horticulture, Haryana",
    audience: "DoH/PMU/DPMU Official",
  },
  {
    id: "admin",
    name: "System Administrator",
    title: "Platform Administrator",
    audience: "DoH/PMU/DPMU Official",
  },
];

interface RoleCtx {
  role: Role;
  setRole: (r: Role) => void;
}

export const RoleContext = createContext<RoleCtx>({ role: ROLES[0], setRole: () => {} });
export const useRole = () => useContext(RoleContext);

export function canViewProgramme(role: Role, visible_to: ProgrammeAudience[]): boolean {
  if (role.id === "admin") return true;
  return visible_to.includes("All") || visible_to.includes(role.audience);
}
