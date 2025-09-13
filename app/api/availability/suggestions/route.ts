import { NextRequest, NextResponse } from 'next/server';
import { getUserCalendars } from '@/app/lib/db';

export async function POST(request: NextRequest) {
  try {
    const {
      user1Id,
      user2Id,
      intent,
      duration,
      bufferBefore = 0,
      bufferAfter = 0,
      timeWindow,
    } = await request.json();

    // Get calendars for both users
    const [user1Calendars, user2Calendars] = await Promise.all([
      getUserCalendars(user1Id),
      getUserCalendars(user2Id),
    ]);

    // Calculate the next available slot based on intent
    const slot = await findNextAvailableSlot({
      intent,
      duration,
      bufferBefore,
      bufferAfter,
      timeWindow,
      user1Calendars,
      user2Calendars,
    });

    if (!slot) {
      return NextResponse.json({ slot: null });
    }

    // Add location suggestion for in-person meetings
    let slotWithLocation: any = slot;
    if (['coffee', 'lunch', 'dinner'].includes(intent)) {
      slotWithLocation = { ...slot, location: getLocationSuggestion(intent) };
    }

    return NextResponse.json({ slot: slotWithLocation });
  } catch (error) {
    console.error('Error generating suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestion' },
      { status: 500 }
    );
  }
}

async function findNextAvailableSlot(params: any) {
  const {
    intent,
    duration,
    timeWindow,
  } = params;

  // For demo, return a mock slot based on intent
  const now = new Date();
  const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

  // Adjust for specific time windows
  if (timeWindow) {
    const [startHour, startMinute] = timeWindow.start.split(':').map(Number);
    const [endHour, endMinute] = timeWindow.end.split(':').map(Number);

    // Find next occurrence of this time window
    const targetDate = new Date(startTime);
    targetDate.setHours(startHour, startMinute, 0, 0);

    // If the window has passed today, move to tomorrow
    if (targetDate < now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // Skip weekends for work-related intents
    if (targetDate.getDay() === 0) targetDate.setDate(targetDate.getDate() + 1);
    if (targetDate.getDay() === 6) targetDate.setDate(targetDate.getDate() + 2);

    const endTime = new Date(targetDate.getTime() + duration * 60 * 1000);

    return {
      start: targetDate.toISOString(),
      end: endTime.toISOString(),
    };
  }

  // Default slot
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  return {
    start: startTime.toISOString(),
    end: endTime.toISOString(),
  };
}

function getLocationSuggestion(intent: string): string {
  const locations: Record<string, string[]> = {
    coffee: [
      'Blue Bottle Coffee - Ferry Building',
      'Sightglass Coffee - SOMA',
      'Ritual Coffee Roasters - Mission',
      'Four Barrel Coffee - Mission',
    ],
    lunch: [
      'The Grove - Yerba Buena',
      'Souvla - Hayes Valley',
      'Chipotle - Financial District',
      'Sweetgreen - SOMA',
    ],
    dinner: [
      'State Bird Provisions - Fillmore',
      'Nopa - Western Addition',
      'Foreign Cinema - Mission',
      'Zuni Café - Hayes Valley',
    ],
  };

  const options = locations[intent] || ['TBD'];
  return options[Math.floor(Math.random() * options.length)];
}