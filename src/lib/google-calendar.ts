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

export function decryptToken(ciphertext: string): string {
  const [ivHex, encHex, tagHex] = ciphertext.split(":");
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex")).toString("utf8") + decipher.final("utf8");
}

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
      "https://nexus.blackscale.consulting/app/api/auth/callback/google-calendar"
  );
}

export function getAuthUrl(): string {
  const oauth = getOAuthClient();
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
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
