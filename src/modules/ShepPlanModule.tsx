import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Target, ArrowRight, TrendingUp, Sprout, Users, Layers, ShoppingCart, CheckCircle2, Repeat } from "lucide-react";
import { Badge, Card, EmptyState, IndicativeTag, PageHeader, SectionHeader, SimulatedTag } from "../components/ui";
import { useRole, type Role } from "../lib/role";
import { SHEP_PLANS, buyerById, cropPlans, farmersByPg, listings, pgById } from "../data/seed";
import type { ShepPlan, ShepPlanStatus } from "../data/types";
import { productionPlanRows } from "../lib/intelligence";

const STATUS_TONE: Record<ShepPlanStatus, "neutral" | "orange" | "good"> = {
  Draft: "neutral",
  Agreed: "orange",
  "Under Execution": "good",
};

// Farmer-facing wording for the same status.
const PLAIN_STATUS: Record<ShepPlanStatus, string> = {
  Draft: "Being planned",
  Agreed: "Agreed with buyer",
  "Under Execution": "Growing for this order",
};

// The demo spine: each step links to the screen where it happens.
const SPINE = [
  { label: "Market signal", to: "/market-signals", icon: TrendingUp },
  { label: "SHEP plan", to: "/shep-plan", icon: Target },
  { label: "Crop plan", to: "/crop-plans", icon: Sprout },
  { label: "PG aggregation", to: "/production-plan", icon: Layers },
  { label: "Marketplace", to: "/marketplace", icon: ShoppingCart },
  { label: "Sale", to: "/orders", icon: CheckCircle2 },
  { label: "Next-season learning", to: "/forecast", icon: Repeat },
];

function visiblePlans(role: Role): ShepPlan[] {
  if (role.id === "farmer" || role.id === "pg_manager") return SHEP_PLANS.filter((p) => p.pg_id === role.scopedPgId);
  if (role.id === "buyer") return SHEP_PLANS.filter((p) => p.buyer_id === role.scopedBuyerId);
  return SHEP_PLANS;
}

function ProcessSpine() {
  return (
    <Card className="mb-4">
      <SectionHeader title="How one crop moves through the platform" subtitle="Each step opens the screen where it happens" />
      <ol className="flex flex-wrap items-center gap-2">
        {SPINE.map((s, i) => (
          <li key={s.to} className="flex items-center gap-2">
            <Link to={s.to} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-gt-purple hover:text-gt-purple">
              <s.icon size={13} /> {s.label}
            </Link>
            {i < SPINE.length - 1 && <ArrowRight size={13} className="text-muted" />}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="subtle text-[11px]">{label}</div>
      <div className="text-sm font-medium text-ink">{children}</div>
    </div>
  );
}

function PlanCard({ plan, farmerView }: { plan: ShepPlan; farmerView: boolean }) {
  const pg = pgById(plan.pg_id);
  const buyer = plan.buyer_id ? buyerById(plan.buyer_id) : undefined;
  const { min, max } = plan.indicative_price_range_per_qtl;
  const linkedPlans = cropPlans.filter((cp) => cp.crop === plan.crop && farmersByPg(plan.pg_id).some((f) => f.farmer_id === cp.farmer_id));
  const linkedListings = listings.filter((l) => l.crop === plan.crop && l.pg_id === plan.pg_id);
  const prodRow = productionPlanRows(plan.pg_id).find((r) => r.crop === plan.crop);

  if (farmerView) {
    return (
      <Card>
        <SectionHeader
          title={`${plan.crop} for ${plan.target_market}`}
          subtitle={`${pg?.name ?? plan.pg_id} · ${plan.market_window}`}
          right={<Badge tone={STATUS_TONE[plan.status]}>{PLAIN_STATUS[plan.status]}</Badge>}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="What the market is asking for">{plan.buyer_requirement}</Field>
          <Field label="Buyer interest">{plan.indicative_demand_qtl} Qtl requested</Field>
          <Field label="Your expected harvest">
            {plan.expected_production_qtl} Qtl from {plan.planned_acreage} acres
          </Field>
          <Field label="Indicative price">
            <span className="inline-flex items-center gap-2">Rs {min.toLocaleString("en-IN")} to Rs {max.toLocaleString("en-IN")} per Qtl <IndicativeTag /></span>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/advisories" className="text-xs font-semibold text-gt-purple hover:underline">Advisory for you</Link>
          <Link to="/crop-plans" className="text-xs font-semibold text-gt-purple hover:underline">Your crop plans</Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeader
        title={`${plan.crop} · ${plan.variety}`}
        subtitle={`${plan.shep_plan_id} · ${pg?.name ?? plan.pg_id} (${pg?.district ?? ""})`}
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={STATUS_TONE[plan.status]}>{plan.status}</Badge>
            <IndicativeTag />
          </div>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Target market / buyer">{plan.target_market}{buyer ? ` · ${buyer.name}` : ""}</Field>
        <Field label="Buyer requirement">{plan.buyer_requirement}</Field>
        <Field label="Indicative demand">{plan.indicative_demand_qtl} Qtl</Field>
        <Field label="Indicative price range">Rs {min.toLocaleString("en-IN")} to {max.toLocaleString("en-IN")} /Qtl</Field>
        <Field label="Market / harvest window">{plan.market_window}</Field>
        <Field label="Planned acreage">{plan.planned_acreage} acres</Field>
        <Field label="Expected production">{plan.expected_production_qtl} Qtl</Field>
        <Field label="Preferred channel">{plan.preferred_channel}</Field>
      </div>
      <div className="mt-4 rounded-lg bg-surface px-3 py-2.5 text-xs text-ink flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-semibold">Connected to production:</span>
        <span>{linkedPlans.length} farmer crop plan(s)</span>
        <span>{linkedListings.length} marketplace listing(s)</span>
        {prodRow && (
          <span>
            crop-plan total {prodRow.expected_qtl.toLocaleString("en-IN")} Qtl vs SHEP plan {plan.expected_production_qtl} Qtl · <Badge tone={prodRow.signal === "On Track" ? "good" : "warn"}>{prodRow.signal}</Badge>
          </span>
        )}
        <Link to="/production-plan" className="font-semibold text-gt-purple hover:underline">Open PG production plan</Link>
      </div>
    </Card>
  );
}

export default function ShepPlanModule() {
  const { role } = useRole();
  const farmerView = role.id === "farmer";
  const plans = visiblePlans(role);

  return (
    <div>
      <PageHeader
        title={farmerView ? "What the market is asking for" : "SHEP Market & Business Plan"}
        subtitle={
          farmerView
            ? "Buyer interest and prices for your crop, before you plant"
            : "Pre-market intelligence: buyer demand and market survey turned into a business plan before any crop is sown"
        }
        icon={<Target size={20} />}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <IndicativeTag />
        <SimulatedTag />
        <span className="subtle text-xs">Plan values are indicative. They are not contracts or confirmed prices.</span>
      </div>

      {!farmerView && <ProcessSpine />}

      {plans.length === 0 ? (
        <Card>
          <EmptyState icon={<Users size={20} />} title="No SHEP plan for your scope yet" body="Plans appear here once a buyer requirement and a Producer Group are linked." />
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((p) => (
            <PlanCard key={p.shep_plan_id} plan={p} farmerView={farmerView} />
          ))}
        </div>
      )}

      {!farmerView && (
        <p className="subtle text-xs mt-4 flex items-center gap-1.5">
          <Users size={12} /> PG members are counted in the PG production plan, where crop plans roll up into one gap or surplus signal.
        </p>
      )}
    </div>
  );
}
