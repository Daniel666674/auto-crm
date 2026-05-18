import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq } from "drizzle-orm";

function esc(v: string | null | undefined): string {
  if (!v) return "";
  return String(v).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = db.select().from(contacts).where(eq(contacts.id, id)).get();
  if (!c) return new NextResponse("Not found", { status: 404 });

  const parts = c.name.split(" ");
  const family = parts.length > 1 ? parts.slice(-1)[0] : "";
  const given = parts.length > 1 ? parts.slice(0, -1).join(" ") : c.name;

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(c.name)}`,
    `N:${esc(family)};${esc(given)};;;`,
  ];
  if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(c.email)}`);
  if (c.phone) lines.push(`TEL;TYPE=CELL:${esc(c.phone)}`);
  if (c.whatsappNumber && c.whatsappNumber !== c.phone) lines.push(`TEL;TYPE=WHATSAPP:${esc(c.whatsappNumber)}`);
  if (c.company) lines.push(`ORG:${esc(c.company)}`);
  if (c.title) lines.push(`TITLE:${esc(c.title)}`);
  if (c.linkedinUrl) lines.push(`URL:${esc(c.linkedinUrl)}`);
  if (c.location) lines.push(`ADR;TYPE=WORK:;;${esc(c.location)};;;;`);
  if (c.notes) lines.push(`NOTE:${esc(c.notes)}`);
  lines.push(`REV:${new Date().toISOString()}`);
  lines.push("END:VCARD");

  const filename = c.name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}
