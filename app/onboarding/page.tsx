'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { createCalcomManagedUser } from '@/app/lib/calcom';

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleConnectCalendar = async () => {
    setConnecting(true);
    try {
      console.log('Creating Cal.com managed user from onboarding...');

      // Create managed user in Cal.com
      const calcomUser = await createCalcomManagedUser(
        user!.email,
        user!.displayName || 'User'
      );

      console.log('Cal.com managed user created in onboarding:', calcomUser);

      // TODO: Store Cal.com credentials in user profile
      // For now, just proceed to home
      router.push('/home');
    } catch (error) {
      console.error('Calendar connection error:', error);
      alert('Cal.com integration error: ' + (error as Error).message);
      setConnecting(false);
    }
  };

  const handleSkip = () => {
    router.push('/home');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-pulse">
          <div className="w-16 h-16 gradient-icon rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Connect your calendars</h1>
            <p className="text-gray-600">
              Link Google, Outlook, or iCloud so we can find mutual free time. We never expose event details.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleConnectCalendar}
              disabled={connecting}
              className="w-full py-3 px-4 gradient-primary text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {connecting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connecting...
                </span>
              ) : (
                'Connect calendars'
              )}
            </button>

            <button
              onClick={handleSkip}
              disabled={connecting}
              className="w-full py-3 px-4 text-gray-600 font-medium hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Skip for now
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="text-center text-sm text-gray-500">
              <p>Supported providers:</p>
              <div className="flex justify-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#0078D4" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 13.15l-7.3 7.3a.75.75 0 01-1.06 0l-3.428-3.428a.75.75 0 111.06-1.06l2.898 2.897 6.77-6.769a.75.75 0 111.06 1.06z" />
                  </svg>
                  Outlook
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#000000" d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                  </svg>
                  iCloud
                </span>
                <span className="text-gray-500">More...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}