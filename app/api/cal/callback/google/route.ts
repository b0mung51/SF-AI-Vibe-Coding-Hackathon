import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(new URL('/edit-profile?error=google_oauth_failed', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/edit-profile?error=no_authorization_code', request.url));
    }

    // Save Google Calendar credentials using Cal.com API
    const response = await fetch('https://api.cal.com/v2/calendars/save-google-or-outlook-calendar-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cal-secret-key': process.env.NEXT_PUBLIC_CALCOM_JWT_TOKEN!,
      },
      body: JSON.stringify({
        provider: 'google',
        code,
        state,
        // Add other required fields based on Cal.com API requirements
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to save Google Calendar credentials:', errorText);
      return NextResponse.redirect(new URL('/edit-profile?error=save_credentials_failed', request.url));
    }

    const data = await response.json();
    console.log('Google Calendar credentials saved:', data);

    // Redirect back to edit profile with success
    return NextResponse.redirect(new URL('/edit-profile?success=google_connected', request.url));

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/edit-profile?error=callback_error', request.url));
  }
}