import { Fragment, useMemo, useState } from "react";
import { ClipboardList, ChevronDown, ChevronUp, XCircle, CheckCircle2, Truck, PackageCheck, AlertTriangle } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import { orders as seedOrders, ordersByBuyer, ordersForListingOwner, buyerById, pgById, packhouseById } from "../data/seed";
import type { Order, OrderStatus } from "../data/types";
import { formatDateTime } from "../lib/format";

const statusTone: Record<OrderStatus, "good" | "warn" | "bad" | "neutral" | "orange"> = {
  Placed: "neutral",
  Confirmed: "orange",
  "In Transit": "warn",
  Delivered: "good",
  Cancelled: "bad",
  Disputed: "bad",
};

const statusIcon: Record<OrderStatus, typeof CheckCircle2> = {
  Placed: ClipboardList,
  Confirmed: CheckCircle2,
  "In Transit": Truck,
  Delivered: PackageCheck,
  Cancelled: XCircle,
  Disputed: AlertTriangle,
};

// Forward status lifecycle for sell-side confirm/advance actions.
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  Placed: "Confirmed",
  Confirmed: "In Transit",
  "In Transit": "Delivered",
};

function sourceName(o: Order): string {
  if (o.pg_id) return pgById(o.pg_id)?.name ?? o.pg_id;
  if (o.packhouse_id) return packhouseById(o.packhouse_id)?.name ?? o.packhouse_id;
  return "-";
}

export default function OrdersModule() {
  const { role } = useRole();
  const isBuyer = role.id === "buyer";
  const isSellSide = role.id === "pg_manager" || role.id === "packhouse";
  const isOversight = role.id === "pmu" || role.id === "admin";

  const [, forceRender] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const orders = useMemo<Order[]>(() => {
    if (isBuyer) return ordersByBuyer(role.scopedBuyerId ?? "BYR-001");
    if (isSellSide) return ordersForListingOwner(role.scopedPgId ?? null, role.scopedPackhouseId ?? null);
    return seedOrders;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, seedOrders.length]);

  const advance = (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    order.status = next;
    order.history.push({
      status: next,
      at: new Date().toISOString(),
      by: role.id === "packhouse" ? "Packhouse Operator" : "PG Manager",
      remark:
        next === "Confirmed"
          ? "Order confirmed and accepted for dispatch."
          : next === "In Transit"
            ? "Consignment dispatched from source location."
            : "Consignment received and delivery confirmed.",
    });
    forceRender((n) => n + 1);
    flash(`Order ${order.order_id} moved to ${next}.`);
  };

  const cancel = (order: Order) => {
    if (order.status === "Delivered" || order.status === "Cancelled") return;
    order.status = "Cancelled";
    order.history.push({
      status: "Cancelled",
      at: new Date().toISOString(),
      by: isBuyer ? "Buyer" : role.id === "packhouse" ? "Packhouse Operator" : "PG Manager",
      remark: "Order cancelled by " + (isBuyer ? "buyer" : "seller") + " before delivery.",
    });
    forceRender((n) => n + 1);
    flash(`Order ${order.order_id} cancelled.`);
  };

  return (
    <div>
      <PageHeader
        title={isOversight ? "Orders & Fulfilment - Aggregate View" : "Orders & Fulfilment"}
        subtitle="Full status-change history is recorded against every order for auditability"
        icon={<ClipboardList size={20} />}
      />

      <Card>
        {orders.length === 0 ? (
          <EmptyState icon={<ClipboardList size={22} />} title="No orders yet" body="Orders placed against listings will appear here with their full status history." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Crop / Grade</Th>
                <Th>Qty (Qtl)</Th>
                <Th>{isBuyer ? "Seller" : "Buyer"}</Th>
                <Th>Channel</Th>
                <Th>Value</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const Icon = statusIcon[o.status];
                const isOpen = expanded === o.order_id;
                const canAdvance = isSellSide && NEXT_STATUS[o.status];
                const canCancel = (isBuyer || isSellSide) && o.status !== "Delivered" && o.status !== "Cancelled";
                return (
                  <Fragment key={o.order_id}>
                    <tr>
                      <Td className="font-medium">
                        <button onClick={() => setExpanded(isOpen ? null : o.order_id)} className="inline-flex items-center gap-1 hover:text-gt-purple">
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {o.order_id}
                        </button>
                      </Td>
                      <Td>{o.crop}<div className="subtle text-[11px]">{o.grade}</div></Td>
                      <Td>{o.quantity_qtl}</Td>
                      <Td className="text-xs">{isBuyer ? sourceName(o) : buyerById(o.buyer_id)?.name ?? o.buyer_id}</Td>
                      <Td><Badge>{o.channel}</Badge></Td>
                      <Td className="font-semibold">Rs {(o.quantity_qtl * o.agreed_price_per_qtl).toLocaleString("en-IN")}</Td>
                      <Td>
                        <Badge tone={statusTone[o.status]}>
                          <Icon size={12} /> {o.status}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          {canAdvance && (
                            <button className="text-xs font-semibold text-gt-purple hover:underline" onClick={() => advance(o)}>
                              Mark {NEXT_STATUS[o.status]}
                            </button>
                          )}
                          {canCancel && (
                            <button className="text-xs font-semibold text-bad hover:underline" onClick={() => cancel(o)}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="bg-surface px-4 py-3 border-b border-border/70">
                          <SectionHeader title="Status-Change History" subtitle={`${o.order_id} · placed ${o.placed_on}`} />
                          <ol className="relative border-l-2 border-border ml-1.5 space-y-3">
                            {o.history.map((h, i) => {
                              const HIcon = statusIcon[h.status];
                              return (
                                <li key={i} className="ml-4">
                                  <span className="absolute -ml-[23px] mt-0.5 grid place-items-center w-5 h-5 rounded-full bg-white border-2 border-gt-purple text-gt-purple">
                                    <HIcon size={11} />
                                  </span>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-ink">{h.status}</span>
                                    <span className="subtle text-xs">{formatDateTime(h.at)}</span>
                                    <span className="subtle text-xs">· by {h.by}</span>
                                  </div>
                                  <p className="text-xs text-muted mt-0.5">{h.remark}</p>
                                </li>
                              );
                            })}
                          </ol>
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

      {toast && (
        <div className="fixed bottom-6 right-6 bg-ink text-white text-sm px-4 py-2.5 rounded-lg shadow-cardhover z-50 spark-fade max-w-xs">
          {toast}
        </div>
      )}
    </div>
  );
}
