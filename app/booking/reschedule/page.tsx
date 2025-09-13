/*
 * NOTE: This page is currently unused in the app flow.
 * Users book through our app interface, not Cal.com directly.
 * Keeping for potential future Cal.com booking integration.
 */
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BookingReschedulePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Reschedule Meeting</h1>
            <p className="text-gray-600">
              You can reschedule your meeting by selecting a new time slot or contacting the other party directly.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.back()}
              className="w-full py-3 px-4 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              Select New Time
            </button>
            <Link
              href="/home"
              className="block w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}