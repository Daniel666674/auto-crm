import { NextResponse } from 'next/server';

export async function GET() {
  const KEY = process.env.BREVO_API_KEY || '';
  if (!KEY) return NextResponse.json({ error: 'BREVO_API_KEY not configured' }, { status: 500 });
  try {
    const res = await fetch('https://api.brevo.com/v3/contacts/lists?limit=50&offset=0', {
      headers: { 'api-key': KEY }
    });
    if (!res.ok) return NextResponse.json({ error: `Brevo ${res.status}: ${res.statusText}` }, { status: res.status });
    const data = await res.json();
    return NextResponse.json({ lists: data.lists || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
