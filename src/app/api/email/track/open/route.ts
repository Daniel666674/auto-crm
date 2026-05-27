import { NextRequest, NextResponse } from "next/server";
import { logEmailEvent, getMessageSentAt } from "@/lib/email";
import { classifyOpen, getClientIp } from "@/lib/email-open-classify";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const messageId = searchParams.get("m");
    const userAgent = req.headers.get("user-agent");
    const ip = getClientIp(
      req.headers.get("x-forwarded-for"),
      req.headers.get("x-real-ip")
    );

    // Classify the open now, while we have the IP and request timing — this is
    // the only point Apple's 17/8 source IP is observable.
    const openType = classifyOpen({
      ip,
      userAgent,
      sentAtMs: getMessageSentAt(messageId),
      openAtMs: Date.now(),
    });

    logEmailEvent({
      contactId: searchParams.get("c"),
      sequenceId: searchParams.get("s"),
      enrollmentId: searchParams.get("e"),
      campaignId: searchParams.get("cmp"),
      messageId,
      type: "open",
      userAgent,
      openType,
    });
  } catch {
    /* never block the pixel */
  }
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Content-Length": String(PIXEL.length),
    },
  });
}
