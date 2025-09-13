import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { config as authOptions } from '@/auth';

interface MutualAvailabilityRequest {
  participants: string[];
  dateRange: {
    from: string; // ISO 8601
    to: string;   // ISO 8601
  };
  duration: number; // minutes
  preferences?: {
    timeRange?: { start: number; end: number }; // hours in 24h format
    excludeLunch?: boolean;
  };
}

interface TimeSlot {
  start: string; // ISO 8601
  end: string;   // ISO 8601
  available: boolean;
  participants: string[];
  type: 'mutual' | 'busy' | 'yours';
  title?: string;
}

interface MutualAvailabilityResponse {
  success: boolean;
  mutualSlots: TimeSlot[];
  individualAvailability: {
    [userId: string]: TimeSlot[];
  };
  suggestions: {
    type: string;
    slot: TimeSlot;
    confidence: number;
  }[];
}

// Helper function to generate mock availability data
function generateMockAvailability(userId: string, dateRange: { from: string; to: string }): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startDate = new Date(dateRange.from);
  const endDate = new Date(dateRange.to);
  
  // Generate slots for each day in the range
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    // Skip weekends for this mock
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Generate hourly slots from 9 AM to 6 PM
    for (let hour = 9; hour < 18; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      
      // Mock some busy slots
      const isBusy = Math.random() < 0.3; // 30% chance of being busy
      const isLunch = hour === 12; // Lunch hour
      
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: !isBusy && !isLunch,
        participants: [userId],
        type: isBusy ? 'busy' : (isLunch ? 'busy' : 'mutual'),
        title: isBusy ? 'Busy' : (isLunch ? 'Lunch Break' : undefined)
      });
    }
  }
  
  return slots;
}

// Helper function to find mutual availability
function findMutualSlots(availabilityData: { [userId: string]: TimeSlot[] }, duration: number): TimeSlot[] {
  const userIds = Object.keys(availabilityData);
  if (userIds.length < 2) return [];
  
  const mutualSlots: TimeSlot[] = [];
  const firstUserSlots = availabilityData[userIds[0]];
  
  firstUserSlots.forEach(slot => {
    if (!slot.available) return;
    
    // Check if all other users are available at this time
    const isAvailableForAll = userIds.slice(1).every(userId => {
      const userSlots = availabilityData[userId];
      return userSlots.some(userSlot => 
        userSlot.start === slot.start && 
        userSlot.end === slot.end && 
        userSlot.available
      );
    });
    
    if (isAvailableForAll) {
      mutualSlots.push({
        ...slot,
        participants: userIds,
        type: 'mutual'
      });
    }
  });
  
  return mutualSlots;
}

// Helper function to generate AI suggestions
function generateAISuggestions(mutualSlots: TimeSlot[]): { type: string; slot: TimeSlot; confidence: number }[] {
  const suggestions = [];
  
  // First 30-min suggestion
  const first30min = mutualSlots.find(slot => {
    const slotDate = new Date(slot.start);
    const duration = new Date(slot.end).getTime() - slotDate.getTime();
    return duration >= 30 * 60 * 1000; // 30 minutes
  });
  
  if (first30min) {
    suggestions.push({
      type: 'first_30min',
      slot: first30min,
      confidence: 0.95
    });
  }
  
  // First 1-hour suggestion
  const first1hour = mutualSlots.find(slot => {
    const slotDate = new Date(slot.start);
    const duration = new Date(slot.end).getTime() - slotDate.getTime();
    return duration >= 60 * 60 * 1000; // 60 minutes
  });
  
  if (first1hour) {
    suggestions.push({
      type: 'first_1hour',
      slot: first1hour,
      confidence: 0.90
    });
  }
  
  // Morning coffee (9-11 AM)
  const morningCoffee = mutualSlots.find(slot => {
    const hour = new Date(slot.start).getHours();
    return hour >= 9 && hour <= 11;
  });
  
  if (morningCoffee) {
    suggestions.push({
      type: 'morning_coffee',
      slot: morningCoffee,
      confidence: 0.85
    });
  }
  
  // Lunch (12-2 PM)
  const lunch = mutualSlots.find(slot => {
    const hour = new Date(slot.start).getHours();
    return hour >= 12 && hour <= 14;
  });
  
  if (lunch) {
    suggestions.push({
      type: 'lunch',
      slot: lunch,
      confidence: 0.80
    });
  }
  
  // Dinner (6-8 PM)
  const dinner = mutualSlots.find(slot => {
    const hour = new Date(slot.start).getHours();
    return hour >= 18 && hour <= 20;
  });
  
  if (dinner) {
    suggestions.push({
      type: 'dinner',
      slot: dinner,
      confidence: 0.75
    });
  }
  
  return suggestions;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: MutualAvailabilityRequest = await request.json();
    const { participants, dateRange, duration, preferences } = body;

    // Validate required fields
    if (!participants || participants.length < 2) {
      return NextResponse.json(
        { success: false, message: 'At least 2 participants are required' },
        { status: 400 }
      );
    }

    if (!dateRange || !dateRange.from || !dateRange.to) {
      return NextResponse.json(
        { success: false, message: 'Date range is required' },
        { status: 400 }
      );
    }

    // Mock delay to simulate Cal.com API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock availability data for each participant
    const individualAvailability: { [userId: string]: TimeSlot[] } = {};
    
    participants.forEach(userId => {
      individualAvailability[userId] = generateMockAvailability(userId, dateRange);
    });

    // Find mutual availability
    const mutualSlots = findMutualSlots(individualAvailability, duration);

    // Generate AI suggestions
    const suggestions = generateAISuggestions(mutualSlots);

    const response: MutualAvailabilityResponse = {
      success: true,
      mutualSlots,
      individualAvailability,
      suggestions
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Mutual availability error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch mutual availability. Please try again.' 
      },
      { status: 500 }
    );
  }
}