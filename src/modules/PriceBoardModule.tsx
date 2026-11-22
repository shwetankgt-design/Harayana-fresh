import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, Activity } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, StatCard, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import { priceObservations, listings, orders, auctions } from "../data/seed";
import type { Crop } from "../data/types";
import { formatDate } from "../lib/format";

const CROPS: Crop[] = ["Kinnow", "Guava", "Tomato", "Potato", "Onion", "Mango"];

export default function PriceBoardModule() {
  const { role } = useRole();
  const isOversight = role.id === "pmu" || role.id === "admin";

  const activeListings = listings.filter((l) => l.status === "Active" || l.status === "Matched").length;
  const openOrders = orders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled").length;
  const openAuctions = auctions.filter((a) => a.status === "Open").length;
  const grossOrderValue = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.quantity_qtl * o.agreed_price_per_qtl, 0);

  const trendByCrop = useMemo(() => {
    return CROPS.map((crop) => {
      const points = priceObservations
        .filter((p) => p.crop === crop)
        .sort((a, b) => (a.observed_on < b.observed_on ? -1 : 1))
        .map((p) => ({ date: formatDate(p.observed_on), price: p.price_per_qtl }));
      return { crop, points, latest: points[points.length - 1]?.price };
    }).filter((c) => c.points.length >= 2);
  }, []);

  const recentByChannel = useMemo(() => {
    const map = new Map<string, { channel: string; count: number; value: number }>();
    orders
      .filter((o) => o.status !== "Cancelled")
      .forEach((o) => {
        const key = o.channel;
        const entry = map.get(key) ?? { channel: key, count: 0, value: 0 };
        entry.count += 1;
        entry.value += o.quantity_qtl * o.agreed_price_per_qtl;
        map.set(key, entry);
      });
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, []);

  return (
    <div>
      <PageHeader
        title={isOversight ? "Marketplace Activity - Aggregate View" : "Live Price & Order Status Board"}
        subtitle="Realised prices and demand pulled from live orders and closed auctions across the platform"
        icon={<Activity size={20} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Active Listings" value={String(activeListings)} />
        <StatCard label="Open Orders" value={String(openOrders)} tone="orange" sub="Placed / Confirmed / In Transit" />
        <StatCard label="Live Auctions" value={String(openAuctions)} tone="good" />
        <StatCard label="Gross Order Value" value={`Rs ${(grossOrderValue / 100000).toFixed(1)} L`} />
      </div>

      <Card className="mb-4">
        <SectionHeader title="Realised Price Trend by Crop" subtitle="Derived from confirmed orders and closed auction winning bids" />
        {trendByCrop.length === 0 ? (
          <EmptyState icon={<TrendingUp size={20} />} title="Not enough price history yet" body="Price trends populate once multiple orders or auctions close for a crop." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trendByCrop.map(({ crop, points, latest }) => (
              <div key={crop} className="border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-ink">{crop}</span>
                  <Badge tone="good">Rs {latest}/Qtl latest</Badge>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip formatter={(v: number) => [`Rs ${v}`, "Price/Qtl"]} />
                    <Line type="monotone" dataKey="price" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title="Demand by Channel" subtitle="Order count and value realised per sales channel" />
        {recentByChannel.length === 0 ? (
          <EmptyState icon={<Activity size={20} />} title="No order activity yet" body="Place orders from the Marketplace Discovery module to populate channel demand." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Channel</Th>
                <Th>Orders</Th>
                <Th>Value</Th>
              </tr>
            </thead>
            <tbody>
              {recentByChannel.map((r) => (
                <tr key={r.channel}>
                  <Td><Badge>{r.channel}</Badge></Td>
                  <Td>{r.count}</Td>
                  <Td className="font-semibold">Rs {r.value.toLocaleString("en-IN")}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
