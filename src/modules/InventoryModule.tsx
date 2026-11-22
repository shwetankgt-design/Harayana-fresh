import { Fragment, useMemo, useState } from "react";
import { Boxes, ChevronDown, ChevronUp, Sprout, Warehouse, Scissors, PackageCheck, Truck, CheckCircle2 } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import {
  inventoryLots,
  lotsByFarmer,
  lotsByPackhouse,
  lotsByPg,
  ordersByBuyer,
  pgById,
  packhouseById,
  farmerById,
} from "../data/seed";
import type { InventoryLot, LotStage } from "../data/types";
import { formatDateTime } from "../lib/format";

const STAGE_ORDER: LotStage[] = ["Harvested", "Received at Packhouse", "Graded", "Packed", "Dispatched", "Delivered to Buyer"];

const STAGE_ICON: Record<LotStage, typeof Sprout> = {
  Harvested: Sprout,
  "Received at Packhouse": Warehouse,
  Graded: Scissors,
  Packed: PackageCheck,
  Dispatched: Truck,
  "Delivered to Buyer": CheckCircle2,
};

const STAGE_TONE: Record<LotStage, "good" | "warn" | "bad" | "neutral" | "orange"> = {
  Harvested: "neutral",
  "Received at Packhouse": "orange",
  Graded: "orange",
  Packed: "warn",
  Dispatched: "warn",
  "Delivered to Buyer": "good",
};

export default function InventoryModule() {
  const { role } = useRole();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<LotStage | "All">("All");

  const lots = useMemo<InventoryLot[]>(() => {
    if (role.id === "farmer") return lotsByFarmer(role.scopedFarmerId ?? "HRF-00001");
    if (role.id === "pg_manager") return lotsByPg(role.scopedPgId ?? "PG-001");
    if (role.id === "packhouse") return lotsByPackhouse(role.scopedPackhouseId ?? "PH-01");
    if (role.id === "buyer") {
      const orderIds = new Set(ordersByBuyer(role.scopedBuyerId ?? "BYR-001").map((o) => o.order_id));
      return inventoryLots.filter((l) => l.order_id && orderIds.has(l.order_id));
    }
    return inventoryLots;
  }, [role]);

  const filtered = stageFilter === "All" ? lots : lots.filter((l) => l.stage === stageFilter);

  const counts = useMemo(() => {
    const m = new Map<LotStage, number>();
    STAGE_ORDER.forEach((s) => m.set(s, 0));
    lots.forEach((l) => m.set(l.stage, (m.get(l.stage) ?? 0) + 1));
    return m;
  }, [lots]);

  const isOversight = role.id === "pmu" || role.id === "admin";

  return (
    <div>
      <PageHeader
        title={isOversight ? "Value-Chain Inventory - Aggregate View" : "Inventory & Lot Tracking"}
        subtitle="Lot status from farm harvest through packhouse grading, packing and dispatch"
        icon={<Boxes size={20} />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {STAGE_ORDER.map((s) => {
          const Icon = STAGE_ICON[s];
          return (
            <button
              key={s}
              onClick={() => setStageFilter(stageFilter === s ? "All" : s)}
              className={`card card-pad text-left transition-shadow ${stageFilter === s ? "ring-2 ring-gt-purple" : ""}`}
            >
              <div className="flex items-center gap-1.5 text-muted mb-1">
                <Icon size={14} />
                <span className="text-[11px] font-semibold uppercase tracking-wide">{s}</span>
              </div>
              <div className="text-xl font-bold text-ink">{counts.get(s) ?? 0}</div>
            </button>
          );
        })}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<Boxes size={22} />} title="No lots to show" body="Inventory lots will appear here once produce is harvested and enters the value chain." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Lot</Th>
                <Th>Crop / Grade</Th>
                <Th>Qty (Qtl)</Th>
                <Th>Farmer</Th>
                <Th>PG</Th>
                <Th>Packhouse</Th>
                <Th>Stage</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const isOpen = expanded === l.lot_id;
                const Icon = STAGE_ICON[l.stage];
                return (
                  <Fragment key={l.lot_id}>
                    <tr>
                      <Td className="font-medium">
                        <button onClick={() => setExpanded(isOpen ? null : l.lot_id)} className="inline-flex items-center gap-1 hover:text-gt-purple">
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {l.lot_id}
                        </button>
                      </Td>
                      <Td>{l.crop}<div className="subtle text-[11px]">{l.grade}</div></Td>
                      <Td>{l.quantity_qtl}</Td>
                      <Td className="text-xs">{farmerById(l.farmer_id)?.name ?? l.farmer_id}</Td>
                      <Td className="text-xs">{pgById(l.pg_id)?.name ?? l.pg_id}</Td>
                      <Td className="text-xs">{l.packhouse_id ? packhouseById(l.packhouse_id)?.name ?? l.packhouse_id : "-"}</Td>
                      <Td>
                        <Badge tone={STAGE_TONE[l.stage]}>
                          <Icon size={12} /> {l.stage}
                        </Badge>
                      </Td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} className="bg-surface px-4 py-3 border-b border-border/70">
                          <SectionHeader title="Lot Movement History" subtitle={`${l.lot_id} · created ${formatDateTime(l.created_on)}`} />
                          <ol className="relative border-l-2 border-border ml-1.5 space-y-3">
                            {l.history.map((h, i) => {
                              const HIcon = STAGE_ICON[h.stage];
                              return (
                                <li key={i} className="ml-4">
                                  <span className="absolute -ml-[23px] mt-0.5 grid place-items-center w-5 h-5 rounded-full bg-white border-2 border-gt-purple text-gt-purple">
                                    <HIcon size={11} />
                                  </span>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-ink">{h.stage}</span>
                                    <span className="subtle text-xs">{formatDateTime(h.at)}</span>
                                    <span className="subtle text-xs">· by {h.by}</span>
                                  </div>
                                  <p className="text-xs text-muted mt-0.5">{h.remark}</p>
                                </li>
                              );
                            })}
                          </ol>
                          {l.order_id && <p className="subtle mt-3">Linked order: <span className="font-semibold text-ink">{l.order_id}</span></p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
