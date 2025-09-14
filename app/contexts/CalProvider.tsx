'use client';

import { useState, useEffect } from 'react';
import { CalProvider } from '@calcom/atoms';
import { useAuth } from './AuthContext';

export default function CalProviderWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState('');

  useEffect(() => {
    // For now, we'll use a placeholder access token
    // In production, you would fetch the user's actual Cal.com access token
    if (user) {
      // This could be stored in the user's profile in Firebase
      // For now, we'll use the JWT token as placeholder
      setAccessToken(process.env.NEXT_PUBLIC_CALCOM_JWT_TOKEN || '');
    }
  }, [user]);

  return (
    <CalProvider
      accessToken={accessToken}
      clientId={process.env.CAL_OAUTH_CLIENT_ID}
      options={{
        apiUrl: process.env.CAL_API_URL,
        refreshUrl: process.env.REFRESH_URL
      }}
    >
      {children}
    </CalProvider>
  );
}