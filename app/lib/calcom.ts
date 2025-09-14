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

      // For existing users, we need to generate access tokens
      // This is a simplified approach - in production you might need to implement proper token management
      return {
        accessToken: 'existing_user_token', // Placeholder - you'll need proper token generation
        refreshToken: 'existing_user_refresh', // Placeholder - you'll need proper token generation
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

export async function getCalendarOAuthUrl(provider: 'google' | 'outlook', managedUserId: string): Promise<string> {
  const JWT_TOKEN = process.env.NEXT_PUBLIC_CALCOM_JWT_TOKEN;

  if (!JWT_TOKEN) {
    throw new Error('Cal.com JWT token not configured');
  }

  const response = await fetch('https://api.cal.com/v2/calendars/get-oauth-connect-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cal-secret-key': JWT_TOKEN,
    },
    body: JSON.stringify({
      provider,
      userId: managedUserId,
      redirectUrl: `${window.location.origin}/api/cal/callback/${provider}`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get OAuth URL:', error);
    throw new Error(`Failed to get ${provider} OAuth URL: ${response.status}`);
  }

  const data = await response.json();
  return data.url || data.authUrl || data.data?.url;
}