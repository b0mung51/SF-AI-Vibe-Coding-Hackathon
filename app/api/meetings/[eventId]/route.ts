import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth';
import { googleCalendarService } from '@/src/lib/googleCalendar';

interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  startTime?: string; // ISO string
  endTime?: string; // ISO string
  attendees?: string[];
  location?: string;
  timezone?: string;
}

// GET - Retrieve a specific meeting
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { eventId } = params;
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Get event from Google Calendar
    const event = await googleCalendarService.getEvent(eventId);
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.summary,
        description: event.description,
        startTime: event.start?.dateTime,
        endTime: event.end?.dateTime,
        location: event.location,
        attendees: event.attendees?.map(a => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus
        })),
      }
    });

  } catch (error) {
    console.error('Error fetching meeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}

// PUT - Update a meeting
export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { eventId } = params;
    const body: UpdateMeetingRequest = await request.json();
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Validate dates if provided
    let startTime: Date | undefined;
    let endTime: Date | undefined;
    
    if (body.startTime) {
      startTime = new Date(body.startTime);
      if (isNaN(startTime.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start time format' },
          { status: 400 }
        );
      }
    }
    
    if (body.endTime) {
      endTime = new Date(body.endTime);
      if (isNaN(endTime.getTime())) {
        return NextResponse.json(
          { error: 'Invalid end time format' },
          { status: 400 }
        );
      }
    }
    
    if (startTime && endTime && startTime >= endTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Update the Google Calendar event
    await googleCalendarService.updateEvent(eventId, {
      title: body.title,
      description: body.description,
      startTime,
      endTime,
      attendees: body.attendees,
      location: body.location,
      timezone: body.timezone,
    });

    // TODO: Update meeting data in database
    // This would be implemented when database integration is added

    return NextResponse.json({
      success: true,
      message: 'Meeting updated successfully'
    });

  } catch (error) {
    console.error('Error updating meeting:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Meeting not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('insufficient permissions')) {
        return NextResponse.json(
          { 
            error: 'Permission denied',
            message: 'You do not have permission to update this meeting'
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update meeting' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel/delete a meeting
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { eventId } = params;
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Delete the Google Calendar event
    await googleCalendarService.deleteEvent(eventId);

    // TODO: Update meeting status in database to 'cancelled'
    // This would be implemented when database integration is added

    return NextResponse.json({
      success: true,
      message: 'Meeting cancelled successfully'
    });

  } catch (error) {
    console.error('Error deleting meeting:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Meeting not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('insufficient permissions')) {
        return NextResponse.json(
          { 
            error: 'Permission denied',
            message: 'You do not have permission to cancel this meeting'
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to cancel meeting' },
      { status: 500 }
    );
  }
}