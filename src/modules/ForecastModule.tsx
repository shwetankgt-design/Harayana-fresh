import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Sparkles, FlaskConical, AlertTriangle } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import { demandForecasts, seasonRecommendationsForPg, pgById, DISTRICTS } from "../data/seed";
import type { District, ForecastTrend } from "../data/types";

function StagedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gt-orange-dark bg-gt-orange/10 rounded-full px-2 py-0.5">
      <FlaskConical size={10} /> Experimental / Indicative
    </span>
  );
}

function trendTone(trend: ForecastTrend): "good" | "bad" | "neutral" {
  if (trend === "Opportunity") return "good";
  if (trend === "Glut Risk") return "bad";
  return "neutral";
}

export default function ForecastModule() {
  const { role } = useRole();

  if (role.id === "farmer" || role.id === "pg_manager") {
    const pg = pgById(role.scopedPgId!)!;
    const recs = seasonRecommendationsForPg(pg.pg_id);
    return (
      <div>
        <PageHeader title="Your expected harvest and next season" subtitle="What your Producer Group's own order history suggests for next season" icon={<Sparkles size={20} />} />
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-gt-orange/5 border border-gt-orange/20 p-3.5">
          <AlertTriangle size={18} className="text-gt-orange-dark shrink-0 mt-0.5" />
          <div className="text-sm text-ink">
            <div className="mb-1"><StagedBadge /></div>
            This recommendation is directional and demo-scale, built only from your Producer Group's own listings and orders on this platform. It is not a validated forecasting model - use it as a conversation starter, not a guarantee.
          </div>
        </div>
        {recs.length === 0 ? (
          <Card><EmptyState icon={<Sparkles size={20} />} title="Not enough order history yet" body="Recommendations build up once your Producer Group has completed orders for a crop." /></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recs.map((r) => (
              <Card key={r.crop}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-ink">{r.crop}</div>
                  <Badge tone={r.fulfilment_rate_pct >= 70 ? "good" : "warn"}>{r.fulfilment_rate_pct}% fulfilled</Badge>
                </div>
                <p className="text-sm text-ink leading-relaxed">{r.recommendation}</p>
                <div className="subtle mt-2">Based on {r.orders_analysed} order(s) across {r.seasons_analysed} season(s) · avg. Rs {r.avg_realisation_per_qtl.toLocaleString("en-IN")}/Qtl</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <ForecastAnalyticalView />;
}

function ForecastAnalyticalView() {
  const [district, setDistrict] = useState<District | "All Districts">("All Districts");
  const filtered = useMemo(
    () => (district === "All Districts" ? demandForecasts : demandForecasts.filter((f) => f.district === district)),
    [district]
  );
  const chartData = useMemo(
    () =>
      filtered.slice(0, 12).map((f) => ({
        label: `${f.crop} · ${f.district}`,
        demand: f.projected_next_season_demand_qtl,
        trend: f.trend,
      })),
    [filtered]
  );
  const trendColor = (t: ForecastTrend) => (t === "Opportunity" ? "#16a34a" : t === "Glut Risk" ? "#dc2626" : "#7c3aed");

  return (
    <div>
      <PageHeader title="Demand Forecasting - Experimental / Indicative" subtitle="Directional glut/opportunity signals derived from seed and demo transaction data" icon={<Sparkles size={20} />} />

      <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-gt-orange/5 border border-gt-orange/20 p-3.5">
        <AlertTriangle size={18} className="text-gt-orange-dark shrink-0 mt-0.5" />
        <div className="text-sm text-ink">
          <div className="mb-1"><StagedBadge /></div>
          Forecasts below are computed only from this demo's seeded orders and price observations. They are directional and demo-scale, not a validated statistical model - do not use for real procurement or investment decisions.
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm">
          <span className="subtle block mb-1">Filter by District</span>
          <select className="input" value={district} onChange={(e) => setDistrict(e.target.value as District | "All Districts")}>
            <option>All Districts</option>
            {DISTRICTS.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
        </label>
      </div>

      <Card className="mb-4">
        <SectionHeader title="Projected Next-Season Demand (Qtl)" subtitle="Top signals for the current filter" />
        {chartData.length === 0 ? (
          <EmptyState icon={<Sparkles size={20} />} title="No forecast for this filter" body="Try a different district." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ left: 4, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="demand" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={trendColor(d.trend as ForecastTrend)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <SectionHeader title="Glut / Opportunity Signals by Crop and District" subtitle="Recommended channel is the most-used channel in each crop-district's order history" />
        {filtered.length === 0 ? (
          <EmptyState icon={<Sparkles size={20} />} title="No data for this filter" body="Try a different district." />
        ) : (
          <Table>
            <thead>
              <tr><Th>Crop</Th><Th>District</Th><Th>Trend</Th><Th>Projected Demand</Th><Th>Projected Price</Th><Th>Recommended Channel</Th><Th>Confidence</Th></tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.forecast_id}>
                  <Td className="font-medium">{f.crop}</Td>
                  <Td>{f.district}</Td>
                  <Td><Badge tone={trendTone(f.trend)}>{f.trend}</Badge></Td>
                  <Td>{f.projected_next_season_demand_qtl.toLocaleString("en-IN")} Qtl</Td>
                  <Td>Rs {f.projected_price_per_qtl.toLocaleString("en-IN")}</Td>
                  <Td>{f.recommended_channel ?? "-"}</Td>
                  <Td><Badge tone={f.confidence === "Medium" ? "neutral" : "warn"}>{f.confidence}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
