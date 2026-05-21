import { NextRequest, NextResponse } from "next/server";
import { logEmailEvent } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("u");

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
      contactId: searchParams.get("c"),
      sequenceId: searchParams.get("s"),
      enrollmentId: searchParams.get("e"),
      messageId: searchParams.get("m"),
      type: "click",
      url: dest,
    });
  } catch {
    /* never block the redirect */
  }

  return NextResponse.redirect(dest, { status: 302 });
}
