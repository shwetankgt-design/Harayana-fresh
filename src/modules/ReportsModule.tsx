import { useEffect, useMemo, useState } from "react";
import { FileBarChart, Download, ShieldCheck } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, StatCard, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import {
  DISTRICTS,
  orders,
  listings,
  inventoryLots,
  benefitRecords,
  communityPosts,
  listingById,
  reportAccessLog,
  logReportAccess,
} from "../data/seed";
import type { District, ReportKey } from "../data/types";
import { formatDateTime } from "../lib/format";

const REPORTS: { key: ReportKey; label: string }[] = [
  { key: "overview", label: "Overview - All Modules" },
  { key: "marketplace", label: "Marketplace Volume" },
  { key: "inventory", label: "Inventory Throughput" },
  { key: "benefits", label: "Benefit Disbursal" },
  { key: "community", label: "Community Engagement" },
];

function inDistrict<T extends { district: District }>(rows: T[], d: District | "All Districts"): T[] {
  return d === "All Districts" ? rows : rows.filter((r) => r.district === d);
}

function buildRows(report: ReportKey, district: District | "All Districts") {
  if (report === "marketplace") {
    return orders
      .filter((o) => o.status !== "Cancelled")
      .filter((o) => district === "All Districts" || listingById(o.listing_id)?.district === district)
      .map((o) => ({
        order_id: o.order_id,
        crop: o.crop,
        district: listingById(o.listing_id)?.district ?? "-",
        channel: o.channel,
        quantity_qtl: o.quantity_qtl,
        value: o.quantity_qtl * o.agreed_price_per_qtl,
        status: o.status,
        placed_on: o.placed_on,
      }));
  }
  if (report === "inventory") {
    return inDistrict(inventoryLots, district).map((l) => ({
      lot_id: l.lot_id,
      crop: l.crop,
      district: l.district,
      stage: l.stage,
      quantity_qtl: l.quantity_qtl,
      updated_on: l.updated_on,
    }));
  }
  if (report === "benefits") {
    return inDistrict(benefitRecords, district).map((b) => ({
      benefit_id: b.benefit_id,
      district: b.district,
      scheme: b.scheme,
      status: b.status,
      amount_claimed: b.amount_claimed,
      amount_disbursed: b.amount_disbursed ?? 0,
    }));
  }
  if (report === "community") {
    return inDistrict(communityPosts, district).map((p) => ({
      post_id: p.post_id,
      district: p.district,
      type: p.type,
      resolution_status: p.resolution_status,
      moderation_status: p.moderation_status,
      posted_on: p.posted_on,
    }));
  }
  // overview
  const mp = orders.filter((o) => o.status !== "Cancelled" && (district === "All Districts" || listingById(o.listing_id)?.district === district));
  const inv = inDistrict(inventoryLots, district);
  const ben = inDistrict(benefitRecords, district);
  const com = inDistrict(communityPosts, district);
  const lst = inDistrict(listings, district);
  return [
    { module: "Marketplace", metric: "Orders", value: mp.length },
    { module: "Marketplace", metric: "Active/Total Listings", value: `${lst.filter((l) => l.status === "Active").length}/${lst.length}` },
    { module: "Inventory", metric: "Lots Tracked", value: inv.length },
    { module: "Benefit", metric: "Claims", value: ben.length },
    { module: "Benefit", metric: "Amount Disbursed", value: ben.reduce((s, b) => s + (b.amount_disbursed ?? 0), 0) },
    { module: "Community", metric: "Threads", value: com.length },
  ];
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsModule() {
  const { role } = useRole();
  const [report, setReport] = useState<ReportKey>("overview");
  const [district, setDistrict] = useState<District | "All Districts">("All Districts");
  const [logVersion, setLogVersion] = useState(0);

  useEffect(() => {
    logReportAccess(role.id, role.title, report, district, "Viewed");
    setLogVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, district]);

  const rows = useMemo(() => buildRows(report, district), [report, district]);

  function exportAs(format: "csv" | "json") {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const filenameBase = `haryana-fresh-${report}-${district === "All Districts" ? "all-districts" : district.toLowerCase()}-${stamp}`;
    if (format === "csv") {
      download(`${filenameBase}.csv`, toCSV(rows as Record<string, unknown>[]), "text/csv;charset=utf-8;");
      logReportAccess(role.id, role.title, report, district, "Exported CSV");
    } else {
      download(`${filenameBase}.json`, JSON.stringify(rows, null, 2), "application/json;charset=utf-8;");
      logReportAccess(role.id, role.title, report, district, "Exported JSON");
    }
    setLogVersion((v) => v + 1);
  }

  const columns = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div>
      <PageHeader title="Activity Reporting & Export" subtitle="Cross-module report views with on-demand CSV/JSON export" icon={<FileBarChart size={20} />} />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="text-sm">
          <span className="subtle block mb-1">Report</span>
          <select className="input" value={report} onChange={(e) => setReport(e.target.value as ReportKey)}>
            {REPORTS.map((r) => (<option key={r.key} value={r.key}>{r.label}</option>))}
          </select>
        </label>
        <label className="text-sm">
          <span className="subtle block mb-1">District</span>
          <select className="input" value={district} onChange={(e) => setDistrict(e.target.value as District | "All Districts")}>
            <option>All Districts</option>
            {DISTRICTS.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
        </label>
        <button onClick={() => exportAs("csv")} className="btn-primary inline-flex items-center gap-1.5"><Download size={14} /> Export CSV</button>
        <button onClick={() => exportAs("json")} className="btn-primary inline-flex items-center gap-1.5"><Download size={14} /> Export JSON</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Rows in Current View" value={String(rows.length)} />
        <StatCard label="Report" value={REPORTS.find((r) => r.key === report)?.label ?? ""} />
        <StatCard label="Jurisdiction" value={district} />
        <StatCard label="Access Log Entries" value={String(reportAccessLog.length)} />
      </div>

      <Card className="mb-4">
        <SectionHeader title="Report Data" subtitle="Same data used for the CSV/JSON export" />
        {rows.length === 0 ? (
          <EmptyState icon={<FileBarChart size={20} />} title="No rows for this filter" body="Try a different report or district." />
        ) : (
          <Table>
            <thead>
              <tr>{columns.map((c) => (<Th key={c}>{c.replace(/_/g, " ")}</Th>))}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((r, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <Td key={c} className="text-xs">{String((r as Record<string, unknown>)[c] ?? "-")}</Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {role.id === "admin" && (
        <Card>
          <SectionHeader title="Report Access Audit Log" subtitle="Who viewed or exported which report, this session" />
          {reportAccessLog.length === 0 ? (
            <EmptyState icon={<ShieldCheck size={20} />} title="No access recorded yet" body="Entries appear as personas view or export reports." />
          ) : (
            <Table key={logVersion}>
              <thead>
                <tr><Th>When</Th><Th>Persona</Th><Th>Report</Th><Th>Jurisdiction</Th><Th>Action</Th></tr>
              </thead>
              <tbody>
                {reportAccessLog.slice(0, 80).map((l) => (
                  <tr key={l.log_id}>
                    <Td className="text-xs">{formatDateTime(l.accessed_on)}</Td>
                    <Td className="text-xs">{l.role_title}</Td>
                    <Td>{REPORTS.find((r) => r.key === l.report)?.label ?? l.report}</Td>
                    <Td>{l.district_filter}</Td>
                    <Td><Badge tone={l.action === "Viewed" ? "neutral" : "good"}>{l.action}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
