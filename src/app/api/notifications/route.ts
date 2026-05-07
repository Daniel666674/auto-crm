import { NextResponse } from 'next/server';
import { mktDb } from '@/db/mkt-db';

export async function GET() {
  try {
    const now = Date.now();
    const sevenDaysAgoMs = now - 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgoSec = Math.floor(sevenDaysAgoMs / 1000);
    const thirtyDaysAgoSec = Math.floor(now / 1000) - 30 * 24 * 60 * 60;

    const notifications: Array<{ id: string; type: string; msg: string; time: number }> = [];

    // Marketing handoffs (passed_to_sales_at in ms)
    const handoffs = mktDb.prepare(`
      SELECT id, name, company, passed_to_sales_at
      FROM mkt_contacts
      WHERE ready_for_sales = 1 AND passed_to_sales_at IS NOT NULL AND passed_to_sales_at >= ?
      ORDER BY passed_to_sales_at DESC LIMIT 10
    `).all(sevenDaysAgoMs) as Array<{ id: string; name: string; company: string; passed_to_sales_at: number }>;

    for (const h of handoffs) {
      notifications.push({
        id: `handoff-${h.id}`,
        type: 'handoff',
        msg: `${h.name} (${h.company}) enviado a pipeline de ventas`,
        time: h.passed_to_sales_at,
      });
    }

    // Sales deal updates (updated_at in seconds — Drizzle default)
    try {
      const deals = mktDb.prepare(`
        SELECT d.id, d.name, d.value, d.stage, d.updated_at, ps.name as stage_name
        FROM deals d
        LEFT JOIN pipeline_stages ps ON d.stage = ps.id
        WHERE d.updated_at >= ?
        ORDER BY d.updated_at DESC LIMIT 10
      `).all(sevenDaysAgoSec) as Array<{ id: string; name: string; value: number; stage: string; updated_at: number; stage_name: string | null }>;

      for (const deal of deals) {
        const val = deal.value ? ` ($${(deal.value / 100).toLocaleString('es-CO')})` : '';
        notifications.push({
          id: `deal-${deal.id}-${deal.updated_at}`,
          type: 'deal',
          msg: `Deal "${deal.name}"${val} movido a ${deal.stage_name || deal.stage}`,
          time: deal.updated_at * 1000,
        });
      }
    } catch { /* deals table may not exist in all envs */ }

    // Overdue activities (scheduled_at in seconds)
    try {
      const overdue = mktDb.prepare(`
        SELECT a.id, a.type, a.notes, a.scheduled_at, c.name as contact_name
        FROM activities a
        LEFT JOIN contacts c ON a.contact_id = c.id
        WHERE a.completed_at IS NULL AND a.scheduled_at < ? AND a.scheduled_at >= ?
        ORDER BY a.scheduled_at DESC LIMIT 5
      `).all(Math.floor(now / 1000), thirtyDaysAgoSec) as Array<{ id: string; type: string; notes: string; scheduled_at: number; contact_name: string | null }>;

      for (const act of overdue) {
        notifications.push({
          id: `activity-${act.id}`,
          type: 'delivery',
          msg: `Actividad vencida: ${act.type}${act.contact_name ? ` con ${act.contact_name}` : ''}`,
          time: act.scheduled_at * 1000,
        });
      }
    } catch { /* activities table may not exist */ }

    notifications.sort((a, b) => b.time - a.time);

    return NextResponse.json(notifications.slice(0, 20));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
