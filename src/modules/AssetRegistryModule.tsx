import { useMemo, useState } from "react";
import { CircleMarker, Popup } from "react-leaflet";
import { Warehouse, Plus, Pencil, Trash2, Camera, X } from "lucide-react";
import { Badge, Card, EmptyState, IllustrativeTag, PageHeader, SectionHeader, StatCard, Table, Td, Th } from "../components/ui";
import { Field, FormGrid, MultiChip, Select, checkNumber, compressImage, isBlank } from "../components/form";
import { BaseMap, FitBounds, toTuple } from "../components/map/MapKit";
import { PointCapture } from "../components/map/PlotCapture";
import { useRole } from "../lib/role";
import { producerGroups, pgById } from "../data/seed";
import { ASSET_OWNERS, ASSET_STATUSES, ASSET_TYPES, HARYANA_BLOCKS, HARYANA_CENTER, HARYANA_DISTRICTS, type AssetType, type LatLng } from "../data/haryanaMaster";
import { SEEDED_ASSETS, type AssetRecord } from "../data/registry";
import { deleteAsset, upsertAsset, useRegistry } from "../lib/registryStore";
import { inHaryana } from "../lib/geo";

export const ASSET_COLORS: Record<AssetType, string> = {
  "Integrated Pack House (Hub)": "#4E2A84",
  "Collection Centre (Spoke)": "#7B5AA6",
  "Cold Storage": "#2563EB",
  "Ripening Chamber": "#F5A623",
  "Processing Unit": "#A6266E",
  "Fulfilment Centre": "#16a34a",
  "APMC Mandi": "#C4304A",
};

export function useAllAssets(): AssetRecord[] {
  const registry = useRegistry();
  return useMemo(() => [...registry.assets, ...SEEDED_ASSETS], [registry.assets]);
}

type Draft = Omit<AssetRecord, "lat" | "lng"> & { location: LatLng | null };

const blankDraft = (): Draft => ({
  asset_id: `AST-NEW-${Date.now()}`,
  name: "",
  type: "Collection Centre (Spoke)",
  district: "",
  block: "",
  owner: "Producer Group",
  status: "Operational",
  capacity_mt: "",
  commissioned_year: "",
  linked_pg_ids: [],
  scheme: "",
  photo: null,
  source: "captured",
  location_simulated: false,
  location: null,
});

export default function AssetRegistryModule() {
  const { role } = useRole();
  const canEdit = role.id === "pmu" || role.id === "admin";
  const assets = useAllAssets();
  const [type, setType] = useState("");
  const [district, setDistrict] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const filtered = assets.filter((a) => (!type || a.type === type) && (!district || a.district === district));
  const operational = filtered.filter((a) => a.status === "Operational").length;
  const pipeline = filtered.filter((a) => a.status === "Under construction" || a.status === "Planned").length;
  // Cold storage capacity is a total; every other asset's capacity is per day. Never add the two.
  const storageMt = filtered.filter((a) => a.type === "Cold Storage").reduce((s, a) => s + (Number(a.capacity_mt) || 0), 0);
  const handlingMtDay = filtered.filter((a) => a.type !== "Cold Storage" && a.type !== "APMC Mandi").reduce((s, a) => s + (Number(a.capacity_mt) || 0), 0);

  const open = (a?: AssetRecord) => {
    setErrors({});
    setDraft(a ? { ...a, location: { lat: a.lat, lng: a.lng } } : blankDraft());
    window.scrollTo({ top: 0 });
  };

  const save = () => {
    if (!draft) return;
    const e: Record<string, string | undefined> = {};
    if (isBlank(draft.name)) e.name = "Required.";
    if (isBlank(draft.district)) e.district = "Required.";
    if (!draft.location) e.location = "Capture or enter the asset's location.";
    else if (!inHaryana(draft.location) && draft.type !== "Fulfilment Centre") e.location = "The location is outside Haryana.";
    e.capacity_mt = checkNumber(draft.capacity_mt, { min: 0, maxDecimals: 2 });
    e.commissioned_year = checkNumber(draft.commissioned_year, { min: 1950, max: 2030, whole: true });
    Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
    setErrors(e);
    if (Object.keys(e).length || !draft.location) return;
    const { location, ...rest } = draft;
    upsertAsset({ ...rest, lat: location.lat, lng: location.lng, source: "captured", location_simulated: false });
    setDraft(null);
  };

  const center = draft?.location ?? HARYANA_DISTRICTS.find((d) => d.name === draft?.district) ?? HARYANA_CENTER;

  return (
    <div>
      <PageHeader title="Value-Chain Asset Registry" subtitle="Pack houses, collection centres, cold storage, ripening, processing, fulfilment centres and mandis, with location" icon={<Warehouse size={20} />} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {canEdit && <button className="btn-orange" onClick={() => open()}><Plus size={16} /> Add asset</button>}
        <select className="input !w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All asset types</option>
          {ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className="input !w-auto" value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">All districts</option>
          {HARYANA_DISTRICTS.map((d) => <option key={d.name}>{d.name}</option>)}
        </select>
        <IllustrativeTag label="Seeded assets illustrative" />
      </div>

      {draft && (
        <Card className="mb-4">
          <SectionHeader
            title={draft.source === "captured" && assets.some((a) => a.asset_id === draft.asset_id) ? "Edit asset" : "Add asset"}
            right={<button className="text-muted hover:text-ink" onClick={() => setDraft(null)}><X size={16} /></button>}
          />
          <div className="space-y-4">
            <FormGrid>
              <Field label="Asset name" required error={errors.name}><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label="Asset type" required><Select value={draft.type} onChange={(v) => setDraft({ ...draft, type: v as AssetType })} options={[...ASSET_TYPES]} /></Field>
              <Field label="Status"><Select value={draft.status} onChange={(v) => setDraft({ ...draft, status: v as AssetRecord["status"] })} options={[...ASSET_STATUSES]} /></Field>
              <Field label="District" required error={errors.district}><Select value={draft.district} onChange={(v) => setDraft({ ...draft, district: v, block: "" })} options={HARYANA_DISTRICTS.map((d) => d.name)} placeholder="Select district" /></Field>
              <Field label="Block">
                {HARYANA_BLOCKS[draft.district] ? (
                  <Select value={draft.block} onChange={(v) => setDraft({ ...draft, block: v })} options={HARYANA_BLOCKS[draft.district]} placeholder="Select block" />
                ) : (
                  <input className="input" value={draft.block} onChange={(e) => setDraft({ ...draft, block: e.target.value })} />
                )}
              </Field>
              <Field label="Owner / operator"><Select value={draft.owner} onChange={(v) => setDraft({ ...draft, owner: v })} options={ASSET_OWNERS} /></Field>
              <Field label="Capacity (MT)" error={errors.capacity_mt} hint="Per day for pack houses and centres, total for storage. 1 MT = 10 Qtl."><input className="input" type="number" step="0.01" value={draft.capacity_mt} onChange={(e) => setDraft({ ...draft, capacity_mt: e.target.value })} /></Field>
              <Field label="Commissioned (year)" error={errors.commissioned_year}><input className="input" type="number" value={draft.commissioned_year} onChange={(e) => setDraft({ ...draft, commissioned_year: e.target.value })} /></Field>
              <Field label="Funding scheme"><input className="input" placeholder="e.g. MIDH, AIF, HSHM" value={draft.scheme} onChange={(e) => setDraft({ ...draft, scheme: e.target.value })} /></Field>
            </FormGrid>
            <Field label="Linked Producer Groups"><MultiChip options={producerGroups.map((p) => p.pg_id)} value={draft.linked_pg_ids} onChange={(v) => setDraft({ ...draft, linked_pg_ids: v })} /></Field>
            <p className="subtle text-xs">{draft.linked_pg_ids.map((id) => pgById(id)?.name).filter(Boolean).join(", ")}</p>
            <Field label="Location" required error={errors.location}>
              <PointCapture value={draft.location} center={center} onChange={(p) => setDraft({ ...draft, location: p })} />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn-ghost text-xs cursor-pointer">
                <Camera size={13} /> {draft.photo ? "Replace photo" : "Add photo"}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setDraft({ ...draft, photo: await compressImage(f) }); }} />
              </label>
              {draft.photo && <img src={draft.photo} alt="Asset" className="h-20 rounded-lg border border-border" />}
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={save}>Save asset</button>
              <button className="btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <StatCard label="Assets" value={String(filtered.length)} />
        <StatCard label="Operational" value={String(operational)} tone="good" />
        <StatCard label="Under construction / planned" value={String(pipeline)} tone={pipeline ? "warn" : "neutral"} />
        <StatCard label="Handling capacity" value={`${handlingMtDay.toLocaleString("en-IN")} MT/day`} sub="Pack houses, centres, ripening, processing" />
        <StatCard label="Cold storage capacity" value={`${storageMt.toLocaleString("en-IN")} MT`} />
      </div>

      <Card className="mb-4">
        <SectionHeader title="Asset map" subtitle="Colour shows asset type" />
        <BaseMap height={420}>
          {filtered.length > 0 && <FitBounds points={filtered} maxZoom={12} />}
          {filtered.map((a) => (
            <CircleMarker key={a.asset_id} center={toTuple(a)} radius={a.type === "APMC Mandi" ? 5 : 8} pathOptions={{ color: ASSET_COLORS[a.type], fillColor: ASSET_COLORS[a.type], fillOpacity: a.status === "Operational" ? 0.85 : 0.3, weight: 2 }}>
              <Popup>
                <div className="text-sm"><b>{a.name}</b><br />{a.type}<br />{a.district} · {a.status}{a.capacity_mt ? <><br />Capacity: {a.capacity_mt} MT</> : null}</div>
              </Popup>
            </CircleMarker>
          ))}
        </BaseMap>
        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          {ASSET_TYPES.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: ASSET_COLORS[t] }} /> {t}</span>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Asset list" />
        {filtered.length === 0 ? (
          <EmptyState icon={<Warehouse size={20} />} title="No assets match" body="Change the filters or add an asset." />
        ) : (
          <Table>
            <thead><tr><Th>Asset</Th><Th>Type</Th><Th>District</Th><Th>Owner</Th><Th>Capacity (MT)</Th><Th>Linked PGs</Th><Th>Status</Th>{canEdit && <Th>Actions</Th>}</tr></thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.asset_id}>
                  <Td className="font-medium">{a.name}<div className="subtle text-[11px]">{a.source === "captured" ? "Captured" : "Seeded"}{a.location_simulated ? ", approximate location" : ""}</div></Td>
                  <Td className="text-xs">{a.type}</Td>
                  <Td className="text-xs">{a.district}{a.block ? `, ${a.block}` : ""}</Td>
                  <Td className="text-xs">{a.owner}</Td>
                  <Td>{a.capacity_mt || "-"}</Td>
                  <Td className="text-xs">{a.linked_pg_ids.length || "-"}</Td>
                  <Td><Badge tone={a.status === "Operational" ? "good" : a.status === "Non-functional" ? "bad" : "warn"}>{a.status}</Badge></Td>
                  {canEdit && (
                    <Td>
                      {a.source === "captured" ? (
                        <div className="flex gap-2">
                          <button className="text-muted hover:text-gt-purple" onClick={() => open(a)}><Pencil size={14} /></button>
                          <button className="text-muted hover:text-bad" onClick={() => { if (window.confirm(`Delete ${a.name}?`)) deleteAsset(a.asset_id); }}><Trash2 size={14} /></button>
                        </div>
                      ) : (
                        <span className="subtle text-[11px]">Seeded</span>
                      )}
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
