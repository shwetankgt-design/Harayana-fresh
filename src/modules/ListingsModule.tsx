import { useState } from "react";
import { PackageSearch, Plus, CheckCircle2, Tag, MapPin, Gavel } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import {
  listings as seedListings,
  listingsByPg,
  listingsByPackhouse,
  pgById,
  packhouseById,
  farmersByPg,
  plansByFarmer,
} from "../data/seed";
import type { Crop, Grade, Listing, SalesChannel } from "../data/types";
import { formatDate } from "../lib/format";

const CROPS: Crop[] = ["Kinnow", "Guava", "Tomato", "Potato", "Onion", "Mango"];
const GRADES: Grade[] = ["Grade A (Premium)", "Grade B (Standard)", "Grade C (Processing)"];
const CHANNELS: SalesChannel[] = ["Retail", "Institutional", "Digital Commerce", "Wholesale"];

const statusTone: Record<Listing["status"], "good" | "warn" | "bad" | "neutral" | "orange"> = {
  Active: "good",
  Matched: "orange",
  Fulfilled: "neutral",
  Closed: "neutral",
  Expired: "bad",
};

function ChannelChips({ channels }: { channels: SalesChannel[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {channels.map((c) => (
        <Badge key={c} tone="neutral">{c}</Badge>
      ))}
    </div>
  );
}

export default function ListingsModule() {
  const { role } = useRole();
  const isPackhouse = role.id === "packhouse";
  const pgId = role.scopedPgId ?? "PG-001";
  const packhouseId = role.scopedPackhouseId ?? "PH-01";
  const pg = !isPackhouse ? pgById(pgId) : undefined;
  const packhouse = isPackhouse ? packhouseById(packhouseId) : undefined;

  const scopedSeed = isPackhouse ? listingsByPackhouse(packhouseId) : listingsByPg(pgId);
  const [listings, setListings] = useState<Listing[]>(scopedSeed);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const members = !isPackhouse ? farmersByPg(pgId) : [];
  const [form, setForm] = useState({
    crop: "Tomato" as Crop,
    grade: "Grade B (Standard)" as Grade,
    quantity: "40",
    price: "1200",
    channels: ["Wholesale"] as SalesChannel[],
    format: "Fixed Price" as Listing["format"],
    days: "25",
  });

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const toggleChannel = (c: SalesChannel) => {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(c) ? f.channels.filter((x) => x !== c) : [...f.channels, c],
    }));
  };

  const createListing = () => {
    if (form.channels.length === 0) {
      flash("Select at least one sales channel for this listing.");
      return;
    }
    // Traceability: pull real crop plans for this crop from the PG's members (P0 data).
    const linkedPlans = !isPackhouse
      ? members.flatMap((m) => plansByFarmer(m.farmer_id)).filter((p) => p.crop === form.crop)
      : [];
    const linkedFarmerIds = [...new Set(linkedPlans.map((p) => p.farmer_id))];
    const availFrom = new Date();
    const availUntil = new Date(availFrom);
    availUntil.setDate(availUntil.getDate() + (parseInt(form.days) || 20));

    const listing: Listing = {
      listing_id: `LST-NEW-${Math.floor(Math.random() * 9000 + 1000)}`,
      source_type: isPackhouse ? "Packhouse" : "PG",
      pg_id: isPackhouse ? null : pgId,
      packhouse_id: isPackhouse ? packhouseId : null,
      crop: form.crop,
      grade: form.grade,
      quantity_qtl: parseFloat(form.quantity) || 0,
      quantity_available_qtl: parseFloat(form.quantity) || 0,
      district: (isPackhouse ? packhouse?.district : pg?.district) ?? "Karnal",
      village: (isPackhouse ? packhouse?.name : members[0]?.village) ?? "",
      available_from: availFrom.toISOString().slice(0, 10),
      available_until: availUntil.toISOString().slice(0, 10),
      channels: form.channels,
      format: form.format,
      price_per_qtl: form.format === "Fixed Price" ? parseFloat(form.price) || 0 : null,
      reserve_price_per_qtl: form.format === "Auction" ? parseFloat(form.price) || 0 : null,
      linked_plan_ids: linkedPlans.map((p) => p.plan_id),
      linked_farmer_ids: isPackhouse ? [] : linkedFarmerIds,
      created_by_farmer_id: isPackhouse ? (members[0]?.farmer_id ?? "") : (pg?.manager_farmer_id ?? ""),
      created_on: availFrom.toISOString().slice(0, 10),
      status: "Active",
      notes: isPackhouse
        ? `Graded output listed directly by ${packhouse?.name ?? "packhouse"}.`
        : linkedFarmerIds.length
          ? `Pooled listing from ${linkedFarmerIds.length} member(s) with active ${form.crop} crop plans.`
          : `New listing - no matching active crop plan found for ${form.crop} yet (demo entry).`,
    };
    seedListings.unshift(listing);
    setListings((prev) => [listing, ...prev]);
    setShowAdd(false);
    flash(
      listing.format === "Auction"
        ? "Auction listing created. Visit the Auctions module to monitor bids."
        : "Listing published to the marketplace."
    );
  };

  return (
    <div>
      <PageHeader
        title="Marketplace Listings"
        subtitle={
          isPackhouse
            ? `${packhouse?.name ?? "Packhouse"} · produce listed for sale across channels`
            : `${pg?.name ?? "Producer Group"} · pooled produce listed for sale, traceable to member crop plans`
        }
        icon={<PackageSearch size={20} />}
      />

      <div className="flex justify-end mb-4">
        <button className="btn-orange" onClick={() => setShowAdd((s) => !s)}>
          <Plus size={16} /> New Listing
        </button>
      </div>

      {showAdd && (
        <Card className="mb-4">
          <SectionHeader title="Create Listing" subtitle="Produce, grade, quantity, location and availability window" />
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="subtle block mb-1">Crop</label>
              <select className="input" value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value as Crop })}>
                {CROPS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="subtle block mb-1">Grade</label>
              <select className="input" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value as Grade })}>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="subtle block mb-1">Quantity (Qtl)</label>
              <input className="input" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="subtle block mb-1">Format</label>
              <select className="input" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as Listing["format"] })}>
                <option>Fixed Price</option>
                <option>Auction</option>
              </select>
            </div>
            <div>
              <label className="subtle block mb-1">{form.format === "Auction" ? "Reserve price / Qtl (Rs)" : "Price / Qtl (Rs)"}</label>
              <input className="input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="subtle block mb-1">Availability window (days)</label>
              <input className="input" type="number" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
            </div>
          </div>
          <div className="mt-3">
            <label className="subtle block mb-1">Sales channels (multi-channel catalogue - tag one listing with several)</label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChannel(c)}
                  className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                    form.channels.includes(c)
                      ? "bg-gt-purple text-white border-gt-purple"
                      : "bg-white text-muted border-border hover:border-gt-purple/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-primary" onClick={createListing}><CheckCircle2 size={16} /> Publish Listing</button>
            <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </Card>
      )}

      <Card>
        {listings.length === 0 ? (
          <EmptyState icon={<PackageSearch size={22} />} title="No listings yet" body="Create a listing above to make pooled produce visible to buyers." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Listing</Th>
                <Th>Crop / Grade</Th>
                <Th>Available Qty</Th>
                <Th>Location</Th>
                <Th>Window</Th>
                <Th>Channels</Th>
                <Th>Format / Price</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.listing_id}>
                  <Td className="font-medium">
                    {l.listing_id}
                    {l.linked_plan_ids.length > 0 && (
                      <div className="subtle text-[11px] mt-0.5">Traced to {l.linked_plan_ids.length} crop plan(s), {l.linked_farmer_ids.length} member(s)</div>
                    )}
                  </Td>
                  <Td>{l.crop}<div className="subtle text-[11px]">{l.grade}</div></Td>
                  <Td>{l.quantity_available_qtl} / {l.quantity_qtl} Qtl</Td>
                  <Td><span className="inline-flex items-center gap-1"><MapPin size={12} className="text-muted" /> {l.village}, {l.district}</span></Td>
                  <Td className="text-xs">{formatDate(l.available_from)} - {formatDate(l.available_until)}</Td>
                  <Td><ChannelChips channels={l.channels} /></Td>
                  <Td>
                    {l.format === "Auction" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gt-orange-dark"><Gavel size={12} /> Auction · Reserve Rs {l.reserve_price_per_qtl}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold"><Tag size={12} className="text-muted" /> Rs {l.price_per_qtl}/Qtl</span>
                    )}
                  </Td>
                  <Td><Badge tone={statusTone[l.status]}>{l.status}</Badge></Td>
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
