import { useMemo, useState } from "react";
import { Megaphone, Plus, Bell } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "../components/ui";
import { useRole } from "../lib/role";
import { advisories, advisoriesForFarmer, farmerById, producerGroups, TODAY } from "../data/seed";
import type { Advisory, AdvisoryTargetAudience, Crop, District } from "../data/types";
import { formatDate } from "../lib/format";

const DISTRICTS: District[] = ["Karnal", "Kurukshetra", "Sirsa", "Ambala", "Hisar", "Panipat"];
const CROPS: Crop[] = ["Kinnow", "Guava", "Tomato", "Potato", "Onion", "Mango"];

const TARGET_LABEL: Record<AdvisoryTargetAudience, string> = {
  "All Farmers": "All Farmers",
  "Specific Crop": "Crop-Targeted",
  "Specific District": "District-Targeted",
  "Specific PG": "PG-Targeted",
};

export default function AdvisoryModule() {
  const { role } = useRole();
  const canPublish = role.id === "pmu" || role.id === "admin";

  const [localAdvisories, setLocalAdvisories] = useState<Advisory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<AdvisoryTargetAudience>("All Farmers");
  const [crop, setCrop] = useState<Crop>("Tomato");
  const [district, setDistrict] = useState<District>("Karnal");
  const [pgId, setPgId] = useState(producerGroups[0].pg_id);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const visible = useMemo<Advisory[]>(() => {
    const all = [...localAdvisories, ...advisories];
    if (canPublish) return all;
    const farmer = farmerById(role.scopedFarmerId ?? "HRF-00001");
    if (!farmer) return all.filter((a) => a.target === "All Farmers");
    return all.filter((a) => advisoriesForFarmer(farmer).some((v) => v.advisory_id === a.advisory_id) || localAdvisories.includes(a));
  }, [localAdvisories, canPublish, role]);

  const newCount = canPublish ? 0 : visible.filter((a) => {
    const days = (TODAY.getTime() - new Date(a.issued_on).getTime()) / (24 * 3600 * 1000);
    return days <= 7;
  }).length;

  const publish = () => {
    if (!title.trim() || !body.trim()) return;
    const adv: Advisory = {
      advisory_id: `ADV-LOCAL-${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      issuing_authority: role.id === "pmu" ? "PMU - Haryana Horticulture Digital Mission" : "DPMU",
      issued_by_role: role.id === "pmu" ? "PMU" : "DPMU",
      issued_on: new Date().toISOString().slice(0, 10),
      target,
      target_crop: target === "Specific Crop" ? crop : null,
      target_district: target === "Specific District" ? district : null,
      target_pg_id: target === "Specific PG" ? pgId : null,
      moderation_status: "Visible",
    };
    setLocalAdvisories((a) => [adv, ...a]);
    setTitle("");
    setBody("");
    setShowForm(false);
    flash("Advisory published.");
  };

  return (
    <div>
      <PageHeader
        title={canPublish ? "Advisory & Notice Publishing" : "Advisory for you"}
        subtitle={canPublish ? "Publish crop / geography / PG-targeted advisories to farmers and PGs" : "Advisories relevant to your crops, district and Producer Group"}
        icon={<Megaphone size={20} />}
      />

      {!canPublish && newCount > 0 && (
        <div className="flex items-center gap-2 mb-4 rounded-lg bg-gt-orange/10 border border-gt-orange/30 px-3 py-2.5 text-sm text-gt-orange-dark font-medium">
          <Bell size={16} /> {newCount} new advisory{newCount > 1 ? "ies" : ""} published in the last 7 days
        </div>
      )}

      {canPublish && (
        <div className="mb-4">
          {!showForm ? (
            <button className="btn-orange text-sm" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Publish Advisory
            </button>
          ) : (
            <Card>
              <SectionHeader title="Publish New Advisory" />
              <input
                className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-gt-purple/40"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gt-purple/40"
                rows={3}
                placeholder="Advisory content..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="subtle">Target:</span>
                {(["All Farmers", "Specific Crop", "Specific District", "Specific PG"] as AdvisoryTargetAudience[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTarget(t)}
                    className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                      target === t ? "bg-gt-purple text-white border-gt-purple" : "border-border text-muted hover:border-gt-purple"
                    }`}
                  >
                    {TARGET_LABEL[t]}
                  </button>
                ))}
                {target === "Specific Crop" && (
                  <select className="text-xs border border-border rounded-lg px-2 py-1.5" value={crop} onChange={(e) => setCrop(e.target.value as Crop)}>
                    {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                {target === "Specific District" && (
                  <select className="text-xs border border-border rounded-lg px-2 py-1.5" value={district} onChange={(e) => setDistrict(e.target.value as District)}>
                    {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
                {target === "Specific PG" && (
                  <select className="text-xs border border-border rounded-lg px-2 py-1.5" value={pgId} onChange={(e) => setPgId(e.target.value)}>
                    {producerGroups.map((p) => <option key={p.pg_id} value={p.pg_id}>{p.name}</option>)}
                  </select>
                )}
              </div>
              <div className="flex gap-2">
                <button className="btn-orange text-xs" onClick={publish}>Publish</button>
                <button className="btn-ghost text-xs" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </Card>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <Card><EmptyState icon={<Megaphone size={22} />} title="No advisories" body="Advisories targeted to your crop, district or Producer Group will appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => (
            <Card key={a.advisory_id}>
              <SectionHeader
                title={a.title}
                subtitle={`${a.issuing_authority} · ${formatDate(a.issued_on)}`}
                right={<Badge tone="orange">{TARGET_LABEL[a.target]}</Badge>}
              />
              <p className="text-sm text-ink leading-relaxed">{a.body}</p>
              {(a.target_crop || a.target_district || a.target_pg_id) && (
                <p className="subtle mt-2">
                  Targeted to: {[a.target_crop, a.target_district, a.target_pg_id].filter(Boolean).join(" · ")}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-ink text-white text-sm px-4 py-2.5 rounded-lg shadow-cardhover z-50 spark-fade max-w-xs">
          {toast}
        </div>
      )}
    </div>
  );
}
