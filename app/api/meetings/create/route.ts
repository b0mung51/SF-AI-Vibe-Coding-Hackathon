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

    // Create the Google Calendar event
    const calendarResult = await googleCalendarService.createEvent({
      title: body.title,
      description: body.description,
      startTime,
      endTime,
      attendees: allAttendees,
      location: body.location,
      timezone: body.timezone || 'UTC',
      createMeetLink: body.createMeetLink ?? true, // Default to creating Meet link
    });

    // TODO: Store meeting data in database with Google Calendar event ID
    // This would be implemented when database integration is added
    const meetingData = {
      id: calendarResult.eventId,
      title: body.title,
      description: body.description,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendees: allAttendees,
      location: body.location,
      meetingUrl: calendarResult.meetLink,
      googleCalendarEventId: calendarResult.eventId,
      organizerId: session.user.email,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      meeting: meetingData,
      message: 'Meeting created successfully and added to Google Calendar'
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