# Haryana Fresh Digital Platform

Client-facing demo of the Haryana Fresh Digital Platform, built for Grant Thornton Bharat. It
shows the digital backbone connecting SHEP, farmers and Producer Groups (PGs), packhouses,
Haryana Fresh, buyers and the Department of Horticulture (DoH) / PMU / DPMU, one crop at a time,
from market signal to next-season learning.

It is one responsive React app (no backend): desktop-first for institutional users, mobile
friendly for the farmer persona. It is an illustrative prototype, not a production system.

## Running it

Requires Node.js 18+.

```bash
npm install
npm run dev      # http://localhost:3800
npm run build    # typecheck + production build into dist/
```

## What is real vs simulated

- **Real app logic**: UI, routing, persona switching, member and crop-plan entry, listings,
  orders, auctions and bidding, order status changes, packhouse packing and dispatch, content
  moderation, advisory publishing, report export (CSV/JSON), buyer requirement capture.
- **Simulated**: every government system (Farm Trace, e-Girdwari, e-Kharid, MFMB,
  AgriStack/InDEA). These are typed functions in `src/lib/adapters.ts` returning deterministic
  seed data, with a seeded ~15% sync failure rate so the retry/error UI is exercised. The
  Sync Status screen lists the data each source is expected to provide. Field sensor readings,
  market price feeds and the leadership outcome KPIs are simulated or illustrative and are tagged
  as such wherever they appear.
- **Experimental / Indicative**: demand forecasts, market signals, SHEP plan values and
  recommendations. Every screen that shows them carries that tag.
- **No persistence**: edits live in memory (component state, or the shared seed arrays) and reset
  on page reload.

## Modules

1. **SHEP Market & Business Plan**: pre-market intelligence per crop: target market, buyer
   requirement, indicative demand and price range, market window, planned acreage, expected
   production, preferred channel and status (Draft, Agreed, Under Execution). Shows what each plan
   connects to. Farmers see a plain-language version.
2. **Data hub**: unified farmer/PG profile, PG member management, season-wise crop plans,
   programme repository, data completeness (PMU), integration sync status (PMU).
3. **PG Production & Marketing Plan**: member crop plans rolled up per PG and crop, against buyer
   demand, with a gap or surplus flag (Potential Surplus, Demand Gap / Buyer Opportunity, On
   Track). Click a row to see the contributing crop plans and buyer requirements.
4. **Marketplace**: listings tagged with multiple sales channels, buyer discovery with a
   rule-based match score, orders with a full status history, auctions and bulk bidding,
   live price board.
5. **Haryana Fresh Quality Check** (packhouse): lot traceability from source PG through grade, QC
   status, Haryana Fresh packaging and dispatch readiness. Packhouse operators can mark a lot
   packed and then dispatched. Traceability codes are visual only.
6. **Inventory, transactions and benefits**: lot tracking from harvest to delivery, read-only
   transaction archive, MFMB benefit/DBT status (farmer, PG manager) and consolidated disbursal
   by district (PMU).
7. **E-Community**: questions and discussions, targeted advisories (PMU publishes), moderation.
8. **Market and field intelligence**: market signals with "Inputs considered" and a "Why this
   signal?" panel per signal, simulated field data, demand forecast and next-season
   recommendation, buyer requirement capture.
9. **Leadership outcome KPIs** (PMU and leadership view): six tiles across the top row. Volume
   market-linked, price realisation vs benchmark, share sold through identified channels,
   post-harvest loss trend, packhouse utilisation, and PGs with buyer linkage. Operational metrics
   (data completeness, sync status, claims, MIS) remain below.
10. **MIS and reporting**: district-filtered dashboard, report export, access audit log (admin).

## Personas

Defined in `src/lib/role.ts`. Use "Open Application" on the home page (`/`), then switch persona
from the top-right menu: Farmer / PG Member, PG Manager, Packhouse Operator, Buyer, DoH/PMU/DPMU
Official, System Administrator.

Navigation is filtered per persona in `src/components/Shell.tsx`. Routes themselves are not
role-guarded, so this is a demo-grade scoping, not access control.

**Senior Leadership view** is at `/executive-login`; the demo access code is in
`src/modules/ExecutiveLogin.tsx`. It is checked in the browser and is not a security control.

## Data

`src/data/seed.ts` generates everything at import time from a fixed seed (`mulberry32`), so the
demo is identical on every run. All dates are relative to a fixed demo "today" (`TODAY`, 20 Aug
2026), not the real clock.

- 10 Producer Groups, 200 registered farmers (175 active), 6 districts: Karnal, Kurukshetra,
  Sirsa, Ambala, Hisar, Panipat
- 6 crops: Kinnow, Guava, Mango, Tomato, Potato, Onion. Tomato is the single crop for the demo
  story.
- 4 packhouses, 4 buyers (one per buyer type)
- Three static SHEP plans (Tomato), indicative values only
- Listings, orders, auctions, inventory lots, transactions, benefit claims, community posts and
  advisories all derive from the entities above
- Production plan, market-signal explanations, outcome KPIs and quality status are computed from
  the same data in `src/lib/intelligence.ts`. They draw no random numbers.

Quantities are in Qtl throughout (1 MT = 10 Qtl). Adding or reordering seed generation shifts
the random sequence, so downstream numbers change.

**Known data limit:** seeded buyer requirements are far smaller than planned farmer supply, so
the PG production plan flags nearly every PG crop as Potential Surplus. Recalibrating buyer
demand in the seed would change every downstream number, so it has not been done.

## Demo script (about 16 minutes, Tomato throughout)

1. **Opening (1 min)**: home page at `/`. Say this is an illustrative prototype, not a production
   system, and that the government data is simulated.
2. **Farmer / SHEP (2.5 min)**: Open Application, then (on a phone-width window) "What the market
   is asking for" and the SHEP plan for Tomato. Show "Your expected harvest" on the dashboard and
   the advisory for the farmer.
3. **PG Manager (3 min)**: "PG Production & Marketing Plan" for Karnal. Click the Tomato row to
   see the crop plans and buyer requirements behind the signal. Then a listing from the same
   plans.
4. **Buyer (3 min)**: Capture a requirement, then Marketplace Discovery for transparent matching,
   then place an order. Bidding only if time allows.
5. **Packhouse (1.5 min)**: "Haryana Fresh Quality Check". LOT-00028 is Tomato, Grade A, at
   Graded. Click **Mark packed** to show Haryana Fresh Packed and Ready for dispatch.
6. **DoH / PMU and leadership (4 min)**: the six outcome KPI tiles, then Market Signals with
   "Why this signal?", then Integration Sync Status, then the advisory and moderation actions.
   Sign in at `/executive-login` for the leadership view.
7. **Close (0.5 min)**: market outcomes feed the next production cycle.

Keep for Q&A only, not core demo time: Add Member, detailed DBT drill-down, content moderation,
CSV export, report access audit log, repeated order-status clicks, and both auction and
fixed-price flows in depth.

Before the session: reload the page to reset seeded state. Go through a rehearsal once. Shrink
the browser to phone width and back to desktop before the session.
