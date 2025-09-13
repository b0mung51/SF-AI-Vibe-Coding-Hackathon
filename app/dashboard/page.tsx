'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, Settings, Plus, Share2, Copy, ExternalLink } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, QRCodeGenerator, MultiUserScheduler } from '@/src/components/ui';
import { Layout } from '@/src/components/layout/Layout';
import { useOnboardingStore } from '@/src/store';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isCompleted } = useOnboardingStore();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showMultiUserScheduler, setShowMultiUserScheduler] = useState(false);

  // Generate shareable URL based on user email or ID
  const shareableUrl = session?.user?.email 
    ? `${window.location.origin}/profile/${encodeURIComponent(session.user.email.split('@')[0])}`
    : '';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated' && !isCompleted) {
      router.push('/onboarding');
      return;
    }
  }, [status, isCompleted, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || !isCompleted) {
    return null;
  }

  const quickActions = [
    {
      title: 'Schedule Meeting',
      description: 'Create a new meeting with AI suggestions',
      icon: Plus,
      href: '/schedule',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Multi-User Meeting',
      description: 'Find mutual availability for multiple people',
      icon: Users,
      action: 'multi-user',
      color: 'bg-indigo-500 hover:bg-indigo-600',
    },
    {
      title: 'View Calendar',
      description: 'See your upcoming meetings and availability',
      icon: Calendar,
      href: '/calendar',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'Manage Profile',
      description: 'Update your settings and preferences',
      icon: Settings,
      href: '/profile',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  const recentMeetings = [
    {
      id: 1,
      title: 'Team Standup',
      time: '9:00 AM - 9:30 AM',
      date: 'Today',
      attendees: 5,
      status: 'upcoming',
    },
    {
      id: 2,
      title: 'Client Review',
      time: '2:00 PM - 3:00 PM',
      date: 'Today',
      attendees: 3,
      status: 'upcoming',
    },
    {
      id: 3,
      title: 'Project Planning',
      time: '10:00 AM - 11:00 AM',
      date: 'Tomorrow',
      attendees: 4,
      status: 'scheduled',
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {session.user?.name}!
          </h1>
          <p className="text-blue-100">
            Ready to schedule your next meeting? Let's make it efficient.
          </p>
        </div>

        {/* Share Profile Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Share Your Profile</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shareable Link Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Shareable Link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Share this link with others so they can easily schedule meetings with you.
                </p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <code className="flex-1 text-sm text-gray-800 break-all">
                    {shareableUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyUrl}
                    className="flex items-center gap-1 shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowQR(!showQR)}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {showQR ? 'Hide QR Code' : 'Show QR Code'}
                  </Button>
                  <Button
                    onClick={() => window.open(shareableUrl, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Preview Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR Code Card */}
            {showQR && (
              <div className="flex justify-center lg:justify-start">
                <QRCodeGenerator
                  value={shareableUrl}
                  title="Profile QR Code"
                  size={180}
                />
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card key={action.title} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${action.color} text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {action.description}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (action.action === 'multi-user') {
                              setShowMultiUserScheduler(true);
                            } else if (action.href) {
                              router.push(action.href);
                            }
                          }}
                        >
                          Get Started
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Meetings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Meetings</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {recentMeetings.map((meeting) => (
                  <div key={meeting.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {meeting.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{meeting.time}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{meeting.date}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{meeting.attendees} attendees</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          meeting.status === 'upcoming'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {meeting.status}
                        </span>
                        <Button variant="outline" size="sm">
                          Join
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Multi-User Scheduler */}
        {showMultiUserScheduler && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Multi-User Scheduling</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMultiUserScheduler(false)}
              >
                Close
              </Button>
            </div>
            <MultiUserScheduler
              onScheduleMeeting={(slot, users) => {
                console.log('Scheduling meeting:', { slot, users });
                // Here you would typically create the meeting
                alert(`Meeting scheduled for ${new Date(slot.start).toLocaleString()} with ${users.map(u => u.name).join(', ')}`);
              }}
            />
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                  <p className="text-xs text-gray-500">meetings scheduled</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">18.5</p>
                  <p className="text-xs text-gray-500">meeting time</p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Efficiency</p>
                  <p className="text-2xl font-bold text-gray-900">94%</p>
                  <p className="text-xs text-gray-500">on-time rate</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Saved Time</p>
                  <p className="text-2xl font-bold text-gray-900">2.3h</p>
                  <p className="text-xs text-gray-500">with AI suggestions</p>
                </div>
                <Settings className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}