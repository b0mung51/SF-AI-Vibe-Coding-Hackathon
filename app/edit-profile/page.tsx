'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { getUserCalendars, addCalendar, updateCalendar, deleteCalendar, getDefaultSchedulableHours } from '@/app/lib/db';
import { createCalcomManagedUser } from '@/app/lib/calcom';
import type { Calendar, SchedulableHours } from '@/app/types';

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

export default function CalendarsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isAddingCalendar, setIsAddingCalendar] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [expandedCalendar, setExpandedCalendar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCalendarConnect, setShowCalendarConnect] = useState(false);
  const [currentManagedUserId, setCurrentManagedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (user) {
      loadCalendars();
    }
  }, [user, loading, router]);

  const loadCalendars = async () => {
    if (!user) return;
    try {
      const userCalendars = await getUserCalendars(user.id);
      setCalendars(userCalendars);
      if (userCalendars.length > 0) {
        setExpandedCalendar(userCalendars[0].id);
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
    }
  };

  const handleAddCalendar = async () => {
    setIsAddingCalendar(true);
    try {
      console.log('Creating Cal.com managed user...');

      const calcomUser = await createCalcomManagedUser(
        user!.email,
        user!.displayName || 'User'
      );

      console.log('Cal.com managed user created:', calcomUser);

      const isFirstCalendar = calendars.length === 0;
      const category = isFirstCalendar ? 'personal' : 'work';

      const newCalendar: Omit<Calendar, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user!.id,
        provider: 'calcom',
        email: user!.email,
        category,
        isDefault: isFirstCalendar || (category === 'work' && !calendars.find(c => c.category === 'work' && c.isDefault)),
        schedulableHours: getDefaultSchedulableHours(category),
        calcomIntegrationId: calcomUser.managedUserId,
      };

      const calendarId = await addCalendar(newCalendar);
      const createdCalendar = { ...newCalendar, id: calendarId, createdAt: new Date(), updatedAt: new Date() };

      setCalendars([...calendars, createdCalendar]);
      setExpandedCalendar(calendarId);

      // Show calendar connection interface
      setCurrentManagedUserId(calcomUser.managedUserId);
      setShowCalendarConnect(true);
    } catch (error) {
      console.error('Error creating Cal.com managed user:', error);
      alert('Cal.com integration error: ' + (error as Error).message);
    } finally {
      setIsAddingCalendar(false);
    }
  };

  const handleCategoryChange = (calendarId: string, category: 'work' | 'personal') => {
    setCalendars(calendars.map(cal => {
      if (cal.id === calendarId) {
        const updatedCal = { ...cal, category };
        const hasOtherDefault = calendars.some(c => c.id !== calendarId && c.category === category && c.isDefault);
        if (!hasOtherDefault) {
          updatedCal.isDefault = true;
        }
        return updatedCal;
      }
      return cal;
    }));
    setIsDirty(true);
  };

  const handleDefaultToggle = (calendarId: string) => {
    setCalendars(calendars.map(cal => {
      return { ...cal, isDefault: cal.id === calendarId };
    }));
    setIsDirty(true);
  };

  const handleTimeChange = (calendarId: string, day: keyof SchedulableHours, slotIndex: number, field: 'start' | 'end', value: string) => {
    setCalendars(calendars.map(cal => {
      if (cal.id === calendarId) {
        const updatedHours = { ...cal.schedulableHours };
        if (updatedHours[day].length === 0) {
          updatedHours[day] = [{ start: '09:00', end: '17:00' }];
        }
        if (!updatedHours[day][slotIndex]) {
          updatedHours[day][slotIndex] = { start: '09:00', end: '17:00' };
        }
        updatedHours[day][slotIndex] = {
          ...updatedHours[day][slotIndex],
          [field]: value
        };
        return { ...cal, schedulableHours: updatedHours };
      }
      return cal;
    }));
    setIsDirty(true);
  };

  const handleAddTimeSlot = (calendarId: string, day: keyof SchedulableHours) => {
    setCalendars(calendars.map(cal => {
      if (cal.id === calendarId) {
        const updatedHours = { ...cal.schedulableHours };
        updatedHours[day] = [...updatedHours[day], { start: '09:00', end: '17:00' }];
        return { ...cal, schedulableHours: updatedHours };
      }
      return cal;
    }));
    setIsDirty(true);
  };

  const handleRemoveTimeSlot = (calendarId: string, day: keyof SchedulableHours, slotIndex: number) => {
    setCalendars(calendars.map(cal => {
      if (cal.id === calendarId) {
        const updatedHours = { ...cal.schedulableHours };
        updatedHours[day] = updatedHours[day].filter((_, index) => index !== slotIndex);
        return { ...cal, schedulableHours: updatedHours };
      }
      return cal;
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const calendar of calendars) {
        await updateCalendar(calendar.id, {
          category: calendar.category,
          isDefault: calendar.isDefault,
          schedulableHours: calendar.schedulableHours,
        });
      }
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving calendars:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectCalendar = async (calendarId: string) => {
    if (!confirm('Are you sure you want to disconnect this calendar? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteCalendar(calendarId);
      setCalendars(calendars.filter(cal => cal.id !== calendarId));

      // If the expanded calendar was the one we deleted, close it
      if (expandedCalendar === calendarId) {
        setExpandedCalendar(null);
      }

      alert('Calendar disconnected successfully.');
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      alert('Failed to disconnect calendar. Please try again.');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse">
          <div className="w-16 h-16 gradient-icon rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
          </div>
          {/* Inline Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-4 py-2 gradient-primary text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Calendar List */}
        <div className="space-y-4 mb-6">
          {calendars.map((calendar) => (
            <div key={calendar.id} className="bg-white rounded-xl shadow-sm">
              {/* Calendar Header */}
              <button
                onClick={() => setExpandedCalendar(expandedCalendar === calendar.id ? null : calendar.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 gradient-icon rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{calendar.email}</p>
                    <p className="text-sm text-gray-500">
                      {calendar.category === 'work' ? 'Work' : 'Personal'}
                      {calendar.isDefault && ' • Default'}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${expandedCalendar === calendar.id ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Calendar Settings (Expanded) */}
              {expandedCalendar === calendar.id && (
                <div className="px-4 pb-6 border-t border-gray-100">
                  {/* Calendar Type Selection */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Calendar Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCategoryChange(calendar.id, 'work')}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                          calendar.category === 'work'
                            ? 'bg-gray-100 border-gray-300 text-gray-500'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Work
                      </button>
                      <button
                        onClick={() => handleCategoryChange(calendar.id, 'personal')}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                          calendar.category === 'personal'
                            ? 'bg-gray-100 border-gray-300 text-gray-500'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Personal
                      </button>
                    </div>
                  </div>

                  {/* Default Toggle */}
                  <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Default</label>
                      <p className="text-xs text-gray-500">This calendar will be used for new meetings</p>
                    </div>
                    <button
                      onClick={() => handleDefaultToggle(calendar.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        calendar.isDefault ? 'gradient-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          calendar.isDefault ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Available Hours Per Day */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Available Hours</label>
                    <div className="space-y-4">
                      {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map(day => (
                        <div key={day} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-medium text-gray-700 capitalize">
                              {day}
                            </div>
                            <button
                              onClick={() => handleAddTimeSlot(calendar.id, day)}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {calendar.schedulableHours[day]?.length > 0 ? (
                              calendar.schedulableHours[day].map((slot, slotIndex) => (
                                <div key={slotIndex} className="flex gap-2 items-center">
                                  <select
                                    value={slot.start}
                                    onChange={(e) => handleTimeChange(calendar.id, day, slotIndex, 'start', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                  >
                                    {TIME_OPTIONS.map(time => (
                                      <option key={time} value={time}>{time}</option>
                                    ))}
                                  </select>
                                  <span className="text-gray-400 text-sm">to</span>
                                  <select
                                    value={slot.end}
                                    onChange={(e) => handleTimeChange(calendar.id, day, slotIndex, 'end', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                  >
                                    {TIME_OPTIONS.map(time => (
                                      <option key={time} value={time}>{time}</option>
                                    ))}
                                  </select>
                                  {calendar.schedulableHours[day].length > 1 && (
                                    <button
                                      onClick={() => handleRemoveTimeSlot(calendar.id, day, slotIndex)}
                                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-500 italic">No available hours</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Disconnect Calendar */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => handleDisconnectCalendar(calendar.id)}
                      className="w-full py-3 px-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium hover:bg-red-100 hover:border-red-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v3M4 7h16" />
                      </svg>
                      Disconnect Calendar
                    </button>
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      This will permanently remove this calendar connection from your account.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Calendar Button */}
        <button
          onClick={handleAddCalendar}
          disabled={isAddingCalendar}
          className="w-full py-4 px-6 bg-white border-2 border-dashed border-gray-300 rounded-xl text-gray-600 font-medium hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isAddingCalendar ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Adding calendar...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Calendar
            </>
          )}
        </button>

        {/* Calendar Connection Modal */}
        {showCalendarConnect && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Connect Your Calendars</h3>
                <button
                  onClick={() => setShowCalendarConnect(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Connect your Google Calendar, Outlook, and other calendars to enable scheduling with Cal.com.
              </p>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Google Calendar</h4>
                  <button
                    onClick={() => {
                      // Redirect to Cal.com Google Calendar connection
                      const calcomUrl = `https://app.cal.com/apps/google-calendar?user=${currentManagedUserId}`;
                      window.open(calcomUrl, '_blank');
                    }}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Connect Google Calendar
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Outlook Calendar</h4>
                  <button
                    onClick={() => {
                      // Redirect to Cal.com Outlook Calendar connection
                      const calcomUrl = `https://app.cal.com/apps/outlook-calendar?user=${currentManagedUserId}`;
                      window.open(calcomUrl, '_blank');
                    }}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 13.15l-7.3 7.3a.75.75 0 01-1.06 0l-3.428-3.428a.75.75 0 111.06-1.06l2.898 2.897 6.77-6.769a.75.75 0 111.06 1.06z" />
                    </svg>
                    Connect Outlook Calendar
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Apple iCloud Calendar</h4>
                  <button
                    onClick={() => {
                      // Redirect to Cal.com Apple Calendar connection
                      const calcomUrl = `https://app.cal.com/apps/apple-calendar?user=${currentManagedUserId}`;
                      window.open(calcomUrl, '_blank');
                    }}
                    className="w-full py-3 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                    </svg>
                    Connect Apple Calendar
                  </button>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Clicking these buttons will open Cal.com in a new tab where you can connect your calendars. After connecting, close the tab and you'll be able to use your calendars for scheduling.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowCalendarConnect(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => setShowCalendarConnect(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}