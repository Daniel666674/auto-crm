import { NextRequest, NextResponse } from "next/server";
import { logEmailEvent } from "@/lib/email";
import { recomputeContact } from "@/lib/fit-recompute";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("u");
  const contactId = searchParams.get("c");

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
    logEmailEvent({
      contactId,
      sequenceId: searchParams.get("s"),
      enrollmentId: searchParams.get("e"),
      campaignId: searchParams.get("cmp"),
      messageId: searchParams.get("m"),
      type: "click",
      url: dest,
      userAgent: req.headers.get("user-agent"),
    });
    // A click is a strong intent signal — immediately re-score so the lead
    // flips to "hot" in real time rather than waiting for the next cron run.
    if (contactId) recomputeContact(contactId);
  } catch {
    /* never block the redirect */
  }

  return NextResponse.redirect(dest, { status: 302 });
}
