/**
 * Open-event classification — distinguishes real human opens from machine
 * prefetch / privacy proxies, so engagement metrics aren't inflated.
 *
 *   gmail    — Google Image Proxy fired the pixel → a real user opened it in Gmail (COUNT)
 *   human    — pixel loaded from a client IP with a normal UA                      (COUNT)
 *   mpp      — Apple Mail Privacy Protection prefetch from Apple's 17.0.0.0/8 block (filter)
 *   bot      — security scanner / link-preview / mail gateway                       (filter)
 *   prefetch — pixel fired within seconds of send → machine, not a human            (filter)
 *
 * Apple MPP is the dominant source of fake opens: it pre-fetches every image on
 * Apple's data-centre servers the moment mail arrives, regardless of whether the
 * user ever opens it. Those requests originate from Apple's 17/8 network, which is
 * the only reliable signal (the UA is a generic Safari string with no marker).
 */

export type OpenType = "human" | "gmail" | "mpp" | "bot" | "prefetch";

// Security scanners, link-preview bots, mail gateways. NOTE: GoogleImageProxy is
// intentionally NOT here — it indicates a genuine Gmail open by the recipient.
const RX_BOT_UA =
  /bot|crawler|spider|monitor|preview|scanner|proofpoint|barracuda|mimecast|fortinet|microsoftpreview|googleweblight/i;

const RX_GMAIL_PROXY = /googleimageproxy/i;

// Opens this close to the send are machine prefetch, not a human reading the mail.
export const PREFETCH_MS = 3000;

/**
 * Extracts the originating client IP from proxy headers. Nginx forwards the
 * chain via X-Forwarded-For ("client, proxy1, proxy2"); the first entry is the
 * real client. Falls back to X-Real-IP.
 */
export function getClientIp(
  xForwardedFor: string | null | undefined,
  xRealIp?: string | null | undefined
): string | null {
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  if (xRealIp) return xRealIp.trim();
  return null;
}

/** True if the IP belongs to Apple's 17.0.0.0/8 block (Apple MPP prefetch). */
export function isAppleMppIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  // Strip any IPv4-mapped IPv6 prefix (e.g. "::ffff:17.1.2.3")
  const v4 = ip.replace(/^::ffff:/i, "");
  const m = v4.match(/^(\d{1,3})\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
  return m ? m[1] === "17" : false;
}

export function classifyOpen(opts: {
  ip?: string | null;
  userAgent?: string | null;
  sentAtMs?: number | null;
  openAtMs?: number | null;
}): OpenType {
  const ua = opts.userAgent || "";

  // A Gmail proxy hit means the recipient actually opened the message.
  if (RX_GMAIL_PROXY.test(ua)) return "gmail";

  // Apple MPP — data-centre prefetch from Apple's network.
  if (isAppleMppIp(opts.ip)) return "mpp";

  // Known non-human openers.
  if (RX_BOT_UA.test(ua)) return "bot";

  // Fired suspiciously fast after send → machine prefetch / gateway scan.
  if (
    opts.sentAtMs != null &&
    opts.openAtMs != null &&
    opts.openAtMs - opts.sentAtMs < PREFETCH_MS
  ) {
    return "prefetch";
  }

  return "human";
}

/** Open types that represent a genuine human read and should be counted. */
export function isConfirmedOpen(t: OpenType | string | null | undefined): boolean {
  return t === "human" || t === "gmail";
}

/** Open types that must be filtered out of engagement metrics & scoring. */
export function isFilteredOpen(t: OpenType | string | null | undefined): boolean {
  return t === "mpp" || t === "bot" || t === "prefetch";
}
