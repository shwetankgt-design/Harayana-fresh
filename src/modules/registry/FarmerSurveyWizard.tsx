import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  UserSearch, LandPlot, Coins, TriangleAlert, Wrench, CreditCard, Droplets, ScanLine,
  ChevronLeft, ChevronRight, Save, CheckCircle2, Plus, Trash2, ShieldCheck, Camera, Search,
} from "lucide-react";
import { Badge, Card, PageHeader } from "../../components/ui";
import { Field, FormGrid, MultiChip, Select, SubSection, YesNo, checkNumber, compressImage, isBlank } from "../../components/form";
import { PlotCapture, PointCapture } from "../../components/map/PlotCapture";
import { useRole } from "../../lib/role";
import { emptySurvey, newPlot, type CropLine, type FarmerSurvey } from "../../data/registry";
import { farmerMembers, plansByFarmer, producerGroups } from "../../data/seed";
import {
  CREDIT_SOURCES, CULTIVATION_CHALLENGES, HARYANA_BLOCKS, HARYANA_CENTER, HARYANA_DISTRICTS, HARYANA_MANDIS, HARYANA_VILLAGES,
  HF_CROPS, INCOME_BRACKETS, INPUT_CHALLENGES, INPUT_SOURCES, IRRIGATION_SOURCES, LOAN_OUTCOMES, LOAN_REJECTION_REASONS,
  LOGISTICS_PROVIDERS, MACHINES, MARKETING_CHANNELS, MONTHS, NON_FARM_INCOME, PG_BENEFITS, SCHEMES, SEASONS_CAPTURE, STORAGE_SOURCES,
  type LatLng,
} from "../../data/haryanaMaster";
import { getRegistry, upsertSurvey, updateRegistry, useRegistry } from "../../lib/registryStore";
import { nextFarmerId } from "../../lib/farmerRegistry";
import { areaInAcres, villageLocation } from "../../lib/geo";

// Eight tabs, following the arecanut farmer survey's grouping.
const STEPS = [
  { label: "Farmer & Location", icon: UserSearch },
  { label: "Land & Crops", icon: LandPlot },
  { label: "Sales & Logistics", icon: Coins },
  { label: "Challenges", icon: TriangleAlert },
  { label: "Mechanisation & Inputs", icon: Wrench },
  { label: "Finance & Schemes", icon: CreditCard },
  { label: "Irrigation & Sustainability", icon: Droplets },
  { label: "Geo-tag & Review", icon: ScanLine },
];

type Errors = Record<string, string | undefined>;

function validateStep(step: number, f: FarmerSurvey): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (isBlank(f.farmer_name)) e.farmer_name = "Required.";
    if (!/^[6-9]\d{9}$/.test(f.mobile_no)) e.mobile_no = "Enter a 10-digit mobile number starting with 6-9.";
    if (f.aadhaar_last4 && !/^\d{4}$/.test(f.aadhaar_last4)) e.aadhaar_last4 = "Exactly 4 digits.";
    e.age = checkNumber(f.age, { required: true, min: 18, max: 100, whole: true });
    if (isBlank(f.district)) e.district = "Required.";
    if (isBlank(f.block)) e.block = "Required.";
    if (isBlank(f.village)) e.village = "Required.";
    if (f.pg_member === "Yes") {
      if (isBlank(f.pg_id)) e.pg_id = "Required because the farmer is a PG member.";
      e.pg_since_year = checkNumber(f.pg_since_year, { required: true, min: 2000, max: 2026, whole: true });
    }
  }
  if (step === 1) {
    e.land_own_acres = checkNumber(f.land_own_acres, { required: true, min: 0, maxDecimals: 2 });
    e.land_leased_acres = checkNumber(f.land_leased_acres, { min: 0, maxDecimals: 2 });
    e.horti_area_acres = checkNumber(f.horti_area_acres, { required: true, min: 0.01, maxDecimals: 2 });
    const total = (Number(f.land_own_acres) || 0) + (Number(f.land_leased_acres) || 0);
    if (!e.horti_area_acres && Number(f.horti_area_acres) > total) e.horti_area_acres = "Cannot exceed own plus leased land.";
    if (f.crops.length === 0) e.crops = "Add at least one crop.";
    f.crops.forEach((c, i) => {
      if (isBlank(c.crop)) e[`crop_${i}_crop`] = "Required.";
      e[`crop_${i}_area`] = checkNumber(c.area_acres, { required: true, min: 0.01, maxDecimals: 2 });
      e[`crop_${i}_yield`] = checkNumber(c.expected_yield_qtl, { min: 0, maxDecimals: 2 });
    });
  }
  if (step === 2) {
    if (isBlank(f.marketing_channel)) e.marketing_channel = "Required.";
    if (f.marketing_channel === "APMC Mandi" && isBlank(f.mandi_name)) e.mandi_name = "Required for APMC Mandi.";
    if (f.marketing_channel === "Other" && isBlank(f.marketing_channel_other)) e.marketing_channel_other = "Required because 'Other' is selected.";
    e.rate_inr_per_qtl = checkNumber(f.rate_inr_per_qtl, { min: 0, maxDecimals: 2 });
    e.storage_duration_months = checkNumber(f.storage_duration_months, { min: 0, max: 24, whole: true });
    e.logistics_cost_inr_per_qtl = checkNumber(f.logistics_cost_inr_per_qtl, { min: 0, maxDecimals: 2 });
  }
  if (step === 3) {
    if (f.challenges.includes("Other") && isBlank(f.challenges_other)) e.challenges_other = "Required because 'Other' is selected.";
    if (f.challenges.includes("Availability of farm machinery")) e.machinery_waiting_days = checkNumber(f.machinery_waiting_days, { required: true, min: 0, whole: true });
  }
  if (step === 4) {
    e.input_distance_km = checkNumber(f.input_distance_km, { min: 0, maxDecimals: 1 });
    if (f.tech_adoption === "Yes" && isBlank(f.tech_adoption_detail)) e.tech_adoption_detail = "Required because a technology solution is used.";
  }
  if (step === 5) {
    if (isBlank(f.income_bracket)) e.income_bracket = "Required.";
    if (f.credit_linkage === "Yes") {
      if (isBlank(f.credit_source)) e.credit_source = "Required because credit linkage is Yes.";
      e.credit_amount_inr = checkNumber(f.credit_amount_inr, { required: true, min: 0, max: 100000000, maxDecimals: 2 });
      e.credit_interest_pct = checkNumber(f.credit_interest_pct, { required: true, min: 0, max: 50, maxDecimals: 2 });
    } else if (f.loan_outcome === "Rejected" && isBlank(f.loan_rejection_reason)) {
      e.loan_rejection_reason = "Required because the last application was rejected.";
    }
    if (f.kcc_account === "Yes") e.kcc_limit_inr_lakh = checkNumber(f.kcc_limit_inr_lakh, { required: true, min: 0, max: 1000, maxDecimals: 2 });
    if (f.scheme_availed === "Yes" && f.schemes.length === 0) e.schemes = "Select at least one scheme.";
  }
  if (step === 6) {
    if (f.irrigation_source.length === 0) e.irrigation_source = "Select at least one source.";
    if (f.crop_insurance === "Yes" && isBlank(f.crop_insurance_detail)) e.crop_insurance_detail = "Required because crop insurance is Yes.";
  }
  if (step === 7) {
    const mapped = f.plots.some((p) => p.boundary.length >= 3);
    if (!f.home_location && !mapped) e.geo = "Capture the farmer's location or at least one plot boundary, so the farmer can be mapped.";
    f.plots.forEach((p, i) => {
      e[`plot_${i}_area`] = checkNumber(p.reported_area_acres, { required: true, min: 0.01, maxDecimals: 2 });
    });
  }
  Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
  return e;
}

function surveyFromSeed(farmerId: string, capturedBy: string): FarmerSurvey | null {
  const f = farmerMembers.find((x) => x.farmer_id === farmerId);
  if (!f) return null;
  const s = emptySurvey(capturedBy);
  const village = HARYANA_VILLAGES.find((v) => v.name === f.village);
  const plans = plansByFarmer(f.farmer_id);
  return {
    ...s,
    farmer_id: f.farmer_id,
    farmer_name: f.name,
    mobile_no: f.phone,
    gender: f.gender,
    guardian_name: f.father_or_husband_name,
    district: f.district,
    block: village?.block ?? "",
    village: f.village,
    pg_member: "Yes",
    pg_id: f.pg_id,
    pg_since_year: f.joined_on.slice(0, 4),
    land_own_acres: String(f.land_holding_acres),
    horti_area_acres: String(f.land_holding_acres),
    crops: plans.length
      ? plans.map((p) => ({ crop: p.crop, variety: "", season: p.season, area_acres: String(p.area_acres), expected_yield_qtl: String(p.expected_yield_qtl), sowing_month: MONTHS[Number(p.sowing_date.slice(5, 7)) - 1] }))
      : s.crops,
  };
}

export default function FarmerSurveyWizard() {
  const { role } = useRole();
  const navigate = useNavigate();
  const { key } = useParams();
  const [params] = useSearchParams();
  const registry = useRegistry();

  const initial = useMemo<FarmerSurvey>(() => {
    if (key) {
      const existing = getRegistry().surveys.find((s) => s.survey_id === key);
      if (existing) return existing;
      const fromSeed = surveyFromSeed(key, role.name);
      if (fromSeed) return fromSeed;
    }
    const seedId = params.get("farmer");
    const s = (seedId && surveyFromSeed(seedId, role.name)) || emptySurvey(role.name);
    if (role.id === "pg_manager" && !seedId) return { ...s, pg_member: "Yes", pg_id: role.scopedPgId ?? "", district: producerGroups.find((p) => p.pg_id === role.scopedPgId)?.district ?? "" };
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const [form, setForm] = useState<FarmerSurvey>(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };
  const set = <K extends keyof FarmerSurvey>(k: K, v: FarmerSurvey[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = (status: "Draft" | "Submitted") => {
    const s: FarmerSurvey = { ...form, status, updated_at: new Date().toISOString() };
    if (status === "Submitted") {
      for (let i = 0; i < STEPS.length; i++) {
        const e = validateStep(i, s);
        if (Object.keys(e).length) {
          setErrors(e);
          setStep(i);
          flash(`Fix the highlighted fields on "${STEPS[i].label}" before submitting.`);
          return;
        }
      }
      if (!s.farmer_id) s.farmer_id = nextFarmerId(getRegistry().surveys);
      // A village typed in by hand joins the village master, placed at the farmer's captured location.
      const known = [...HARYANA_VILLAGES, ...getRegistry().villages].some((v) => v.name.toLowerCase() === s.village.toLowerCase() && v.district === s.district);
      if (!known) {
        const where = s.home_location ?? s.plots.find((p) => p.boundary.length)?.boundary[0] ?? HARYANA_DISTRICTS.find((d) => d.name === s.district) ?? HARYANA_CENTER;
        updateRegistry((r) => ({ ...r, villages: [...r.villages, { name: s.village, block: s.block, district: s.district, lat: where.lat, lng: where.lng }] }));
      }
    }
    upsertSurvey(s);
    setForm(s);
    if (status === "Submitted") navigate(`/farmer-registry/${s.survey_id}`);
    else flash("Draft saved. You can resume it from Farmer Registry.");
  };

  const next = () => {
    const e = validateStep(step, form);
    setErrors(e);
    if (Object.keys(e).length) {
      flash("Fix the highlighted fields to continue.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  };

  const center: LatLng = form.home_location ?? villageLocation(form.village) ?? [...registry.villages].find((v) => v.name === form.village) ?? HARYANA_DISTRICTS.find((d) => d.name === form.district) ?? HARYANA_CENTER;

  return (
    <div>
      <PageHeader
        title={form.farmer_id ? `Farmer registration: ${form.farmer_name || form.farmer_id}` : "New farmer registration"}
        subtitle="Capture farmer, land, crop, market, finance and geo-location details. Saved on this device."
        icon={<UserSearch size={20} />}
      />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {STEPS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStep(i)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
              step === i ? "bg-gt-purple text-white border-gt-purple" : "bg-white text-muted border-border hover:border-gt-purple/40"
            }`}
          >
            <s.icon size={13} /> {i + 1}. {s.label}
          </button>
        ))}
      </div>

      <Card className="mb-4">
        <div className="space-y-6">
          {step === 0 && <StepFarmer form={form} set={set} errors={errors} setForm={setForm} flash={flash} />}
          {step === 1 && <StepLand form={form} set={set} errors={errors} />}
          {step === 2 && <StepSales form={form} set={set} errors={errors} />}
          {step === 3 && <StepChallenges form={form} set={set} errors={errors} />}
          {step === 4 && <StepMech form={form} set={set} errors={errors} />}
          {step === 5 && <StepFinance form={form} set={set} errors={errors} />}
          {step === 6 && <StepIrrigation form={form} set={set} errors={errors} />}
          {step === 7 && <StepGeo form={form} set={set} errors={errors} center={center} flash={flash} />}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="btn-ghost" onClick={() => (step === 0 ? navigate("/farmer-registry") : setStep(step - 1))}>
          <ChevronLeft size={16} /> {step === 0 ? "Cancel" : "Back"}
        </button>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => save("Draft")}><Save size={16} /> Save as draft</button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={next}>Next <ChevronRight size={16} /></button>
          ) : (
            <button type="button" className="btn-orange" onClick={() => save("Submitted")}><CheckCircle2 size={16} /> Submit registration</button>
          )}
        </div>
      </div>

      {toast && <div className="fixed bottom-6 right-6 bg-ink text-white text-sm px-4 py-2.5 rounded-lg shadow-cardhover z-50 spark-fade max-w-sm">{toast}</div>}
    </div>
  );
}

type StepProps = {
  form: FarmerSurvey;
  set: <K extends keyof FarmerSurvey>(k: K, v: FarmerSurvey[K]) => void;
  errors: Errors;
};

// ---------- Step 1: Farmer & Location ----------

function StepFarmer({ form, set, errors, setForm, flash }: StepProps & { setForm: (f: FarmerSurvey) => void; flash: (m: string) => void }) {
  const { role } = useRole();
  const registry = useRegistry();
  const [query, setQuery] = useState("");
  const [otpSent, setOtpSent] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [cascade, setCascade] = useState(false);
  const [newVillage, setNewVillage] = useState(false);

  const q = query.trim().toLowerCase();
  const matches = q.length >= 3
    ? farmerMembers
        .filter((f) => f.phone.includes(q) || f.farmer_id.toLowerCase().includes(q) || f.name.toLowerCase().includes(q))
        .filter((f) => role.id !== "pg_manager" || f.pg_id === role.scopedPgId)
        .slice(0, 6)
    : [];
  const capturedMatches = q.length >= 3 ? registry.surveys.filter((s) => s.aadhaar_last4 === q || s.mobile_no.includes(q) || s.farmer_id.toLowerCase().includes(q)).slice(0, 4) : [];

  const allVillages = [...HARYANA_VILLAGES, ...registry.villages];
  const blocks = form.district ? HARYANA_BLOCKS[form.district] ?? [] : [];
  const villagesInBlock = allVillages.filter((v) => v.district === form.district && (!form.block || v.block === form.block));
  const pgs = producerGroups.filter((p) => !form.district || p.district === form.district);

  const pickVillage = (name: string) => {
    const v = allVillages.find((x) => x.name === name);
    if (v) setForm({ ...form, village: v.name, block: v.block, district: v.district });
    else set("village", name);
  };

  const sendOtp = () => {
    if (!/^[6-9]\d{9}$/.test(form.mobile_no)) {
      flash("Enter a valid mobile number first.");
      return;
    }
    const code = String(100000 + Math.floor(Math.random() * 900000));
    setOtpSent(code);
    flash(`Simulated OTP sent: ${code}. No SMS gateway is connected in this demo.`);
  };

  return (
    <>
      <SubSection title="Farmer link">
        <Field label="Search existing farmer (mobile, farmer ID or name)" hint="Pick a match to pre-fill from the farmer registry.">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input !pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="At least 3 characters" />
          </div>
        </Field>
        {(matches.length > 0 || capturedMatches.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {matches.map((f) => (
              <button key={f.farmer_id} type="button" className="text-left rounded-lg border border-border px-3 py-2 text-xs hover:border-gt-purple" onClick={() => { const s = surveyFromSeed(f.farmer_id, role.name); if (s) { setForm({ ...s, survey_id: form.survey_id }); flash(`Pre-filled from ${f.farmer_id}.`); setQuery(""); } }}>
                <div className="font-semibold text-ink">{f.name}</div>
                <div className="text-muted">{f.farmer_id} · {f.phone} · {f.village}</div>
              </button>
            ))}
            {capturedMatches.map((s) => (
              <Link key={s.survey_id} to={`/farmer-registry/${s.survey_id}`} className="rounded-lg border border-warn/40 px-3 py-2 text-xs">
                Already registered: <b>{s.farmer_name}</b> ({s.farmer_id || "draft"})
              </Link>
            ))}
          </div>
        )}
        <FormGrid>
          <Field label="Farmer name" required error={errors.farmer_name}><input className="input" value={form.farmer_name} onChange={(e) => set("farmer_name", e.target.value)} /></Field>
          <Field label="Mobile number" required error={errors.mobile_no}>
            <div className="flex gap-2">
              <input className="input" inputMode="numeric" maxLength={10} value={form.mobile_no} onChange={(e) => { set("mobile_no", e.target.value.replace(/\D/g, "")); set("mobile_verified", false); }} />
              {form.mobile_verified ? <Badge tone="good"><ShieldCheck size={12} /> Verified</Badge> : <button type="button" className="btn-ghost text-xs whitespace-nowrap" onClick={sendOtp}>Send OTP</button>}
            </div>
            {otpSent && !form.mobile_verified && (
              <div className="flex gap-2 mt-2">
                <input className="input" placeholder="Enter OTP" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} />
                <button type="button" className="btn-primary text-xs" onClick={() => { if (otpInput === otpSent) { set("mobile_verified", true); flash("Mobile verified (simulated)."); } else flash("OTP does not match."); }}>Verify</button>
              </div>
            )}
          </Field>
          <Field label="Aadhaar (last 4 digits)" error={errors.aadhaar_last4} hint="Only the last 4 digits are stored."><input className="input" inputMode="numeric" maxLength={4} value={form.aadhaar_last4} onChange={(e) => set("aadhaar_last4", e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Gender" required><Select value={form.gender} onChange={(v) => set("gender", v)} options={["Male", "Female", "Other"]} /></Field>
          <Field label="Age" required error={errors.age}><input className="input" type="number" value={form.age} onChange={(e) => set("age", e.target.value)} /></Field>
          <Field label="Father / husband name"><input className="input" value={form.guardian_name} onChange={(e) => set("guardian_name", e.target.value)} /></Field>
          <Field label="Farmer ID" hint={form.farmer_id ? undefined : "Assigned automatically when the registration is submitted."}><input className="input" value={form.farmer_id || "Assigned on submit"} disabled /></Field>
          <Field label="Survey year"><Select value={form.survey_year} onChange={(v) => set("survey_year", v)} options={["2026-27", "2025-26", "2024-25"]} /></Field>
        </FormGrid>
      </SubSection>

      <SubSection title="Location">
        <div className="flex gap-2 text-xs">
          <button type="button" className={`rounded-full px-3 py-1 border ${!cascade ? "bg-gt-purple text-white border-gt-purple" : "border-border text-muted"}`} onClick={() => setCascade(false)}>Search village</button>
          <button type="button" className={`rounded-full px-3 py-1 border ${cascade ? "bg-gt-purple text-white border-gt-purple" : "border-border text-muted"}`} onClick={() => setCascade(true)}>District, block, village</button>
        </div>
        <FormGrid>
          {!cascade && !newVillage && (
            <Field label="Village" required error={errors.village} hint="Type to search; district and block fill in automatically.">
              <input className="input" list="hf-villages" value={form.village} onChange={(e) => pickVillage(e.target.value)} />
              <datalist id="hf-villages">{allVillages.map((v) => <option key={`${v.district}-${v.name}`} value={v.name}>{`${v.block}, ${v.district}`}</option>)}</datalist>
            </Field>
          )}
          <Field label="District" required error={errors.district}>
            <Select value={form.district} onChange={(v) => setForm({ ...form, district: v, block: "", village: cascade || newVillage ? "" : form.village, pg_id: "" })} options={HARYANA_DISTRICTS.map((d) => d.name)} placeholder="Select district" />
          </Field>
          <Field label="Block" required error={errors.block}>
            {blocks.length ? (
              <Select value={form.block} onChange={(v) => setForm({ ...form, block: v, village: cascade ? "" : form.village })} options={blocks} placeholder="Select block" />
            ) : (
              <input className="input" value={form.block} onChange={(e) => set("block", e.target.value)} placeholder="Type block name" />
            )}
          </Field>
          {(cascade || newVillage) && (
            <Field label="Village" required error={errors.village}>
              {newVillage ? (
                <input className="input" value={form.village} onChange={(e) => set("village", e.target.value)} placeholder="Type the village name" />
              ) : (
                <Select value={form.village} onChange={(v) => set("village", v)} options={villagesInBlock.map((v) => v.name)} placeholder={villagesInBlock.length ? "Select village" : "No villages listed yet"} />
              )}
            </Field>
          )}
        </FormGrid>
        <button type="button" className="text-xs font-semibold text-gt-purple hover:underline" onClick={() => setNewVillage((n) => !n)}>
          {newVillage ? "Pick from the village list" : "Village not in the list? Add it"}
        </button>
        {newVillage && <p className="subtle text-xs">A new village joins the master list on submit, placed at the farmer's captured location.</p>}
      </SubSection>

      <SubSection title="Producer Group linkage">
        <FormGrid>
          <Field label="Member of a Producer Group (PG)?" required><YesNo value={form.pg_member} onChange={(v) => set("pg_member", v)} /></Field>
          {form.pg_member === "Yes" && (
            <>
              <Field label="Producer Group" required error={errors.pg_id}><Select value={form.pg_id} onChange={(v) => set("pg_id", v)} options={pgs.map((p) => ({ value: p.pg_id, label: p.name }))} placeholder="Select PG" /></Field>
              <Field label="Member since (year)" required error={errors.pg_since_year}><input className="input" type="number" value={form.pg_since_year} onChange={(e) => set("pg_since_year", e.target.value)} /></Field>
              <Field label="Benefits received from the PG" wide><MultiChip options={PG_BENEFITS} value={form.pg_benefits} onChange={(v) => set("pg_benefits", v)} /></Field>
            </>
          )}
        </FormGrid>
      </SubSection>
    </>
  );
}

// ---------- Step 2: Land & crops ----------

function StepLand({ form, set, errors }: StepProps) {
  const registry = useRegistry();
  const cropOptions = [...HF_CROPS.map((c) => c.name), ...registry.crops];
  const setCrop = (i: number, patch: Partial<CropLine>) => set("crops", form.crops.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const cropArea = form.crops.reduce((s, c) => s + (Number(c.area_acres) || 0), 0);

  return (
    <>
      <SubSection title="Land holding">
        <FormGrid>
          <Field label="Own land (acres)" required error={errors.land_own_acres}><input className="input" type="number" step="0.01" value={form.land_own_acres} onChange={(e) => set("land_own_acres", e.target.value)} /></Field>
          <Field label="Leased-in land (acres)" error={errors.land_leased_acres}><input className="input" type="number" step="0.01" value={form.land_leased_acres} onChange={(e) => set("land_leased_acres", e.target.value)} /></Field>
          <Field label="Area under horticulture (acres)" required error={errors.horti_area_acres}><input className="input" type="number" step="0.01" value={form.horti_area_acres} onChange={(e) => set("horti_area_acres", e.target.value)} /></Field>
        </FormGrid>
      </SubSection>

      <SubSection title="Crops grown (Haryana Fresh crop list)">
        {errors.crops && <p className="text-xs font-semibold text-bad">{errors.crops}</p>}
        <div className="space-y-3">
          {form.crops.map((c, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-ink">Crop {i + 1}</span>
                {form.crops.length > 1 && <button type="button" className="text-muted hover:text-bad" onClick={() => set("crops", form.crops.filter((_, j) => j !== i))}><Trash2 size={14} /></button>}
              </div>
              <FormGrid>
                <Field label="Crop" required error={errors[`crop_${i}_crop`]}><Select value={c.crop} onChange={(v) => setCrop(i, { crop: v })} options={cropOptions} placeholder="Select crop" /></Field>
                <Field label="Variety"><input className="input" value={c.variety} onChange={(e) => setCrop(i, { variety: e.target.value })} /></Field>
                <Field label="Season"><Select value={c.season} onChange={(v) => setCrop(i, { season: v })} options={SEASONS_CAPTURE} /></Field>
                <Field label="Area (acres)" required error={errors[`crop_${i}_area`]}><input className="input" type="number" step="0.01" value={c.area_acres} onChange={(e) => setCrop(i, { area_acres: e.target.value })} /></Field>
                <Field label="Expected yield (Qtl)" error={errors[`crop_${i}_yield`]}><input className="input" type="number" step="0.01" value={c.expected_yield_qtl} onChange={(e) => setCrop(i, { expected_yield_qtl: e.target.value })} /></Field>
                <Field label="Sowing / planting month"><Select value={c.sowing_month} onChange={(v) => setCrop(i, { sowing_month: v })} options={MONTHS} /></Field>
              </FormGrid>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="btn-ghost text-xs" onClick={() => set("crops", [...form.crops, { crop: "", variety: "", season: "Rabi", area_acres: "", expected_yield_qtl: "", sowing_month: "Oct" }])}><Plus size={13} /> Add crop</button>
          <span className="text-xs text-muted">Total crop area: {cropArea.toFixed(2)} acres</span>
        </div>
      </SubSection>

      <SubSection title="Organic farming">
        <FormGrid>
          <Field label="Follows organic practices?"><YesNo value={form.organic_farming} onChange={(v) => set("organic_farming", v)} /></Field>
          {form.organic_farming === "Yes" && <Field label="Holds an organic certificate?"><YesNo value={form.organic_certified} onChange={(v) => set("organic_certified", v)} /></Field>}
        </FormGrid>
      </SubSection>
    </>
  );
}

// ---------- Step 3: Sales & logistics ----------

function StepSales({ form, set, errors }: StepProps) {
  const registry = useRegistry();
  const mandis = [...HARYANA_MANDIS, ...registry.mandis];
  const sorted = [...mandis.filter((m) => m.district === form.district), ...mandis.filter((m) => m.district !== form.district)];
  return (
    <>
      <SubSection title="Sales and marketing">
        <FormGrid>
          <Field label="Main marketing channel" required error={errors.marketing_channel}><Select value={form.marketing_channel} onChange={(v) => set("marketing_channel", v)} options={MARKETING_CHANNELS} /></Field>
          {form.marketing_channel === "APMC Mandi" && (
            <Field label="Mandi" required error={errors.mandi_name} hint="Mandis in the farmer's district are listed first."><Select value={form.mandi_name} onChange={(v) => set("mandi_name", v)} options={sorted.map((m) => ({ value: m.name, label: `${m.name} (${m.district})` }))} placeholder="Select mandi" /></Field>
          )}
          {form.marketing_channel === "Other" && <Field label="Specify channel" required error={errors.marketing_channel_other}><input className="input" value={form.marketing_channel_other} onChange={(e) => set("marketing_channel_other", e.target.value)} /></Field>}
          <Field label="Average rate realised (Rs/Qtl)" error={errors.rate_inr_per_qtl}><input className="input" type="number" step="0.01" value={form.rate_inr_per_qtl} onChange={(e) => set("rate_inr_per_qtl", e.target.value)} /></Field>
          <Field label="Main month of sale"><Select value={form.sale_month} onChange={(v) => set("sale_month", v)} options={MONTHS} /></Field>
        </FormGrid>
      </SubSection>
      <SubSection title="Storage and logistics">
        <FormGrid>
          <Field label="Storage used"><Select value={form.storage_source} onChange={(v) => set("storage_source", v)} options={STORAGE_SOURCES} /></Field>
          {form.storage_source !== "No storage" && <Field label="Storage duration (months)" error={errors.storage_duration_months}><input className="input" type="number" value={form.storage_duration_months} onChange={(e) => set("storage_duration_months", e.target.value)} /></Field>}
          <Field label="Transport to market"><Select value={form.logistics_provider} onChange={(v) => set("logistics_provider", v)} options={LOGISTICS_PROVIDERS} placeholder="Select" /></Field>
          <Field label="Transport cost (Rs/Qtl)" error={errors.logistics_cost_inr_per_qtl}><input className="input" type="number" step="0.01" value={form.logistics_cost_inr_per_qtl} onChange={(e) => set("logistics_cost_inr_per_qtl", e.target.value)} /></Field>
        </FormGrid>
      </SubSection>
    </>
  );
}

// ---------- Step 4: Challenges ----------

function StepChallenges({ form, set, errors }: StepProps) {
  return (
    <SubSection title="Cultivation and marketing challenges">
      <Field label="Challenges faced (select all that apply)"><MultiChip options={CULTIVATION_CHALLENGES} value={form.challenges} onChange={(v) => set("challenges", v)} /></Field>
      <FormGrid>
        {form.challenges.includes("Availability of farm machinery") && <Field label="Average wait for machinery (days)" required error={errors.machinery_waiting_days}><input className="input" type="number" value={form.machinery_waiting_days} onChange={(e) => set("machinery_waiting_days", e.target.value)} /></Field>}
        {form.challenges.includes("Other") && <Field label="Specify challenge" required error={errors.challenges_other}><input className="input" value={form.challenges_other} onChange={(e) => set("challenges_other", e.target.value)} /></Field>}
      </FormGrid>
    </SubSection>
  );
}

// ---------- Step 5: Mechanisation & inputs ----------

function StepMech({ form, set, errors }: StepProps) {
  return (
    <>
      <SubSection title="Farm mechanisation">
        <Field label="Machines owned"><MultiChip options={MACHINES} value={form.mech_owned} onChange={(v) => set("mech_owned", v)} /></Field>
        <Field label="Machines rented"><MultiChip options={MACHINES} value={form.mech_rented} onChange={(v) => set("mech_rented", v)} /></Field>
        {form.mech_owned.length > 0 && <Field label="Are owned machines financed?"><YesNo value={form.mech_financed} onChange={(v) => set("mech_financed", v)} /></Field>}
      </SubSection>
      <SubSection title="Input supply">
        <Field label="Where inputs are bought"><MultiChip options={INPUT_SOURCES} value={form.input_source} onChange={(v) => set("input_source", v)} /></Field>
        <FormGrid>
          <Field label="Distance to input source (km)" error={errors.input_distance_km}><input className="input" type="number" step="0.1" value={form.input_distance_km} onChange={(e) => set("input_distance_km", e.target.value)} /></Field>
        </FormGrid>
        <Field label="Challenges in buying inputs"><MultiChip options={INPUT_CHALLENGES} value={form.input_challenges} onChange={(v) => set("input_challenges", v)} /></Field>
      </SubSection>
      <SubSection title="Technology adoption">
        <FormGrid>
          <Field label="Uses any digital or technology solution?"><YesNo value={form.tech_adoption} onChange={(v) => set("tech_adoption", v)} /></Field>
          {form.tech_adoption === "Yes" && <Field label="Details" required error={errors.tech_adoption_detail}><input className="input" value={form.tech_adoption_detail} onChange={(e) => set("tech_adoption_detail", e.target.value)} /></Field>}
        </FormGrid>
      </SubSection>
    </>
  );
}

// ---------- Step 6: Finance & schemes ----------

function StepFinance({ form, set, errors }: StepProps) {
  return (
    <>
      <SubSection title="Household income">
        <FormGrid>
          <Field label="Total household income (annual)" required error={errors.income_bracket}><Select value={form.income_bracket} onChange={(v) => set("income_bracket", v)} options={INCOME_BRACKETS} placeholder="Select bracket" /></Field>
          <Field label="Has a bank account?"><YesNo value={form.bank_account} onChange={(v) => set("bank_account", v)} /></Field>
        </FormGrid>
        <Field label="Non-farm income sources"><MultiChip options={NON_FARM_INCOME} value={form.non_farm_income} onChange={(v) => set("non_farm_income", v)} /></Field>
      </SubSection>
      <SubSection title="Credit">
        <FormGrid>
          <Field label="Has an active loan or credit line?"><YesNo value={form.credit_linkage} onChange={(v) => set("credit_linkage", v)} /></Field>
          {form.credit_linkage === "Yes" ? (
            <>
              <Field label="Credit source" required error={errors.credit_source}><Select value={form.credit_source} onChange={(v) => set("credit_source", v)} options={CREDIT_SOURCES} placeholder="Select" /></Field>
              <Field label="Amount (Rs)" required error={errors.credit_amount_inr}><input className="input" type="number" step="0.01" value={form.credit_amount_inr} onChange={(e) => set("credit_amount_inr", e.target.value)} /></Field>
              <Field label="Interest rate (% per annum)" required error={errors.credit_interest_pct}><input className="input" type="number" step="0.01" value={form.credit_interest_pct} onChange={(e) => set("credit_interest_pct", e.target.value)} /></Field>
            </>
          ) : (
            <>
              <Field label="Outcome of last loan application"><Select value={form.loan_outcome} onChange={(v) => set("loan_outcome", v)} options={LOAN_OUTCOMES} /></Field>
              {form.loan_outcome === "Rejected" && <Field label="Reason for rejection" required error={errors.loan_rejection_reason}><Select value={form.loan_rejection_reason} onChange={(v) => set("loan_rejection_reason", v)} options={LOAN_REJECTION_REASONS} placeholder="Select" /></Field>}
            </>
          )}
          <Field label="Has a Kisan Credit Card (KCC)?"><YesNo value={form.kcc_account} onChange={(v) => set("kcc_account", v)} /></Field>
          {form.kcc_account === "Yes" && <Field label="KCC limit (Rs lakh)" required error={errors.kcc_limit_inr_lakh}><input className="input" type="number" step="0.01" value={form.kcc_limit_inr_lakh} onChange={(e) => set("kcc_limit_inr_lakh", e.target.value)} /></Field>}
        </FormGrid>
      </SubSection>
      <SubSection title="Government schemes (last 2 years)">
        <Field label="Availed any scheme?"><YesNo value={form.scheme_availed} onChange={(v) => set("scheme_availed", v)} /></Field>
        {form.scheme_availed === "Yes" && <Field label="Schemes availed" required error={errors.schemes}><MultiChip options={SCHEMES} value={form.schemes} onChange={(v) => set("schemes", v)} /></Field>}
      </SubSection>
    </>
  );
}

// ---------- Step 7: Irrigation & sustainability ----------

function StepIrrigation({ form, set, errors }: StepProps) {
  return (
    <>
      <SubSection title="Irrigation">
        <Field label="Irrigation sources" required error={errors.irrigation_source}><MultiChip options={IRRIGATION_SOURCES} value={form.irrigation_source} onChange={(v) => set("irrigation_source", v)} /></Field>
        <Field label="Irrigation challenges"><input className="input" value={form.irrigation_challenges} onChange={(e) => set("irrigation_challenges", e.target.value)} /></Field>
      </SubSection>
      <SubSection title="Soil health and insurance">
        <FormGrid>
          <Field label="Has a Soil Health Card?"><YesNo value={form.soil_health_card} onChange={(v) => set("soil_health_card", v)} /></Field>
          <Field label="Crop insured?"><YesNo value={form.crop_insurance} onChange={(v) => set("crop_insurance", v)} /></Field>
          {form.crop_insurance === "Yes" && <Field label="Insurance details" required error={errors.crop_insurance_detail}><input className="input" value={form.crop_insurance_detail} onChange={(e) => set("crop_insurance_detail", e.target.value)} /></Field>}
          <Field label="Flood or drought in last 5 years?"><YesNo value={form.natural_calamity_5yr} onChange={(v) => set("natural_calamity_5yr", v)} /></Field>
        </FormGrid>
      </SubSection>
    </>
  );
}

// ---------- Step 8: Geo-tag & review ----------

function StepGeo({ form, set, errors, center, flash }: StepProps & { center: LatLng; flash: (m: string) => void }) {
  const totalMapped = form.plots.reduce((s, p) => s + (p.boundary.length >= 3 ? areaInAcres(p.boundary) : 0), 0);
  const cropOptions = [...new Set(form.crops.map((c) => c.crop).filter(Boolean))];

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      set("field_photo", await compressImage(file));
    } catch (e) {
      flash((e as Error).message);
    }
  };

  return (
    <>
      {errors.geo && <p className="text-sm font-semibold text-bad">{errors.geo}</p>}
      <SubSection title="Farmer's location (house or farm gate)">
        <PointCapture value={form.home_location} accuracy={form.home_location_accuracy_m} center={center} onChange={(p, acc) => { set("home_location", p); set("home_location_accuracy_m", acc); }} />
      </SubSection>

      <SubSection title="Land plots and boundaries">
        <p className="subtle text-xs">Add each plot the farmer cultivates. Capture its boundary by drawing on the map, tapping corners with GPS, walking the perimeter, or uploading a file.</p>
        {form.plots.map((p, i) => (
          <div key={p.plot_id} className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <input className="input !w-auto text-sm font-semibold" value={p.label} onChange={(e) => set("plots", form.plots.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              {form.plots.length > 1 && <button type="button" className="text-muted hover:text-bad" onClick={() => set("plots", form.plots.filter((_, j) => j !== i))}><Trash2 size={14} /></button>}
            </div>
            <FormGrid>
              <Field label="Reported area (acres)" required error={errors[`plot_${i}_area`]}><input className="input" type="number" step="0.01" value={p.reported_area_acres} onChange={(e) => set("plots", form.plots.map((x, j) => (j === i ? { ...x, reported_area_acres: e.target.value } : x)))} /></Field>
              <Field label="Main crop on this plot"><Select value={p.crop} onChange={(v) => set("plots", form.plots.map((x, j) => (j === i ? { ...x, crop: v } : x)))} options={cropOptions} placeholder="Select" /></Field>
            </FormGrid>
            <PlotCapture plot={p} center={p.boundary[0] ?? center} onChange={(np) => set("plots", form.plots.map((x, j) => (j === i ? np : x)))} />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button type="button" className="btn-ghost text-xs" onClick={() => set("plots", [...form.plots, newPlot(form.plots.length)])}><Plus size={13} /> Add plot</button>
          <span className="text-xs text-muted">Total mapped: {totalMapped.toFixed(2)} acres across {form.plots.filter((p) => p.boundary.length >= 3).length} plot(s)</span>
        </div>
      </SubSection>

      <SubSection title="Field photo">
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-ghost text-xs cursor-pointer">
            <Camera size={13} /> {form.field_photo ? "Replace photo" : "Take or upload photo"}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
          {form.field_photo && <button type="button" className="text-xs text-bad hover:underline" onClick={() => set("field_photo", null)}>Remove</button>}
        </div>
        {form.field_photo && <img src={form.field_photo} alt="Field" className="max-h-56 rounded-lg border border-border" />}
      </SubSection>

      <SubSection title="Review">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="subtle text-[11px]">Farmer</div><div className="font-medium text-ink">{form.farmer_name || "-"}</div></div>
          <div><div className="subtle text-[11px]">Village</div><div className="font-medium text-ink">{form.village ? `${form.village}, ${form.district}` : "-"}</div></div>
          <div><div className="subtle text-[11px]">Producer Group</div><div className="font-medium text-ink">{form.pg_member === "Yes" ? producerGroups.find((p) => p.pg_id === form.pg_id)?.name ?? "-" : "Not a member"}</div></div>
          <div><div className="subtle text-[11px]">Mobile</div><div className="font-medium text-ink">{form.mobile_no || "-"} {form.mobile_verified && <Badge tone="good">Verified</Badge>}</div></div>
          <div><div className="subtle text-[11px]">Horticulture area</div><div className="font-medium text-ink">{form.horti_area_acres || "-"} acres</div></div>
          <div><div className="subtle text-[11px]">Crops</div><div className="font-medium text-ink">{cropOptions.join(", ") || "-"}</div></div>
          <div><div className="subtle text-[11px]">Location</div><div className="font-medium text-ink">{form.home_location ? "Captured" : "Not captured"}</div></div>
          <div><div className="subtle text-[11px]">Mapped plots</div><div className="font-medium text-ink">{form.plots.filter((p) => p.boundary.length >= 3).length}</div></div>
        </div>
        <p className="subtle text-xs">Records are stored in this browser only. There is no server sync in this demo.</p>
      </SubSection>
    </>
  );
}
