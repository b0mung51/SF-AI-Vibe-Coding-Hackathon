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

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to create Cal.com managed user:', error);
    throw new Error(`Cal.com managed user creation failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('Cal.com managed user created:', data);

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    managedUserId: data.user.id,
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