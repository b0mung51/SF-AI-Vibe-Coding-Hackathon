/*
 * NOTE: This page is currently unused in the app flow.
 * Users book through our app interface, not Cal.com directly.
 * Keeping for potential future Cal.com booking integration.
 */
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BookingCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Meeting Cancelled</h1>
            <p className="text-gray-600">
              Your meeting has been cancelled. Both parties have been notified and calendar events have been removed.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/home"
              className="block w-full py-3 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Home
            </Link>
            <button
              onClick={() => router.back()}
              className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Schedule New Meeting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}