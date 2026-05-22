import { google } from "googleapis";
import { db } from "@/db";
import { googleTokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOAuthClient, decryptToken, storeTokens } from "./google-calendar";

/**
 * Returns the userId of a connected Google account to send sequence mail from,
 * or null if none is connected. Prefers SEQUENCE_SENDER_USER_ID if set,
 * otherwise the most recently connected account.
 */
export function getGmailSenderUserId(): string | null {
  const preferred = process.env.SEQUENCE_SENDER_USER_ID;
  if (preferred) {
    const row = db.select({ userId: googleTokens.userId }).from(googleTokens).where(eq(googleTokens.userId, preferred)).get();
    if (row) return row.userId;
  }
  const any = db.select({ userId: googleTokens.userId }).from(googleTokens).all();
  return any.length > 0 ? any[any.length - 1].userId : null;
}

function buildRawMessage(opts: { from: string; to: string; subject: string; html: string; replyTo?: string }): string {
  // RFC 2047 encode the subject so non-ASCII survives.
  const encodedSubject = `=?UTF-8?B?${Buffer.from(opts.subject, "utf8").toString("base64")}?=`;
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    ...(opts.replyTo ? [`Reply-To: ${opts.replyTo}`] : []),
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];
  const body = Buffer.from(opts.html, "utf8").toString("base64");
  const message = `${headers.join("\r\n")}\r\n\r\n${body}`;
  // base64url
  return Buffer.from(message, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function gmailClient(userId: string) {
  const record = db.select().from(googleTokens).where(eq(googleTokens.userId, userId)).get();
  if (!record) return null;
  const oauth = getOAuthClient();
  oauth.setCredentials({
    access_token: decryptToken(record.accessTokenEnc),
    refresh_token: record.refreshTokenEnc ? decryptToken(record.refreshTokenEnc) : undefined,
    expiry_date: record.expiryDate ?? undefined,
  });
  oauth.on("tokens", (tokens) => { storeTokens(userId, tokens); });
  return google.gmail({ version: "v1", auth: oauth });
}

export interface InboundMessage {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

/** Lists inbox messages matching a Gmail search query (metadata only). */
export async function listInboundMessages(userId: string, q: string, max = 50): Promise<InboundMessage[]> {
  const gmail = gmailClient(userId);
  if (!gmail) return [];

  const list = await gmail.users.messages.list({ userId: "me", q, maxResults: max });
  const ids = (list.data.messages ?? []).map((m) => m.id).filter((id): id is string => !!id);

  const out: InboundMessage[] = [];
  for (const id of ids) {
    const msg = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date"],
    });
    const headers = msg.data.payload?.headers ?? [];
    const h = (name: string) => headers.find((x) => x.name?.toLowerCase() === name)?.value ?? "";
    out.push({ id, from: h("from"), subject: h("subject"), date: h("date"), snippet: msg.data.snippet ?? "" });
  }
  return out;
}

export interface GmailSendResult {
  id?: string;
  from: string;
}

/** Send an email through the connected Workspace account's Gmail. */
export async function sendViaGmail(
  userId: string,
  opts: { to: string; subject: string; html: string; fromName?: string; replyTo?: string }
): Promise<GmailSendResult> {
  const record = db.select().from(googleTokens).where(eq(googleTokens.userId, userId)).get();
  if (!record) throw new Error("Cuenta de Google no conectada");

  const oauth = getOAuthClient();
  oauth.setCredentials({
    access_token: decryptToken(record.accessTokenEnc),
    refresh_token: record.refreshTokenEnc ? decryptToken(record.refreshTokenEnc) : undefined,
    expiry_date: record.expiryDate ?? undefined,
  });
  oauth.on("tokens", (tokens) => { storeTokens(userId, tokens); });

  const gmail = google.gmail({ version: "v1", auth: oauth });

  // Resolve the From address from the connected CRM user's mailbox (their
  // Workspace account). Avoids depending on a Gmail read scope just to send.
  let address = "";
  const user = db.select({ email: users.email }).from(users).where(eq(users.id, userId)).get();
  if (user?.email) address = user.email.trim();
  if (!address) {
    try {
      const profile = await gmail.users.getProfile({ userId: "me" });
      address = profile.data.emailAddress || "";
    } catch {
      /* no read scope available — fall through to the error below */
    }
  }
  if (!address) throw new Error("No se pudo resolver la dirección del remitente de Gmail");
  const from = opts.fromName ? `${opts.fromName} <${address}>` : address;

  const raw = buildRawMessage({ from, to: opts.to, subject: opts.subject, html: opts.html, replyTo: opts.replyTo });
  const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });

  return { id: res.data.id ?? undefined, from: address };
}
