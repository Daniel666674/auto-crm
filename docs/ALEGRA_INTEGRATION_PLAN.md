# Alegra Integration Plan (Future)

> Status: **PLANNED — NOT IMPLEMENTED**
> This document describes the planned integration of Alegra invoicing and tax handling into Nexus.
> Use this as the blueprint when ready to build.

## Why Alegra

Alegra is the leading SME invoicing/accounting platform in Colombia + LATAM. It handles:
- **Electronic invoicing** (DIAN-compliant — facturación electrónica obligatoria in Colombia)
- **IVA / Retención** automatic calculation
- **Inventory + clients** management
- **Reportes contables** (libros oficiales, declaraciones)

For Nexus, the value is: **deal won → click button → DIAN-stamped invoice issued automatically**.

## API Reference
- Docs: https://developer.alegra.com/docs
- Base URL: `https://api.alegra.com/api/v1`
- Auth: HTTP Basic with `email:apiToken` (base64-encoded)
- Rate limit: 60 req/min on standard plan

## Scope

### Phase 1 — Customer + invoice sync (minimum viable)

**Triggered when:** deal moves to `Cerrado Ganado` AND payment is confirmed (Wompi webhook OR manual).

**Flow:**
1. Look up Alegra customer by `contact.email` or `contact.taxId` (NIT)
2. If not found → create customer (`POST /contacts`):
   ```json
   {
     "name": "<contact.name>",
     "identification": { "type": "NIT|CC", "number": "<nit>" },
     "email": "<contact.email>",
     "phonePrimary": "<contact.phone>",
     "address": { "address": "<contact.location>", "city": "<>" },
     "kindOfPerson": "LEGAL_ENTITY|PERSON_ENTITY"
   }
   ```
3. Create invoice (`POST /invoices`):
   ```json
   {
     "date": "YYYY-MM-DD",
     "dueDate": "YYYY-MM-DD",
     "client": { "id": <alegraCustomerId> },
     "items": [
       { "id": <serviceId>, "price": <copValue>, "quantity": 1, "tax": [{ "id": <ivaTaxId> }] }
     ],
     "paymentForm": "CASH",
     "stamp": { "generateStamp": true }
   }
   ```
4. Store Alegra invoice ID + number on the deal: `alegraInvoiceId`, `alegraInvoiceNumber`, `alegraInvoiceUrl`
5. Auto-attach PDF to deal activity log

### Phase 2 — Recurring deals → recurring invoices

For deals with `isRecurring = true`:
- On won, create a recurring template in Alegra (`POST /recurring-invoices`)
- Use `recurringInterval` to set cadence (monthly/quarterly/annual)
- Subscribe to Alegra's `invoice.created` webhook to log each renewal as a Nexus activity

### Phase 3 — Tax engine

- Pre-fill IVA (19% default Colombia) on every deal value
- Toggle: incluido vs. excluido del valor
- Soportes contables: descargar XML DIAN + PDF directamente desde la deal

### Phase 4 — Notes/Credit/Debit notes

When a deal is refunded or modified post-invoice:
- Issue credit note (`POST /credit-notes`) referencing the original invoice
- Adjust deal status + create activity

## Schema additions (when ready to implement)

```sql
ALTER TABLE deals ADD COLUMN alegra_invoice_id TEXT;
ALTER TABLE deals ADD COLUMN alegra_invoice_number TEXT;
ALTER TABLE deals ADD COLUMN alegra_invoice_url TEXT;
ALTER TABLE deals ADD COLUMN alegra_invoice_status TEXT;
ALTER TABLE deals ADD COLUMN alegra_invoiced_at INTEGER;

ALTER TABLE contacts ADD COLUMN alegra_customer_id TEXT;
ALTER TABLE contacts ADD COLUMN tax_id TEXT;
ALTER TABLE contacts ADD COLUMN tax_id_type TEXT; -- NIT, CC, CE, PASSPORT
ALTER TABLE contacts ADD COLUMN tax_regime TEXT; -- responsable_iva, no_responsable_iva, etc.
```

## Required env vars

```env
ALEGRA_EMAIL=...
ALEGRA_API_TOKEN=...
ALEGRA_DEFAULT_TAX_ID=...     # IVA 19% tax ID from Alegra
ALEGRA_DEFAULT_SERVICE_ID=... # Default service line item
ALEGRA_WEBHOOK_SECRET=...     # For verifying inbound webhooks
```

## API endpoints to build (when ready)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/alegra/customers/sync` | POST | Push contact → Alegra customer (idempotent) |
| `/api/alegra/invoices` | POST | Create invoice from deal |
| `/api/alegra/invoices/[dealId]` | GET | Fetch invoice status + PDF URL |
| `/api/alegra/webhook` | POST | Receive Alegra events (invoice.paid, invoice.voided) |
| `/api/alegra/taxes` | GET | List available taxes for dropdown |

## UI additions

- **Deal detail page**: card next to WompiPaymentCard — "Facturación Alegra"
  - Button: "Emitir factura DIAN" (after deal is won)
  - Status: Pendiente / Emitida / Pagada / Anulada
  - Link: ver PDF / XML / portal Alegra
  - "Anular factura" → creates credit note
- **Contact form**: NIT/CC + tipo + régimen fields
- **Settings → Integraciones**: Alegra section with API token + default tax + default service mapping

## Decisions to make before building

1. **NIT validation** — use Alegra's validator or build local DIAN check digit logic?
2. **Service catalog** — one default service per deal, or map deals to product/service line items?
3. **Multi-currency** — Nexus is COP-native; do we need USD invoices for international clients?
4. **Resolución DIAN** — needs to be active in Alegra account; Nexus should display warning if expiring soon.
5. **Soft-delete vs. credit notes** — refunds should always go through credit notes (DIAN-compliant).

## Testing

- Alegra has a sandbox mode (`https://api.alegra.com/api/v1` with sandbox account)
- Set `ALEGRA_ENV=sandbox` env var to flip base URL
- Sandbox invoices don't generate real DIAN stamps but mirror the API contract
