import { useMemo, useState } from "react";
import { Search, MapPin, ShoppingCart, Sparkles, X, Gavel } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import {
  listings as seedListings,
  orders as seedOrders,
  buyerRequirements,
  matchListingsForRequirement,
  pgById,
  packhouseById,
} from "../data/seed";
import type { Crop, District, Grade, Listing, Order, OrderStatusEvent, SalesChannel } from "../data/types";
import { formatDate } from "../lib/format";

const CROPS: Crop[] = ["Kinnow", "Guava", "Tomato", "Potato", "Onion", "Mango"];
const GRADES: Grade[] = ["Grade A (Premium)", "Grade B (Standard)", "Grade C (Processing)"];
const DISTRICTS: District[] = ["Karnal", "Kurukshetra", "Sirsa", "Ambala", "Hisar", "Panipat"];
const CHANNELS: SalesChannel[] = ["Retail", "Institutional", "Digital Commerce", "Wholesale"];

const tierTone = { "Strong Match": "good", "Good Match": "orange", "Partial Match": "neutral" } as const;

function sourceName(l: Listing): string {
  if (l.source_type === "PG" && l.pg_id) return pgById(l.pg_id)?.name ?? l.pg_id;
  if (l.source_type === "Packhouse" && l.packhouse_id) return packhouseById(l.packhouse_id)?.name ?? l.packhouse_id;
  return "-";
}

export default function MarketplaceModule() {
  const { role } = useRole();
  const buyerId = role.scopedBuyerId ?? "BYR-001";
  const myRequirements = buyerRequirements.filter((r) => r.buyer_id === buyerId);

  const [filters, setFilters] = useState({ crop: "All", grade: "All", district: "All", channel: "All" });
  const [orderQty, setOrderQty] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [, forceRender] = useState(0);
  const [showMatches, setShowMatches] = useState(myRequirements[0]?.requirement_id ?? "");

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const filtered = useMemo(() => {
    return seedListings.filter((l) => {
      if (l.status !== "Active" && l.status !== "Matched") return false;
      if (l.quantity_available_qtl <= 0) return false;
      if (filters.crop !== "All" && l.crop !== filters.crop) return false;
      if (filters.grade !== "All" && l.grade !== filters.grade) return false;
      if (filters.district !== "All" && l.district !== filters.district) return false;
      if (filters.channel !== "All" && !l.channels.includes(filters.channel as SalesChannel)) return false;
      return true;
    });
  }, [filters]);

  const activeReq = myRequirements.find((r) => r.requirement_id === showMatches);
  const matches = activeReq ? matchListingsForRequirement(activeReq) : [];

  const placeOrder = (listing: Listing) => {
    if (listing.format === "Auction") {
      flash("This is an auction listing - place bids from the Auctions & Bulk Bidding module.");
      return;
    }
    const qtyStr = orderQty[listing.listing_id] ?? "";
    const qty = parseFloat(qtyStr) || Math.min(10, listing.quantity_available_qtl);
    if (qty <= 0 || qty > listing.quantity_available_qtl) {
      flash(`Enter a quantity up to ${listing.quantity_available_qtl} Qtl available.`);
      return;
    }
    const now = new Date().toISOString();
    const history: OrderStatusEvent[] = [
      { status: "Placed", at: now, by: "Buyer (self-service order)", remark: `Order placed against listing ${listing.listing_id}.` },
    ];
    const order: Order = {
      order_id: `ORD-NEW-${Math.floor(Math.random() * 9000 + 1000)}`,
      listing_id: listing.listing_id,
      buyer_id: buyerId,
      pg_id: listing.pg_id,
      packhouse_id: listing.packhouse_id,
      crop: listing.crop,
      grade: listing.grade,
      quantity_qtl: qty,
      agreed_price_per_qtl: listing.price_per_qtl ?? 0,
      channel: listing.channels[0] ?? "Wholesale",
      placed_on: now.slice(0, 10),
      status: "Placed",
      history,
    };
    seedOrders.unshift(order);
    listing.quantity_available_qtl -= qty;
    if (listing.quantity_available_qtl === 0) listing.status = "Fulfilled";
    forceRender((n) => n + 1);
    flash(`Order ${order.order_id} placed for ${qty} Qtl of ${listing.crop}. Track it in Orders & Fulfilment.`);
  };

  return (
    <div>
      <PageHeader
        title="Marketplace Discovery"
        subtitle="Search PG and packhouse listings by produce, grade, geography and availability"
        icon={<Search size={20} />}
      />

      {myRequirements.length > 0 && (
        <Card className="mb-4">
          <SectionHeader
            title="Matched to Your Requirements"
            subtitle="Rule-based match score against your standing procurement requirements"
            right={
              <select className="input !w-auto text-xs" value={showMatches} onChange={(e) => setShowMatches(e.target.value)}>
                {myRequirements.map((r) => (
                  <option key={r.requirement_id} value={r.requirement_id}>
                    {r.crop} · {r.quantity_qtl} Qtl · min {r.min_grade.split(" ")[1]}
                  </option>
                ))}
              </select>
            }
          />
          {matches.length === 0 ? (
            <EmptyState icon={<Sparkles size={20} />} title="No matching listings right now" body="No active listings currently satisfy this requirement's crop." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matches.slice(0, 4).map((m) => (
                <div key={m.listing.listing_id} className="border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-ink">{m.listing.crop} · {sourceName(m.listing)}</span>
                    <Badge tone={tierTone[m.tier]}>{m.tier} · {m.score}%</Badge>
                  </div>
                  <div className="subtle text-xs mb-2">{m.listing.grade} · {m.listing.quantity_available_qtl} Qtl available · {m.listing.district}</div>
                  <ul className="text-xs text-muted space-y-0.5 mb-2 list-disc list-inside">
                    {m.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                  <button className="btn-primary !py-1.5 !text-xs" onClick={() => placeOrder(m.listing)}>
                    <ShoppingCart size={13} /> {m.listing.format === "Auction" ? "View in Auctions" : "Place Order"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="mb-4">
        <SectionHeader title="Filter Listings" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="subtle block mb-1">Produce</label>
            <select className="input" value={filters.crop} onChange={(e) => setFilters({ ...filters, crop: e.target.value })}>
              <option>All</option>
              {CROPS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="subtle block mb-1">Grade</label>
            <select className="input" value={filters.grade} onChange={(e) => setFilters({ ...filters, grade: e.target.value })}>
              <option>All</option>
              {GRADES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="subtle block mb-1">District</label>
            <select className="input" value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value })}>
              <option>All</option>
              {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="subtle block mb-1">Channel</label>
            <select className="input" value={filters.channel} onChange={(e) => setFilters({ ...filters, channel: e.target.value })}>
              <option>All</option>
              {CHANNELS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<Search size={22} />} title="No listings match these filters" body="Try widening the produce, grade, district or channel filters." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Listing</Th>
                <Th>Crop / Grade</Th>
                <Th>Source</Th>
                <Th>Available Qty</Th>
                <Th>Location</Th>
                <Th>Channels</Th>
                <Th>Price</Th>
                <Th>Order</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.listing_id}>
                  <Td className="font-medium">{l.listing_id}</Td>
                  <Td>{l.crop}<div className="subtle text-[11px]">{l.grade}</div></Td>
                  <Td className="text-xs">{sourceName(l)}</Td>
                  <Td>{l.quantity_available_qtl} Qtl</Td>
                  <Td><span className="inline-flex items-center gap-1 text-xs"><MapPin size={12} className="text-muted" /> {l.district}</span></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {l.channels.map((c) => <Badge key={c}>{c}</Badge>)}
                    </div>
                  </Td>
                  <Td>
                    {l.format === "Auction" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gt-orange-dark"><Gavel size={12} /> Auction</span>
                    ) : (
                      <span className="text-xs font-semibold">Rs {l.price_per_qtl}/Qtl</span>
                    )}
                  </Td>
                  <Td>
                    {l.format === "Auction" ? (
                      <span className="subtle text-xs">Bid in Auctions</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          className="input !w-16 !py-1 text-xs"
                          type="number"
                          placeholder="Qty"
                          value={orderQty[l.listing_id] ?? ""}
                          onChange={(e) => setOrderQty({ ...orderQty, [l.listing_id]: e.target.value })}
                        />
                        <button className="btn-orange !py-1.5 !px-2.5 !text-xs" onClick={() => placeOrder(l)}>
                          <ShoppingCart size={13} />
                        </button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-ink text-white text-sm px-4 py-2.5 rounded-lg shadow-cardhover z-50 spark-fade max-w-sm flex items-start gap-2">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-white/60 hover:text-white shrink-0"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
