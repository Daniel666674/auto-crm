# BlackScale Nexus — Revenue Engine

Two funnels, one shared database, one objective: **turn ad spend into closed revenue and know exactly where it leaks.** This is an internal tool — every number is meant to drive an action, not decorate a report.

---

## 1. Marketing Funnel — "Funnel por Plataforma"
**Location:** Marketing module → *Funnel* tab. **Audience:** Julian (CMO).
**Question it answers:** *Where is my spend, which stage is starved, and which channel deserves more money this week?*

It maps each ad channel (Meta, LinkedIn, Google Ads) to the funnel stage it's actually operating in — **Awareness (TOFU) → Consideration (MOFU) → Conversion (BOFU)** — and flags gaps.

### What's real today (no setup needed)
- **Leads / Conversions / Revenue per platform** — derived live from the CRM: every contact is attributed to a channel by its `source` or a `utm_source=...` in its notes, then joined to won deals. Google's "leads" number, for example, is the real count of Google-attributed contacts.
- **Gap detection** — if a stage has zero active channels (e.g. nobody running Consideration), the banner flags it and proposes the fix.
- **Stage gates** — the rules for "graduating" a campaign to the next stage.

### What fills in as you add values
| Metric | Source | How to turn it real |
|---|---|---|
| Impressions, reach, frequency, CPM, followers, CTR | Ad platforms | Connect APIs (below) **or** type them weekly |
| Spend → **CPL, ROAS, budget split** | Ad platforms / manual | Same |

Two ways to feed it, in order of effort:
1. **Manual entry (instant):** `PUT /api/marketing/ad-metrics` with `{ meta:{spendCents,impressions,...}, linkedin:{...}, google:{...} }`. The funnel immediately computes real CPL (spend ÷ leads), ROAS (revenue ÷ spend) and the budget split.
2. **Live APIs (auto):** add credentials to `.env.local` and the nightly/triggered sync pulls metrics automatically. The clients are already built (`src/lib/integrations/{meta,linkedin,google-ads}.ts`); they stay inert until their env vars exist:
   - **Meta:** `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`
   - **LinkedIn:** `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AD_ACCOUNT_ID`
   - **Google Ads:** `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_ACCESS_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`
   - Trigger a pull: `POST /api/marketing/funnel/sync/meta` (or `linkedin` / `google`).

Until a platform is fed, the funnel shows Julian's example numbers with a "datos de ejemplo" flag — so it always looks complete and never blocks.

---

## 2. Sales Funnel
**Location:** Sales module → *Funnel* (Revenue Intelligence). **Audience:** Daniel (Sales).
**Question it answers:** *Which deal do I call right now, what's silently dying, and will I hit quota?*

Same visual language as marketing, but every element is an action:

- **KPI strip:** open pipeline, weighted pipeline, **sales velocity** (the master B2B metric = open deals × avg deal × win-rate ÷ cycle days, per month), win rate, avg cycle, won this period.
- **Quota coverage:** reads the real quarterly target from *Ajustes → Metas de venta* (`salesTargets`). Shows attainment % and **coverage ratio** (open pipeline ÷ remaining quota — healthy ≥ 3×).
- **Forecast bands:** Won so far · Commit (≥80% prob) · Best case (≥50%) · Pipeline — one glance tells you the quarter's range.
- **Stage funnel:** count + value + stage-to-stage conversion + **avg days-in-stage** (red when a stage is stalling).
- **Next Best Action (hot list):** the top 10 open deals ranked by value × probability × urgency (closing soon / going stale), each linking straight to the deal. This is the "who to call today" list.
- **Health:** stuck deals (>14d no movement) and slipping deals (close date already passed).
- **Win rate by source:** which channels actually *close* — the signal that flows back to marketing.

---

## 3. How the two funnels work together (the engine)

They share one database, so signals cross automatically:

| Signal | Direction | Effect |
|---|---|---|
| **Deal Won** | Sales → Marketing | Revenue is attributed to the originating channel; marketing's per-platform "Revenue" updates |
| **Win rate by source** | Sales → Marketing | Shows which channels close — tells Julian where to push budget |
| **Stage gap** (e.g. no Consideration) | Marketing → Sales | Surfaces the campaign to build before leads go cold |
| **Lead attribution** (`source` / `utm_source`) | Shared | The same tag drives marketing's channel split *and* sales' win-rate-by-source |

**The one habit that powers all of it:** tag every lead's `source` (or put `utm_source=meta|google|linkedin` in the link). That single field is what lets the engine connect spend → lead → deal → revenue end-to-end.

---

## Build status / roadmap
- ✅ **M1** Marketing funnel on real CRM data · ✅ **M2** manual ad-spend → CPL/ROAS · ✅ **M3** ad-platform clients + sync (awaiting credentials)
- ✅ **S1** Sales Funnel view · ✅ **S2** action triggers (aging, slippage, quota coverage, forecast, win/loss by source)
- ⏳ Next: nightly cron to auto-sync ad platforms; one-click "create campaign task" from a marketing gap; deal-stage history for true days-in-stage (currently uses last-update as a proxy).
