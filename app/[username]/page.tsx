'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getUserByUsername } from '@/app/lib/db';
import { useAuth } from '@/app/contexts/AuthContext';
import type { User } from '@/app/types';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [warmingUp, setWarmingUp] = useState(false);

  useEffect(() => {
    loadUser();
  }, [params.username]);

  const loadUser = async () => {
    try {
      const username = (params.username as string).replace('@', '');
      const user = await getUserByUsername(username);

      if (!user) {
        router.push('/');
        return;
      }

      setProfileUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!profileUser || !currentUser) return;

    setWarmingUp(true);
    try {
      // Warm up availability cache
      const response = await fetch('/api/availability/mutual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user1Id: currentUser.id,
          user2Id: profileUser.id,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });

      if (response.ok) {
        router.push(`/schedule/${profileUser.username}`);
      }
    } catch (error) {
      console.error('Error warming up availability:', error);
    } finally {
      setWarmingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User not found</h2>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col items-center text-center">
            {profileUser.photoURL ? (
              <img
                src={profileUser.photoURL}
                alt={profileUser.displayName}
                className="w-24 h-24 rounded-full mb-4"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold mb-4">
                {profileUser.displayName?.[0] || 'U'}
              </div>
            )}

            <h1 className="text-2xl font-bold text-gray-900">{profileUser.displayName}</h1>
            <p className="text-gray-600">@{profileUser.username}</p>

            {profileUser.location && (
              <div className="flex items-center gap-1 mt-3 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{profileUser.location.city}, {profileUser.location.region}</span>
              </div>
            )}

            {/* Mutual context if both users have location */}
            {currentUser && currentUser.location && profileUser.location && !isOwnProfile && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p>
                  You&apos;re in {currentUser.location.city} • {profileUser.displayName} is in {profileUser.location.city}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {!isOwnProfile && (
          <button
            onClick={handleSchedule}
            disabled={warmingUp}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {warmingUp ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Preparing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule
              </>
            )}
          </button>
        )}

        {isOwnProfile && (
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-blue-700">This is your profile</p>
            <button
              onClick={() => router.push('/home')}
              className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}