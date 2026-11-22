import { useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Badge, Card, PageHeader, SectionHeader, SimulatedTag, SyncStatusBadge, Table, Td, Th } from "../components/ui";
import { getAdapterStatuses, getSyncHistory } from "../lib/adapters";
import type { SyncSystem } from "../data/types";
import { formatDateTime, timeAgo } from "../lib/format";

export default function SyncStatusModule() {
  const adapters = getAdapterStatuses();
  const [expanded, setExpanded] = useState<SyncSystem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const retry = (system: SyncSystem) => {
    flash(`Retry queued for ${system} sync (simulated - no live gateway is contacted in this demo).`);
  };

  return (
    <div>
      <PageHeader
        title="Government Integration Sync Status"
        subtitle="Farm Trace, e-Girdwari, e-Kharid, MFMB and AgriStack/InDEA adapters - all connections are simulated"
        icon={<RefreshCw size={20} />}
      />

      <div className="mb-4">
        <SimulatedTag />
        <p className="subtle mt-2">
          This platform does not call any live government system in this demo. Each adapter below returns
          deterministic seed data and an occasional simulated failure so the error-handling experience is real.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adapters.map((a) => {
          const history = getSyncHistory(a.system);
          const isOpen = expanded === a.system;
          return (
            <Card key={a.system}>
              <SectionHeader
                title={a.system}
                subtitle={a.lastSyncedAt ? `Last run ${timeAgo(a.lastSyncedAt)}` : "No successful run recorded"}
                right={<SyncStatusBadge status={a.status} />}
              />
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="subtle">Records synced</div>
                  <div className="text-sm font-semibold text-ink">{a.recordsSynced.toLocaleString("en-IN")}</div>
                </div>
                <div>
                  <div className="subtle">Last attempt</div>
                  <div className="text-sm font-semibold text-ink">{a.lastSyncedAt ? formatDateTime(a.lastSyncedAt) : "-"}</div>
                </div>
              </div>

              {a.status === "Failed" && (
                <div className="flex items-start gap-2 rounded-lg bg-bad/5 border border-bad/20 p-2.5 mb-3">
                  <AlertCircle size={15} className="text-bad shrink-0 mt-0.5" />
                  <div className="text-xs text-ink">{a.errorMessage}</div>
                </div>
              )}

              <div className="flex gap-2">
                <button className="btn-ghost text-xs" onClick={() => setExpanded(isOpen ? null : a.system)}>
                  {isOpen ? "Hide history" : "View sync history"}
                </button>
                {a.status === "Failed" && (
                  <button className="btn-orange text-xs" onClick={() => retry(a.system)}>
                    <RefreshCw size={13} /> Retry Sync
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="mt-3 border-t border-border pt-3">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Started</Th>
                        <Th>Scope</Th>
                        <Th>Status</Th>
                        <Th>Records</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 6).map((h) => (
                        <tr key={h.id}>
                          <Td>{formatDateTime(h.started_at)}</Td>
                          <Td>{h.scope}</Td>
                          <Td><Badge tone={h.status === "Success" ? "good" : "bad"}>{h.status}</Badge></Td>
                          <Td>{h.records_synced}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-ink text-white text-sm px-4 py-2.5 rounded-lg shadow-cardhover z-50 spark-fade max-w-xs">
          {toast}
        </div>
      )}
    </div>
  );
}
