import { NextRequest, NextResponse } from 'next/server';
import { getUserCalendars } from '@/app/lib/db';
import type { TimeSlot, Calendar } from '@/app/types';

export async function POST(request: NextRequest) {
  try {
    const { user1Id, user2Id, startDate, endDate } = await request.json();

    // Get calendars for both users
    const [user1Calendars, user2Calendars] = await Promise.all([
      getUserCalendars(user1Id),
      getUserCalendars(user2Id),
    ]);

    // For now, return mock availability
    // In production, this would integrate with Cal.com API
    const mockSlots: TimeSlot[] = generateMockSlots(startDate, endDate);

    // Apply schedulable hours filtering
    const filteredSlots = filterBySchedulableHours(mockSlots, user1Calendars, user2Calendars);

    return NextResponse.json({
      slots: filteredSlots,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  } catch (error) {
    console.error('Error calculating mutual availability:', error);
    return NextResponse.json(
      { error: 'Failed to calculate availability' },
      { status: 500 }
    );
  }
}

function generateMockSlots(startDate: string, endDate: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    // Add some mock available slots for each day
    const dayOfWeek = current.getDay();

    // Skip weekends for now
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Morning slot
      const morningStart = new Date(current);
      morningStart.setHours(9, 0, 0, 0);
      const morningEnd = new Date(current);
      morningEnd.setHours(10, 30, 0, 0);
      slots.push({
        start: morningStart.toISOString(),
        end: morningEnd.toISOString(),
      });

      // Afternoon slot
      const afternoonStart = new Date(current);
      afternoonStart.setHours(14, 0, 0, 0);
      const afternoonEnd = new Date(current);
      afternoonEnd.setHours(16, 0, 0, 0);
      slots.push({
        start: afternoonStart.toISOString(),
        end: afternoonEnd.toISOString(),
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return slots;
}

function filterBySchedulableHours(
  slots: TimeSlot[],
  user1Calendars: Calendar[],
  user2Calendars: Calendar[]
): TimeSlot[] {
  // For simplicity, just return the slots as-is
  // In production, this would check against each user's schedulable hours
  return slots;
}