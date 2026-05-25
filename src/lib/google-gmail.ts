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
export function getGmailSenderUserId(preferredUserId?: string): string | null {
  const rows = db.select({ userId: googleTokens.userId, scope: googleTokens.scope }).from(googleTokens).all();
  if (rows.length === 0) return null;

  // Prefer tokens we know can send. If none record a scope (legacy rows), fall
  // back to the full set so behavior is unchanged for older installs.
  const canSend = (s: string | null) => !!s && s.includes("gmail.send");
  const withSend = rows.filter((r) => canSend(r.scope));
  const pool = withSend.length > 0 ? withSend : rows;

  const inPool = (uid?: string | null) => (uid ? pool.find((r) => r.userId === uid)?.userId : undefined);
  return (
    inPool(preferredUserId) ||                       // the user performing the action
    inPool(process.env.SEQUENCE_SENDER_USER_ID) ||   // an explicitly pinned sender
    pool[pool.length - 1].userId                     // most recently connected
  );
}

function buildRawMessage(opts: { from: string; to: string; subject: string; html: string; replyTo?: string; listUnsubscribe?: string }): string {
  // RFC 2047 encode the subject so non-ASCII survives.
  const encodedSubject = `=?UTF-8?B?${Buffer.from(opts.subject, "utf8").toString("base64")}?=`;
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    ...(opts.replyTo ? [`Reply-To: ${opts.replyTo}`] : []),
    `Subject: ${encodedSubject}`,
    // RFC 8058 one-click unsubscribe — required by Google for bulk senders.
    ...(opts.listUnsubscribe
      ? [`List-Unsubscribe: <${opts.listUnsubscribe}>`, "List-Unsubscribe-Post: List-Unsubscribe=One-Click"]
      : []),
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
  opts: { to: string; subject: string; html: string; fromName?: string; replyTo?: string; listUnsubscribe?: string }
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

  const raw = buildRawMessage({ from, to: opts.to, subject: opts.subject, html: opts.html, replyTo: opts.replyTo, listUnsubscribe: opts.listUnsubscribe });
  const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });

  return { id: res.data.id ?? undefined, from: address };
}
