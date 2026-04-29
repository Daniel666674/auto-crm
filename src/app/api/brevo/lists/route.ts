import { NextResponse } from 'next/server';
export async function GET() {
  try {
    const res = await fetch('https://api.brevo.com/v3/contacts/lists?limit=50&offset=0', {
      headers: { 'api-key': process.env.BREVO_API_KEY || '' }
    });
    const data = await res.json();
    return NextResponse.json({ lists: data.lists || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
