# Nexus Revenue Engine — Go-Live Checklist

Everything you need to collect to make both funnels 100% real. The funnel now shows
**zero hardcoded data** — it's real CRM data + whatever you feed it below; missing
values show "—" until provided.

There are **two ways** to feed ad metrics. Do them in this order:

1. **Free / instant** — tag lead sources + enter spend manually (no external accounts).
2. **Automated** — connect the three ad-platform APIs (needs credentials + approvals).

---

## 0. Fastest path (do this first — needs nothing external)

### 0.1 Tag every lead's source ⭐ highest leverage
This single field connects spend → lead → deal → revenue across **both** funnels.
- For each contact, set **`source`** to one of: `meta` / `facebook` / `instagram`, `google` / `google_ads`, `linkedin`, `website` / `organic`.
- Or, on web-form/landing leads, include **`utm_source=meta|google|linkedin`** — the funnel reads `utm_source` from the contact's notes automatically.
- For the ~2,149 contacts currently tagged `import`: bulk-update their `source` where you know the origin (CSV re-import or the contacts table).
- **Result:** marketing funnel leads/revenue per channel + sales funnel win-rate-by-source go live immediately.

### 0.2 Set the sales quota
- **Ajustes → Metas de venta** → add a target: period **quarterly**, the year, the quarter, and the value in **COP**.
- **Result:** Sales Funnel quota gauge (attainment + 3× coverage) and forecast bands activate.

### 0.3 Enter ad spend manually (optional, no API)
- **Marketing → Funnel → "Datos de Pauta"** button → fill per platform (Inversión COP/mes, Impresiones, CPM, Seguidores, CTR, etc.) → **Guardar**.
- **Result:** real CPL (spend ÷ leads), ROAS (revenue ÷ spend) and budget split — without any external account.

---

## 1. Meta (Facebook + Instagram) Ads API

**Goal:** a long-lived System User token + your Ad Account ID.

1. **App:** [developers.facebook.com](https://developers.facebook.com) → *My Apps* → *Create App* → type **Business** → add the **Marketing API** product.
2. **System User:** [business.facebook.com](https://business.facebook.com) → *Business Settings* → *Users → System Users* → **Add** (e.g. "Nexus Sync"), role **Admin**.
3. **Grant asset access:** Business Settings → *Accounts → Ad Accounts* → select your ad account → *Assign Partners/People* → add the System User with **View Performance** (or Manage).
4. **Token:** back in *System Users* → select it → **Generate New Token** → pick your app → scopes **`ads_read`** + **`read_insights`** → token expiration **Never**.
5. **Ad Account ID:** Business Settings → *Accounts → Ad Accounts* → the id shown as `act_XXXXXXXXXX` — use the **digits only**.

```
META_ACCESS_TOKEN=<system user token>
META_AD_ACCOUNT_ID=<digits, no act_ prefix>
# Optional — only if your ad account bills in USD and you want COP:
META_USD_COP_RATE=4000
```
Approval time: **none** (self-serve). Token is long-lived.

---

## 2. LinkedIn Ads API

**Goal:** Marketing Developer Platform access + access token + sponsored Ad Account ID.

1. **App:** [linkedin.com/developers](https://www.linkedin.com/developers) → *Create app* → associate with your **Company Page**.
2. **Request access:** app → *Products* → request **Advertising API** (Marketing Developer Platform). ⏳ Approval can take **1–2 weeks**.
3. **Token:** once approved, run OAuth with scopes **`r_ads_reporting`** + **`r_ads`** to get an access token.
4. **Ad Account ID:** Campaign Manager → *Account Assets* → the numeric account id.

```
LINKEDIN_ACCESS_TOKEN=<oauth access token>
LINKEDIN_AD_ACCOUNT_ID=<numeric account id>
# Optional:
LINKEDIN_USD_COP_RATE=4000
```
⚠️ **Token note:** LinkedIn access tokens expire (~60 days). For now, re-paste when it expires; long-term we'll add refresh-token handling (tracked follow-up).

---

## 3. Google Ads API

**Goal:** Developer token + OAuth access token + Customer ID.

1. **Developer token:** in a **Google Ads Manager (MCC)** account → *Tools → API Center* → apply for a **Developer Token** (Basic access). ⏳ Approval **~1–3 business days**.
2. **OAuth:** [Google Cloud Console](https://console.cloud.google.com) → enable **Google Ads API** → *APIs & Services → Credentials* → create **OAuth client ID**. Complete the consent flow with scope `https://www.googleapis.com/auth/adwords` to obtain a **refresh token**, then exchange it for an **access token**.
3. **Customer ID:** the **10-digit** account id (no dashes). If you access it through the MCC, also note the manager id.

```
GOOGLE_ADS_DEVELOPER_TOKEN=<developer token>
GOOGLE_ADS_ACCESS_TOKEN=<oauth access token>
GOOGLE_ADS_CUSTOMER_ID=<10 digits, no dashes>
# Optional, if accessed via a manager account:
GOOGLE_ADS_LOGIN_CUSTOMER_ID=<MCC id, no dashes>
```
⚠️ **Token note:** Google access tokens expire **~1 hour**. For unattended nightly sync we need the refresh-token→access-token exchange (tracked follow-up). For first tests, paste a fresh access token and run a manual sync.

---

## 4. Put it on the server & activate

1. Edit **`/var/www/nexus/.env.local`** and add the lines you collected above.
2. Restart so the env is loaded:
   ```bash
   cd /var/www/nexus && pm2 restart nexus --update-env
   ```
3. The in-process scheduler auto-pulls every 12h. To pull **now**:
   ```bash
   curl -X POST http://localhost:3000/api/marketing/funnel/sync-all
   ```
   (If you set `CRON_SECRET`, add `-H "Authorization: Bearer <secret>"`.)

---

## 5. Optional hardening

```
ENCRYPTION_KEY=<random 32+ chars>   # SQLCipher DB-at-rest encryption (needs SQLCipher build)
CRON_SECRET=<random string>          # protects the sync-all endpoint
```

---

## 6. Verify it's live

| Check | Where | Expect |
|---|---|---|
| Source tagging works | Marketing → Funnel | Leads/revenue per platform > 0 |
| Manual spend | Datos de Pauta → Guardar | CPL/ROAS + budget split appear |
| API connected | Funnel platform cards | "API conectada" badge, real impressions/CPM |
| Sync ran | `POST /sync-all` response | `{ ok: true, synced: N }` |
| Quota | Sales → Funnel | Coverage gauge + forecast bands populated |
| Win-rate by source | Sales → Funnel (bottom) | Per-source rows with win % |

---

## Summary — what unlocks what

| You provide | Unlocks |
|---|---|
| Lead `source` / `utm_source` | Channel split + revenue attribution + win-rate-by-source (both funnels) |
| Sales quota (Metas de venta) | Quota coverage + forecast bands |
| Manual spend (Datos de Pauta) | Real CPL, ROAS, budget mix — no API |
| Meta / LinkedIn / Google env vars | Auto-synced impressions, CPM, frequency, CTR, followers |
