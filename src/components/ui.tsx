import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`card card-pad ${onClick ? "cursor-pointer hover:shadow-cardhover transition-shadow" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
      <div>
        <h3 className="section-title text-base">{title}</h3>
        {subtitle && <p className="subtle mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

const toneMap = {
  good: "bg-good/10 text-good",
  warn: "bg-warn/10 text-warn",
  bad: "bg-bad/10 text-bad",
  neutral: "bg-gt-purple/10 text-gt-purple",
  orange: "bg-gt-orange/10 text-gt-orange-dark",
} as const;

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof toneMap }) {
  return <span className={`pill ${toneMap[tone]}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {icon && <div className="grid place-items-center w-10 h-10 rounded-xl bg-gt-purple/10 text-gt-purple shrink-0">{icon}</div>}
      <div>
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        <p className="subtle">{subtitle}</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, body }: { icon?: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {icon && <div className="grid place-items-center w-12 h-12 rounded-full bg-surface text-muted mb-3">{icon}</div>}
      <div className="text-sm font-semibold text-ink">{title}</div>
      <p className="subtle mt-1 max-w-sm">{body}</p>
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-surface animate-pulse" />
      ))}
    </div>
  );
}

export function StatCard({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: keyof typeof toneMap }) {
  return (
    <Card>
      <div className="subtle">{label}</div>
      <div className="text-2xl font-bold text-ink mt-1">{value}</div>
      {sub && <div className={`text-xs font-semibold mt-1 ${tone !== "neutral" ? toneMap[tone].split(" ")[1] : "text-muted"}`}>{sub}</div>}
    </Card>
  );
}

export function CompletenessBar({ pct }: { pct: number }) {
  const tone = pct >= 80 ? "bg-good" : pct >= 55 ? "bg-warn" : "bg-bad";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
        <div className={`h-full ${tone} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-ink w-9 text-right">{pct}%</span>
    </div>
  );
}

const syncIcon = {
  Success: CheckCircle2,
  Failed: XCircle,
  "In Progress": Clock,
} as const;
const syncTone = {
  Success: "good",
  Failed: "bad",
  "In Progress": "warn",
} as const;

export function SyncStatusBadge({ status }: { status: "Success" | "Failed" | "In Progress" }) {
  const Icon = syncIcon[status];
  return (
    <Badge tone={syncTone[status] as keyof typeof toneMap}>
      <Icon size={12} />
      {status === "Success" ? "Synced" : status === "Failed" ? "Sync Failed" : "Syncing"}
    </Badge>
  );
}

export function SimulatedTag() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gt-orange-dark bg-gt-orange/10 rounded-full px-2 py-0.5">
      <AlertTriangle size={10} /> Simulated integration
    </span>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm border-collapse min-w-[560px]">{children}</table>
    </div>
  );
}
export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`text-left font-semibold text-muted text-xs uppercase tracking-wide px-3 py-2 border-b border-border ${className}`}>{children}</th>;
}
export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 border-b border-border/70 text-ink ${className}`}>{children}</td>;
}
