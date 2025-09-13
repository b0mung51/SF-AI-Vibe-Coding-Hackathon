import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { availabilityInferenceService } from '@/src/lib/availabilityInference';
import { calcomSyncService } from '@/src/lib/calcomSync';

/**
 * POST /api/availability/suggest
 * Generate smart meeting time suggestions based on calendar patterns
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      duration = 60, // Default 60 minutes
      preferredTimeRange,
      excludeDays,
      lookAheadDays = 14
    } = body;

    // Get user's calendar events (this would typically come from your database)
    // For now, we'll use a placeholder - in a real app, you'd fetch from your storage
    const userEvents = await getUserCalendarEvents(session.user.email);

    // Generate suggestions
    const suggestions = await availabilityInferenceService.suggestMeetingTimes(
      userEvents,
      duration,
      preferredTimeRange,
      excludeDays
    );

    return NextResponse.json({
      suggestions,
      metadata: {
        duration,
        lookAheadDays,
        totalSuggestions: suggestions.length,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Availability suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/availability/suggest
 * Get availability insights and patterns for a user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get('timezone') || 'UTC';
    const lookAheadDays = parseInt(searchParams.get('lookAheadDays') || '14');

    // Get user's calendar events
    const userEvents = await getUserCalendarEvents(session.user.email);

    // Generate insights
    const insights = await availabilityInferenceService.inferAvailability(
      userEvents,
      timezone,
      lookAheadDays
    );

    return NextResponse.json({
      insights,
      metadata: {
        timezone,
        lookAheadDays,
        eventsAnalyzed: userEvents.length,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Availability insights error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get user's calendar events
 * In a real application, this would fetch from your database
 */
async function getUserCalendarEvents(userEmail: string) {
  // This is a placeholder - in a real app, you would:
  // 1. Query your database for the user's stored calendar events
  // 2. Or fetch fresh data from Cal.com API
  // 3. Return the events in the CalendarEvent format
  
  // For demo purposes, return some sample events
  return [
    {
      id: '1',
      title: 'Team Standup',
      startTime: new Date('2024-01-15T09:00:00Z'),
      endTime: new Date('2024-01-15T09:30:00Z'),
      attendees: ['team@example.com'],
      type: 'meeting' as const,
      source: 'calcom' as const
    },
    {
      id: '2',
      title: 'Client Call',
      startTime: new Date('2024-01-15T14:00:00Z'),
      endTime: new Date('2024-01-15T15:00:00Z'),
      attendees: ['client@example.com'],
      type: 'meeting' as const,
      source: 'calcom' as const
    },
    {
      id: '3',
      title: 'Focus Time - Development',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T12:00:00Z'),
      attendees: [],
      type: 'focus' as const,
      source: 'calcom' as const
    }
  ];
}