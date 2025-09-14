'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { getUserCalendars, addCalendar, updateCalendar, getDefaultSchedulableHours } from '@/app/lib/db';
import { createCalcomManagedUser } from '@/app/lib/calcom';
import type { Calendar, SchedulableHours, TimeWindow } from '@/app/types';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAYS_DISPLAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

      // Create managed user in Cal.com using platform API
      const calcomUser = await createCalcomManagedUser(
        user!.email,
        user!.displayName || 'User'
      );

      console.log('Cal.com managed user created:', calcomUser);

      // Create a calendar entry in our database
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

      alert('Cal.com calendar successfully connected!');
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
        // If this is the only calendar of this category, make it default
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
    const calendar = calendars.find(c => c.id === calendarId);
    if (!calendar) return;

    setCalendars(calendars.map(cal => {
      if (cal.category === calendar.category) {
        return { ...cal, isDefault: cal.id === calendarId };
      }
      return cal;
    }));
    setIsDirty(true);
  };

  const handleTimeWindowChange = (calendarId: string, day: typeof DAYS[number], index: number, field: 'start' | 'end', value: string) => {
    setCalendars(calendars.map(cal => {
      if (cal.id === calendarId) {
        const updatedHours = { ...cal.schedulableHours };
        updatedHours[day][index] = { ...updatedHours[day][index], [field]: value };
        return { ...cal, schedulableHours: updatedHours };
      }
      return cal;
    }));
    setIsDirty(true);
  };

  const handleAddTimeWindow = (calendarId: string, day: typeof DAYS[number]) => {
    setCalendars(calendars.map(cal => {
      if (cal.id === calendarId) {
        const updatedHours = { ...cal.schedulableHours };
        const lastWindow = updatedHours[day][updatedHours[day].length - 1];
        const newStart = lastWindow ? lastWindow.end : '09:00';
        const newEnd = '17:00';
        updatedHours[day] = [...updatedHours[day], { start: newStart, end: newEnd }];
        return { ...cal, schedulableHours: updatedHours };
      }
      return cal;
    }));
    setIsDirty(true);
  };

  const handleRemoveTimeWindow = (calendarId: string, day: typeof DAYS[number], index: number) => {
    setCalendars(calendars.map(cal => {
      if (cal.id === calendarId) {
        const updatedHours = { ...cal.schedulableHours };
        updatedHours[day] = updatedHours[day].filter((_, i) => i !== index);
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
      <div className="max-w-4xl mx-auto px-4 py-8">
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
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="px-4 pb-4 border-t border-gray-100">
                  {/* Category Selection */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCategoryChange(calendar.id, 'work')}
                        className={`flex-1 py-2 px-4 rounded-lg border ${
                          calendar.category === 'work'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Work
                      </button>
                      <button
                        onClick={() => handleCategoryChange(calendar.id, 'personal')}
                        className={`flex-1 py-2 px-4 rounded-lg border ${
                          calendar.category === 'personal'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Personal
                      </button>
                    </div>
                  </div>

                  {/* Default Toggle */}
                  <div className="mt-4 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Make default for this category</label>
                    <button
                      onClick={() => handleDefaultToggle(calendar.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        calendar.isDefault ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          calendar.isDefault ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Schedulable Hours */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Schedulable Hours</label>
                    <div className="space-y-2">
                      {DAYS.map((day, dayIndex) => (
                        <div key={day} className="flex items-start gap-2">
                          <span className="w-12 text-sm text-gray-600 mt-2">{DAYS_DISPLAY[dayIndex]}</span>
                          <div className="flex-1 space-y-2">
                            {calendar.schedulableHours[day].length === 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Off</span>
                                <button
                                  onClick={() => handleAddTimeWindow(calendar.id, day)}
                                  className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                  Add window
                                </button>
                              </div>
                            ) : (
                              calendar.schedulableHours[day].map((window, windowIndex) => (
                                <div key={windowIndex} className="flex items-center gap-2">
                                  <select
                                    value={window.start}
                                    onChange={(e) => handleTimeWindowChange(calendar.id, day, windowIndex, 'start', e.target.value)}
                                    className="px-2 py-1 border border-gray-200 rounded text-sm"
                                  >
                                    {TIME_OPTIONS.map(time => (
                                      <option key={time} value={time}>{time}</option>
                                    ))}
                                  </select>
                                  <span className="text-sm text-gray-500">to</span>
                                  <select
                                    value={window.end}
                                    onChange={(e) => handleTimeWindowChange(calendar.id, day, windowIndex, 'end', e.target.value)}
                                    className="px-2 py-1 border border-gray-200 rounded text-sm"
                                  >
                                    {TIME_OPTIONS.map(time => (
                                      <option key={time} value={time}>{time}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleRemoveTimeWindow(calendar.id, day, windowIndex)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                  {windowIndex === calendar.schedulableHours[day].length - 1 && calendar.schedulableHours[day].length < 2 && (
                                    <button
                                      onClick={() => handleAddTimeWindow(calendar.id, day)}
                                      className="text-sm text-blue-600 hover:text-blue-700"
                                    >
                                      Add
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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
          className="w-full py-3 px-4 bg-white border-2 border-dashed border-gray-300 rounded-xl text-gray-600 font-medium hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAddingCalendar ? 'Adding calendar...' : '+ Add calendar'}
        </button>

        {/* Save Button */}
        {isDirty && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="max-w-4xl mx-auto">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}