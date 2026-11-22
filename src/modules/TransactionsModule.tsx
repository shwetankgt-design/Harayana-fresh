import { useMemo, useState } from "react";
import { Receipt, Lock, Filter } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Table, Td, Th } from "../components/ui";
import { useRole } from "../lib/role";
import { transactions, transactionsByBuyer, transactionsByPackhouse, transactionsByPg, buyerById, pgById, packhouseById } from "../data/seed";
import type { TransactionRecord, TransactionStatus, TransactionType } from "../data/types";
import { formatDate } from "../lib/format";

const STATUS_TONE: Record<TransactionStatus, "good" | "warn" | "bad" | "neutral" | "orange"> = {
  Recorded: "neutral",
  Reconciled: "good",
  Disputed: "bad",
};

const TYPE_FILTERS: (TransactionType | "All")[] = ["All", "Sale Proceeds", "Aggregator Commission", "Packhouse Service Fee", "Farmer Payout"];

export default function TransactionsModule() {
  const { role } = useRole();
  const [typeFilter, setTypeFilter] = useState<TransactionType | "All">("All");
  const [selected, setSelected] = useState<TransactionRecord | null>(null);

  const scoped = useMemo<TransactionRecord[]>(() => {
    if (role.id === "pg_manager") return transactionsByPg(role.scopedPgId ?? "PG-001");
    if (role.id === "packhouse") return transactionsByPackhouse(role.scopedPackhouseId ?? "PH-01");
    if (role.id === "buyer") return transactionsByBuyer(role.scopedBuyerId ?? "BYR-001");
    return transactions;
  }, [role]);

  const filtered = typeFilter === "All" ? scoped : scoped.filter((t) => t.type === typeFilter);
  const total = filtered.reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <PageHeader
        title="Financial Transaction Archive"
        subtitle="Immutable audit record of commercial/revenue transactions linked to marketplace orders"
        icon={<Receipt size={20} />}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-muted" />
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
              typeFilter === t ? "bg-gt-purple text-white border-gt-purple" : "border-border text-muted hover:border-gt-purple"
            }`}
          >
            {t}
          </button>
        ))}
        <span className="subtle ml-auto">{filtered.length} record(s) · Rs {total.toLocaleString("en-IN")}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          {filtered.length === 0 ? (
            <EmptyState icon={<Receipt size={22} />} title="No transactions found" body="Financial records linked to orders will appear here for audit." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Txn</Th>
                  <Th>Order</Th>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Recorded</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.transaction_id} className={`cursor-pointer ${selected?.transaction_id === t.transaction_id ? "bg-gt-purple/5" : ""}`} onClick={() => setSelected(t)}>
                    <Td className="font-medium">{t.transaction_id}</Td>
                    <Td className="text-xs">{t.order_id}</Td>
                    <Td className="text-xs">{t.type}</Td>
                    <Td className="font-semibold">Rs {t.amount.toLocaleString("en-IN")}</Td>
                    <Td><Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge></Td>
                    <Td className="text-xs">{formatDate(t.recorded_on)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <SectionHeader title="Record Detail" subtitle="Immutable audit view" right={<Lock size={15} className="text-muted" />} />
          {!selected ? (
            <EmptyState icon={<Receipt size={20} />} title="Select a record" body="Click a row to view the full audit detail for that transaction." />
          ) : (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-surface border border-border p-3">
                <div className="subtle mb-1">Reference No.</div>
                <div className="font-mono text-xs font-semibold text-ink break-all">{selected.reference_no}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="subtle">Amount</div>
                  <div className="font-semibold text-ink">Rs {selected.amount.toLocaleString("en-IN")}</div>
                </div>
                <div>
                  <div className="subtle">Status</div>
                  <Badge tone={STATUS_TONE[selected.status]}>{selected.status}</Badge>
                </div>
                <div>
                  <div className="subtle">PG</div>
                  <div className="text-ink text-xs">{selected.pg_id ? pgById(selected.pg_id)?.name ?? selected.pg_id : "-"}</div>
                </div>
                <div>
                  <div className="subtle">Packhouse</div>
                  <div className="text-ink text-xs">{selected.packhouse_id ? packhouseById(selected.packhouse_id)?.name ?? selected.packhouse_id : "-"}</div>
                </div>
                <div>
                  <div className="subtle">Buyer</div>
                  <div className="text-ink text-xs">{buyerById(selected.buyer_id)?.name ?? selected.buyer_id}</div>
                </div>
                <div>
                  <div className="subtle">Recorded On</div>
                  <div className="text-ink text-xs">{formatDate(selected.recorded_on)}</div>
                </div>
              </div>
              <p className="text-xs text-muted leading-relaxed border-t border-border pt-3">{selected.narrative}</p>
              <div className="text-[11px] text-muted flex items-center gap-1.5">
                <Lock size={11} /> This record is retained for audit and cannot be edited or deleted from this view.
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
