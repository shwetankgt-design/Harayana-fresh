import { useState } from "react";
import { UserCircle2, MapPin, Phone, CheckCircle2, XCircle, Link2 } from "lucide-react";
import { Badge, Card, CompletenessBar, PageHeader, SectionHeader, SimulatedTag, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import { farmerMembers, farmersByPg, parcelsByFarmer, pgById, plansByFarmer } from "../data/seed";
import { fetchEGirdwariConfirmation, fetchFarmTraceRecord } from "../lib/adapters";
import { formatDate } from "../lib/format";
import type { FarmerMember } from "../data/types";

function FarmerDetail({ farmer }: { farmer: FarmerMember }) {
  const parcels = parcelsByFarmer(farmer.farmer_id);
  const plans = plansByFarmer(farmer.farmer_id);
  const farmTrace = fetchFarmTraceRecord(farmer.farmer_id);
  const pg = pgById(farmer.pg_id);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="grid place-items-center w-16 h-16 rounded-full bg-gt-purple/10 text-gt-purple shrink-0">
            <UserCircle2 size={36} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-ink">{farmer.name}</h2>
              <Badge tone={farmer.affiliation_status === "Active" ? "good" : farmer.affiliation_status === "Pending Verification" ? "warn" : "bad"}>
                {farmer.affiliation_status}
              </Badge>
            </div>
            <div className="text-sm text-muted mt-0.5">S/o, D/o, or W/o {farmer.father_or_husband_name}</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1"><MapPin size={13} /> {farmer.village}, {farmer.district}</span>
              <span className="inline-flex items-center gap-1"><Phone size={13} /> {farmer.phone}</span>
              <span>{farmer.role_in_pg} · {pg?.name}</span>
            </div>
          </div>
          <div className="sm:w-48">
            <div className="subtle mb-1">Data completeness</div>
            <CompletenessBar pct={farmer.data_completeness_pct} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionHeader title="Farm Trace Registry Link" right={<SimulatedTag />} />
          <div className="flex items-center gap-2 mb-2">
            {farmTrace.found ? <CheckCircle2 size={16} className="text-good" /> : <XCircle size={16} className="text-bad" />}
            <span className="text-sm text-ink">{farmTrace.status}</span>
          </div>
          {farmTrace.found ? (
            <div className="text-xs text-muted font-mono bg-surface rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
              <Link2 size={12} /> {farmTrace.farm_trace_id}
            </div>
          ) : (
            <p className="subtle">This farmer record has not yet been linked to a Farm Trace ID. PG Manager should
              initiate field verification to complete the sync.</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span className="subtle">e-KYC status:</span>
            <Badge tone={farmer.ekyc_verified ? "good" : "warn"}>{farmer.ekyc_verified ? "Verified" : "Pending"}</Badge>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Land Parcels" subtitle={`${parcels.length} parcel(s) · e-Girdwari confirmation shown per parcel`} right={<SimulatedTag />} />
          <div className="space-y-2">
            {parcels.map((p) => {
              const conf = fetchEGirdwariConfirmation(p.parcel_id);
              return (
                <div key={p.parcel_id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-ink">{p.village} · Survey {p.survey_no}</div>
                    <div className="subtle">{p.area_acres} acres · {p.irrigation_source} · {p.soil_type}</div>
                  </div>
                  <Badge tone={conf.confirmed ? "good" : "warn"}>{conf.confirmed ? `Confirmed FY ${conf.jamabandi_year}` : "Unconfirmed"}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Crop Plans" subtitle="Season-wise plans linked to this farmer" />
        <Table>
          <thead>
            <tr>
              <Th>Crop</Th>
              <Th>Season</Th>
              <Th>Area (acres)</Th>
              <Th>Expected Yield (Qtl)</Th>
              <Th>Sowing</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.plan_id}>
                <Td className="font-medium">{p.crop}</Td>
                <Td>{p.season} {p.year}</Td>
                <Td>{p.area_acres}</Td>
                <Td>{p.expected_yield_qtl.toLocaleString("en-IN")}</Td>
                <Td>{formatDate(p.sowing_date)}</Td>
                <Td><Badge>{p.status}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

export default function ProfileModule() {
  const { role } = useRole();
  const isSelfOnly = role.id === "farmer";
  const scopedMembers = role.scopedPgId ? farmersByPg(role.scopedPgId) : farmerMembers;
  const [selected, setSelected] = useState<string>(role.scopedFarmerId ?? scopedMembers[0]?.farmer_id ?? "");
  const farmer = farmerMembers.find((f) => f.farmer_id === selected);

  return (
    <div>
      <PageHeader
        title="Farmer / PG Profile"
        subtitle="Unified profile combining application data with mocked Farm Trace and e-Girdwari records"
        icon={<UserCircle2 size={20} />}
      />

      {!isSelfOnly && scopedMembers.length > 1 && (
        <Card className="mb-4">
          <SectionHeader title="Select a member" subtitle="PMU/PG Manager view - choose a farmer to inspect" />
          <div className="flex flex-wrap gap-2">
            {scopedMembers.map((m) => (
              <button
                key={m.farmer_id}
                onClick={() => setSelected(m.farmer_id)}
                className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                  m.farmer_id === selected ? "border-gt-purple bg-gt-purple/5 text-gt-purple font-semibold" : "border-border text-ink hover:border-gt-purple"
                }`}
              >
                {m.name}
                <div className="text-[11px] text-muted font-normal">{m.village}</div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {farmer ? <FarmerDetail farmer={farmer} /> : (
        <Card><p className="subtle">No farmer record found in scope.</p></Card>
      )}
    </div>
  );
}
