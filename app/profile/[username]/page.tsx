'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle, 
  Loader2,
  CalendarPlus,
  Coffee,
  Utensils,
  Sun,
  Moon
} from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui';

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  timezone: string;
  workingHours: {
    [key: string]: {
      start: string;
      end: string;
      enabled: boolean;
    };
  };
  lunchWindow: {
    start: string;
    end: string;
    enabled: boolean;
  };
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const username = params.username as string;

  useEffect(() => {
    // Simulate fetching user profile data
    // In a real app, this would fetch from your API
    const fetchProfile = async () => {
      try {
        // Mock profile data - replace with actual API call
        const mockProfile: UserProfile = {
          name: decodeURIComponent(username).charAt(0).toUpperCase() + decodeURIComponent(username).slice(1),
          email: `${username}@example.com`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          timezone: 'America/New_York',
          workingHours: {
            monday: { start: '09:00', end: '17:00', enabled: true },
            tuesday: { start: '09:00', end: '17:00', enabled: true },
            wednesday: { start: '09:00', end: '17:00', enabled: true },
            thursday: { start: '09:00', end: '17:00', enabled: true },
            friday: { start: '09:00', end: '17:00', enabled: true },
            saturday: { start: '10:00', end: '14:00', enabled: false },
            sunday: { start: '10:00', end: '14:00', enabled: false },
          },
          lunchWindow: {
            start: '12:00',
            end: '13:00',
            enabled: true,
          },
        };
        
        setProfile(mockProfile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  const handleConnect = async () => {
    if (!session) {
      // Redirect to sign in if not authenticated
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href));
      return;
    }

    setConnecting(true);
    
    try {
      // Call the calendar connection API
      const response = await fetch('/api/calendar/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: username,
          permissions: ['calendar.readonly', 'calendar.events']
        }),
      });

      const result = await response.json();

      if (result.success) {
        setConnected(true);
        
        // Redirect to scheduling page after successful connection
        setTimeout(() => {
          router.push(`/schedule?with=${username}`);
        }, 1500);
      } else {
        throw new Error(result.message || 'Failed to connect calendars');
      }
      
    } catch (error) {
      console.error('Error connecting calendars:', error);
      // You could add a toast notification here
      alert('Failed to connect calendars. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const formatWorkingHours = (day: string) => {
    if (!profile?.workingHours[day]?.enabled) {
      return 'Not available';
    }
    const { start, end } = profile.workingHours[day];
    return `${start} - ${end}`;
  };

  const getAvailabilityStatus = () => {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (!profile?.workingHours[currentDay]?.enabled) {
      return { status: 'unavailable', text: 'Currently unavailable' };
    }
    
    const { start, end } = profile.workingHours[currentDay];
    if (currentTime >= start && currentTime <= end) {
      return { status: 'available', text: 'Currently available' };
    }
    
    return { status: 'unavailable', text: 'Currently unavailable' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">The profile you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const availabilityStatus = getAvailabilityStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
            />
            <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 border-white ${
              availabilityStatus.status === 'available' ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.name}</h1>
          <p className="text-gray-600 mb-2">{availabilityStatus.text}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span>{profile.timezone}</span>
          </div>
        </div>

        {/* Connect Section */}
        <div className="mb-8">
          <Card className="text-center">
            <CardContent className="p-8">
              {connected ? (
                <div className="space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <h2 className="text-2xl font-bold text-gray-900">Calendars Connected!</h2>
                  <p className="text-gray-600">Redirecting to scheduling page...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <CalendarPlus className="h-16 w-16 text-blue-600 mx-auto" />
                  <h2 className="text-2xl font-bold text-gray-900">Connect Your Calendar</h2>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Connect your calendar with {profile.name} to see mutual availability and schedule meetings easily.
                  </p>
                  <Button
                    onClick={handleConnect}
                    disabled={connecting}
                    size="lg"
                    className="px-8"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-5 w-5 mr-2" />
                        Connect Calendar
                      </>
                    )}
                  </Button>
                  {!session && (
                    <p className="text-sm text-gray-500">
                      You'll be asked to sign in to connect your calendar
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Working Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Working Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(profile.workingHours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between items-center">
                    <span className="capitalize font-medium text-gray-700">
                      {day}
                    </span>
                    <span className={`text-sm ${
                      hours.enabled ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {formatWorkingHours(day)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Availability Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Lunch Break</span>
                <span className="text-sm text-gray-900">
                  {profile.lunchWindow.enabled 
                    ? `${profile.lunchWindow.start} - ${profile.lunchWindow.end}`
                    : 'No lunch break set'
                  }
                </span>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-700 mb-3">Meeting Types Available</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Quick 30min</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Standard 1hr</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Coffee className="h-4 w-4" />
                    <span>Coffee Chat</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Utensils className="h-4 w-4" />
                    <span>Lunch Meeting</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}