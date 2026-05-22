import { google, calendar_v3 } from "googleapis";
import { db } from "@/db";
import { googleTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key && process.env.NODE_ENV === "production") {
    console.error("[NEXUS] ENCRYPTION_KEY missing — Google Calendar tokens stored with weak key");
  }
  return crypto.scryptSync(key ?? "", "nexus-gcal-salt", 32);
}

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), enc.toString("hex"), tag.toString("hex")].join(":");
}

export function decryptToken(value: string): string {
  if (!value) return value;
  // Encrypted values are exactly iv:ciphertext:tag, all lowercase hex, with a
  // 12-byte (24-hex) IV. Some subsystems historically stored tokens UNENCRYPTED
  // in these columns; anything that isn't our format is treated as plaintext and
  // returned as-is, so a legacy raw token never crashes the decrypt path.
  const parts = value.split(":");
  const looksEncrypted =
    parts.length === 3 &&
    parts[0].length === 24 &&
    parts.every((p) => p.length % 2 === 0 && /^[0-9a-f]+$/i.test(p));
  if (!looksEncrypted) return value;
  try {
    const [ivHex, encHex, tagHex] = parts;
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return decipher.update(Buffer.from(encHex, "hex")).toString("utf8") + decipher.final("utf8");
  } catch {
    // Wrong key or corrupt value — return as-is rather than throwing.
    return value;
  }
}

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
      "https://nexus.blackscale.consulting/app/api/auth/callback/google-calendar"
  );
}

export function getAuthUrl(state?: string): string {
  const oauth = getOAuthClient();
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    // Same full scope set as the NextAuth sign-in so a reconnect never drops the
    // Analytics/Search Console grants (and vice-versa).
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/webmasters.readonly",
    ],
    ...(state ? { state } : {}),
  });
}

export async function storeTokens(
  userId: string,
  tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }
) {
  if (!tokens.access_token) return;
  const row = {
    userId,
    accessTokenEnc: encryptToken(tokens.access_token),
    refreshTokenEnc: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
    expiryDate: tokens.expiry_date ?? null,
  };
  const existing = db.select().from(googleTokens).where(eq(googleTokens.userId, userId)).get();
  if (existing) {
    db.update(googleTokens).set({ ...row, updatedAt: new Date() }).where(eq(googleTokens.userId, userId)).run();
  } else {
    db.insert(googleTokens).values(row).run();
  }
}

export async function getUpcomingEvents(userId: string): Promise<calendar_v3.Schema$Event[]> {
  const record = db.select().from(googleTokens).where(eq(googleTokens.userId, userId)).get();
  if (!record) return [];

  const oauth = getOAuthClient();
  oauth.setCredentials({
    access_token: decryptToken(record.accessTokenEnc),
    refresh_token: record.refreshTokenEnc ? decryptToken(record.refreshTokenEnc) : undefined,
    expiry_date: record.expiryDate ?? undefined,
  });

  // Auto-refresh and persist updated tokens
  oauth.on("tokens", (tokens) => { storeTokens(userId, tokens); });

  const cal = google.calendar({ version: "v3", auth: oauth });
  const res = await cal.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  });

  return res.data.items ?? [];
}

export const CALENDAR_TZ = process.env.CALENDAR_TZ || "America/Bogota";

/** Authenticated Calendar client for a connected user, or null if not connected. */
function calendarClient(userId: string): calendar_v3.Calendar | null {
  const record = db.select().from(googleTokens).where(eq(googleTokens.userId, userId)).get();
  if (!record) return null;
  const oauth = getOAuthClient();
  oauth.setCredentials({
    access_token: decryptToken(record.accessTokenEnc),
    refresh_token: record.refreshTokenEnc ? decryptToken(record.refreshTokenEnc) : undefined,
    expiry_date: record.expiryDate ?? undefined,
  });
  oauth.on("tokens", (tokens) => { storeTokens(userId, tokens); });
  return google.calendar({ version: "v3", auth: oauth });
}

/** Events on the primary calendar within [timeMin, timeMax] (ISO strings). */
export async function getEventsInRange(
  userId: string,
  timeMinISO: string,
  timeMaxISO: string
): Promise<calendar_v3.Schema$Event[]> {
  const cal = calendarClient(userId);
  if (!cal) return [];
  const res = await cal.events.list({
    calendarId: "primary",
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    maxResults: 250,
    singleEvents: true,
    orderBy: "startTime",
  });
  return res.data.items ?? [];
}

export interface CreateEventInput {
  title: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:MM (24h)
  durationMin: number;
  notes?: string;
  attendees?: string[];
}

/** Creates an event on the user's primary Workspace calendar. */
export async function createCalendarEvent(
  userId: string,
  input: CreateEventInput
): Promise<{ id?: string; htmlLink?: string }> {
  const cal = calendarClient(userId);
  if (!cal) throw new Error("Cuenta de Google no conectada");

  const [y, m, d] = input.date.split("-").map(Number);
  const [hh, mm] = input.time.split(":").map(Number);
  const p = (n: number) => String(n).padStart(2, "0");
  // Treat the components as wall-clock in CALENDAR_TZ; do arithmetic in UTC so
  // adding the duration never trips over the server's local DST rules.
  const base = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const end = new Date(base.getTime() + Math.max(5, input.durationMin) * 60000);
  const startStr = `${y}-${p(m)}-${p(d)}T${p(hh)}:${p(mm)}:00`;
  const endStr = `${end.getUTCFullYear()}-${p(end.getUTCMonth() + 1)}-${p(end.getUTCDate())}T${p(end.getUTCHours())}:${p(end.getUTCMinutes())}:00`;

  const attendees = (input.attendees ?? []).filter(Boolean).map((email) => ({ email }));

  const res = await cal.events.insert({
    calendarId: "primary",
    sendUpdates: attendees.length ? "all" : "none",
    requestBody: {
      summary: input.title,
      description: input.notes || undefined,
      start: { dateTime: startStr, timeZone: CALENDAR_TZ },
      end: { dateTime: endStr, timeZone: CALENDAR_TZ },
      ...(attendees.length ? { attendees } : {}),
    },
  });

  return { id: res.data.id ?? undefined, htmlLink: res.data.htmlLink ?? undefined };
}
