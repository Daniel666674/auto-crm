# Nexus — Marketing Audit & M+S Alignment Plan

> The Blackscale thesis: in Colombian B2B, the #1 revenue leak is the gap between
> Marketing and Sales. Nexus is the operating system that closes that gap.
> This document is the audit + roadmap to make that thesis verifiable, measurable,
> and visible to every prospect who demos the product.

**Status:** living document. Update after each tier ships.
**Owner:** Daniel Acosta.
**Cadence:** review monthly against KPIs in Part 4.

> **Update (2026-05-25): Brevo removed.** The Brevo email-marketing integration
> (lib, API routes, hub, lists, webhook, and all `brevo*` fields) was fully
> stripped from the codebase. Engagement (opens/clicks, hot/warm/cold) is now
> computed natively from BlackScale-sent mail. Mentions of Brevo below are kept
> for historical context only — the components and routes they reference no
> longer exist. ICP recalculation now lives at `/api/marketing/recalculate-scores`.

---

## Part 1 — Marketing module audit

### Inventory (what exists today)

24 components in `src/components/marketing/` (~5,400 LOC):

| Component | Purpose | State |
|---|---|---|
| `mkt-engagement-board` | Hot/warm/cold contact triage | Working |
| `mkt-campaign-wall` | Campaign list + platform filter | Working (Block A) |
| `mkt-contacts-view` | Mirror of sales ContactsTable via CSS bridge | Working (M1) |
| `mkt-attribution` | First/last touch attribution view | Exists, thin |
| `mkt-handoff-center` | Marketing → Sales handoff queue | Working |
| `mkt-reengagement` | Returned-from-sales requeue | Working (M1) |
| `mkt-segment-health` | List/segment quality scoring | Exists |
| `mkt-icp-scorer` | ICP fit scoring | Exists |
| `mkt-lists` | Lists mirror | Removed (2026-05-25) |
| `mkt-segments-builder` | Rule-based smart segments + live preview | Working (M3) |
| `mkt-funnel` | Lifecycle + deal stage funnel | Working (M3) |
| `mkt-pipeline-view` | Marketing's view of sales pipeline | Exists, duplicates sales |
| `mkt-lead-velocity` | Lead velocity rate | Exists |
| `mkt-analytics` | Marketing analytics | Exists |
| `mkt-intelligence` | Pattern insights | Exists |
| `mkt-calendar` | Content calendar | Exists, low usage |
| `mkt-digest` | Weekly summary email | Exists |
| `mkt-roi` | ROI calculation | Exists, thin |
| `mkt-brevo-hub` | Brevo control panel | Removed (2026-05-25) |
| `mkt-advanced-settings` | Settings page | Exists |
| `mkt-provider` | React context | Working |
| `mkt-sidebar` | Marketing navigation | Working |

13 marketing-specific API routes + 4 cross-team routes
(`handoff`, `return-to-marketing`, `revenue`, `revenue-intelligence`).
(The 8 Brevo routes were removed 2026-05-25.)

### Bidirectional sync — what's already wired

- `contacts.lifecycleStage` (subscriber → lead → MQL → SQL → opportunity →
  customer → evangelist) is the shared language across both modules.
- `contacts.returnedToMarketingAt` + reason — canonical "this lead is back
  with marketing" flag. Sales queries default to `WHERE returned_to_marketing_at
  IS NULL`; marketing opts in with `?includeReturned=true`.
- `contacts.firstTouchCampaignId` / `lastTouchCampaignId` — attribution
  captured natively from BlackScale email events (`email_events` table).
- `/api/handoff` clears the return flag on re-handoff (idempotent).
- `/api/deals/[id]` auto-promotes lifecycle on stage change: won → customer,
  lost (no other active deals) → re-engagement queue, otherwise advances to SQL.
- Marketing's ContactsTable uses the exact same component as sales,
  themed via the `MKT_VAR_OVERRIDES` CSS bridge.

This is more bidirectional sync than 95% of CRMs ship with. The plumbing is
strong. The visibility and the loop-closing are weak — that's where this
plan focuses.

### Strengths (don't break these)

1. **Lifecycle stage as shared canonical state.** Both modules read/write the
   same field. No "marketing has their own stages, sales has theirs."
2. **Native engagement engine.** Campaigns, engagement scoring, and email
   events are computed locally from BlackScale-sent mail — no external
   email-marketing dependency. (Replaced the Brevo integration 2026-05-25.)
3. **Return-to-marketing is enforced.** The bug we fixed in commit `75639e2`
   made this airtight — the contact actually disappears from sales when
   returned. This is rare and table-stakes for M+S trust.
4. **Single source of truth for contacts.** ContactsTable is reused, not
   forked. Every fix benefits both teams.
5. **Funnel + segments builder are real.** Not vaporware — they query live
   data and show meaningful counts.

### Gaps (what's weak, by severity)

#### 🔴 Critical gaps — these are the M+S alignment killers

**G1. No handoff-quality measurement.**
The handoff center shows what was passed. It doesn't show what happened
after. There's no "acceptance rate" (sales actually worked it), no
"time-to-first-touch" SLA, no "leads that died in 30 days" count.
Marketing can't improve what marketing can't measure.

**G2. No campaign-to-revenue table.**
`mkt-attribution` exists but is thin. There is no view that says:
"Campaña Q2 Seguros → 34 contacts → 12 SQL → 4 won → $58M revenue → 22%
ROI." Without this, marketing optimizes for opens/clicks (vanity) instead
of revenue (truth).

**G3. No SLA dashboard.**
Sales agrees to contact every MQL within 24h. Marketing agrees to qualify
every form-fill within 1h. Neither commitment exists in the product. No
breach alerts.

**G4. No stuck-lead alerts.**
A contact stuck in MQL for 21 days is a marketing problem (didn't nurture
to SQL) or a sales problem (didn't work it). Currently invisible.

**G5. No closed-loop scoring.**
ICP score and lead score are set at top of funnel. They don't update based
on whether the lead became a customer. Without feedback, scoring drifts
and marketing keeps sending sales the wrong leads.

#### 🟡 Important gaps — these limit the product's competitive story

**G6. Too many marketing sections.** 8 sidebar groups, ~24 components.
No "command center" — no single page a marketer opens in the morning that
answers "where do I focus today?"

**G7. ROI module is thin.** `mkt-roi.tsx` exists with TypeScript errors
(`scheduledAt` property missing). Needs to be the showpiece.

**G8. Marketing forecast missing.** Sales has a forecast. Marketing should
have one too — based on top-of-funnel volume × historical conversion rates
= predicted closed revenue 90 days out.

**G9. Account-based view missing.** Multiple contacts at the same company
are treated as independent leads. In B2B, a deal involves 4-7 stakeholders
at one account; we should aggregate by company.

**G10. No "predicted next-best-action" anywhere.** We have all the data
(score, lifecycle, last touch, deal stage) but no UI tells the user "this
is the contact you should call right now and why."

#### 🟢 Cosmetic / future polish

**G11.** Pipeline View in marketing module duplicates the sales pipeline.
Should be replaced with a marketing-specific view (funnel by source).

**G12.** Calendar component exists but isn't tied to anything actionable.

**G13.** Lead Velocity is exposed but unclear what action it drives.

**G14.** Smart Segments Builder doesn't yet trigger a campaign from a
segment (you can build the segment, but you can't yet launch a campaign
directly from it).

---

## Part 2 — The B2B M+S disconnection problem (and how Nexus answers it)

### The 8 disconnection symptoms we see in every Colombian B2B agency

| # | Symptom | What causes it | What Nexus does today | Gap |
|---|---|---|---|---|
| 1 | Sales doesn't trust marketing's leads | No shared definition of MQL/SQL | Shared `lifecycleStage` field | None — but the definition is implicit. Make it explicit + editable. |
| 2 | Marketing optimizes opens/clicks, not revenue | No revenue feedback to marketing | First/last touch fields captured | No revenue view by campaign (G2) |
| 3 | Leads die in the gap | No SLA, no breach alerts | None | Critical (G3) |
| 4 | Sales says "the lead never responded" → marketing has no recourse | No return-to-marketing flow | `returnedToMarketingAt` + reason + UI | Working ✅ |
| 5 | Marketing nurtures leads sales is already working on | No live sync of who's in pipeline | Lifecycle promotes on deal stage change | Working ✅ |
| 6 | No closed-loop on what works | Scoring doesn't learn from outcomes | None | Critical (G5) |
| 7 | Each team has their own dashboard, neither sees the whole | Two completely separate UIs | Marketing + Sales modules with shared data | Cmd Center missing (G6) |
| 8 | Account complexity invisible (multi-stakeholder B2B) | Contact-level view only | None | Account view missing (G9) |

### What "winning" looks like for Blackscale's positioning

When a prospect demos Nexus, the demo flow that closes them is:

1. **"Look at this contact."** — shows lifecycle, first/last touch, both
   teams' notes in one place. ✅ Already works.
2. **"Click here — this campaign generated $58M last quarter."** — campaign
   → revenue. ❌ Build this (G2).
3. **"This is your M+S health score, updated every morning."** — single
   number that tells leadership if alignment is working. ❌ Build this.
4. **"Sales has 12h left to contact this MQL — here's the breach alert."**
   — SLA enforcement. ❌ Build this (G3).
5. **"And this lead came back to marketing 14 days ago for these reasons —
   here's the nurture sequence we triggered."** — closed loop. ✅ Re-engagement
   queue works; sequence trigger is the missing piece.

That's the 5-minute demo that makes Blackscale Nexus the obvious answer
to B2B M+S disconnection in Colombia.

---

## Part 3 — Action plan (3 tiers, prioritized)

Each item has: **effort** (S=½ day, M=1-2 days, L=3-5 days, XL=1-2 weeks),
**impact** (1-5), **files**, and **acceptance criteria**.

### Tier 1 — Quick wins (this month, ship 5 items in 2 weeks)

These items make the demo work and turn implicit features into visible value.

#### T1.1 — Campaign-to-Revenue table (kills G2)
- **Effort:** M (1-2 days) · **Impact:** 5
- **Files:**
  - New API: `src/app/api/marketing/campaign-revenue/route.ts`
  - New component: `src/components/marketing/mkt-campaign-revenue.tsx`
  - Wire into existing `mkt-roi.tsx` or replace it
- **Logic:** for each campaign, join contacts via `firstTouchCampaignId` +
  `lastTouchCampaignId` → join deals via `contact_id` → aggregate counts +
  $ won. Show: contacts, SQLs, won deals, won revenue, ROI%.
- **Acceptance:** demo can click any campaign and see attributed revenue.

#### T1.2 — M+S Health Score (kills part of G6, anchors demo step 3)
- **Effort:** M · **Impact:** 5
- **Files:**
  - New API: `src/app/api/ms-health/route.ts`
  - New component: shown on BOTH `src/app/dashboard/page.tsx` (sales) AND
    marketing engagement board.
- **Score formula (0-100):**
  - Handoff acceptance rate (% of MQLs sales worked within 7d) — 25 pts
  - Return-to-marketing rate (lower is better, capped) — 20 pts
  - MQL→SQL conversion rate vs target — 20 pts
  - Stale-lead rate (% contacts stuck >14d in their stage) — 15 pts
  - Time-to-first-touch (avg hours, lower is better) — 20 pts
- **Acceptance:** one number visible on both sides, with drilldown.

#### T1.3 — SLA breach alerts (kills G3)
- **Effort:** M · **Impact:** 5
- **Files:**
  - New API: `src/app/api/ms-sla/route.ts` (returns breaches)
  - New settings tab section: `TabCliente` already shows requirements; add
    `TabAutomatizaciones` section for SLA config (`mql_response_hours`,
    `form_qualification_hours`, defaults 24h / 1h)
  - New widget on both dashboards: "⚠ X handoffs vencen en <2h"
- **Logic:** any contact with lifecycle=MQL and `passedToSalesAt` older than
  SLA threshold without a sales activity = breach.
- **Acceptance:** sales rep sees the count + can click into the list.

#### T1.4 — Stuck-lead detector (kills G4)
- **Effort:** S · **Impact:** 4
- **Files:**
  - Extend `src/app/api/marketing/stale/route.ts` (already exists for stale
    contacts) — add lifecycle-stuck dimension.
  - Add a row to the existing marketing engagement board: "12 contactos
    estancados en MQL >14 días."
- **Acceptance:** marketing sees actionable list of leads to nurture or
  return.

#### T1.5 — Unified M+S Command Center page (kills G6)
- **Effort:** L · **Impact:** 5
- **Files:**
  - New route: `src/app/ms-command/page.tsx`
  - Reuses existing components: funnel, campaign-revenue, sla-breaches,
    ms-health, recent activity feed (both sides), top deals.
  - Add nav entries in both sales sidebar (`src/components/Sidebar.tsx`)
    and marketing sidebar (`mkt-sidebar.tsx`): "Command Center".
- **Layout:**
  ```
  ┌──────────────────────────────────────────────────────┐
  │ M+S Health Score (big number) + trend sparkline       │
  ├──────────────────────────┬───────────────────────────┤
  │ Top campaigns by revenue │ SLA breaches now          │
  ├──────────────────────────┴───────────────────────────┤
  │ Funnel (mkt + sales) with conversion % between stages│
  ├──────────────────────────┬───────────────────────────┤
  │ Stuck leads by stage     │ Returns by reason (30d)   │
  └──────────────────────────┴───────────────────────────┘
  ```
- **Acceptance:** one page anyone (Daniel, Julian, a prospect) opens to
  understand the system in 30 seconds.

**Tier 1 total:** ~5-7 working days. Outcome: the demo story works
end-to-end. Every Block A and Block B feature has a visible payoff.

---

### Tier 2 — Real loops (next 2 months, ship 4 items)

These items convert one-time data capture into compounding feedback loops.
This is where the product gets defensible.

#### T2.1 — Closed-loop scoring (kills G5)
- **Effort:** L · **Impact:** 5
- **Files:**
  - New cron / nightly job: `src/lib/scoring-loop.ts`
  - For each won deal: increment historical score weight of the
    contact's `firstTouchCampaignId` + `industry` + ICP signal pattern.
  - For each lost deal: decrement same.
  - Update `crm_settings` table with learned weights; surface in
    `SettingsScoringWeights` UI as "auto-learned vs manual."
- **Acceptance:** after 90 days, scoring weights have moved based on
  outcomes. Marketing can see "your ICP score for Industry=Seguros went
  from 60 to 78 because 4 of 5 wins this Q came from there."

#### T2.2 — Marketing forecast (kills G8)
- **Effort:** L · **Impact:** 4
- **Files:**
  - New API: `src/app/api/marketing/forecast/route.ts`
  - New component: `src/components/marketing/mkt-forecast.tsx`
- **Logic:** historical lifecycle conversion rates × current top-of-funnel
  volume = predicted revenue 30/60/90 days out, by source/campaign.
- **Acceptance:** marketing director sees "based on current funnel, you'll
  close $42M COP in May (±15%)."

#### T2.3 — Auto-handoff rules engine (extends existing workflows)
- **Effort:** L · **Impact:** 4
- **Files:**
  - Extend `src/app/api/settings/workflows/route.ts` (workflows table
    already exists).
  - Add triggers: "score ≥ X AND lifecycle=lead → auto-promote to MQL,"
    "meeting requested → auto-handoff to sales," etc.
- **Acceptance:** the handoff center shows a "queued by automation" badge
  on auto-promoted contacts. Reduces manual triage to zero.

#### T2.4 — Account-based view (kills G9)
- **Effort:** XL · **Impact:** 4
- **Files:**
  - New table: `accounts` (id, company_name, domain, industry, size,
    primary_contact_id, total_pipeline_value, …).
  - Migration: backfill from existing `contacts.company`.
  - New route: `src/app/accounts/page.tsx` + `src/app/accounts/[id]/page.tsx`.
  - Reuse contact + deal + activity components in account context.
- **Acceptance:** for a company with 5 contacts and 2 deals, the account
  page shows everything in one place. Multi-stakeholder B2B becomes visible.

**Tier 2 total:** ~10-14 working days spread across 2 months. Outcome: the
product learns. Scoring improves. Forecast becomes credible. Account-based
selling becomes possible.

---

### Tier 3 — Industry-leading (Q3, ship 3 items)

These items position Nexus above any other Colombian or LATAM CRM.

#### T3.1 — Multi-touch attribution model (extends T1.1)
- **Effort:** XL · **Impact:** 4
- **Files:**
  - Extend `contacts.assistingCampaignIds` (already exists, currently
    unused).
  - On every touch (email open, click, form, meeting), append campaignId
    to assisting array.
  - New API: `/api/marketing/attribution-model?model=w-shaped|u-shaped|linear|first|last`
  - Component: shows revenue split per campaign under different models.
- **Acceptance:** marketing can answer "if I cut spend on LinkedIn ads,
  how much pipeline disappears?" under any attribution model.

#### T3.2 — Predicted Next-Best-Action (kills G10)
- **Effort:** XL · **Impact:** 5
- **Files:**
  - New job: `src/lib/nba-engine.ts` (runs daily)
  - For each active contact: compute next-best-action from features
    (lifecycle, days in stage, score, last touch, deal value).
  - Surface on every contact card: "Llama hoy — score subió 12 puntos
    tras abrir 3 emails esta semana."
  - Optional ANTHROPIC_API_KEY integration: if set, call Claude with
    structured context to generate a 1-sentence rationale per contact.
- **Acceptance:** sales rep opens Nexus and sees the 5 contacts to call
  today in priority order with reasoning.

#### T3.3 — Sales-Marketing SLA contract page (extends T1.3)
- **Effort:** L · **Impact:** 3
- **Files:**
  - New route: `src/app/settings/sla/page.tsx`
  - A formal, editable SLA between the marketing director and sales head:
    response times, qualification criteria, return-to-marketing reasons.
  - Version-controlled; both heads must "accept" changes.
  - Surfaces in every handoff: "Per SLA v2.3, you have 22 hours to contact
    this MQL."
- **Acceptance:** the SLA stops being a Google Doc and becomes an
  enforced part of the product. This is the moat — no other CRM does this.

---

## Part 4 — Success metrics (track monthly)

Add these to the M+S Health Score (T1.2) and the Command Center (T1.5):

### Pipeline health metrics

| Metric | Target | How calculated | Current source |
|---|---|---|---|
| MQL → SQL conversion rate | ≥ 35% | (# became SQL) / (# became MQL) over 90d | `contacts.lifecycleStage` history |
| SQL → Win conversion rate | ≥ 22% | (# wons) / (# became SQL) over 90d | `deals.closedAt` + stage |
| Avg MQL → Won days | ≤ 60d | weighted avg of stage-time | computed |
| Pipeline coverage ratio | ≥ 3.5× | open pipeline $ / target $ | `deals` + `settings.targets` |

### M+S alignment health metrics

| Metric | Target | How calculated |
|---|---|---|
| Handoff acceptance rate | ≥ 90% | MQLs with sales activity within SLA / total handoffs |
| Time-to-first-touch | < 4h | avg(first sales activity ts - handoff ts) |
| Return-to-marketing rate | ≤ 15% | returned / total handoffs (30d) |
| Stuck-lead rate | ≤ 10% | contacts stuck > 14d in stage / total active |
| SLA breach rate | < 5% | breached handoffs / total handoffs |

### Marketing efficiency metrics

| Metric | Target | How calculated |
|---|---|---|
| Cost per MQL | < target | (campaign spend) / (#MQLs attributed) |
| Cost per won deal | < target | spend / wons attributed |
| Marketing-sourced pipeline % | ≥ 60% | $ from first_touch≠outbound / total pipeline |
| Avg score of won deals | rising trend | confirms scoring works |

---

## Part 5 — Sequencing & dependencies

### Build order (do not reorder without re-checking deps)

```
T1.1 Campaign Revenue   ─┐
                         ├─→ T1.2 M+S Health Score ─→ T1.5 Command Center
T1.3 SLA Breaches       ─┘                                    ↑
T1.4 Stuck Leads        ──────────────────────────────────────┘

T1.2 M+S Health Score ──→ T2.1 Closed-loop Scoring ──→ T3.2 Next-Best-Action
T1.1 Campaign Revenue ──→ T2.2 Forecast            ─┐
                                                    ├─→ T3.1 Multi-touch Attribution
T2.4 Account view       ─────────────────────────────┘

T1.3 SLA Breaches      ──→ T3.3 Formal SLA Contract
T2.3 Auto-handoff       ──→ feeds into Command Center widgets
```

### Quick-start picks (what to build first if you have ½ day)

1. **T1.4 (stuck leads)** — half-day, immediate value, no new dependencies.
2. **T1.1 (campaign revenue)** — best ratio of demo impact to effort.
3. **T1.2 (M+S health score)** — anchors the demo narrative.

### What NOT to do (anti-patterns)

- Don't build a separate marketing pipeline / sales pipeline split — we
  already have one shared lifecycle. Resist the urge.
- Don't add more sidebar items in the marketing module before Command
  Center ships. We already have too many (G6).
- Don't re-introduce an external email-marketing dependency. Engagement is
  now native — build on the local `email_events` engine.
- Don't add an AI co-pilot to every screen — pick one (T3.2 NBA) and make
  it excellent.
- Don't ship attribution dashboards (T3.1) before closed-loop scoring
  (T2.1) — attribution without outcome feedback is vanity.

---

## Appendix A — Files that already exist and should be leveraged

When building Tier 1 items, don't recreate what already works:

- `src/app/api/marketing/funnel/route.ts` — has lifecycle counts query;
  reuse for M+S health.
- `src/app/api/marketing/stale/route.ts` — has the stale-contact logic;
  extend it.
- `src/app/api/handoff/route.ts` — handoff creation; add `acceptedAt`
  timestamp on first sales activity.
- `src/app/api/return-to-marketing/route.ts` — already captures reason;
  surface in dashboards.
- `email_events` table + `/api/marketing/recalculate-scores` — native
  capture point for engagement scoring and first/last touch.
- `src/components/marketing/mkt-funnel.tsx` — reuse on Command Center.
- `src/types/portal.ts` — `PORTAL_WIDGETS` already has `mkt-attribution`,
  `mkt-engagement`, `mkt-campaigns`; the same widget components can power
  Command Center.

## Appendix B — Pre-existing TS errors to clean up before T2

These are tracked but not yet fixed; cleaning them is a prerequisite for
T2.1 closed-loop scoring (touches scoring code paths):

- `src/components/marketing/mkt-roi.tsx` — `scheduledAt` does not exist
  on `MktCampaign`.
- `src/components/marketing/mkt-digest.tsx` — `totalSent` does not exist
  on `MktCampaign`.
- `src/components/marketing/mkt-lists.tsx` — style typing issue line 18.
- `src/components/analytics/ga4-detail.tsx` — `range` property missing.
- `src/app/api/sequences/[id]/*` — Next 15 params Promise typing.

## Appendix C — Demo script (after Tier 1 ships)

5-minute demo that closes B2B prospects:

> **Slide 0 (10s):** "Tu agencia tiene un problema invisible: marketing y
> sales se acusan mutuamente del mismo lead muerto. Nexus mide esa
> desconexión, la cierra, y te muestra cuánto revenue cuesta."

> **Step 1 (30s):** Open Command Center. Point to M+S Health Score: 73/100.
> "Eso significa que de cada 4 leads, 1 muere en la grieta. Vamos a verlo."

> **Step 2 (60s):** Click "SLA breaches now". Show 3 MQLs that sales no
> ha tocado en 26h. "Tu marketing trabajó. Tu sales no respondió. Nexus
> lo detecta automáticamente."

> **Step 3 (90s):** Click "Top campaigns by revenue". Show Q2 Seguros
> campaign → $58M atribuido → 22% ROI. "Aquí marketing demuestra que su
> trabajo generó plata, no opens y clicks."

> **Step 4 (60s):** Click a returned-to-marketing contact. Show reason
> ("no contestó tras 5 intentos"). "Sales no perdió el lead — lo regresó
> con contexto. Marketing lo metió en una secuencia de re-engagement."

> **Step 5 (45s):** Open a contact. Show NBA suggestion: "Llamar hoy —
> score subió 12 puntos esta semana." "Cada vendedor abre Nexus y sabe
> exactamente qué hacer."

> **Close (15s):** "Esto es lo que Blackscale entrega: no un CRM, una
> máquina de revenue que rompe la desconexión M+S. ¿Cuándo lo arrancamos
> para tu equipo?"

---

**Next review:** after Tier 1 ships (target end of June 2026). Update
metrics in Part 4 with actual values, mark Tier 1 items as ✅, and
re-prioritize Tier 2 if anything new came up.
