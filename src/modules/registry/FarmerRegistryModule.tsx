import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Plus, Download, Search, ArrowUpDown, RotateCcw, MapPin } from "lucide-react";
import { Badge, Card, EmptyState, IllustrativeTag, PageHeader, StatCard, Table, Td, Th } from "../../components/ui";
import { useRole } from "../../lib/role";
import { producerGroups, pgById } from "../../data/seed";
import { HARYANA_DISTRICTS } from "../../data/haryanaMaster";
import { getPersistError, resetRegistry, useRegistry } from "../../lib/registryStore";
import { registryRows, type RegistryRow, type RegistryStatus } from "../../lib/farmerRegistry";

const STATUS_TONE: Record<RegistryStatus, "neutral" | "warn" | "good"> = {
  "Baseline (seeded)": "neutral",
  Draft: "warn",
  Submitted: "good",
};

type SortKey = "name" | "farmer_id" | "district" | "pg" | "status" | "updated";

function toCsv(rows: RegistryRow[]): string {
  const header = ["Farmer ID", "Name", "Mobile", "Gender", "District", "Block", "Village", "Producer Group", "Status", "Horticulture acres", "Crops", "Latitude", "Longitude", "Location source", "Mapped plots"];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [r.farmer_id, r.name, r.mobile, r.gender, r.district, r.block, r.village, pgById(r.pg_id)?.name ?? "", r.status, r.horti_area_acres, r.crops.join("; "), r.home?.lat.toFixed(6) ?? "", r.home?.lng.toFixed(6) ?? "", r.home ? (r.home_simulated ? "Simulated" : "Captured") : "", r.plots.filter((p) => p.boundary.length >= 3).length].map(esc).join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export default function FarmerRegistryModule() {
  const { role } = useRole();
  const navigate = useNavigate();
  const registry = useRegistry();
  const pgScoped = role.id === "pg_manager";
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [pg, setPg] = useState(pgScoped ? role.scopedPgId ?? "" : "");
  const [status, setStatus] = useState<"" | RegistryStatus>("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "updated", dir: -1 });

  const all = useMemo(() => registryRows(registry.surveys), [registry.surveys]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = all.filter(
      (r) =>
        (!needle || r.name.toLowerCase().includes(needle) || r.mobile.includes(needle) || r.farmer_id.toLowerCase().includes(needle) || r.village.toLowerCase().includes(needle)) &&
        (!district || r.district === district) &&
        (!pg || r.pg_id === pg) &&
        (!status || r.status === status)
    );
    const val = (r: RegistryRow): string => {
      switch (sort.key) {
        case "name": return r.name;
        case "farmer_id": return r.farmer_id;
        case "district": return r.district;
        case "pg": return pgById(r.pg_id)?.name ?? "";
        case "status": return r.status;
        case "updated": return r.updated;
      }
    };
    return [...filtered].sort((a, b) => val(a).localeCompare(val(b)) * sort.dir);
  }, [all, q, district, pg, status, sort]);

  const scoped = pgScoped ? all.filter((r) => r.pg_id === role.scopedPgId) : all;
  const submitted = scoped.filter((r) => r.status === "Submitted").length;
  const drafts = scoped.filter((r) => r.status === "Draft").length;
  const geoCaptured = scoped.filter((r) => r.survey && (r.home || r.plots.some((p) => p.boundary.length >= 3))).length;

  const header = (key: SortKey, label: string) => (
    <Th>
      <button type="button" className="inline-flex items-center gap-1 uppercase" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label} <ArrowUpDown size={11} className={sort.key === key ? "text-gt-purple" : ""} />
      </button>
    </Th>
  );

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `haryana-fresh-farmer-registry-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const persistError = getPersistError();

  return (
    <div>
      <PageHeader title="Farmer Registry" subtitle="Register farmers, map their location and land plots, and link them to Producer Groups" icon={<Users size={20} />} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button className="btn-orange" onClick={() => navigate("/farmer-registry/new")}><Plus size={16} /> New farmer registration</button>
        <button className="btn-ghost" onClick={exportCsv}><Download size={16} /> Download CSV</button>
        <Link to="/geo-view" className="btn-ghost"><MapPin size={16} /> Open map</Link>
        {registry.surveys.length > 0 && (role.id === "admin" || role.id === "pmu") && (
          <button className="btn-ghost text-bad" onClick={() => { if (window.confirm("Delete every farmer registration captured on this device? Seeded farmers stay.")) resetRegistry(); }}>
            <RotateCcw size={16} /> Reset captured data
          </button>
        )}
      </div>
      {persistError && <div className="mb-4 rounded-lg bg-bad/5 border border-bad/20 p-3 text-sm text-ink">{persistError}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Farmers in scope" value={String(scoped.length)} sub={pgScoped ? pgById(role.scopedPgId ?? "")?.name : "Seeded and captured"} />
        <StatCard label="Registrations submitted" value={String(submitted)} tone="good" />
        <StatCard label="Drafts in progress" value={String(drafts)} tone={drafts ? "warn" : "neutral"} />
        <StatCard label="Captured with GPS" value={String(geoCaptured)} sub="Seeded farmers use simulated locations" />
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input !pl-8" placeholder="Name, mobile, farmer ID, village" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input" value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">All districts</option>
            {HARYANA_DISTRICTS.map((d) => <option key={d.name}>{d.name}</option>)}
          </select>
          <select className="input" value={pg} disabled={pgScoped} onChange={(e) => setPg(e.target.value)}>
            <option value="">All Producer Groups</option>
            {producerGroups.map((p) => <option key={p.pg_id} value={p.pg_id}>{p.name}</option>)}
          </select>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as RegistryStatus | "")}>
            <option value="">All statuses</option>
            <option>Submitted</option>
            <option>Draft</option>
            <option>Baseline (seeded)</option>
          </select>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <span className="subtle text-xs">{rows.length} farmer(s). Click a row to open the record.</span>
          <IllustrativeTag label="Seeded locations simulated" />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<Users size={20} />} title="No farmers match" body="Change the filters, or register a new farmer." />
        ) : (
          <Table>
            <thead>
              <tr>
                {header("farmer_id", "Farmer ID")}
                {header("name", "Name")}
                {header("district", "Location")}
                {header("pg", "Producer Group")}
                <Th>Crops</Th>
                <Th>Geo</Th>
                {header("status", "Status")}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 300).map((r) => (
                <tr key={r.key} className="cursor-pointer hover:bg-gt-purple/5" onClick={() => navigate(`/farmer-registry/${r.key}`)}>
                  <Td className="text-xs font-mono">{r.farmer_id}</Td>
                  <Td className="font-medium">{r.name}<div className="subtle text-[11px]">{r.mobile}</div></Td>
                  <Td className="text-xs">{r.village}{r.block ? `, ${r.block}` : ""}<div className="subtle text-[11px]">{r.district}</div></Td>
                  <Td className="text-xs">{pgById(r.pg_id)?.name ?? "-"}</Td>
                  <Td className="text-xs">{r.crops.join(", ") || "-"}</Td>
                  <Td className="text-xs">
                    {r.home ? <Badge tone={r.home_simulated ? "neutral" : "good"}>{r.home_simulated ? "Simulated" : "GPS"}</Badge> : <Badge tone="warn">None</Badge>}
                    <div className="subtle text-[11px]">{r.plots.filter((p) => p.boundary.length >= 3).length} plot(s)</div>
                  </Td>
                  <Td><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {rows.length > 300 && <p className="subtle text-xs mt-2">Showing the first 300. Narrow the filters or download the CSV for all {rows.length}.</p>}
      </Card>
    </div>
  );
}
