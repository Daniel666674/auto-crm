import { db } from "@/db";
import { emailSuppressions, emailEvents } from "@/db/schema";
import { eq } from "drizzle-orm";

export const EMAIL_FROM = process.env.DIGEST_FROM || "nexus@blackscale.consulting";
export const SENDER_NAME = process.env.SENDER_NAME || "BlackScale";

export function getBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** Replace {{key}} merge tags with values. Unknown tags become empty strings. */
export function renderTemplate(tpl: string, vars: Record<string, string | undefined>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function isSuppressed(email: string): boolean {
  if (!email) return true;
  const row = db
    .select({ email: emailSuppressions.email })
    .from(emailSuppressions)
    .where(eq(emailSuppressions.email, email.toLowerCase().trim()))
    .get();
  return !!row;
}

export function suppress(email: string, reason = "unsubscribe"): void {
  if (!email) return;
  try {
    db.insert(emailSuppressions)
      .values({ email: email.toLowerCase().trim(), reason, createdAt: new Date() })
      .onConflictDoNothing()
      .run();
  } catch {
    /* already suppressed */
  }
}

export function logEmailEvent(e: {
  contactId?: string | null;
  sequenceId?: string | null;
  enrollmentId?: string | null;
  campaignId?: string | null;
  messageId?: string | null;
  type: string;
  url?: string | null;
  userAgent?: string | null;
}): void {
  try {
    db.insert(emailEvents)
      .values({
        contactId: e.contactId ?? null,
        sequenceId: e.sequenceId ?? null,
        enrollmentId: e.enrollmentId ?? null,
        campaignId: e.campaignId ?? null,
        messageId: e.messageId ?? null,
        type: e.type,
        url: e.url ?? null,
        userAgent: e.userAgent ?? null,
        createdAt: new Date(),
      })
      .run();
  } catch {
    /* non-fatal */
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface TrackingCtx {
  contactId?: string | null;
  enrollmentId?: string | null;
  sequenceId?: string | null;
  campaignId?: string | null;
  messageId: string;
  unsubEmail?: string | null;
}

/**
 * Turns a plain-text body into tracked HTML: linkifies bare URLs through the
 * click tracker, appends a 1x1 open-tracking pixel and an unsubscribe footer.
 */
export function buildTrackedHtml(bodyText: string, ctx: TrackingCtx): string {
  const base = getBaseUrl();
  const q = (extra: Record<string, string>) =>
    new URLSearchParams({
      m: ctx.messageId,
      ...(ctx.contactId ? { c: ctx.contactId } : {}),
      ...(ctx.enrollmentId ? { e: ctx.enrollmentId } : {}),
      ...(ctx.sequenceId ? { s: ctx.sequenceId } : {}),
      ...(ctx.campaignId ? { cmp: ctx.campaignId } : {}),
      ...extra,
    }).toString();

  // Escape, then linkify http(s) URLs through the click tracker.
  const escaped = escapeHtml(bodyText);
  const linked = escaped.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
    const tracked = `${base}/api/email/track/click?${q({ u: encodeURIComponent(url) })}`;
    return `<a href="${tracked}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
  const htmlBody = linked.replace(/\n/g, "<br>");

  const pixel = `<img src="${base}/api/email/track/open?${q({})}" width="1" height="1" alt="" style="display:none" />`;

  const unsubUrl = ctx.unsubEmail
    ? `${base}/api/email/unsubscribe?${new URLSearchParams({ a: ctx.unsubEmail, ...(ctx.contactId ? { c: ctx.contactId } : {}) }).toString()}`
    : "";
  const footer = unsubUrl
    ? `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e5e5;font-size:11px;color:#999;font-family:Arial,sans-serif">` +
      `BlackScale · <a href="${unsubUrl}" style="color:#999">Cancelar suscripción</a>` +
      `</div>`
    : "";

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222">${htmlBody}${footer}${pixel}</div>`;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  id?: string;
}

/**
 * Sends an email through the best available transport:
 *   1. Google Workspace (Gmail) if an account is connected — sends as the real
 *      mailbox, ideal for personal sequences.
 *   2. Resend as fallback (or when EMAIL_TRANSPORT=resend forces it).
 * Throws if neither transport is available/working.
 */
export async function sendEmail(input: SendEmailInput, preferredSenderUserId?: string): Promise<SendEmailResult> {
  const forceResend = process.env.EMAIL_TRANSPORT === "resend";

  if (!forceResend) {
    const { getGmailSenderUserId, sendViaGmail } = await import("./google-gmail");
    const senderUserId = getGmailSenderUserId(preferredSenderUserId);
    if (senderUserId) {
      // Gmail is connected and is the chosen transport. Use it authoritatively
      // and surface its errors directly — never mask a Gmail failure with a
      // (possibly misconfigured) Resend fallback. Resend only serves when no
      // Google account is connected, or when EMAIL_TRANSPORT=resend forces it.
      const r = await sendViaGmail(senderUserId, {
        to: input.to,
        subject: input.subject,
        html: input.html,
        fromName: SENDER_NAME,
        replyTo: input.replyTo,
        listUnsubscribe: `${getBaseUrl()}/api/email/unsubscribe?a=${encodeURIComponent(input.to)}`,
      });
      return { id: r.id };
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("No hay transporte de email configurado (conecta Google Workspace o define RESEND_API_KEY)");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from || EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? input.html.replace(/<[^>]+>/g, ""),
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });

  const data = (await res.json()) as { id?: string; message?: string; name?: string };
  if (!res.ok) {
    throw new Error(data.message || data.name || "Error al enviar email");
  }
  return { id: data.id };
}
