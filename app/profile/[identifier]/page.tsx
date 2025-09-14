'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Calendar, User, Globe, ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  timezone: string;
}



export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [isConnecting, setIsConnecting] = useState(false);

  const identifier = params.identifier as string;

  useEffect(() => {
    if (identifier) {
      fetchUserProfile();
    }
  }, [identifier]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${identifier}`);
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.user);
      } else {
        toast.error('User not found');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };



  const handleConnect = async () => {
    if (!session?.user?.email || !profile) {
      toast.error('Please sign in to connect with this user');
      router.push('/auth/signin');
      return;
    }

    if (session.user.id === profile.id) {
      toast.error('You cannot connect with yourself');
      return;
    }

    try {
      setIsConnecting(true);
      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: profile.id,
          message: `Hi ${profile.name}, I'd like to connect and sync our calendars for easier meeting scheduling.`
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Connection request sent to ${profile.name}!`);
        // Redirect to scheduling interface
        router.push(`/schedule?with=${profile.id}`);
      } else {
        toast.error(data.error || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error('Failed to connect with user');
    } finally {
      setIsConnecting(false);
    }
  };





  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h1>
          <p className="text-gray-600 mb-6">The profile you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/dashboard')} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            onClick={() => router.back()}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center space-x-6 mb-6">
            <div className="relative">
              {profile.avatar ? (
                <img 
                  src={profile.avatar} 
                  alt={profile.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.name}</h1>
              {profile.username && (
                <p className="text-gray-600 mb-2">@{profile.username}</p>
              )}
              <div className="flex items-center text-gray-500">
                <Globe className="h-4 w-4 mr-2" />
                <span>{profile.timezone}</span>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <Button 
                onClick={() => {
                  const params = new URLSearchParams({ with: profile!.id });
                  router.push(`/schedule?${params.toString()}`);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
              <Button 
                onClick={handleConnect}
                disabled={isConnecting}
                variant="outline"
                className="text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Schedule?</h2>
          <p className="text-gray-600 mb-6">
            Click the "Schedule Meeting" button above to view {profile.name}'s availability and book a meeting.
          </p>
          <Button 
            onClick={() => {
              const params = new URLSearchParams({ with: profile!.id });
              router.push(`/schedule?${params.toString()}`);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
          >
            <Calendar className="h-5 w-5 mr-2" />
            Go to Scheduling Page
          </Button>
        </div>
      </div>
    </div>
  );
}