import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { config as authOptions } from '@/auth';

/**
 * Cal.com OAuth Callback Handler
 * Handles the OAuth authorization code flow callback from Cal.com
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('Cal.com OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/dashboard?error=oauth_error&message=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard?error=missing_params&message=Missing authorization code or state', request.url)
      );
    }

    // Verify state parameter
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard?error=invalid_state&message=Invalid state parameter', request.url)
      );
    }

    // Get current session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.id !== stateData.userId) {
      return NextResponse.redirect(
        new URL('/dashboard?error=unauthorized&message=Session mismatch', request.url)
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.cal.com/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.CALCOM_CLIENT_ID!,
        client_secret: process.env.CALCOM_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/calcom/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL('/dashboard?error=token_exchange&message=Failed to exchange authorization code', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user information from Cal.com
    const userResponse = await fetch('https://api.cal.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'cal-api-version': '2024-08-13',
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to get user info from Cal.com');
      return NextResponse.redirect(
        new URL('/dashboard?error=user_info&message=Failed to get user information', request.url)
      );
    }

    const calcomUser = await userResponse.json();

    // Store the connection data in your database
    // This is a mock implementation - replace with actual database storage
    const connectionData = {
      userId: session.user.id,
      calcomUserId: calcomUser.data.id,
      calcomUsername: calcomUser.data.username,
      calcomEmail: calcomUser.data.email,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry: new Date(Date.now() + expires_in * 1000).toISOString(),
      timeZone: calcomUser.data.timeZone,
      connectedAt: new Date().toISOString(),
      status: 'connected'
    };

    // TODO: Store connectionData in your database
    console.log('Cal.com connection established:', {
      userId: connectionData.userId,
      calcomUserId: connectionData.calcomUserId,
      calcomUsername: connectionData.calcomUsername
    });

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      new URL('/dashboard?success=calcom_connected&message=Successfully connected to Cal.com', request.url)
    );

  } catch (error) {
    console.error('Cal.com callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=callback_error&message=An unexpected error occurred', request.url)
    );
  }
}