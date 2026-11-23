import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CircleMarker, Polygon, Popup } from "react-leaflet";
import { UserCircle2, Pencil, Trash2, ArrowLeft, ClipboardEdit } from "lucide-react";
import { Badge, Card, EmptyState, IllustrativeTag, PageHeader, SectionHeader, Table, Td, Th } from "../../components/ui";
import { BaseMap, FitBounds, toTuple } from "../../components/map/MapKit";
import { useRole } from "../../lib/role";
import { farmerMembers, pgById } from "../../data/seed";
import { PG_LOCATIONS } from "../../data/haryanaMaster";
import { deleteSurvey, useRegistry } from "../../lib/registryStore";
import { registryRows } from "../../lib/farmerRegistry";
import { areaMismatch, formatLatLng } from "../../lib/geo";

function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="subtle text-[11px]">{label}</div>
      <div className="text-sm font-medium text-ink">{children || "-"}</div>
    </div>
  );
}

const list = (xs: string[]) => (xs.length ? xs.join(", ") : "-");

export default function FarmerRecordView() {
  const { key } = useParams();
  const navigate = useNavigate();
  const { role } = useRole();
  const registry = useRegistry();
  const row = registryRows(registry.surveys).find((r) => r.key === key);
  const canEdit = role.id === "pg_manager" || role.id === "pmu" || role.id === "admin";

  if (!row) {
    return (
      <Card>
        <EmptyState icon={<UserCircle2 size={20} />} title="Farmer not found" body="This record may have been deleted on this device." />
        <div className="text-center"><Link to="/farmer-registry" className="text-sm font-semibold text-gt-purple">Back to Farmer Registry</Link></div>
      </Card>
    );
  }

  const s = row.survey;
  const pg = pgById(row.pg_id);
  const pgLoc = row.pg_id ? PG_LOCATIONS[row.pg_id] : undefined;
  const mapPoints = [...(row.home ? [row.home] : []), ...row.plots.flatMap((p) => p.boundary)];

  return (
    <div>
      <PageHeader title={row.name} subtitle={`${row.farmer_id} · ${row.village}${row.block ? `, ${row.block}` : ""}, ${row.district}`} icon={<UserCircle2 size={20} />} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button className="btn-ghost" onClick={() => navigate("/farmer-registry")}><ArrowLeft size={16} /> Farmer Registry</button>
        <Badge tone={row.status === "Submitted" ? "good" : row.status === "Draft" ? "warn" : "neutral"}>{row.status}</Badge>
        {canEdit && s && <button className="btn-primary" onClick={() => navigate(`/farmer-registry/${s.survey_id}/edit`)}><Pencil size={16} /> {s.status === "Draft" ? "Resume draft" : "Edit"}</button>}
        {canEdit && !s && <button className="btn-orange" onClick={() => navigate(`/farmer-registry/new?farmer=${row.farmer_id}`)}><ClipboardEdit size={16} /> Complete full registration</button>}
        {canEdit && s && (
          <button className="btn-ghost text-bad" onClick={() => { if (window.confirm(`Delete the registration for ${row.name}? This cannot be undone on this device.`)) { deleteSurvey(s.survey_id); navigate("/farmer-registry"); } }}>
            <Trash2 size={16} /> Delete
          </button>
        )}
      </div>

      {!s && (
        <div className="mb-4 rounded-lg bg-gt-orange/5 border border-gt-orange/20 p-3 text-sm text-ink">
          Baseline record from the seeded registry. Location and plots are simulated. Complete the full registration to capture GPS, plots and survey details.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <SectionHeader title="Farmer and Producer Group" />
          <div className="grid grid-cols-2 gap-3">
            <KV label="Mobile">{row.mobile} {s?.mobile_verified && <Badge tone="good">Verified</Badge>}</KV>
            <KV label="Gender / age">{row.gender}{s?.age ? `, ${s.age}` : ""}</KV>
            <KV label="Father / husband">{s?.guardian_name ?? row.seed?.father_or_husband_name}</KV>
            <KV label="Aadhaar (last 4)">{s?.aadhaar_last4}</KV>
            <KV label="Producer Group">{pg?.name ?? "Not a member"}</KV>
            <KV label="PG member since">{s?.pg_since_year ?? row.seed?.joined_on.slice(0, 4)}</KV>
            <KV label="Horticulture area">{row.horti_area_acres ? `${row.horti_area_acres} acres` : "-"}</KV>
            <KV label="Crops">{list(row.crops)}</KV>
          </div>
        </Card>
        <Card>
          <SectionHeader title="Location and plots" right={row.home_simulated ? <IllustrativeTag label="Simulated location" /> : <Badge tone="good">GPS captured</Badge>} />
          {mapPoints.length ? (
            <BaseMap height={260}>
              <FitBounds points={mapPoints} maxZoom={17} />
              {row.plots.map((p, i) => p.boundary.length >= 3 && (
                <Polygon key={i} positions={p.boundary.map(toTuple)} pathOptions={{ color: "#F5A623", weight: 2, fillOpacity: 0.3 }}>
                  <Popup>{p.label}: {p.mapped_acres} acres mapped</Popup>
                </Polygon>
              ))}
              {row.home && <CircleMarker center={toTuple(row.home)} radius={7} pathOptions={{ color: "#4E2A84", fillColor: "#4E2A84", fillOpacity: 0.8 }}><Popup>Farmer location</Popup></CircleMarker>}
              {pgLoc && <CircleMarker center={toTuple(pgLoc)} radius={7} pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.8 }}><Popup>{pg?.name}</Popup></CircleMarker>}
            </BaseMap>
          ) : (
            <EmptyState icon={<UserCircle2 size={20} />} title="No location captured" body="Edit the registration to capture GPS or a plot boundary." />
          )}
          {row.home && <p className="subtle text-xs mt-2">Location: {formatLatLng(row.home)}{s?.home_location_accuracy_m ? ` (±${Math.round(s.home_location_accuracy_m)} m)` : ""}</p>}
        </Card>
      </div>

      {row.plots.length > 0 && (
        <Card className="mb-4">
          <SectionHeader title="Land plots" subtitle="Reported vs GPS-mapped area per plot" />
          <Table>
            <thead><tr><Th>Plot</Th><Th>Crop</Th><Th>Reported (acres)</Th><Th>Mapped (acres)</Th><Th>Check</Th></tr></thead>
            <tbody>
              {row.plots.map((p, i) => (
                <tr key={i}>
                  <Td className="font-medium">{p.label}</Td>
                  <Td>{p.crop || "-"}</Td>
                  <Td>{p.reported_acres ?? "-"}</Td>
                  <Td>{p.mapped_acres ?? "-"}</Td>
                  <Td>{p.reported_acres && p.mapped_acres ? (areaMismatch(p.reported_acres, p.mapped_acres) ? <Badge tone="warn">Differs over 15%</Badge> : <Badge tone="good">Matches</Badge>) : "-"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {s && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <SectionHeader title="Land and crops" />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <KV label="Own land">{s.land_own_acres} acres</KV>
              <KV label="Leased land">{s.land_leased_acres || "0"} acres</KV>
              <KV label="Organic">{s.organic_farming}{s.organic_farming === "Yes" ? ` (certified: ${s.organic_certified})` : ""}</KV>
            </div>
            <Table>
              <thead><tr><Th>Crop</Th><Th>Season</Th><Th>Acres</Th><Th>Yield (Qtl)</Th></tr></thead>
              <tbody>{s.crops.map((c, i) => <tr key={i}><Td>{c.crop}{c.variety ? ` · ${c.variety}` : ""}</Td><Td>{c.season}</Td><Td>{c.area_acres}</Td><Td>{c.expected_yield_qtl || "-"}</Td></tr>)}</tbody>
            </Table>
          </Card>
          <Card>
            <SectionHeader title="Sales, storage and logistics" />
            <div className="grid grid-cols-2 gap-3">
              <KV label="Marketing channel">{s.marketing_channel === "Other" ? s.marketing_channel_other : s.marketing_channel}</KV>
              <KV label="Mandi">{s.mandi_name}</KV>
              <KV label="Rate realised">{s.rate_inr_per_qtl ? `Rs ${s.rate_inr_per_qtl}/Qtl` : "-"}</KV>
              <KV label="Month of sale">{s.sale_month}</KV>
              <KV label="Storage">{s.storage_source}{s.storage_duration_months ? `, ${s.storage_duration_months} months` : ""}</KV>
              <KV label="Transport">{s.logistics_provider}{s.logistics_cost_inr_per_qtl ? `, Rs ${s.logistics_cost_inr_per_qtl}/Qtl` : ""}</KV>
            </div>
          </Card>
          <Card>
            <SectionHeader title="Challenges, mechanisation and inputs" />
            <div className="grid grid-cols-2 gap-3">
              <KV label="Challenges">{list(s.challenges)}{s.challenges_other ? ` (${s.challenges_other})` : ""}</KV>
              <KV label="Machines owned">{list(s.mech_owned)}</KV>
              <KV label="Machines rented">{list(s.mech_rented)}</KV>
              <KV label="Input sources">{list(s.input_source)}</KV>
              <KV label="Input distance">{s.input_distance_km ? `${s.input_distance_km} km` : "-"}</KV>
              <KV label="Technology">{s.tech_adoption === "Yes" ? s.tech_adoption_detail : "No"}</KV>
            </div>
          </Card>
          <Card>
            <SectionHeader title="Finance, schemes and sustainability" />
            <div className="grid grid-cols-2 gap-3">
              <KV label="Household income">{s.income_bracket}</KV>
              <KV label="Non-farm income">{list(s.non_farm_income)}</KV>
              <KV label="Credit">{s.credit_linkage === "Yes" ? `${s.credit_source}, Rs ${s.credit_amount_inr} at ${s.credit_interest_pct}%` : `No (${s.loan_outcome})`}</KV>
              <KV label="KCC">{s.kcc_account === "Yes" ? `Rs ${s.kcc_limit_inr_lakh} lakh` : "No"}</KV>
              <KV label="Schemes">{s.scheme_availed === "Yes" ? list(s.schemes) : "None"}</KV>
              <KV label="Irrigation">{list(s.irrigation_source)}</KV>
              <KV label="Soil Health Card">{s.soil_health_card}</KV>
              <KV label="Crop insurance">{s.crop_insurance === "Yes" ? s.crop_insurance_detail : "No"}</KV>
            </div>
          </Card>
          {s.field_photo && (
            <Card>
              <SectionHeader title="Field photo" />
              <img src={s.field_photo} alt="Field" className="max-h-72 rounded-lg border border-border" />
            </Card>
          )}
          <Card>
            <SectionHeader title="Record" />
            <div className="grid grid-cols-2 gap-3">
              <KV label="Captured by">{s.captured_by}</KV>
              <KV label="Survey year">{s.survey_year}</KV>
              <KV label="Created">{new Date(s.created_at).toLocaleString("en-IN")}</KV>
              <KV label="Last updated">{new Date(s.updated_at).toLocaleString("en-IN")}</KV>
            </div>
          </Card>
        </div>
      )}
      {!s && row.seed && (
        <p className="subtle text-xs">Seeded record: {farmerMembers.length} baseline farmers come from the demo dataset.</p>
      )}
    </div>
  );
}
