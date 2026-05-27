import { NextRequest, NextResponse } from "next/server";
import { logEmailEvent, getMessageSentAt } from "@/lib/email";
import { recomputeContact } from "@/lib/fit-recompute";
import { classifyOpen, getClientIp, isFilteredOpen } from "@/lib/email-open-classify";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("u");
  const contactId = searchParams.get("c");
  const messageId = searchParams.get("m");

  let dest = "https://blackscale.consulting";
  if (target) {
    try {
      const decoded = decodeURIComponent(target);
      // Only allow http(s) redirects — never open redirect to other schemes.
      if (/^https?:\/\//i.test(decoded)) dest = decoded;
    } catch {
      /* fall back to default */
    }
  }

  try {
    const userAgent = req.headers.get("user-agent");
    const ip = getClientIp(
      req.headers.get("x-forwarded-for"),
      req.headers.get("x-real-ip")
    );
    // Classify the click source. Security scanners (Proofpoint/Barracuda/etc.)
    // click every link before delivery — those must NOT flip a lead to hot.
    const sourceType = classifyOpen({
      ip,
      userAgent,
      sentAtMs: getMessageSentAt(messageId),
      openAtMs: Date.now(),
    });

    logEmailEvent({
      contactId,
      sequenceId: searchParams.get("s"),
      enrollmentId: searchParams.get("e"),
      campaignId: searchParams.get("cmp"),
      messageId,
      type: "click",
      url: dest,
      userAgent,
      openType: sourceType,
    });

    // A genuine click is a strong intent signal — re-score immediately so the
    // lead flips to "hot" in real time. Bot/prefetch clicks are recorded for
    // auditing but never trigger a promotion.
    if (contactId && !isFilteredOpen(sourceType)) recomputeContact(contactId);
  } catch {
    /* never block the redirect */
  }

  return NextResponse.redirect(dest, { status: 302 });
}
