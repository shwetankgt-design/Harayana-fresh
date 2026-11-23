import { useState } from "react";
import { BadgeCheck, PackageCheck, Truck, QrCode } from "lucide-react";
import { Badge, Card, EmptyState, IllustrativeTag, PageHeader, SectionHeader, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import { inventoryLots, pgById, packhouseById } from "../data/seed";
import type { InventoryLot, LotStage } from "../data/types";
import { qualityStatus } from "../lib/intelligence";
import { formatDateTime } from "../lib/format";

const QC_TONE: Record<string, "good" | "warn" | "bad" | "neutral"> = {
  "QC passed": "good",
  "QC pending": "warn",
  "Not yet received": "neutral",
};

// Visual-only traceability code, derived from the lot ID. It encodes nothing and is labelled as a demo.
function TraceCode({ seed }: { seed: string }) {
  let h = 0;
  for (const ch of seed) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      h = (Math.imul(h, 1103515245) + 12345) >>> 0;
      const inCorner = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
      if (!inCorner && (h >>> 16) & 1) cells.push({ x, y });
    }
  }
  return (
    <svg viewBox="0 0 90 90" width="90" height="90" role="img" aria-label={`Visual traceability code for ${seed}`} className="text-ink">
      <rect x="0" y="0" width="90" height="90" fill="none" />
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x * 10} y={c.y * 10} width="9" height="9" rx="1.5" fill="currentColor" />
      ))}
    </svg>
  );
}

const CHAIN = ["Source PG", "Lot ID", "Packhouse", "Haryana Fresh pack", "Dispatch"];

export default function QualityCheckModule() {
  const { role } = useRole();
  const canAct = role.id === "packhouse";
  const [selected, setSelected] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // Packhouse lots only; PMU and admin see every packhouse.
  const lots = inventoryLots.filter((l) =>
    l.packhouse_id && (role.id === "packhouse" ? l.packhouse_id === (role.scopedPackhouseId ?? "PH-01") : true)
  );
  const lot = lots.find((l) => l.lot_id === selected) ?? null;

  const advance = (target: InventoryLot, stage: LotStage, remark: string) => {
    const at = new Date().toISOString();
    target.stage = stage;
    target.updated_on = at;
    target.history.push({ stage, at, by: "Packhouse Operator", remark });
    setVersion((v) => v + 1);
    flash(`${target.lot_id} moved to ${stage}.`);
  };

  return (
    <div key={version}>
      <PageHeader
        title="Haryana Fresh Quality Check"
        subtitle="Source PG to lot, grade, quality check, Haryana Fresh packaging and dispatch readiness"
        icon={<BadgeCheck size={20} />}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <IllustrativeTag label="Demo traceability" />
        <span className="subtle text-xs">Quality status is derived from the lot's stage. Traceability codes are visual only.</span>
      </div>

      <Card className="mb-4">
        <SectionHeader
          title="Lots at packhouse"
          subtitle={canAct ? "Mark a lot packed, then dispatched, to move it through the chain" : "Read-only view for this role"}
        />
        {lots.length === 0 ? (
          <EmptyState icon={<BadgeCheck size={20} />} title="No lots yet" body="Lots appear once produce is received at a packhouse." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Source PG</Th>
                <Th>Lot ID</Th>
                <Th>Crop</Th>
                <Th>Grade</Th>
                <Th>QC status</Th>
                <Th>Packaging</Th>
                <Th>Dispatch readiness</Th>
                {canAct && <Th>Action</Th>}
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => {
                const q = qualityStatus(l.stage);
                return (
                  <tr
                    key={l.lot_id}
                    onClick={() => setSelected(l.lot_id)}
                    className={`cursor-pointer hover:bg-gt-purple/5 ${selected === l.lot_id ? "bg-gt-purple/5" : ""}`}
                  >
                    <Td className="text-xs">{pgById(l.pg_id)?.name ?? l.pg_id}</Td>
                    <Td className="font-medium">{l.lot_id}</Td>
                    <Td>{l.crop}</Td>
                    <Td className="text-xs">{l.grade}</Td>
                    <Td><Badge tone={QC_TONE[q.qc] ?? "neutral"}>{q.qc}</Badge></Td>
                    <Td className="text-xs">{q.packaging}</Td>
                    <Td><Badge tone={q.dispatch === "Ready for dispatch" ? "good" : "neutral"}>{q.dispatch}</Badge></Td>
                    {canAct && (
                      <Td>
                        {l.stage === "Graded" && (
                          <button
                            className="btn-primary !py-1 !px-2 !text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              advance(l, "Packed", "Lot packed in Haryana Fresh packaging and staged for dispatch.");
                            }}
                          >
                            <PackageCheck size={12} /> Mark packed
                          </button>
                        )}
                        {l.stage === "Packed" && (
                          <button
                            className="btn-orange !py-1 !px-2 !text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              advance(l, "Dispatched", "Consignment dispatched from packhouse.");
                            }}
                          >
                            <Truck size={12} /> Mark dispatched
                          </button>
                        )}
                      </Td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {lot && (
        <Card>
          <SectionHeader
            title={`${lot.crop} lot ${lot.lot_id}`}
            subtitle={`${lot.grade} · ${lot.quantity_qtl} Qtl · ${packhouseById(lot.packhouse_id ?? "")?.name ?? ""}`}
            right={<Badge tone={QC_TONE[qualityStatus(lot.stage).qc] ?? "neutral"}>{qualityStatus(lot.stage).qc}</Badge>}
          />
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5">
            <div className="flex flex-col items-center gap-2">
              <TraceCode seed={lot.lot_id} />
              <div className="flex items-center gap-1 text-[11px] font-mono text-ink">
                <QrCode size={12} /> HF-{lot.lot_id}
              </div>
            </div>
            <div className="space-y-3">
              <ol className="flex flex-wrap items-center gap-2 text-xs">
                {CHAIN.map((step, i) => (
                  <li key={step} className="rounded-full border border-border px-2.5 py-1 text-ink">
                    {i + 1}. {step}
                    {step === "Source PG" && `: ${pgById(lot.pg_id)?.name ?? lot.pg_id}`}
                  </li>
                ))}
              </ol>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="subtle text-[11px]">Packaging</div><div className="font-medium text-ink">{qualityStatus(lot.stage).packaging}</div></div>
                <div><div className="subtle text-[11px]">Dispatch readiness</div><div className="font-medium text-ink">{qualityStatus(lot.stage).dispatch}</div></div>
              </div>
              <div>
                <div className="subtle text-[11px] mb-1">Movement history</div>
                <ol className="space-y-1">
                  {lot.history.map((h, i) => (
                    <li key={i} className="text-xs text-ink">
                      <span className="font-semibold">{h.stage}</span> <span className="subtle">{formatDateTime(h.at)} · {h.by}</span>
                      <div className="text-muted">{h.remark}</div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </Card>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-ink text-white text-sm px-4 py-2.5 rounded-lg shadow-cardhover z-50 spark-fade max-w-xs">
          {toast}
        </div>
      )}
    </div>
  );
}
