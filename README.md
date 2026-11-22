# Haryana Fresh Digital Platform

Client-facing demo of the Haryana Fresh Digital Platform, built for Grant Thornton Bharat. It
shows the digital backbone connecting farmers and Producer Groups (PGs), packhouses, buyers and
the Department of Horticulture (DoH) / PMU / DPMU across Haryana's horticulture value chain.

It is one responsive React app (no backend): desktop-first for institutional users, mobile
friendly for the farmer persona.

## Running it

Requires Node.js 18+.

```bash
npm install
npm run dev      # http://localhost:3800
npm run build    # typecheck + production build into dist/
```

## What is real vs simulated

- **Real app logic**: UI, routing, persona switching, member and crop-plan entry, listings,
  orders, auctions and bidding, order status changes, content moderation, advisory publishing,
  report export (CSV/JSON).
- **Simulated**: every government system (Farm Trace, e-Girdwari, e-Kharid, MFMB,
  AgriStack/InDEA). These are typed functions in `src/lib/adapters.ts` returning deterministic
  seed data, with a seeded ~15% sync failure rate so the retry/error UI is exercised. Field
  sensor readings and demand forecasts are also generated and are labelled as simulated or
  experimental wherever they appear.
- **No persistence**: edits live in memory (component state, or the shared seed arrays) and reset
  on page reload.

## Modules

1. **Data hub**: unified farmer/PG profile, PG member management, season-wise crop plans,
   programme repository, data completeness (PMU), integration sync status (PMU).
2. **Marketplace**: listings tagged with multiple sales channels, buyer discovery with a
   rule-based match score, orders with a full status history, auctions and bulk bidding,
   live price board.
3. **Inventory, transactions and benefits**: lot tracking from harvest to delivery, read-only
   transaction archive, MFMB benefit/DBT status (farmer, PG manager) and consolidated disbursal
   by district (PMU).
4. **E-Community**: questions and discussions, targeted advisories (PMU publishes), moderation.
5. **Market and field intelligence**: market signals, simulated field data, demand forecast and
   next-season recommendation, buyer requirement capture.
6. **MIS and reporting**: district-filtered dashboard, report export, access audit log (admin).

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

- 10 Producer Groups, 200 farmers (about 175 active), 6 districts: Karnal, Kurukshetra, Sirsa,
  Ambala, Hisar, Panipat
- 6 crops: Kinnow, Guava, Mango, Tomato, Potato, Onion
- 4 packhouses, 4 buyers (one per buyer type)
- Listings, orders, auctions, inventory lots, transactions, benefit claims, community posts and
  advisories all derive from the entities above

Adding or reordering seed generation shifts the random sequence, so downstream numbers change.

## Demo script suggestion

1. Open `/`, then "Open Application". Note this is one app, not six builds.
2. As **Farmer / PG Member** on a phone-width window: profile, crop plans, field data.
3. As **PG Manager**: add a member, create a listing, advance order ORD-00003. (No demo persona owns
   an open auction, so auctions cannot be closed in the demo; buyers can still bid.)
4. As **Buyer**: filter the marketplace, place an order, bid on an open auction.
5. As **DoH/PMU/DPMU Official**: data completeness, sync status failure and Retry Sync, MIS
   dashboard, report export, publish an advisory, moderate a post.
6. Open `/executive-login` for the leadership view.
