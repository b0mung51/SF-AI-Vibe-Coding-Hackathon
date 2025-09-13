import { NextRequest, NextResponse } from 'next/server';
import { getUserCalendars } from '@/app/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { user1Id, user2Id, prompt } = await request.json();

    // Get calendars for both users
    const [user1Calendars, user2Calendars] = await Promise.all([
      getUserCalendars(user1Id),
      getUserCalendars(user2Id),
    ]);

    // Parse the prompt to extract constraints
    const constraints = parsePrompt(prompt);

    // Find slots based on constraints
    const slots = await findSlotsWithConstraints({
      user1Calendars,
      user2Calendars,
      constraints,
    });

    // Generate response message
    const message = generateResponseMessage(slots, constraints);

    return NextResponse.json({
      message,
      slots: slots.slice(0, 3), // Return top 3 slots
    });
  } catch (error) {
    console.error('Error processing freeform request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

interface Constraints {
  timePreference?: 'morning' | 'afternoon' | 'evening';
  avoidDays?: string[];
  specificTimeRange?: { start: string; end: string };
  duration?: number;
  location?: string;
  afterDate?: Date;
}

function parsePrompt(prompt: string): Constraints {
  const constraints: Constraints = {};
  const lowerPrompt = prompt.toLowerCase();

  // Time preferences
  if (lowerPrompt.includes('morning')) {
    constraints.timePreference = 'morning';
  } else if (lowerPrompt.includes('afternoon')) {
    constraints.timePreference = 'afternoon';
  } else if (lowerPrompt.includes('evening')) {
    constraints.timePreference = 'evening';
  }

  // Avoid days
  if (lowerPrompt.includes('avoid')) {
    const avoidDays: string[] = [];
    if (lowerPrompt.includes('tue')) avoidDays.push('tuesday');
    if (lowerPrompt.includes('thu')) avoidDays.push('thursday');
    if (lowerPrompt.includes('weekend')) {
      avoidDays.push('saturday', 'sunday');
    }
    constraints.avoidDays = avoidDays;
  }

  // Duration
  if (lowerPrompt.includes('30 min') || lowerPrompt.includes('30m')) {
    constraints.duration = 30;
  } else if (lowerPrompt.includes('60 min') || lowerPrompt.includes('1h') || lowerPrompt.includes('hour')) {
    constraints.duration = 60;
  } else if (lowerPrompt.includes('90 min') || lowerPrompt.includes('1.5h')) {
    constraints.duration = 90;
  } else {
    constraints.duration = 60; // Default
  }

  // Time range
  const timeMatch = lowerPrompt.match(/between (\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/);
  if (timeMatch) {
    const startHour = parseInt(timeMatch[1]);
    const startMin = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const endHour = parseInt(timeMatch[3]);
    const endMin = timeMatch[4] ? parseInt(timeMatch[4]) : 0;

    constraints.specificTimeRange = {
      start: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
      end: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
    };
  }

  // Next week
  if (lowerPrompt.includes('next week')) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    constraints.afterDate = nextWeek;
  }

  // Location
  if (lowerPrompt.includes('soma')) {
    constraints.location = 'SOMA';
  } else if (lowerPrompt.includes('mission')) {
    constraints.location = 'Mission';
  } else if (lowerPrompt.includes('financial district') || lowerPrompt.includes('fidi')) {
    constraints.location = 'Financial District';
  }

  return constraints;
}

async function findSlotsWithConstraints(params: any): Promise<any[]> {
  const { constraints } = params;
  const slots = [];

  // Generate mock slots based on constraints
  const now = new Date();
  const startDate = constraints.afterDate || new Date(now.getTime() + 2 * 60 * 60 * 1000);

  for (let i = 0; i < 5; i++) {
    const slotDate = new Date(startDate);
    slotDate.setDate(slotDate.getDate() + i);

    // Skip avoided days
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][slotDate.getDay()];
    if (constraints.avoidDays?.includes(dayName)) {
      continue;
    }

    // Set time based on preference
    let hour = 14; // Default afternoon
    if (constraints.timePreference === 'morning') {
      hour = 9;
    } else if (constraints.timePreference === 'evening') {
      hour = 18;
    }

    if (constraints.specificTimeRange) {
      const [startHour] = constraints.specificTimeRange.start.split(':').map(Number);
      hour = startHour;
    }

    slotDate.setHours(hour, 0, 0, 0);

    const endDate = new Date(slotDate.getTime() + (constraints.duration || 60) * 60 * 1000);

    slots.push({
      start: slotDate.toISOString(),
      end: endDate.toISOString(),
      label: formatSlotLabel(slotDate, endDate),
    });

    if (slots.length >= 3) break;
  }

  return slots;
}

function formatSlotLabel(start: Date, end: Date): string {
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

  return `${start.toLocaleDateString('en-US', dateOptions)} ${start.toLocaleTimeString('en-US', timeOptions)} - ${end.toLocaleTimeString('en-US', timeOptions)}`;
}

function generateResponseMessage(slots: any[], constraints: Constraints): string {
  if (slots.length === 0) {
    return "I couldn't find any available slots matching your criteria. Would you like to try different constraints?";
  }

  let message = "I found these available times";

  if (constraints.timePreference) {
    message += ` in the ${constraints.timePreference}`;
  }

  if (constraints.avoidDays && constraints.avoidDays.length > 0) {
    message += ` (avoiding ${constraints.avoidDays.join(', ')})`;
  }

  message += ':';

  return message;
}