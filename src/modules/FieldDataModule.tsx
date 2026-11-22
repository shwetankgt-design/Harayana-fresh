import { useMemo, useState } from "react";
import { Satellite, Droplets, Thermometer, CloudRain } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, SimulatedTag, StatCard, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import { fieldReadingsByFarmer, fieldReadingsByDistrict, fieldSensorReadings, DISTRICTS, parcelsByFarmer } from "../data/seed";
import type { District, FieldSensorReading } from "../data/types";
import { formatDateTime } from "../lib/format";

function flagTone(flag: FieldSensorReading["advisory_flag"]): "good" | "warn" | "bad" | "neutral" {
  if (flag === "Normal") return "good";
  if (flag === "Low Moisture" || flag === "Heat Stress") return "warn";
  if (flag === "Excess Rainfall") return "bad";
  return "neutral";
}

export default function FieldDataModule() {
  const { role } = useRole();
  const isOversight = role.id === "pmu" || role.id === "admin";

  if (!isOversight) {
    const readings = fieldReadingsByFarmer(role.scopedFarmerId!);
    const parcels = parcelsByFarmer(role.scopedFarmerId!);
    return (
      <div>
        <PageHeader title="Field Data - Your Land Parcels" subtitle="Latest simulated soil and weather readings for your parcels" icon={<Satellite size={20} />} />
        <div className="mb-4"><SimulatedTag /></div>
        {readings.length === 0 ? (
          <Card><EmptyState icon={<Satellite size={20} />} title="No field readings yet" body="Simulated sensor readings appear here once land parcels are on record." /></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readings.map((r) => {
              const parcel = parcels.find((p) => p.parcel_id === r.parcel_id);
              return (
                <Card key={r.reading_id}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-semibold text-ink">{parcel?.village ?? r.district} · {r.parcel_id}</div>
                      <div className="subtle">{formatDateTime(r.recorded_at)}</div>
                    </div>
                    <Badge tone={flagTone(r.advisory_flag)}>{r.advisory_flag}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-2 text-sm text-ink"><Droplets size={16} className="text-gt-purple" /> Soil moisture {r.soil_moisture_pct}%</div>
                    <div className="flex items-center gap-2 text-sm text-ink"><Thermometer size={16} className="text-gt-orange" /> Soil temp {r.soil_temperature_c}°C</div>
                    <div className="flex items-center gap-2 text-sm text-ink"><Thermometer size={16} className="text-gt-orange" /> Ambient {r.ambient_temperature_c}°C</div>
                    <div className="flex items-center gap-2 text-sm text-ink"><CloudRain size={16} className="text-gt-purple" /> Rainfall (24h) {r.rainfall_mm_24h} mm</div>
                  </div>
                  {r.advisory_flag !== "Normal" && (
                    <p className="text-sm text-warn mt-3 font-medium">
                      {r.advisory_flag === "Low Moisture" && "Soil moisture is running low - consider irrigation in the next 24-48 hours."}
                      {r.advisory_flag === "Heat Stress" && "High ambient temperature detected - watch for heat stress on standing crop."}
                      {r.advisory_flag === "Excess Rainfall" && "Heavy rainfall recorded - check for waterlogging and drainage."}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return <FieldDataOversightView />;
}

function FieldDataOversightView() {
  const [district, setDistrict] = useState<District | "All Districts">("All Districts");
  const readings = useMemo(
    () => (district === "All Districts" ? fieldSensorReadings : fieldReadingsByDistrict(district)),
    [district]
  );
  const flagged = readings.filter((r) => r.advisory_flag !== "Normal").length;
  const avgMoisture = readings.length ? Math.round(readings.reduce((s, r) => s + r.soil_moisture_pct, 0) / readings.length) : 0;

  return (
    <div>
      <PageHeader title="Field Data Ingestion - Aggregate View" subtitle="Simulated soil-moisture and weather readings sourced per land parcel" icon={<Satellite size={20} />} />
      <div className="mb-4"><SimulatedTag /></div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm">
          <span className="subtle block mb-1">Filter by District</span>
          <select className="input" value={district} onChange={(e) => setDistrict(e.target.value as District | "All Districts")}>
            <option>All Districts</option>
            {DISTRICTS.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Parcels Reporting" value={String(readings.length)} />
        <StatCard label="Avg. Soil Moisture" value={`${avgMoisture}%`} tone={avgMoisture >= 30 ? "good" : "warn"} />
        <StatCard label="Flagged Readings" value={String(flagged)} tone={flagged > 0 ? "warn" : "good"} />
        <StatCard label="Data Source" value="Simulated" sub="No live sensor hardware connected" />
      </div>

      <Card>
        <SectionHeader title="Latest Readings by Parcel" subtitle="One most-recent reading shown per land parcel" />
        {readings.length === 0 ? (
          <EmptyState icon={<Satellite size={20} />} title="No readings for this filter" body="Choose a different district." />
        ) : (
          <Table>
            <thead>
              <tr><Th>Parcel</Th><Th>District</Th><Th>Recorded</Th><Th>Soil Moisture</Th><Th>Soil Temp</Th><Th>Ambient</Th><Th>Rainfall (24h)</Th><Th>Flag</Th></tr>
            </thead>
            <tbody>
              {readings.slice(0, 60).map((r) => (
                <tr key={r.reading_id}>
                  <Td className="text-xs">{r.parcel_id}</Td>
                  <Td>{r.district}</Td>
                  <Td className="text-xs">{formatDateTime(r.recorded_at)}</Td>
                  <Td>{r.soil_moisture_pct}%</Td>
                  <Td>{r.soil_temperature_c}°C</Td>
                  <Td>{r.ambient_temperature_c}°C</Td>
                  <Td>{r.rainfall_mm_24h} mm</Td>
                  <Td><Badge tone={flagTone(r.advisory_flag)}>{r.advisory_flag}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
