import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
    }

    // Here you would implement the actual refresh token logic with Cal.com API
    // For now, we'll return a placeholder response
    const response = await fetch('https://api.cal.com/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.CAL_OAUTH_CLIENT_ID,
        client_secret: process.env.CALCOM_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokenData = await response.json();

    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 });
  }
}