import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth';
import { googleCalendarService } from '@/src/lib/googleCalendar';

interface CreateMeetingRequest {
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  attendees?: string[];
  location?: string;
  timezone?: string;
  createMeetLink?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CreateMeetingRequest = await request.json();
    
    // Validate required fields
    if (!body.title || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: title, startTime, endTime' },
        { status: 400 }
      );
    }

    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);
    
    // Validate dates
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Check for conflicts in user's calendar
    const hasConflicts = await googleCalendarService.checkConflicts(startTime, endTime);
    
    if (hasConflicts) {
      return NextResponse.json(
        { 
          error: 'Calendar conflict detected',
          message: 'You have existing events during this time slot'
        },
        { status: 409 }
      );
    }

    // Prepare attendees list (include the organizer)
    const allAttendees = body.attendees ? [...body.attendees] : [];
    if (!allAttendees.includes(session.user.email)) {
      allAttendees.push(session.user.email);
    }

    // Try to create Google Calendar event with fallback
    let calendarResult: { eventId: string; meetLink?: string } | null = null;
    let calendarError: string | null = null;

    try {
      calendarResult = await googleCalendarService.createEvent({
        title: body.title,
        description: body.description,
        startTime,
        endTime,
        attendees: allAttendees,
        location: body.location,
        timezone: body.timezone || 'America/Los_Angeles',
        createMeetLink: body.createMeetLink ?? true,
      });
    } catch (error: any) {
      console.error('Google Calendar integration failed:', error.message);
      calendarError = error.message;
      
      // Don't fail the entire request if calendar fails
      // We'll create a meeting record without calendar integration
    }

    // Generate a fallback meeting ID if calendar creation failed
    const meetingId = calendarResult?.eventId || `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create meeting data (with or without calendar integration)
    const meetingData = {
      id: meetingId,
      title: body.title,
      description: body.description,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendees: allAttendees,
      location: body.location,
      meetingUrl: calendarResult?.meetLink,
      googleCalendarEventId: calendarResult?.eventId,
      organizerId: session.user.email,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      calendarIntegration: !!calendarResult,
    };

    // Generate manual calendar links as fallback
    const calendarLinks = {
      google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(body.title)}&dates=${startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(body.description || '')}&location=${encodeURIComponent(body.location || '')}`,
      outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(body.title)}&startdt=${startTime.toISOString()}&enddt=${endTime.toISOString()}&body=${encodeURIComponent(body.description || '')}&location=${encodeURIComponent(body.location || '')}`,
    };

    const responseMessage = calendarResult 
      ? 'Meeting created successfully and added to Google Calendar'
      : `Meeting created successfully. ${calendarError ? 'Calendar integration failed: ' + calendarError + '. ' : ''}Use the calendar links below to add to your calendar manually.`;

    return NextResponse.json({
      success: true,
      meeting: meetingData,
      calendarLinks: calendarResult ? undefined : calendarLinks,
      message: responseMessage,
      warning: calendarError ? 'Google Calendar integration failed, but meeting was created successfully' : undefined
    });

  } catch (error) {
    console.error('Error creating meeting:', error);
    
    // Handle specific Google Calendar API errors
    if (error instanceof Error) {
      if (error.message.includes('insufficient permissions')) {
        return NextResponse.json(
          { 
            error: 'Calendar permission required',
            message: 'Please grant calendar permissions to create events'
          },
          { status: 403 }
        );
      }
      
      if (error.message.includes('quota exceeded')) {
        return NextResponse.json(
          { 
            error: 'Service temporarily unavailable',
            message: 'Calendar service quota exceeded. Please try again later.'
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to create meeting',
        message: 'An unexpected error occurred while creating the meeting'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve user's meetings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate parameters are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Get busy times from Google Calendar
    const busyTimes = await googleCalendarService.getBusyTimes(start, end);

    return NextResponse.json({
      success: true,
      busyTimes: busyTimes.map(time => ({
        start: time.start.toISOString(),
        end: time.end.toISOString(),
      })),
    });

  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}