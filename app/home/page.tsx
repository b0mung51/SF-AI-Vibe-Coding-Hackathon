'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { logOut } from '@/app/lib/firebase';
import { updateUserProfile } from '@/app/lib/db';
import Link from 'next/link';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [location, setLocation] = useState('');
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (user) {
      setUsername(user.username || '');
      if (user.location) {
        setLocation(`${user.location.city}, ${user.location.region}`);
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !user.location && !isRequestingLocation) {
      requestLocation();
    }
  }, [user]);

  const requestLocation = async () => {
    setIsRequestingLocation(true);
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const { latitude, longitude } = position.coords;

        // Reverse geocode to get city, region
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const data = await response.json();

        const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown';
        const region = data.address?.state || data.address?.region || 'Unknown';

        const locationData = {
          city,
          region,
          coordinates: { lat: latitude, lng: longitude }
        };

        await updateUserProfile(user!.id, { location: locationData });
        setLocation(`${city}, ${region}`);
      } catch (error) {
        console.error('Location error:', error);
      }
    }
    setIsRequestingLocation(false);
  };

  const handleUsernameEdit = async () => {
    if (isEditingUsername && user && username !== user.username) {
      try {
        await updateUserProfile(user.id, { username });
      } catch (error) {
        console.error('Error updating username:', error);
        setUsername(user.username || '');
      }
    }
    setIsEditingUsername(!isEditingUsername);
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/${username}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Cal Connect</h1>
          <button
            onClick={handleSignOut}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full gradient-icon flex items-center justify-center text-white text-xl font-semibold">
                {user.displayName?.[0] || 'U'}
              </div>
            )}

            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{user.displayName}</h2>

              <div className="flex items-center gap-2 mt-1">
                {isEditingUsername ? (
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9]/gi, ''))}
                    className="text-sm text-gray-600 border-b border-gray-300 focus:border-blue-500 outline-none"
                    autoFocus
                  />
                ) : (
                  <span className="text-sm text-gray-600">@{username}</span>
                )}
                <button
                  onClick={handleUsernameEdit}
                  className="text-blue-600 text-sm hover:text-blue-700"
                >
                  {isEditingUsername ? 'Save' : 'Edit'}
                </button>
              </div>

              {location && (
                <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleCopyLink}
            className="w-full mt-4 py-2 px-4 gradient-primary text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy link
              </>
            )}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Link
            href="/edit-profile"
            className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 gradient-icon rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Edit profile</p>
                  <p className="text-sm text-gray-500">Manage calendars and settings</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/connections"
            className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 gradient-icon rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Your connections</p>
                  <p className="text-sm text-gray-500">View and manage connections</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}