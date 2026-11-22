import { useState } from "react";
import { Sprout, Plus, CheckCircle2 } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import { cropPlans as seedPlans, farmersByPg, farmerMembers, landParcels, parcelsByFarmer, pgById } from "../data/seed";
import type { Crop, CropPlan, Season } from "../data/types";
import { formatDate } from "../lib/format";

const CROPS: Crop[] = ["Kinnow", "Guava", "Tomato", "Potato", "Onion", "Mango"];
const SEASONS: Season[] = ["Kharif", "Rabi", "Zaid"];

export default function CropPlanModule() {
  const { role } = useRole();
  const scopedFarmers = role.id === "farmer" && role.scopedFarmerId
    ? farmerMembers.filter((f) => f.farmer_id === role.scopedFarmerId)
    : role.scopedPgId
      ? farmersByPg(role.scopedPgId)
      : farmerMembers;

  const [plans, setPlans] = useState<CropPlan[]>(() =>
    seedPlans.filter((p) => scopedFarmers.some((f) => f.farmer_id === p.farmer_id))
  );
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({
    farmer_id: scopedFarmers[0]?.farmer_id ?? "",
    crop: "Tomato" as Crop,
    season: "Kharif" as Season,
    area: "1.0",
    yield_qtl: "80",
  });

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const canEdit = role.id !== "buyer" && role.id !== "packhouse";

  const addPlan = () => {
    const farmerParcels = parcelsByFarmer(form.farmer_id);
    const parcel_id = farmerParcels[0]?.parcel_id ?? landParcels[0]?.parcel_id;
    if (!form.farmer_id || !parcel_id) {
      flash("Select a farmer with a registered land parcel first.");
      return;
    }
    const sowing = new Date();
    const harvest = new Date(sowing);
    harvest.setDate(harvest.getDate() + 120);
    const plan: CropPlan = {
      plan_id: `CP-NEW-${Math.floor(Math.random() * 9000 + 1000)}`,
      farmer_id: form.farmer_id,
      parcel_id,
      crop: form.crop,
      season: form.season,
      year: "2026-27",
      area_acres: parseFloat(form.area) || 0,
      expected_yield_qtl: parseFloat(form.yield_qtl) || 0,
      sowing_date: sowing.toISOString().slice(0, 10),
      expected_harvest_date: harvest.toISOString().slice(0, 10),
      status: "Planned",
    };
    setPlans((prev) => [plan, ...prev]);
    setShowAdd(false);
    flash("Crop plan entry saved.");
  };

  return (
    <div>
      <PageHeader
        title="Season-wise Crop Plans"
        subtitle="Crop, area, expected yield and land parcel entries by season"
        icon={<Sprout size={20} />}
      />

      {canEdit && (
        <div className="flex justify-end mb-4">
          <button className="btn-orange" onClick={() => setShowAdd((s) => !s)}>
            <Plus size={16} /> New Crop Plan
          </button>
        </div>
      )}

      {showAdd && (
        <Card className="mb-4">
          <SectionHeader title="Enter Crop Plan" subtitle="Season Kharif/Rabi 2026-27" />
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="subtle block mb-1">Farmer</label>
              <select className="input" value={form.farmer_id} onChange={(e) => setForm({ ...form, farmer_id: e.target.value })}>
                {scopedFarmers.map((f) => (
                  <option key={f.farmer_id} value={f.farmer_id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="subtle block mb-1">Crop</label>
              <select className="input" value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value as Crop })}>
                {CROPS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="subtle block mb-1">Season</label>
              <select className="input" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value as Season })}>
                {SEASONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="subtle block mb-1">Area (acres)</label>
              <input className="input" type="number" step="0.1" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </div>
            <div>
              <label className="subtle block mb-1">Expected yield (Qtl)</label>
              <input className="input" type="number" value={form.yield_qtl} onChange={(e) => setForm({ ...form, yield_qtl: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn-primary" onClick={addPlan}><CheckCircle2 size={16} /> Save Plan</button>
            <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </Card>
      )}

      <Card>
        {plans.length === 0 ? (
          <EmptyState icon={<Sprout size={22} />} title="No crop plans recorded" body="Add a season-wise crop plan above to populate this view." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Farmer</Th>
                <Th>Crop</Th>
                <Th>Season</Th>
                <Th>Area (acres)</Th>
                <Th>Expected Yield (Qtl)</Th>
                <Th>Sowing</Th>
                <Th>Harvest (est.)</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const farmer = farmerMembers.find((f) => f.farmer_id === p.farmer_id);
                return (
                  <tr key={p.plan_id}>
                    <Td className="font-medium">{farmer?.name ?? p.farmer_id}</Td>
                    <Td>{p.crop}</Td>
                    <Td>{p.season} {p.year}</Td>
                    <Td>{p.area_acres}</Td>
                    <Td>{p.expected_yield_qtl.toLocaleString("en-IN")}</Td>
                    <Td>{formatDate(p.sowing_date)}</Td>
                    <Td>{formatDate(p.expected_harvest_date)}</Td>
                    <Td><Badge tone={p.status === "Harvested" ? "good" : p.status === "Growing" ? "orange" : "neutral"}>{p.status}</Badge></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-ink text-white text-sm px-4 py-2.5 rounded-lg shadow-cardhover z-50 spark-fade max-w-xs">
          {toast}
        </div>
      )}
    </div>
  );
}
