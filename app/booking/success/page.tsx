/*
 * NOTE: This page is currently unused in the app flow.
 * Users book through our app interface, not Cal.com directly.
 * Keeping for potential future Cal.com booking integration.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BookingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push('/home');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Meeting Booked!</h1>
            <p className="text-gray-600">
              Your calendar event has been successfully created. Both parties will receive calendar invitations.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/home"
              className="block w-full py-3 px-4 gradient-primary text-white font-medium rounded-lg transition-colors"
            >
              Back to Home
            </Link>
            <p className="text-sm text-gray-500">
              Redirecting automatically in 5 seconds...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}