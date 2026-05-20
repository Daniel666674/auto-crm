import { db } from "@/db";
import { salesTargets } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// Fallback used when no monthly targets are configured — matches the historical
// hardcoded value so behavior is unchanged until the user sets quotas in Settings.
export const DEFAULT_MONTHLY_TARGET = 90_000_000; // COP cents

/**
 * Org-wide monthly sales target for the given month: the sum of every user's
 * configured monthly quota. Falls back to DEFAULT_MONTHLY_TARGET when none exist.
 */
export function getMonthlyTarget(year?: number, month?: number): number {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;

  const rows = db
    .select({ targetValue: salesTargets.targetValue })
    .from(salesTargets)
    .where(and(eq(salesTargets.period, "monthly"), eq(salesTargets.year, y), eq(salesTargets.month, m)))
    .all();

  const sum = rows.reduce((s, r) => s + (r.targetValue ?? 0), 0);
  return sum > 0 ? sum : DEFAULT_MONTHLY_TARGET;
}
