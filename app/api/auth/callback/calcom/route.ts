import { NextRequest, NextResponse } from 'next/server';
import { updateUserProfile } from '@/app/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Cal.com OAuth error:', error);
      return NextResponse.redirect(new URL('/edit-profile?error=oauth_failed', request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/edit-profile?error=missing_params', request.url));
    }

    // Parse state to get user ID
    const userId = state;

    // Exchange code for access token using correct Cal.com endpoint
    const tokenResponse = await fetch('https://app.cal.com/api/auth/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.CALCOM_CLIENT_ID,
        client_secret: process.env.CALCOM_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.CALCOM_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return NextResponse.redirect(new URL('/edit-profile?error=token_exchange_failed', request.url));
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token } = tokenData;

    // Get user's Cal.com profile using correct endpoint
    const profileResponse = await fetch('https://app.cal.com/api/auth/oauth/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      console.error('Failed to fetch Cal.com profile');
      return NextResponse.redirect(new URL('/edit-profile?error=profile_fetch_failed', request.url));
    }

    const profile = await profileResponse.json();

    // TODO: Store Cal.com credentials and sync calendars
    // For now, just redirect back with success
    await updateUserProfile(userId, {
      calcomIntegrationId: profile.id,
      // Store encrypted tokens securely in production
    });

    return NextResponse.redirect(new URL('/edit-profile?success=calendar_connected', request.url));
  } catch (error) {
    console.error('Cal.com OAuth callback error:', error);
    return NextResponse.redirect(new URL('/edit-profile?error=unexpected_error', request.url));
  }
}