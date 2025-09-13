'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Clock, Coffee, Utensils, Moon, Zap, Users, MapPin, Video, Plus, UserCheck } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge } from '@/src/components/ui';
import { Layout } from '@/src/components/layout/Layout';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

// AI Suggestion Types
const aiSuggestions = [
  {
    id: 'first-30min',
    title: 'First 30-min',
    description: 'Next available 30-minute slot',
    icon: Clock,
    color: 'bg-blue-500 hover:bg-blue-600',
    duration: 30,
  },
  {
    id: 'first-1hour',
    title: 'First 1-hour',
    description: 'Next available 1-hour slot',
    icon: Zap,
    color: 'bg-green-500 hover:bg-green-600',
    duration: 60,
  },
  {
    id: 'morning-coffee',
    title: 'Morning Coffee',
    description: '9-11 AM coffee meeting',
    icon: Coffee,
    color: 'bg-orange-500 hover:bg-orange-600',
    duration: 30,
    timeRange: { start: 9, end: 11 },
  },
  {
    id: 'lunch',
    title: 'Lunch',
    description: '12-2 PM lunch meeting',
    icon: Utensils,
    color: 'bg-yellow-500 hover:bg-yellow-600',
    duration: 60,
    timeRange: { start: 12, end: 14 },
  },
  {
    id: 'dinner',
    title: 'Dinner',
    description: '6-8 PM dinner meeting',
    icon: Moon,
    color: 'bg-purple-500 hover:bg-purple-600',
    duration: 90,
    timeRange: { start: 18, end: 20 },
  },
];

// Mock calendar data for 3-day overlay
const generateMockCalendarData = () => {
  const today = new Date();
  const days = [];
  
  for (let i = 0; i < 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const events = [];
    // Generate some mock events
    if (i === 0) { // Today
      events.push(
        { start: 9, end: 10, type: 'busy', title: 'Team Standup' },
        { start: 11, end: 12, type: 'yours', title: 'Project Review' },
        { start: 14, end: 15.5, type: 'busy', title: 'Client Call' },
        { start: 16, end: 17, type: 'mutual', title: 'Available' }
      );
    } else if (i === 1) { // Tomorrow
      events.push(
        { start: 10, end: 11, type: 'yours', title: 'Design Review' },
        { start: 13, end: 14, type: 'busy', title: 'Lunch Meeting' },
        { start: 15, end: 16, type: 'mutual', title: 'Available' }
      );
    } else { // Day after
      events.push(
        { start: 9, end: 10, type: 'mutual', title: 'Available' },
        { start: 11, end: 12, type: 'busy', title: 'All Hands' },
        { start: 14, end: 15, type: 'mutual', title: 'Available' }
      );
    }
    
    days.push({
      date,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate(),
      events,
    });
  }
  
  return days;
};

const timeSlots = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 8; // 8 AM to 7 PM
  return {
    hour,
    label: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`,
  };
});

export default function SchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectedWith = searchParams.get('with');
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [connectedUser, setConnectedUser] = useState<{ name: string; email: string; avatar: string } | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ day: number; hour: number } | null>(null);
  const [meetingDetails, setMeetingDetails] = useState({
    title: '',
    duration: 30,
    location: 'Google Meet',
    attendees: '',
    description: '',
  });
  const [calendarData, setCalendarData] = useState(generateMockCalendarData());
  const [isBooking, setIsBooking] = useState(false);
  const [durationLocked, setDurationLocked] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [aiSuggestionsData, setAiSuggestionsData] = useState<any[]>([]);

  // Function to fetch mutual availability
  const fetchMutualAvailability = async () => {
    if (!connectedWith || !session?.user?.email) return;

    setLoadingAvailability(true);
    try {
      const today = new Date();
      const threeDaysLater = new Date();
      threeDaysLater.setDate(today.getDate() + 3);

      const response = await fetch('/api/availability/mutual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participants: [session.user.email, `${connectedWith}@example.com`],
          dateRange: {
            from: today.toISOString(),
            to: threeDaysLater.toISOString()
          },
          duration: 30
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setAiSuggestionsData(result.suggestions);
        // Update calendar data with mutual availability
        // This would integrate the real availability data
      }
    } catch (error) {
      console.error('Error fetching mutual availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    // Load connected user data if 'with' parameter exists
    if (connectedWith) {
      const mockConnectedUser = {
        name: connectedWith.charAt(0).toUpperCase() + connectedWith.slice(1),
        email: `${connectedWith}@example.com`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${connectedWith}`,
      };
      setConnectedUser(mockConnectedUser);
      
      // Fetch mutual availability when connected
      fetchMutualAvailability();
    }

    // Refresh calendar data periodically
    const interval = setInterval(() => {
      setCalendarData(generateMockCalendarData());
      if (connectedWith) {
        fetchMutualAvailability();
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [connectedWith, session]);

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

  const handleSuggestionClick = (suggestion: typeof aiSuggestions[0]) => {
    setSelectedSuggestion(suggestion.id);
    setMeetingDetails(prev => ({ ...prev, duration: suggestion.duration }));
    setDurationLocked(true);
    
    // Find the best available slot based on suggestion
    const bestSlot = findBestSlot(suggestion);
    if (bestSlot) {
      setSelectedTimeSlot(bestSlot);
    }
    
    toast.success(`Selected ${suggestion.title} - ${suggestion.duration} minutes`);
  };

  const findBestSlot = (suggestion: typeof aiSuggestions[0]) => {
    // Simple algorithm to find the best available slot
    for (let dayIndex = 0; dayIndex < calendarData.length; dayIndex++) {
      const day = calendarData[dayIndex];
      
      for (let hour = 8; hour < 19; hour++) {
        // Check if this slot matches the suggestion criteria
        if (suggestion.timeRange) {
          if (hour < suggestion.timeRange.start || hour > suggestion.timeRange.end) {
            continue;
          }
        }
        
        // Check if the slot is available (mutual or no conflict)
        const hasConflict = day.events.some(event => 
          hour >= event.start && hour < event.end && event.type !== 'mutual'
        );
        
        if (!hasConflict) {
          return { day: dayIndex, hour };
        }
      }
    }
    
    return null;
  };

  const handleTimeSlotClick = (dayIndex: number, hour: number) => {
    const day = calendarData[dayIndex];
    const hasConflict = day.events.some(event => 
      hour >= event.start && hour < event.end && event.type !== 'mutual'
    );
    
    if (hasConflict) {
      toast.error('This time slot is not available');
      return;
    }
    
    setSelectedTimeSlot({ day: dayIndex, hour });
    setSelectedSuggestion(null); // Clear AI suggestion when manually selecting
  };

  const handleBookMeeting = async () => {
    if (!selectedTimeSlot || !meetingDetails.title) {
      toast.error('Please select a time slot and enter meeting details');
      return;
    }
    
    setIsBooking(true);
    try {
      const selectedDay = calendarData[selectedTimeSlot.day];
      const startTime = new Date(selectedDay.date);
      startTime.setHours(selectedTimeSlot.hour, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + meetingDetails.duration);
      
      // Prepare participants list
      const participants = [session?.user?.email];
      if (connectedUser) {
        participants.push(connectedUser.email);
      }
      if (meetingDetails.attendees) {
        const additionalAttendees = meetingDetails.attendees.split(',').map(email => email.trim());
        participants.push(...additionalAttendees);
      }
      
      // Call the booking API
      const response = await fetch('/api/meetings/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slot: {
            start: startTime.toISOString(),
            end: endTime.toISOString()
          },
          participants: participants.filter(Boolean),
          title: meetingDetails.title,
          description: meetingDetails.description,
          location: meetingDetails.location,
          method: connectedUser ? 'calcom' : 'deeplink', // Use Cal.com if connected, otherwise deep link
          duration: meetingDetails.duration
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const meetingTime = `${selectedTimeSlot.hour}:00`;
        toast.success(`Meeting "${meetingDetails.title}" booked for ${selectedDay.dayName} at ${meetingTime}!`);
        
        // If deep link was generated, open it
        if (result.deepLink) {
          window.open(result.deepLink, '_blank');
        }
        
        // Reset form
        setSelectedTimeSlot(null);
        setSelectedSuggestion(null);
        setMeetingDetails({
          title: '',
          duration: 30,
          location: 'Google Meet',
          attendees: '',
          description: '',
        });
        setDurationLocked(false);
      } else {
        throw new Error(result.message || 'Failed to book meeting');
      }
      
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to book meeting. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'busy': return 'bg-red-500';
      case 'yours': return 'bg-yellow-500';
      case 'mutual': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Schedule a Meeting
          </h1>
          {connectedUser ? (
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full">
                <UserCheck className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">Connected with</span>
                <img
                  src={connectedUser.avatar}
                  alt={connectedUser.name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-green-900 font-semibold">{connectedUser.name}</span>
              </div>
            </div>
          ) : null}
          <p className="text-gray-600">
            {connectedUser 
              ? `Find mutual availability with ${connectedUser.name} using AI suggestions or manual selection`
              : 'Use AI suggestions or manually select a time slot from the 3-day calendar view'
            }
          </p>
        </div>

        {/* AI Suggestion Chips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>AI Suggestions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {aiSuggestions.map((suggestion) => {
                const Icon = suggestion.icon;
                const isSelected = selectedSuggestion === suggestion.id;
                
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      'p-4 rounded-lg text-white transition-all duration-200 hover:scale-105',
                      suggestion.color,
                      isSelected && 'ring-4 ring-blue-300 scale-105'
                    )}
                  >
                    <Icon className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">{suggestion.title}</div>
                    <div className="text-xs opacity-90 mt-1">
                      {suggestion.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 3-Day Calendar Overlay */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>3-Day Calendar View</span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Busy</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Your Events</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Available</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {/* Time column */}
              <div className="space-y-2">
                <div className="h-12 flex items-center justify-center font-medium text-gray-600">
                  Time
                </div>
                {timeSlots.map((slot) => (
                  <div key={slot.hour} className="h-12 flex items-center justify-center text-sm text-gray-600">
                    {slot.label}
                  </div>
                ))}
              </div>
              
              {/* Day columns */}
              {calendarData.map((day, dayIndex) => (
                <div key={dayIndex} className="space-y-2">
                  <div className="h-12 flex flex-col items-center justify-center bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{day.dayName}</div>
                    <div className="text-sm text-gray-600">{day.dayNumber}</div>
                  </div>
                  
                  {timeSlots.map((slot) => {
                    const hasEvent = day.events.find(event => 
                      slot.hour >= event.start && slot.hour < event.end
                    );
                    
                    const isSelected = selectedTimeSlot?.day === dayIndex && selectedTimeSlot?.hour === slot.hour;
                    const isAvailable = !hasEvent || hasEvent.type === 'mutual';
                    
                    return (
                      <button
                        key={slot.hour}
                        onClick={() => handleTimeSlotClick(dayIndex, slot.hour)}
                        disabled={!isAvailable}
                        className={cn(
                          'h-12 w-full rounded border-2 transition-all duration-200 text-xs font-medium',
                          isSelected && 'ring-4 ring-blue-300 scale-105',
                          hasEvent ? (
                            `${getEventColor(hasEvent.type)} text-white border-transparent`
                          ) : (
                            'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          ),
                          !isAvailable && 'cursor-not-allowed opacity-60'
                        )}
                      >
                        {hasEvent ? hasEvent.title : 'Available'}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meeting Details Form */}
        {(selectedTimeSlot || selectedSuggestion) && (
          <Card>
            <CardHeader>
              <CardTitle>Meeting Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Title *
                  </label>
                  <Input
                    value={meetingDetails.title}
                    onChange={(e) => setMeetingDetails(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter meeting title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <Select
                    value={meetingDetails.duration.toString()}
                    onValueChange={(value) => setMeetingDetails(prev => ({ ...prev, duration: parseInt(value) }))}
                    disabled={durationLocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  {durationLocked && (
                    <p className="text-xs text-blue-600 mt-1">
                      Duration locked by AI suggestion
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <Select
                    value={meetingDetails.location}
                    onValueChange={(value) => setMeetingDetails(prev => ({ ...prev, location: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Google Meet">Google Meet</SelectItem>
                      <SelectItem value="Zoom">Zoom</SelectItem>
                      <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                      <SelectItem value="In Person">In Person</SelectItem>
                      <SelectItem value="Phone Call">Phone Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attendees (emails)
                  </label>
                  <Input
                    value={meetingDetails.attendees}
                    onChange={(e) => setMeetingDetails(prev => ({ ...prev, attendees: e.target.value }))}
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={meetingDetails.description}
                  onChange={(e) => setMeetingDetails(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Meeting agenda or description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {selectedTimeSlot && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Selected Time Slot</h4>
                  <p className="text-blue-800">
                    {calendarData[selectedTimeSlot.day].date.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })} at {selectedTimeSlot.hour}:00
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTimeSlot(null);
                    setSelectedSuggestion(null);
                    setDurationLocked(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBookMeeting}
                  loading={isBooking}
                  disabled={!meetingDetails.title}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Meeting
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}