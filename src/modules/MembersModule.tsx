import { useMemo, useState } from "react";
import { Users, UserPlus, Trash2, CheckCircle2 } from "lucide-react";
import { Badge, Card, CompletenessBar, EmptyState, PageHeader, SectionHeader, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import { farmersByPg, pgById } from "../data/seed";
import type { AffiliationStatus, FarmerMember, MemberRole } from "../data/types";
import { formatDate } from "../lib/format";

export default function MembersModule() {
  const { role } = useRole();
  const pgId = role.scopedPgId ?? "PG-001";
  const pg = pgById(pgId)!;
  const [members, setMembers] = useState<FarmerMember[]>(() => farmersByPg(pgId));
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; village: string; land: string }>({
    name: "",
    village: pg.district,
    land: "3.0",
  });

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const activeCount = useMemo(() => members.filter((m) => m.affiliation_status === "Active").length, [members]);

  const addMember = () => {
    if (!form.name.trim()) {
      flash("Enter a member name before adding.");
      return;
    }
    const next: FarmerMember = {
      farmer_id: `HRF-NEW-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: form.name.trim(),
      father_or_husband_name: "-",
      gender: "Male",
      phone: "9" + Math.floor(100000000 + Math.random() * 899999999),
      district: pg.district,
      village: form.village || pg.district,
      pg_id: pg.pg_id,
      role_in_pg: "Member",
      affiliation_status: "Pending Verification",
      joined_on: new Date().toISOString().slice(0, 10),
      land_holding_acres: parseFloat(form.land) || 0,
      farm_trace_id: null,
      ekyc_verified: false,
      data_completeness_pct: 40,
    };
    setMembers((prev) => [next, ...prev]);
    setShowAdd(false);
    setForm({ name: "", village: pg.district, land: "3.0" });
    flash(`${next.name} added to the Producer Group as Pending Verification.`);
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.farmer_id !== id));
    flash("Member removed from the Producer Group roster.");
  };

  const updateRole = (id: string, role_in_pg: MemberRole) => {
    setMembers((prev) => prev.map((m) => (m.farmer_id === id ? { ...m, role_in_pg } : m)));
  };

  const updateStatus = (id: string, affiliation_status: AffiliationStatus) => {
    setMembers((prev) => prev.map((m) => (m.farmer_id === id ? { ...m, affiliation_status } : m)));
  };

  return (
    <div>
      <PageHeader
        title="PG Member Management"
        subtitle={`${pg.name} · ${pg.district} district`}
        icon={<Users size={20} />}
      />

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex gap-2">
          <Badge>{members.length} total members</Badge>
          <Badge tone="good">{activeCount} active</Badge>
        </div>
        <button className="btn-orange" onClick={() => setShowAdd((s) => !s)}>
          <UserPlus size={16} /> Add Member
        </button>
      </div>

      {showAdd && (
        <Card className="mb-4">
          <SectionHeader title="Add New Member" subtitle="Registers a new farmer against this Producer Group (demo entry, not sent to any live registry)" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="subtle block mb-1">Full name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ram Kumar" />
            </div>
            <div>
              <label className="subtle block mb-1">Village</label>
              <input className="input" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
            </div>
            <div>
              <label className="subtle block mb-1">Land holding (acres)</label>
              <input className="input" type="number" step="0.1" value={form.land} onChange={(e) => setForm({ ...form, land: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn-primary" onClick={addMember}><CheckCircle2 size={16} /> Save Member</button>
            <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </Card>
      )}

      <Card>
        {members.length === 0 ? (
          <EmptyState icon={<Users size={22} />} title="No members in this Producer Group" body="Add a member above to build the roster for this demo." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Village</Th>
                <Th>Land (acres)</Th>
                <Th>Role</Th>
                <Th>Affiliation</Th>
                <Th>Data Completeness</Th>
                <Th>Joined</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.farmer_id}>
                  <Td className="font-medium">{m.name}</Td>
                  <Td>{m.village}</Td>
                  <Td>{m.land_holding_acres}</Td>
                  <Td>
                    <select
                      className="text-xs border border-border rounded-md px-1.5 py-1 bg-white"
                      value={m.role_in_pg}
                      onChange={(e) => updateRole(m.farmer_id, e.target.value as MemberRole)}
                    >
                      <option>Member</option>
                      <option>PG Manager</option>
                      <option>Aggregator</option>
                    </select>
                  </Td>
                  <Td>
                    <select
                      className="text-xs border border-border rounded-md px-1.5 py-1 bg-white"
                      value={m.affiliation_status}
                      onChange={(e) => updateStatus(m.farmer_id, e.target.value as AffiliationStatus)}
                    >
                      <option>Active</option>
                      <option>Pending Verification</option>
                      <option>Inactive</option>
                    </select>
                  </Td>
                  <Td className="w-32"><CompletenessBar pct={m.data_completeness_pct} /></Td>
                  <Td>{formatDate(m.joined_on)}</Td>
                  <Td>
                    <button onClick={() => removeMember(m.farmer_id)} className="text-muted hover:text-bad transition-colors" title="Remove member">
                      <Trash2 size={15} />
                    </button>
                  </Td>
                </tr>
              ))}
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
