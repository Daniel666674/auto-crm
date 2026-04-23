import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "crm.db");

function openDb(): Database.Database {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const db = new Database(DB_PATH, { timeout: 15000 });
  try { db.pragma("journal_mode = WAL"); } catch {}
  try { db.pragma("busy_timeout = 15000"); } catch {}
  try { db.pragma("foreign_keys = ON"); } catch {}
  return db;
}

function initMktTables(db: Database.Database): void {
  const tables = [
    `CREATE TABLE IF NOT EXISTS mkt_contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'website',
      tier INTEGER NOT NULL DEFAULT 2,
      temperature TEXT NOT NULL DEFAULT 'cold',
      score INTEGER NOT NULL DEFAULT 0,
      brevo_cadence TEXT NOT NULL DEFAULT 'Cold Welcome',
      engagement_status TEXT NOT NULL DEFAULT 'cold',
      email_opens INTEGER NOT NULL DEFAULT 0,
      email_clicks INTEGER NOT NULL DEFAULT 0,
      lead_source_detail TEXT NOT NULL DEFAULT '',
      marketing_notes TEXT NOT NULL DEFAULT '',
      ready_for_sales INTEGER NOT NULL DEFAULT 0,
      passed_to_sales_at INTEGER,
      industry TEXT NOT NULL DEFAULT '',
      last_activity INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS mkt_campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      start_date INTEGER NOT NULL,
      target_segment TEXT NOT NULL DEFAULT '',
      cadence_type TEXT NOT NULL DEFAULT 'outreach',
      open_rate REAL NOT NULL DEFAULT 0,
      click_rate REAL NOT NULL DEFAULT 0,
      reply_rate REAL NOT NULL DEFAULT 0,
      total_contacts INTEGER NOT NULL DEFAULT 0,
      conversions INTEGER NOT NULL DEFAULT 0,
      last_sent INTEGER
    )`,
  ];
  for (const sql of tables) {
    try { db.exec(sql); } catch {}
  }
}

const NOW = Date.now();
const DAY = 86400000;

const SEED_CONTACTS = [
  { id: "mc1", name: "María García", company: "TechStartup MX", email: "maria@techstartup.mx", phone: "+57 310 123 4567", source: "website", tier: 1, temperature: "hot", score: 85, brevo_cadence: "Onboarding Premium", engagement_status: "hot", email_opens: 8, email_clicks: 3, lead_source_detail: "Blog post CTA", marketing_notes: "Muy activa, abre todos los emails", ready_for_sales: 1, passed_to_sales_at: null, industry: "Tecnología", last_activity: NOW - DAY },
  { id: "mc2", name: "Carlos Rodríguez", company: "Inmobiliaria Rodríguez", email: "carlos@inmobiliaria.com", phone: "+57 311 987 6543", source: "referido", tier: 1, temperature: "warm", score: 60, brevo_cadence: "Nurturing B2B", engagement_status: "warm", email_opens: 1, email_clicks: 0, lead_source_detail: "Referido por Juan López", marketing_notes: "Abrió email pero no hizo click", ready_for_sales: 0, passed_to_sales_at: null, industry: "Inmobiliaria", last_activity: NOW - 3*DAY },
  { id: "mc3", name: "Ana Martínez", company: "Martínez Consultores", email: "ana@consultoria.mx", phone: "+57 312 555 1234", source: "redes_sociales", tier: 2, temperature: "warm", score: 55, brevo_cadence: "LinkedIn Outreach", engagement_status: "warm", email_opens: 2, email_clicks: 0, lead_source_detail: "LinkedIn DM", marketing_notes: "Respondió en LinkedIn, no en email", ready_for_sales: 0, passed_to_sales_at: null, industry: "Consultoría", last_activity: NOW - 2*DAY },
  { id: "mc4", name: "Roberto Sánchez", company: "Tienda en Línea SA", email: "roberto@tienda.com", phone: "+57 313 777 8888", source: "formulario", tier: 3, temperature: "cold", score: 25, brevo_cadence: "Cold Welcome", engagement_status: "cold", email_opens: 0, email_clicks: 0, lead_source_detail: "Formulario web genérico", marketing_notes: "Sin engagement, posible email incorrecto", ready_for_sales: 0, passed_to_sales_at: null, industry: "E-commerce", last_activity: NOW - 15*DAY },
  { id: "mc5", name: "Laura Hernández", company: "Agencia Creativa", email: "laura@agencia.mx", phone: "+57 314 444 5555", source: "evento", tier: 1, temperature: "hot", score: 90, brevo_cadence: "Event Follow-up", engagement_status: "hot", email_opens: 12, email_clicks: 5, lead_source_detail: "Networking Bogotá 2026", marketing_notes: "Super engaged, pidió demo", ready_for_sales: 1, passed_to_sales_at: null, industry: "Marketing", last_activity: NOW - 0.5*DAY },
  { id: "mc6", name: "Diego Flores", company: "LogiMex", email: "diego@logistica.mx", phone: "+57 315 222 3333", source: "llamada_fria", tier: 3, temperature: "cold", score: 15, brevo_cadence: "Cold Welcome", engagement_status: "dead", email_opens: 0, email_clicks: 0, lead_source_detail: "Lista comprada", marketing_notes: "Bounced — email inválido", ready_for_sales: 0, passed_to_sales_at: null, industry: "Logística", last_activity: NOW - 20*DAY },
  { id: "mc7", name: "Sofía Ramírez", company: "Dental Premium", email: "sofia@dental.mx", phone: "+57 316 666 7777", source: "whatsapp", tier: 2, temperature: "warm", score: 45, brevo_cadence: "WhatsApp Nurture", engagement_status: "warm", email_opens: 1, email_clicks: 0, lead_source_detail: "WhatsApp Business", marketing_notes: "Preguntó precios por WA", ready_for_sales: 0, passed_to_sales_at: null, industry: "Salud", last_activity: NOW - 5*DAY },
  { id: "mc8", name: "Valentina Torres", company: "FoodTech CO", email: "val@foodtech.co", phone: "+57 317 111 2222", source: "redes_sociales", tier: 1, temperature: "hot", score: 78, brevo_cadence: "LinkedIn Outreach", engagement_status: "hot", email_opens: 6, email_clicks: 2, lead_source_detail: "Instagram Ad", marketing_notes: "Interactuó con 3 posts + abrió emails", ready_for_sales: 1, passed_to_sales_at: null, industry: "Alimentos", last_activity: NOW - DAY },
  { id: "mc9", name: "Andrés Mejía", company: "FinPro Solutions", email: "andres@finpro.co", phone: "+57 318 333 4444", source: "website", tier: 2, temperature: "cold", score: 30, brevo_cadence: "Onboarding Premium", engagement_status: "cold", email_opens: 0, email_clicks: 0, lead_source_detail: "Google Ads", marketing_notes: "Registró pero nunca abrió nada", ready_for_sales: 0, passed_to_sales_at: null, industry: "Finanzas", last_activity: NOW - 12*DAY },
  { id: "mc10", name: "Camila Restrepo", company: "EduTech Latam", email: "camila@edutech.co", phone: "+57 319 555 6666", source: "evento", tier: 1, temperature: "hot", score: 82, brevo_cadence: "Event Follow-up", engagement_status: "hot", email_opens: 5, email_clicks: 4, lead_source_detail: "Webinar Marzo 2026", marketing_notes: "Asistió al webinar completo, hizo preguntas", ready_for_sales: 1, passed_to_sales_at: null, industry: "Educación", last_activity: NOW - 2*DAY },
  { id: "mc11", name: "Felipe Castillo", company: "BuildCO", email: "felipe@buildco.com", phone: "+57 320 888 9999", source: "referido", tier: 2, temperature: "cold", score: 35, brevo_cadence: "Nurturing B2B", engagement_status: "dead", email_opens: 0, email_clicks: 0, lead_source_detail: "Referido por partner", marketing_notes: "Unsubscribed del newsletter", ready_for_sales: 0, passed_to_sales_at: null, industry: "Construcción", last_activity: NOW - 25*DAY },
  { id: "mc12", name: "Isabella Vargas", company: "MedPlus", email: "isabella@medplus.co", phone: "+57 321 444 1111", source: "formulario", tier: 2, temperature: "warm", score: 50, brevo_cadence: "Cold Welcome", engagement_status: "warm", email_opens: 2, email_clicks: 0, lead_source_detail: "Landing page salud", marketing_notes: "Abrió 2 emails, no clickeó", ready_for_sales: 0, passed_to_sales_at: null, industry: "Salud", last_activity: NOW - 4*DAY },
];

const SEED_CAMPAIGNS = [
  { id: "mcamp1", name: "Onboarding Premium Q1", status: "active", start_date: NOW - 45*DAY, target_segment: "Tier 1 - Tecnología", cadence_type: "onboarding", open_rate: 42, click_rate: 18, reply_rate: 8, total_contacts: 34, conversions: 5, last_sent: NOW - 2*DAY },
  { id: "mcamp2", name: "LinkedIn Outreach - Latam", status: "active", start_date: NOW - 30*DAY, target_segment: "Tier 1+2 - Todos", cadence_type: "outreach", open_rate: 35, click_rate: 12, reply_rate: 5, total_contacts: 87, conversions: 8, last_sent: NOW - DAY },
  { id: "mcamp3", name: "Nurturing B2B - Inmobiliarias", status: "active", start_date: NOW - 60*DAY, target_segment: "Tier 2 - Inmobiliaria", cadence_type: "nurturing", open_rate: 22, click_rate: 6, reply_rate: 2, total_contacts: 156, conversions: 3, last_sent: NOW - 3*DAY },
  { id: "mcamp4", name: "Cold Welcome Series", status: "active", start_date: NOW - 90*DAY, target_segment: "Tier 3 - Todos", cadence_type: "welcome", open_rate: 11, click_rate: 2, reply_rate: 0.5, total_contacts: 412, conversions: 2, last_sent: NOW - DAY },
  { id: "mcamp5", name: "Event Follow-up Bogotá", status: "completed", start_date: NOW - 20*DAY, target_segment: "Evento - Networking", cadence_type: "event", open_rate: 58, click_rate: 28, reply_rate: 15, total_contacts: 23, conversions: 7, last_sent: NOW - 10*DAY },
  { id: "mcamp6", name: "WhatsApp Nurture Pilot", status: "paused", start_date: NOW - 15*DAY, target_segment: "Tier 2 - WhatsApp", cadence_type: "whatsapp", open_rate: 65, click_rate: 22, reply_rate: 18, total_contacts: 45, conversions: 4, last_sent: NOW - 8*DAY },
  { id: "mcamp7", name: "Webinar Marzo - Automación", status: "completed", start_date: NOW - 25*DAY, target_segment: "Todos los tiers", cadence_type: "event", open_rate: 48, click_rate: 32, reply_rate: 12, total_contacts: 67, conversions: 9, last_sent: NOW - 15*DAY },
  { id: "mcamp8", name: "Re-engagement Q1", status: "active", start_date: NOW - 10*DAY, target_segment: "Cold leads 60+ días", cadence_type: "reengagement", open_rate: 8, click_rate: 1, reply_rate: 0, total_contacts: 230, conversions: 0, last_sent: NOW - 2*DAY },
];

function seedMktData(db: Database.Database): void {
  try {
    const count = (db.prepare("SELECT COUNT(*) as c FROM mkt_contacts").get() as { c: number }).c;
    if (count > 0) return;

    const insertContact = db.prepare(`
      INSERT OR IGNORE INTO mkt_contacts
        (id, name, company, email, phone, source, tier, temperature, score, brevo_cadence,
         engagement_status, email_opens, email_clicks, lead_source_detail, marketing_notes,
         ready_for_sales, passed_to_sales_at, industry, last_activity)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    const insertCampaign = db.prepare(`
      INSERT OR IGNORE INTO mkt_campaigns
        (id, name, status, start_date, target_segment, cadence_type, open_rate, click_rate,
         reply_rate, total_contacts, conversions, last_sent)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    const run = db.transaction(() => {
      for (const c of SEED_CONTACTS) {
        insertContact.run(c.id, c.name, c.company, c.email, c.phone, c.source, c.tier,
          c.temperature, c.score, c.brevo_cadence, c.engagement_status, c.email_opens,
          c.email_clicks, c.lead_source_detail, c.marketing_notes, c.ready_for_sales,
          c.passed_to_sales_at, c.industry, c.last_activity);
      }
      for (const camp of SEED_CAMPAIGNS) {
        insertCampaign.run(camp.id, camp.name, camp.status, camp.start_date, camp.target_segment,
          camp.cadence_type, camp.open_rate, camp.click_rate, camp.reply_rate,
          camp.total_contacts, camp.conversions, camp.last_sent);
      }
    });
    run();
  } catch {}
}

const _sqlite = openDb();
initMktTables(_sqlite);
seedMktData(_sqlite);
export const mktDb = _sqlite;
