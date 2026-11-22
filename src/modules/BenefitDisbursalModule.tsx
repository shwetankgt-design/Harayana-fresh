import { Fragment, useState } from "react";
import { Landmark, ChevronDown, ChevronUp } from "lucide-react";
import { Badge, Card, PageHeader, SectionHeader, SimulatedTag, Table, Td, Th } from "../components/ui";
import { fetchDistrictBenefitSummaries } from "../lib/adapters";
import { benefitsByDistrict, farmerById } from "../data/seed";
import type { District } from "../data/types";
import { formatDate } from "../lib/format";

export default function BenefitDisbursalModule() {
  const summaries = fetchDistrictBenefitSummaries();
  const [expanded, setExpanded] = useState<District | null>(null);

  const grandTotal = summaries.reduce(
    (acc, s) => ({
      claimed: acc.claimed + s.amountClaimed,
      sanctioned: acc.sanctioned + s.amountSanctioned,
      disbursed: acc.disbursed + s.amountDisbursed,
      pending: acc.pending + s.pendingCount,
    }),
    { claimed: 0, sanctioned: 0, disbursed: 0, pending: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Consolidated Benefit Disbursal - PMU / DPMU View"
        subtitle="MFMB benefit and DBT claims aggregated by district jurisdiction"
        icon={<Landmark size={20} />}
      />
      <div className="mb-4"><SimulatedTag /></div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <Card>
          <div className="subtle">Total Claimed</div>
          <div className="text-xl font-bold text-ink mt-1">Rs {grandTotal.claimed.toLocaleString("en-IN")}</div>
        </Card>
        <Card>
          <div className="subtle">Total Sanctioned</div>
          <div className="text-xl font-bold text-ink mt-1">Rs {grandTotal.sanctioned.toLocaleString("en-IN")}</div>
        </Card>
        <Card>
          <div className="subtle">Total Disbursed</div>
          <div className="text-xl font-bold text-good mt-1">Rs {grandTotal.disbursed.toLocaleString("en-IN")}</div>
        </Card>
        <Card>
          <div className="subtle">Pending Claims</div>
          <div className="text-xl font-bold text-warn mt-1">{grandTotal.pending}</div>
        </Card>
      </div>

      <Card>
        <SectionHeader title="By District" subtitle="Click a row to drill down into individual claims" />
        <Table>
          <thead>
            <tr>
              <Th>District</Th>
              <Th>Claims</Th>
              <Th>Farmers Covered</Th>
              <Th>Claimed</Th>
              <Th>Sanctioned</Th>
              <Th>Disbursed</Th>
              <Th>Pending</Th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => {
              const isOpen = expanded === s.district;
              return (
                <Fragment key={s.district}>
                  <tr>
                    <Td className="font-medium">
                      <button onClick={() => setExpanded(isOpen ? null : s.district)} className="inline-flex items-center gap-1 hover:text-gt-purple">
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {s.district}
                      </button>
                    </Td>
                    <Td>{s.claimCount}</Td>
                    <Td>{s.farmersCovered}</Td>
                    <Td>Rs {s.amountClaimed.toLocaleString("en-IN")}</Td>
                    <Td>Rs {s.amountSanctioned.toLocaleString("en-IN")}</Td>
                    <Td className="font-semibold text-good">Rs {s.amountDisbursed.toLocaleString("en-IN")}</Td>
                    <Td>{s.pendingCount > 0 ? <Badge tone="warn">{s.pendingCount} pending</Badge> : <Badge tone="good">All clear</Badge>}</Td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className="bg-surface px-4 py-3 border-b border-border/70">
                        <Table>
                          <thead>
                            <tr>
                              <Th>Benefit ID</Th>
                              <Th>Farmer</Th>
                              <Th>Scheme</Th>
                              <Th>Applied</Th>
                              <Th>Status</Th>
                              <Th>Disbursed On</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {benefitsByDistrict(s.district).map((b) => (
                              <tr key={b.benefit_id}>
                                <Td className="text-xs">{b.benefit_id}</Td>
                                <Td className="text-xs">{farmerById(b.farmer_id)?.name ?? b.farmer_id}</Td>
                                <Td className="text-xs">{b.scheme}</Td>
                                <Td className="text-xs">{formatDate(b.applied_on)}</Td>
                                <Td>
                                  <Badge
                                    tone={
                                      b.status === "Disbursed"
                                        ? "good"
                                        : b.status === "Rejected"
                                          ? "bad"
                                          : b.status === "Sanctioned"
                                            ? "warn"
                                            : "neutral"
                                    }
                                  >
                                    {b.status}
                                  </Badge>
                                </Td>
                                <Td className="text-xs">{b.disbursed_on ? formatDate(b.disbursed_on) : "-"}</Td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
