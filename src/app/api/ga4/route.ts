import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const credsB64 = process.env.GA4_CREDENTIALS || '';
    const propertyId = process.env.GA4_PROPERTY_ID || '';
    if (!credsB64 || !propertyId) {
      return NextResponse.json({ error: 'GA4 not configured' }, { status: 400 });
    }

    const creds = JSON.parse(Buffer.from(credsB64, 'base64').toString('utf-8'));

    // Get access token via service account
    const jwt = await getServiceAccountToken(creds);

    const body = {
      dateRanges: [
        { startDate: '30daysAgo', endDate: 'today' },
        { startDate: '60daysAgo', endDate: '31daysAgo' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'newUsers' },
      ],
      dimensions: [{ name: 'date' }],
      limit: 30,
    };

    const gaRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const data = await gaRes.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function getServiceAccountToken(creds: any): Promise<string> {
  const { createSign } = await import('crypto');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(creds.private_key, 'base64url');
  const assertion = `${header}.${payload}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await res.json();
  return data.access_token;
}
