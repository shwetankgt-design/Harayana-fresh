import { useMemo, useState } from "react";
import { BookOpen, Filter } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "../components/ui";
import { useRole, canViewProgramme } from "../lib/role";
import { programmeItems } from "../data/seed";
import { formatDate } from "../lib/format";

const TYPE_TONE = { Scheme: "good", Circular: "neutral", Advisory: "warn" } as const;

export default function ProgrammeModule() {
  const { role } = useRole();
  const [filter, setFilter] = useState<"All" | "Scheme" | "Circular" | "Advisory">("All");

  const visible = useMemo(
    () => programmeItems.filter((p) => canViewProgramme(role, p.visible_to) && (filter === "All" || p.type === filter)),
    [role, filter]
  );

  return (
    <div>
      <PageHeader
        title="Programme Data Repository"
        subtitle="Schemes, circulars and advisories from PMU / DPMU - visibility is role-based"
        icon={<BookOpen size={20} />}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-muted" />
        {(["All", "Scheme", "Circular", "Advisory"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
              filter === t ? "bg-gt-purple text-white border-gt-purple" : "border-border text-muted hover:border-gt-purple"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card><EmptyState icon={<BookOpen size={22} />} title="No programme items visible" body="Nothing is currently published for this persona and filter combination." /></Card>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => (
            <Card key={p.id}>
              <SectionHeader
                title={p.title}
                subtitle={`${p.issuing_authority} · Ref ${p.reference_no} · ${formatDate(p.issued_on)}`}
                right={<Badge tone={TYPE_TONE[p.type]}>{p.type}</Badge>}
              />
              <p className="text-sm text-ink leading-relaxed">{p.summary}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge tone={p.status === "Open" ? "good" : p.status === "Closed" ? "bad" : "neutral"}>{p.status}</Badge>
                <span className="subtle">Visible to: {p.visible_to.join(", ")}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
