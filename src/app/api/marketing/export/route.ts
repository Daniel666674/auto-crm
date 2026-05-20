import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mktDb } from "@/db/mkt-db";

export const dynamic = "force-dynamic";

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSV(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\n");
}

function csvResponse(csv: string, filename: string): Response {
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const type = new URL(request.url).searchParams.get("type") || "contacts";
  const today = new Date().toISOString().split("T")[0];

  try {
    if (type === "contacts") {
      const rows = mktDb.prepare(`
        SELECT name, company, email, phone, source, tier, temperature, score,
               engagement_status, email_opens, email_clicks, ready_for_sales, industry
        FROM mkt_contacts ORDER BY score DESC
      `).all() as Array<Record<string, unknown>>;
      const headers = ["Nombre", "Empresa", "Email", "Teléfono", "Fuente", "Tier", "Temperatura", "Score", "Engagement", "Aperturas", "Clics", "Listo para ventas", "Industria"];
      const data = rows.map(r => [r.name, r.company, r.email, r.phone, r.source, r.tier, r.temperature, r.score, r.engagement_status, r.email_opens, r.email_clicks, r.ready_for_sales ? "Sí" : "No", r.industry]);
      return csvResponse(buildCSV(headers, data), `mkt-contactos-${today}.csv`);
    }

    if (type === "campaigns") {
      const rows = mktDb.prepare(`
        SELECT name, status, channel, target_segment, cadence_type,
               open_rate, click_rate, reply_rate, total_contacts, conversions, start_date
        FROM mkt_campaigns ORDER BY start_date DESC
      `).all() as Array<Record<string, unknown>>;
      const headers = ["Campaña", "Estado", "Canal", "Segmento", "Cadencia", "Open Rate %", "Click Rate %", "Reply Rate %", "Contactos", "Conversiones", "Inicio"];
      const data = rows.map(r => [
        r.name, r.status, r.channel, r.target_segment, r.cadence_type,
        r.open_rate, r.click_rate, r.reply_rate, r.total_contacts, r.conversions,
        r.start_date ? new Date(Number(r.start_date)).toISOString().split("T")[0] : "",
      ]);
      return csvResponse(buildCSV(headers, data), `mkt-campanas-${today}.csv`);
    }

    if (type === "segments") {
      const rows = mktDb.prepare(`SELECT name, description, rules_json, created_at FROM mkt_segments ORDER BY created_at DESC`).all() as Array<Record<string, unknown>>;
      const headers = ["Segmento", "Descripción", "Reglas (JSON)", "Creado"];
      const data = rows.map(r => [
        r.name, r.description, r.rules_json,
        r.created_at ? new Date(Number(r.created_at)).toISOString().split("T")[0] : "",
      ]);
      return csvResponse(buildCSV(headers, data), `mkt-segmentos-${today}.csv`);
    }

    return NextResponse.json({ error: "type debe ser contacts, campaigns o segments" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
