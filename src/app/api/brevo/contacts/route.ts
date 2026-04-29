import { NextResponse } from 'next/server';

export async function GET() {
  try {
    let allContacts: any[] = [];
    let offset = 0;
    const limit = 500;
    while (true) {
      const res = await fetch(
        `https://api.brevo.com/v3/contacts?limit=${limit}&offset=${offset}`,
        { headers: { 'api-key': process.env.BREVO_API_KEY || '' } }
      );
      const data = await res.json();
      const contacts = data.contacts || [];
      allContacts = allContacts.concat(contacts);
      if (contacts.length < limit) break;
      offset += limit;
    }
    return NextResponse.json({ contacts: allContacts, count: allContacts.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
