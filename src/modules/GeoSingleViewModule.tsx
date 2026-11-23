import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, Polygon, Polyline, Popup } from "react-leaflet";
import { Map as MapIcon } from "lucide-react";
import { Card, IllustrativeTag, PageHeader, SectionHeader, StatCard, Table, Td, Th } from "../components/ui";
import { BaseMap, FitBounds, toTuple } from "../components/map/MapKit";
import { producerGroups, pgById } from "../data/seed";
import { ASSET_TYPES, HARYANA_DISTRICTS, PG_LOCATIONS, type AssetType, type LatLng } from "../data/haryanaMaster";
import { useRegistry } from "../lib/registryStore";
import { registryRows } from "../lib/farmerRegistry";
import { ASSET_COLORS, useAllAssets } from "./AssetRegistryModule";

type Layer = "farmers" | "plots" | "pgs" | "links" | AssetType;

const BASE_LAYERS: { key: Layer; label: string; color: string }[] = [
  { key: "farmers", label: "Farmers", color: "#F5A623" },
  { key: "plots", label: "Land plots", color: "#EAB308" },
  { key: "pgs", label: "Producer Groups", color: "#0F766E" },
  { key: "links", label: "PG to farmer links", color: "#94A3B8" },
];

// One map for PMU and administration: every farmer, plot, Producer Group and value-chain asset.
export default function GeoSingleViewModule() {
  const registry = useRegistry();
  const assets = useAllAssets();
  const [district, setDistrict] = useState("");
  const [pg, setPg] = useState("");
  const [layers, setLayers] = useState<Set<Layer>>(new Set<Layer>(["farmers", "pgs", ...ASSET_TYPES]));

  const toggle = (l: Layer) => setLayers((s) => { const n = new Set(s); if (n.has(l)) n.delete(l); else n.add(l); return n; });
  const on = (l: Layer) => layers.has(l);

  const farmers = useMemo(() => registryRows(registry.surveys).filter((r) => r.status !== "Draft"), [registry.surveys]);
  const fFarmers = farmers.filter((r) => (!district || r.district === district) && (!pg || r.pg_id === pg));
  const fPgs = producerGroups.filter((p) => (!district || p.district === district) && (!pg || p.pg_id === pg));
  const fAssets = assets.filter((a) => (!district || a.district === district) && (!pg || a.linked_pg_ids.includes(pg) || a.type === "APMC Mandi"));

  const plots = fFarmers.flatMap((r) => r.plots.filter((p) => p.boundary.length >= 3).map((p) => ({ row: r, plot: p })));
  const mappedAcres = plots.reduce((s, x) => s + (x.plot.mapped_acres ?? 0), 0);

  const focus: LatLng[] = [
    ...fFarmers.flatMap((r) => (r.home ? [r.home] : [])),
    ...fPgs.map((p) => PG_LOCATIONS[p.pg_id]),
    ...(district || pg ? fAssets.filter((a) => a.type !== "APMC Mandi") : []),
  ];

  const byDistrict = HARYANA_DISTRICTS.map((d) => ({
    district: d.name,
    pgs: producerGroups.filter((p) => p.district === d.name).length,
    farmers: farmers.filter((r) => r.district === d.name).length,
    gps: farmers.filter((r) => r.district === d.name && r.survey && r.home).length,
    acres: farmers.filter((r) => r.district === d.name).reduce((s, r) => s + r.plots.reduce((t, p) => t + (p.mapped_acres ?? 0), 0), 0),
    assets: assets.filter((a) => a.district === d.name && a.type !== "APMC Mandi").length,
    mandis: assets.filter((a) => a.district === d.name && a.type === "APMC Mandi").length,
  })).filter((d) => d.pgs || d.farmers || d.assets || d.mandis);

  return (
    <div>
      <PageHeader title="Geo Single View" subtitle="Farmers, land plots, Producer Groups and value-chain assets across Haryana on one map" icon={<MapIcon size={20} />} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select className="input !w-auto" value={district} onChange={(e) => { setDistrict(e.target.value); setPg(""); }}>
          <option value="">All districts</option>
          {HARYANA_DISTRICTS.map((d) => <option key={d.name}>{d.name}</option>)}
        </select>
        <select className="input !w-auto" value={pg} onChange={(e) => setPg(e.target.value)}>
          <option value="">All Producer Groups</option>
          {producerGroups.filter((p) => !district || p.district === district).map((p) => <option key={p.pg_id} value={p.pg_id}>{p.name}</option>)}
        </select>
        <IllustrativeTag label="Seeded locations simulated" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <StatCard label="Farmers on map" value={String(fFarmers.filter((r) => r.home).length)} sub={`${fFarmers.filter((r) => r.survey && r.home).length} with captured GPS`} />
        <StatCard label="Mapped plots" value={String(plots.length)} sub={`${mappedAcres.toFixed(0)} acres`} />
        <StatCard label="Producer Groups" value={String(fPgs.length)} />
        <StatCard label="Value-chain assets" value={String(fAssets.filter((a) => a.type !== "APMC Mandi").length)} />
        <StatCard label="Mandis" value={String(fAssets.filter((a) => a.type === "APMC Mandi").length)} />
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[...BASE_LAYERS, ...ASSET_TYPES.map((t) => ({ key: t as Layer, label: t, color: ASSET_COLORS[t] }))].map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => toggle(l.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${on(l.key) ? "bg-white border-ink/30 text-ink" : "bg-surface border-border text-muted line-through"}`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} /> {l.label}
            </button>
          ))}
        </div>
        <BaseMap height={560}>
          {focus.length > 0 && <FitBounds points={focus} maxZoom={district || pg ? 12 : 8} />}

          {on("links") && fFarmers.map((r) => r.home && r.pg_id && PG_LOCATIONS[r.pg_id] && (
            <Polyline key={`l-${r.key}`} positions={[toTuple(r.home), toTuple(PG_LOCATIONS[r.pg_id])]} pathOptions={{ color: "#94A3B8", weight: 1, opacity: 0.6 }} />
          ))}

          {on("plots") && plots.map(({ row, plot }, i) => (
            <Polygon key={`p-${row.key}-${i}`} positions={plot.boundary.map(toTuple)} pathOptions={{ color: "#EAB308", weight: 1.5, fillOpacity: 0.35 }}>
              <Popup><div className="text-sm"><b>{row.name}</b><br />{plot.label}{plot.crop ? ` · ${plot.crop}` : ""}<br />Mapped {plot.mapped_acres} acres{plot.simulated ? " (simulated)" : ""}</div></Popup>
            </Polygon>
          ))}

          {fAssets.filter((a) => on(a.type)).map((a) => (
            <CircleMarker key={a.asset_id} center={toTuple(a)} radius={a.type === "APMC Mandi" ? 5 : 8} pathOptions={{ color: ASSET_COLORS[a.type], fillColor: ASSET_COLORS[a.type], fillOpacity: a.status === "Operational" ? 0.85 : 0.3, weight: 2 }}>
              <Popup><div className="text-sm"><b>{a.name}</b><br />{a.type} · {a.status}<br />{a.district}{a.capacity_mt ? ` · ${a.capacity_mt} MT` : ""}{a.linked_pg_ids.length ? <><br />Serves: {a.linked_pg_ids.map((id) => pgById(id)?.name).join(", ")}</> : null}</div></Popup>
            </CircleMarker>
          ))}

          {on("farmers") && fFarmers.map((r) => r.home && (
            <CircleMarker key={`f-${r.key}`} center={toTuple(r.home)} radius={r.survey ? 6 : 3.5} pathOptions={{ color: r.survey ? "#B45309" : "#F5A623", fillColor: "#F5A623", fillOpacity: r.survey ? 0.95 : 0.6, weight: r.survey ? 2 : 1 }}>
              <Popup>
                <div className="text-sm">
                  <b>{r.name}</b> ({r.farmer_id})<br />{r.village}, {r.district}<br />{pgById(r.pg_id)?.name ?? "No PG"}<br />
                  {r.crops.join(", ")}<br />
                  <span className="text-xs">{r.home_simulated ? "Simulated location" : "GPS captured"}</span><br />
                  <Link to={`/farmer-registry/${r.key}`} className="text-gt-purple underline text-xs">Open farmer record</Link>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {on("pgs") && fPgs.map((p) => (
            <CircleMarker key={p.pg_id} center={toTuple(PG_LOCATIONS[p.pg_id])} radius={11} pathOptions={{ color: "#0F766E", fillColor: "#14B8A6", fillOpacity: 0.9, weight: 3 }}>
              <Popup><div className="text-sm"><b>{p.name}</b><br />{p.district} · {p.member_count} members · {p.total_land_acres} acres<br />Crops: {p.primary_crops.join(", ")}</div></Popup>
            </CircleMarker>
          ))}
        </BaseMap>
        <p className="subtle text-xs mt-2">Large dots are farmers with captured GPS; small dots are seeded farmers placed near their village. Faded asset markers are not yet operational.</p>
      </Card>

      <Card>
        <SectionHeader title="District summary" subtitle="Seeded and captured farmers, mapped area and assets" />
        <Table>
          <thead><tr><Th>District</Th><Th>Producer Groups</Th><Th>Farmers</Th><Th>GPS captured</Th><Th>Mapped acres</Th><Th>Assets</Th><Th>Mandis</Th></tr></thead>
          <tbody>
            {byDistrict.map((d) => (
              <tr key={d.district} className="cursor-pointer hover:bg-gt-purple/5" onClick={() => { setDistrict(d.district); setPg(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                <Td className="font-medium">{d.district}</Td>
                <Td>{d.pgs}</Td>
                <Td>{d.farmers}</Td>
                <Td>{d.gps}</Td>
                <Td>{d.acres.toFixed(0)}</Td>
                <Td>{d.assets}</Td>
                <Td>{d.mandis}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
