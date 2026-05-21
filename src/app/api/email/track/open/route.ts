import { NextRequest, NextResponse } from "next/server";
import { logEmailEvent } from "@/lib/email";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    logEmailEvent({
      contactId: searchParams.get("c"),
      sequenceId: searchParams.get("s"),
      enrollmentId: searchParams.get("e"),
      messageId: searchParams.get("m"),
      type: "open",
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
