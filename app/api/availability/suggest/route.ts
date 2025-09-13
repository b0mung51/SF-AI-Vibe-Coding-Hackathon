import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { availabilityInferenceService } from '@/src/lib/availabilityInference';
import { calcomSyncService } from '@/src/lib/calcomSync';
import { multiUserAvailabilityEngine } from '@/src/lib/multiUserAvailability';

/**
 * POST /api/availability/suggest
 * Generate smart meeting time suggestions for single or multiple users
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
      userIds, // Optional: if provided, will find mutual availability
      duration = 60, // Default 60 minutes
      preferredTimeRange = { start: '09:00', end: '17:00' },
      excludeDays = [],
      lookAheadDays = 14,
      requireAllUsers = true
    } = body;

    // If multiple users specified, use multi-user availability engine
    if (userIds && userIds.length > 1) {
      const usersData = await multiUserAvailabilityEngine.syncMultipleUsers(userIds);
      
      if (usersData.length === 0) {
        return NextResponse.json(
          { error: 'Failed to sync calendar data for users' },
          { status: 500 }
        );
      }

      const availabilityRequest = {
        userIds,
        duration,
        preferredTimeRange,
        excludeDays,
        lookAheadDays,
        requireAllUsers
      };

      const result = await multiUserAvailabilityEngine.findMutualAvailability(
        usersData,
        availabilityRequest
      );

      return NextResponse.json({
        suggestions: result.availableSlots.map(slot => ({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          confidence: slot.confidence,
          reason: slot.reason,
          type: slot.type,
          availableUsers: slot.availableUsers,
          conflictingUsers: slot.conflictingUsers
        })),
        conflictAnalysis: result.conflictAnalysis,
        recommendations: result.recommendations,
        metadata: {
          type: 'multi-user',
          totalUsers: userIds.length,
          syncedUsers: usersData.length,
          duration,
          lookAheadDays,
          totalSuggestions: result.availableSlots.length,
          generatedAt: new Date().toISOString()
        }
      });
    }

    // Single user suggestions (existing logic)
    const userEvents = await getUserCalendarEvents(session.user.email);

    // Generate suggestions
    const suggestions = await availabilityInferenceService.suggestMeetingTimes(
      userEvents,
      duration,
      preferredTimeRange,
      excludeDays
    );

    return NextResponse.json({
      suggestions: suggestions.map(slot => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        confidence: slot.confidence,
        reason: slot.reason,
        type: slot.type
      })),
      metadata: {
        type: 'single-user',
        duration,
        lookAheadDays,
        totalSuggestions: suggestions.length,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Availability suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: error instanceof Error ? error.message : 'Unknown error' },
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