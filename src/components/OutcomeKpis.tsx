import { outcomeKpis } from "../lib/intelligence";
import { Card, IllustrativeTag } from "./ui";

const TONE_TEXT = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  neutral: "text-muted",
} as const;

// Leadership outcome KPIs, shown as the first row of the statewide view.
export function OutcomeKpiRow() {
  const kpis = outcomeKpis();
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h2 className="section-title text-base">Programme outcomes</h2>
        <IllustrativeTag />
      </div>
      <p className="subtle mb-3">
        Is the programme improving farmer outcomes, market linkage and value-chain utilisation? These values are
        simulated and do not show impact already achieved.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.key}>
            <div className="subtle text-[11px] leading-snug min-h-[2.5rem]">{k.label}</div>
            <div className="text-sm font-bold text-ink mt-1 leading-snug">{k.value}</div>
            <div className={`text-xs font-semibold mt-1 ${TONE_TEXT[k.tone]}`}>{k.detail}</div>
            <div className="text-[10px] text-muted mt-2">{k.basis}</div>
          </Card>
        ))}
      </div>
      <p className="subtle text-xs mt-2">
        Future KPI, not shown: farmer realisation or income per acre trend, once season-on-season data is attributable.
      </p>
    </section>
  );
}
