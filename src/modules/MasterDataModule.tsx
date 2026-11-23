import { useState } from "react";
import { Database, Plus } from "lucide-react";
import { Badge, Card, PageHeader, SectionHeader, Table, Td, Th } from "../components/ui";
import { Field, FormGrid, Select, isBlank } from "../components/form";
import { useRole } from "../lib/role";
import {
  ASSET_TYPES, CULTIVATION_CHALLENGES, HARYANA_BLOCKS, HARYANA_DISTRICTS, HARYANA_MANDIS, HARYANA_VILLAGES, HF_CROPS,
  INPUT_SOURCES, IRRIGATION_SOURCES, MACHINES, MARKETING_CHANNELS, SCHEMES,
} from "../data/haryanaMaster";
import { updateRegistry, useRegistry } from "../lib/registryStore";
import { inHaryana } from "../lib/geo";

const TABS = ["Districts & blocks", "Villages", "Mandis", "Crops", "Option lists"] as const;
type Tab = (typeof TABS)[number];

const OPTION_LISTS: { name: string; values: readonly string[] }[] = [
  { name: "Government schemes", values: SCHEMES },
  { name: "Marketing channels", values: MARKETING_CHANNELS },
  { name: "Cultivation challenges", values: CULTIVATION_CHALLENGES },
  { name: "Farm machines", values: MACHINES },
  { name: "Input sources", values: INPUT_SOURCES },
  { name: "Irrigation sources", values: IRRIGATION_SOURCES },
  { name: "Asset types", values: ASSET_TYPES },
];

export default function MasterDataModule() {
  const { role } = useRole();
  const canEdit = role.id === "admin" || role.id === "pmu";
  const registry = useRegistry();
  const [tab, setTab] = useState<Tab>("Districts & blocks");
  const [v, setV] = useState({ name: "", district: "", block: "", lat: "", lng: "" });
  const [cropName, setCropName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const villages = [...HARYANA_VILLAGES.map((x) => ({ ...x, added: false })), ...registry.villages.map((x) => ({ ...x, added: true }))];
  const mandis = [...HARYANA_MANDIS.map((x) => ({ ...x, added: false })), ...registry.mandis.map((x) => ({ ...x, added: true }))];

  const addPlace = (kind: "villages" | "mandis") => {
    const lat = Number(v.lat);
    const lng = Number(v.lng);
    if (isBlank(v.name) || isBlank(v.district)) return setError("Name and district are required.");
    if (kind === "villages" && isBlank(v.block)) return setError("Block is required for a village.");
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inHaryana({ lat, lng })) return setError("Enter a latitude and longitude inside Haryana.");
    setError(null);
    if (kind === "villages") updateRegistry((r) => ({ ...r, villages: [...r.villages, { name: v.name.trim(), district: v.district, block: v.block, lat, lng }] }));
    else updateRegistry((r) => ({ ...r, mandis: [...r.mandis, { name: v.name.trim(), district: v.district, lat, lng }] }));
    setV({ name: "", district: "", block: "", lat: "", lng: "" });
  };

  const placeForm = (kind: "villages" | "mandis") => canEdit && (
    <Card className="mb-4">
      <SectionHeader title={kind === "villages" ? "Add village" : "Add mandi"} subtitle="Added entries are stored on this device and appear in the capture forms" />
      <FormGrid>
        <Field label="Name" required><input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="District" required><Select value={v.district} onChange={(d) => setV({ ...v, district: d, block: "" })} options={HARYANA_DISTRICTS.map((d) => d.name)} placeholder="Select" /></Field>
        {kind === "villages" && (
          <Field label="Block" required>
            {HARYANA_BLOCKS[v.district] ? <Select value={v.block} onChange={(b) => setV({ ...v, block: b })} options={HARYANA_BLOCKS[v.district]} placeholder="Select" /> : <input className="input" value={v.block} onChange={(e) => setV({ ...v, block: e.target.value })} />}
          </Field>
        )}
        <Field label="Latitude" required><input className="input" value={v.lat} onChange={(e) => setV({ ...v, lat: e.target.value })} /></Field>
        <Field label="Longitude" required><input className="input" value={v.lng} onChange={(e) => setV({ ...v, lng: e.target.value })} /></Field>
      </FormGrid>
      {error && <p className="text-xs text-bad mt-2">{error}</p>}
      <button className="btn-primary mt-3" onClick={() => addPlace(kind)}><Plus size={14} /> Add</button>
    </Card>
  );

  return (
    <div>
      <PageHeader title="Haryana Master Data" subtitle="Districts, blocks, villages, mandis, Haryana Fresh crops and option lists used across capture forms" icon={<Database size={20} />} />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {TABS.map((t) => (
          <button key={t} onClick={() => { setTab(t); setError(null); }} className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${tab === t ? "bg-gt-purple text-white border-gt-purple" : "bg-white text-muted border-border"}`}>{t}</button>
        ))}
      </div>

      {tab === "Districts & blocks" && (
        <Card>
          <SectionHeader title="All 22 districts of Haryana" subtitle="Headquarters coordinates are approximate. Blocks are listed for the six programme districts." />
          <Table>
            <thead><tr><Th>District</Th><Th>HQ (lat, lng)</Th><Th>Programme</Th><Th>Blocks</Th></tr></thead>
            <tbody>
              {HARYANA_DISTRICTS.map((d) => (
                <tr key={d.name}>
                  <Td className="font-medium">{d.name}</Td>
                  <Td className="text-xs font-mono">{d.lat.toFixed(4)}, {d.lng.toFixed(4)}</Td>
                  <Td>{d.programme ? <Badge tone="good">Yes</Badge> : <Badge>No</Badge>}</Td>
                  <Td className="text-xs">{HARYANA_BLOCKS[d.name]?.join(", ") ?? "Not loaded yet"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === "Villages" && (
        <>
          {placeForm("villages")}
          <Card>
            <SectionHeader title={`Villages (${villages.length})`} subtitle="Only the programme's block towns are preloaded. Add real villages as field teams reach them." />
            <Table>
              <thead><tr><Th>Village</Th><Th>Block</Th><Th>District</Th><Th>Lat, lng</Th><Th>Source</Th></tr></thead>
              <tbody>{villages.map((x) => <tr key={`${x.district}-${x.name}`}><Td className="font-medium">{x.name}</Td><Td>{x.block}</Td><Td>{x.district}</Td><Td className="text-xs font-mono">{x.lat.toFixed(4)}, {x.lng.toFixed(4)}</Td><Td>{x.added ? <Badge tone="orange">Added</Badge> : <Badge>Master</Badge>}</Td></tr>)}</tbody>
            </Table>
          </Card>
        </>
      )}

      {tab === "Mandis" && (
        <>
          {placeForm("mandis")}
          <Card>
            <SectionHeader title={`Haryana mandis (${mandis.length})`} subtitle="APMC markets handling fruit and vegetables, at approximate town coordinates" />
            <Table>
              <thead><tr><Th>Mandi</Th><Th>District</Th><Th>Lat, lng</Th><Th>Source</Th></tr></thead>
              <tbody>{mandis.map((m) => <tr key={`${m.district}-${m.name}`}><Td className="font-medium">{m.name}</Td><Td>{m.district}</Td><Td className="text-xs font-mono">{m.lat.toFixed(4)}, {m.lng.toFixed(4)}</Td><Td>{m.added ? <Badge tone="orange">Added</Badge> : <Badge>Master</Badge>}</Td></tr>)}</tbody>
            </Table>
          </Card>
        </>
      )}

      {tab === "Crops" && (
        <>
          {canEdit && (
            <Card className="mb-4">
              <SectionHeader title="Add crop" />
              <div className="flex gap-2">
                <input className="input !w-64" value={cropName} onChange={(e) => setCropName(e.target.value)} placeholder="Crop name" />
                <button className="btn-primary" onClick={() => { const n = cropName.trim(); if (n && ![...HF_CROPS.map((c) => c.name), ...registry.crops].some((c) => c.toLowerCase() === n.toLowerCase())) { updateRegistry((r) => ({ ...r, crops: [...r.crops, n] })); setCropName(""); } }}><Plus size={14} /> Add</button>
              </div>
            </Card>
          )}
          <Card>
            <SectionHeader title={`Haryana Fresh crops (${HF_CROPS.length + registry.crops.length})`} subtitle="Marketplace crops are traded in this demo's marketplace screens" />
            <Table>
              <thead><tr><Th>Crop</Th><Th>Category</Th><Th>Marketplace</Th></tr></thead>
              <tbody>
                {HF_CROPS.map((c) => <tr key={c.name}><Td className="font-medium">{c.name}</Td><Td>{c.category}</Td><Td>{c.marketplace ? <Badge tone="good">Yes</Badge> : "-"}</Td></tr>)}
                {registry.crops.map((c) => <tr key={c}><Td className="font-medium">{c}</Td><Td>Added</Td><Td>-</Td></tr>)}
              </tbody>
            </Table>
          </Card>
        </>
      )}

      {tab === "Option lists" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OPTION_LISTS.map((l) => (
            <Card key={l.name}>
              <SectionHeader title={l.name} subtitle={`${l.values.length} options`} />
              <div className="flex flex-wrap gap-1.5">{l.values.map((x) => <Badge key={x}>{x}</Badge>)}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
