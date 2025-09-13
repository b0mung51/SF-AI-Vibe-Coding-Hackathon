'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Copy, Check, Edit, Save, X, Link as LinkIcon, Settings, User, Clock, Globe } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge } from '@/src/components/ui';
import { Layout } from '@/src/components/layout/Layout';
import { useOnboardingStore } from '@/src/store';
import { toast } from 'sonner';

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return {
    value: `${hour}:00`,
    label: `${hour}:00`,
  };
});

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    workingHours,
    lunchWindow,
    timezone,
    setWorkingHours,
    setLunchWindow,
    setTimezone,
  } = useOnboardingStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [username, setUsername] = useState('john-doe'); // This would come from user data
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  const shareableLink = `https://calconnect.app/${username}`;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Here you would save the settings to your backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setIsEditing(false);
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopiedLink(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleUsernameEdit = () => {
    setTempUsername(username);
    setIsEditingUsername(true);
  };

  const handleUsernameSave = () => {
    setUsername(tempUsername);
    setIsEditingUsername(false);
    toast.success('Username updated!');
  };

  const handleUsernameCancel = () => {
    setTempUsername(username);
    setIsEditingUsername(false);
  };

  const updateWorkingHours = (day: string, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    setWorkingHours({
      ...workingHours,
      [day]: {
        ...workingHours[day as keyof typeof workingHours],
        [field]: value,
      },
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 mt-1">
              Manage your availability and sharing preferences
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  loading={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Settings
              </Button>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <img
                className="h-16 w-16 rounded-full"
                src={session.user?.image || '/default-avatar.png'}
                alt={session.user?.name || 'User'}
              />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {session.user?.name}
                </h3>
                <p className="text-gray-600">{session.user?.email}</p>
                <Badge variant="success" className="mt-1">
                  Google Calendar Connected
                </Badge>
              </div>
            </div>

            {/* Username/Shareable Link */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Shareable Link</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">calconnect.app/</span>
                  {isEditingUsername ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        value={tempUsername}
                        onChange={(e) => setTempUsername(e.target.value)}
                        className="w-32"
                        placeholder="username"
                      />
                      <Button size="sm" onClick={handleUsernameSave}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleUsernameCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-blue-600">{username}</span>
                      <Button size="sm" variant="ghost" onClick={handleUsernameEdit}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <LinkIcon className="h-4 w-4 text-gray-500" />
                  <span className="flex-1 text-sm font-mono text-gray-700">
                    {shareableLink}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                  >
                    {copiedLink ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <p className="text-xs text-gray-500">
                  Share this link with others so they can schedule meetings with you
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Working Hours</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {daysOfWeek.map((day) => {
                const dayData = workingHours[day.key as keyof typeof workingHours];
                return (
                  <div key={day.key} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      <input
                        type="checkbox"
                        checked={dayData.enabled}
                        onChange={(e) => updateWorkingHours(day.key, 'enabled', e.target.checked)}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <span className="font-medium text-gray-900 w-20">{day.label}</span>
                    </div>
                    
                    {dayData.enabled && (
                      <div className="flex items-center space-x-2">
                        <Select
                          value={dayData.start}
                          onValueChange={(value) => updateWorkingHours(day.key, 'start', value)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <span className="text-gray-500">to</span>
                        
                        <Select
                          value={dayData.end}
                          onValueChange={(value) => updateWorkingHours(day.key, 'end', value)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Timezone & Lunch Settings */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Timezone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Timezone</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={timezone} 
                onValueChange={setTimezone}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Lunch Break */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Lunch Break</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={lunchWindow.enabled}
                    onChange={(e) => setLunchWindow({ ...lunchWindow, enabled: e.target.checked })}
                    disabled={!isEditing}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <label className="font-medium text-gray-900">
                    Enable lunch break
                  </label>
                </div>
                
                {lunchWindow.enabled && (
                  <div className="flex items-center space-x-2">
                    <Select
                      value={lunchWindow.start}
                      onValueChange={(value) => setLunchWindow({ ...lunchWindow, start: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time.value} value={time.value}>
                            {time.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <span className="text-gray-500">to</span>
                    
                    <Select
                      value={lunchWindow.end}
                      onValueChange={(value) => setLunchWindow({ ...lunchWindow, end: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time.value} value={time.value}>
                            {time.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">24</div>
                <div className="text-sm text-gray-600">Meetings Scheduled</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">18</div>
                <div className="text-sm text-gray-600">Link Visits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">94%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">2.3h</div>
                <div className="text-sm text-gray-600">Time Saved</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}