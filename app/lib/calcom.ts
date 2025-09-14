/**
 * Cal.com API integration utilities
 */

const CALCOM_API_URL = process.env.NEXT_PUBLIC_CALCOM_API_URL || 'https://api.cal.com/v1';
const CLIENT_ID = process.env.NEXT_PUBLIC_CALCOM_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_CALCOM_REDIRECT_URI;

/**
 * Create a managed user in Cal.com using the platform API
 */
export async function createCalcomManagedUser(userEmail: string, userName: string): Promise<{
  accessToken: string;
  refreshToken: string;
  managedUserId: string;
}> {
  const CLIENT_ID = process.env.NEXT_PUBLIC_CALCOM_CLIENT_ID;
  const JWT_TOKEN = process.env.NEXT_PUBLIC_CALCOM_JWT_TOKEN;

  if (!CLIENT_ID || !JWT_TOKEN) {
    throw new Error('Cal.com credentials not configured');
  }

  const response = await fetch(`https://api.cal.com/v2/oauth-clients/${CLIENT_ID}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cal-secret-key': JWT_TOKEN,
    },
    body: JSON.stringify({
      email: userEmail,
      name: userName,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });

  const data = await response.json();

  // Handle user already exists (409 Conflict)
  if (response.status === 409 && data.error?.message?.includes('User with the provided e-mail already exists')) {
    const existingUserIdMatch = data.error.message.match(/Existing user ID=(\d+)/);
    if (existingUserIdMatch) {
      const existingUserId = existingUserIdMatch[1];
      console.log('Cal.com user already exists, using existing user ID:', existingUserId);

      // Force refresh tokens for existing user
      const refreshResponse = await fetch(`https://api.cal.com/v2/oauth-clients/${CLIENT_ID}/users/${existingUserId}/force-refresh`, {
        method: 'POST',
        headers: {
          'x-cal-secret-key': JWT_TOKEN,
        },
      });

      if (!refreshResponse.ok) {
        console.error('Failed to force refresh tokens:', await refreshResponse.text());
        throw new Error(`Failed to refresh tokens for existing user: ${refreshResponse.status}`);
      }

      const refreshData = await refreshResponse.json();
      console.log('Tokens refreshed for existing user:', refreshData);

      return {
        accessToken: refreshData.accessToken || refreshData.data?.accessToken,
        refreshToken: refreshData.refreshToken || refreshData.data?.refreshToken,
        managedUserId: existingUserId,
      };
    }
  }

  if (!response.ok) {
    console.error('Failed to create Cal.com managed user:', data);
    throw new Error(`Cal.com managed user creation failed: ${response.status}`);
  }

  console.log('Cal.com managed user created successfully:', data);

  // Cal.com returns data in a nested structure
  const userData = data.data || data;

  return {
    accessToken: userData.accessToken || userData.access_token,
    refreshToken: userData.refreshToken || userData.refresh_token,
    managedUserId: userData.user?.id || userData.id || userData.userId,
  };
}

// Keeping this for backward compatibility but it's not used in managed user flow
export function getCalcomAuthUrl(userId: string): string {
  throw new Error('Cal.com uses managed users, not OAuth redirect flow. Use createCalcomManagedUser instead.');
}

export async function getCalcomCalendars(accessToken: string) {
  const response = await fetch(`${CALCOM_API_URL}/calendars`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch calendars: ${response.statusText}`);
  }

  return await response.json();
}

export async function getCalcomAvailability(
  accessToken: string,
  userId: string,
  startDate: string,
  endDate: string
) {
  const params = new URLSearchParams({
    username: userId,
    dateFrom: startDate,
    dateTo: endDate,
  });

  const response = await fetch(`${CALCOM_API_URL}/availability?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch availability: ${response.statusText}`);
  }

  return await response.json();
}

export async function createCalcomBooking(
  accessToken: string,
  bookingData: {
    eventTypeId: number;
    start: string;
    end: string;
    attendee: {
      name: string;
      email: string;
    };
    location?: string;
    notes?: string;
  }
) {
  const response = await fetch(`${CALCOM_API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create booking: ${response.statusText}`);
  }

  return await response.json();
}

export async function getCalendarOAuthUrl(provider: 'google' | 'outlook', managedUserId: string, accessToken: string): Promise<string> {
  if (!accessToken) {
    throw new Error('Access token not provided');
  }

  // Map our provider names to Cal.com's expected values
  const calendarProvider = provider === 'outlook' ? 'office365' : 'google';

  // Build the URL with required parameters
  const redirectUrl = `http://localhost:3000/api/cal/callback/${provider}`;
  const url = new URL(`https://api.cal.com/v2/calendars/${calendarProvider}/connect`);
  url.searchParams.append('isDryRun', 'false');
  url.searchParams.append('redir', redirectUrl);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get OAuth URL:', error);
    throw new Error(`Failed to get ${provider} OAuth URL: ${response.status}`);
  }

  const data = await response.json();
  console.log('Cal.com OAuth URL response:', JSON.stringify(data, null, 2));

  // Check if response indicates success
  if (data.status === 'success' && data.data) {
    // The actual content is nested in data.data
    const innerData = data.data;
    console.log('Inner data structure:', JSON.stringify(innerData, null, 2));

    // Try different possible field names for the OAuth URL
    const oauthUrl = innerData.url || innerData.authUrl || innerData.redirectUrl ||
                     innerData.connectUrl || innerData.oauth_url || innerData.authorization_url;

    if (oauthUrl) {
      console.log('Found OAuth URL:', oauthUrl);
      return oauthUrl;
    }
  }

  // Fallback to checking direct properties
  const oauthUrl = data.url || data.authUrl || data.redirectUrl;

  if (!oauthUrl) {
    console.error('No OAuth URL found in response. Full response:', JSON.stringify(data, null, 2));
    throw new Error('OAuth URL not found in Cal.com response');
  }

  return oauthUrl;
}