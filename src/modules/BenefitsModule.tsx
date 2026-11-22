import { useMemo } from "react";
import { HandCoins, Landmark, CheckCircle2, Clock, XCircle, FileText } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, SimulatedTag, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import { fetchFarmerBenefitStatus, fetchPgBenefitStatus } from "../lib/adapters";
import type { BenefitRecord, BenefitStatus } from "../data/types";
import { farmerById } from "../data/seed";
import { formatDate } from "../lib/format";

const STATUS_TONE: Record<BenefitStatus, "good" | "warn" | "bad" | "neutral" | "orange"> = {
  Applied: "neutral",
  "Under Verification": "orange",
  Sanctioned: "warn",
  Disbursed: "good",
  Rejected: "bad",
};

const STATUS_ICON: Record<BenefitStatus, typeof CheckCircle2> = {
  Applied: FileText,
  "Under Verification": Clock,
  Sanctioned: Landmark,
  Disbursed: CheckCircle2,
  Rejected: XCircle,
};

export default function BenefitsModule() {
  const { role } = useRole();
  const isPgManager = role.id === "pg_manager";

  const records = useMemo<BenefitRecord[]>(() => {
    if (isPgManager) return fetchPgBenefitStatus(role.scopedPgId ?? "PG-001");
    return fetchFarmerBenefitStatus(role.scopedFarmerId ?? "HRF-00001");
  }, [role, isPgManager]);

  const totals = records.reduce(
    (acc, r) => ({
      claimed: acc.claimed + r.amount_claimed,
      sanctioned: acc.sanctioned + (r.amount_sanctioned ?? 0),
      disbursed: acc.disbursed + (r.amount_disbursed ?? 0),
    }),
    { claimed: 0, sanctioned: 0, disbursed: 0 }
  );

  return (
    <div>
      <PageHeader
        title={isPgManager ? "Member Benefit / DBT Status" : "My Benefit / DBT Status"}
        subtitle="Direct Benefit Transfer linkage via MFMB (Meri Fasal Mera Byora)"
        icon={<HandCoins size={20} />}
      />
      <div className="mb-4"><SimulatedTag /></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Card>
          <div className="subtle">Total Claimed</div>
          <div className="text-2xl font-bold text-ink mt-1">Rs {totals.claimed.toLocaleString("en-IN")}</div>
        </Card>
        <Card>
          <div className="subtle">Total Sanctioned</div>
          <div className="text-2xl font-bold text-ink mt-1">Rs {totals.sanctioned.toLocaleString("en-IN")}</div>
        </Card>
        <Card>
          <div className="subtle">Total Disbursed</div>
          <div className="text-2xl font-bold text-good mt-1">Rs {totals.disbursed.toLocaleString("en-IN")}</div>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Claims" subtitle={isPgManager ? "Across all members of this Producer Group" : "Your MFMB benefit claims"} />
        {records.length === 0 ? (
          <EmptyState icon={<HandCoins size={22} />} title="No benefit claims yet" body="Claims linked to marketplace orders or scheme enrolment will appear here with live status from MFMB." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Benefit ID</Th>
                {isPgManager && <Th>Farmer</Th>}
                <Th>Scheme</Th>
                <Th>Applied</Th>
                <Th>Claimed</Th>
                <Th>Sanctioned</Th>
                <Th>Disbursed</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const Icon = STATUS_ICON[r.status];
                return (
                  <tr key={r.benefit_id}>
                    <Td className="font-medium text-xs">{r.benefit_id}</Td>
                    {isPgManager && <Td className="text-xs">{farmerById(r.farmer_id)?.name ?? r.farmer_id}</Td>}
                    <Td className="text-xs">{r.scheme}</Td>
                    <Td className="text-xs">{formatDate(r.applied_on)}</Td>
                    <Td>Rs {r.amount_claimed.toLocaleString("en-IN")}</Td>
                    <Td>{r.amount_sanctioned ? `Rs ${r.amount_sanctioned.toLocaleString("en-IN")}` : "-"}</Td>
                    <Td>{r.amount_disbursed ? `Rs ${r.amount_disbursed.toLocaleString("en-IN")}` : "-"}</Td>
                    <Td>
                      <Badge tone={STATUS_TONE[r.status]}>
                        <Icon size={12} /> {r.status}
                      </Badge>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
