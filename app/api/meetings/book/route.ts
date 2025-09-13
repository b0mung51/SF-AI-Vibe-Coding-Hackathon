import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { config as authOptions } from '@/auth';

interface BookMeetingRequest {
  slot: {
    start: string; // ISO 8601
    end: string;   // ISO 8601
  };
  participants: string[];
  title: string;
  description?: string;
  location?: string;
  method: 'deeplink' | 'calcom';
  duration: number; // minutes
}

interface BookMeetingResponse {
  success: boolean;
  bookingId?: string;
  bookingUrl?: string;
  deepLink?: string;
  message: string;
  meetingDetails?: {
    id: string;
    title: string;
    start: string;
    end: string;
    participants: string[];
    location: string;
    joinUrl?: string;
  };
}

// Helper function to generate Google Calendar deep link
function generateGoogleCalendarDeepLink(meetingDetails: {
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: string[];
}): string {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams();
  
  params.append('action', 'TEMPLATE');
  params.append('text', meetingDetails.title);
  
  // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const startFormatted = formatDate(meetingDetails.start);
  const endFormatted = formatDate(meetingDetails.end);
  params.append('dates', `${startFormatted}/${endFormatted}`);
  
  if (meetingDetails.description) {
    params.append('details', meetingDetails.description);
  }
  
  if (meetingDetails.location) {
    params.append('location', meetingDetails.location);
  }
  
  if (meetingDetails.attendees && meetingDetails.attendees.length > 0) {
    params.append('add', meetingDetails.attendees.join(','));
  }
  
  return `${baseUrl}?${params.toString()}`;
}

// Helper function to generate Outlook Calendar deep link
function generateOutlookCalendarDeepLink(meetingDetails: {
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: string[];
}): string {
  const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
  const params = new URLSearchParams();
  
  params.append('subject', meetingDetails.title);
  params.append('startdt', meetingDetails.start);
  params.append('enddt', meetingDetails.end);
  
  if (meetingDetails.description) {
    params.append('body', meetingDetails.description);
  }
  
  if (meetingDetails.location) {
    params.append('location', meetingDetails.location);
  }
  
  if (meetingDetails.attendees && meetingDetails.attendees.length > 0) {
    params.append('to', meetingDetails.attendees.join(';'));
  }
  
  return `${baseUrl}?${params.toString()}`;
}

// Mock Cal.com booking function
async function bookWithCalCom(meetingDetails: {
  title: string;
  start: string;
  end: string;
  participants: string[];
  description?: string;
  location?: string;
}): Promise<{ bookingId: string; joinUrl?: string }> {
  // Simulate Cal.com API call
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock successful booking
  const bookingId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Generate mock join URL based on location
  let joinUrl: string | undefined;
  if (meetingDetails.location === 'Google Meet') {
    joinUrl = `https://meet.google.com/${Math.random().toString(36).substr(2, 10)}`;
  } else if (meetingDetails.location === 'Zoom') {
    joinUrl = `https://zoom.us/j/${Math.floor(Math.random() * 1000000000)}`;
  } else if (meetingDetails.location === 'Microsoft Teams') {
    joinUrl = `https://teams.microsoft.com/l/meetup-join/${Math.random().toString(36).substr(2, 20)}`;
  }
  
  return { bookingId, joinUrl };
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

    const body: BookMeetingRequest = await request.json();
    const { slot, participants, title, description, location, method, duration } = body;

    // Validate required fields
    if (!slot || !slot.start || !slot.end) {
      return NextResponse.json(
        { success: false, message: 'Meeting slot is required' },
        { status: 400 }
      );
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one participant is required' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { success: false, message: 'Meeting title is required' },
        { status: 400 }
      );
    }

    if (!method || !['deeplink', 'calcom'].includes(method)) {
      return NextResponse.json(
        { success: false, message: 'Valid booking method is required' },
        { status: 400 }
      );
    }

    const meetingDetails = {
      title,
      start: slot.start,
      end: slot.end,
      participants,
      description,
      location: location || 'Google Meet',
      attendees: participants.filter(p => p !== session.user?.email)
    };

    let response: BookMeetingResponse;

    if (method === 'deeplink') {
      // Generate deep links for manual calendar creation
      const googleLink = generateGoogleCalendarDeepLink(meetingDetails);
      const outlookLink = generateOutlookCalendarDeepLink(meetingDetails);
      
      response = {
        success: true,
        message: 'Deep links generated successfully',
        deepLink: googleLink, // Default to Google Calendar
        meetingDetails: {
          id: `meeting_${Date.now()}`,
          title: meetingDetails.title,
          start: meetingDetails.start,
          end: meetingDetails.end,
          participants: meetingDetails.participants,
          location: meetingDetails.location
        }
      };
    } else {
      // Book through Cal.com
      try {
        const calComResult = await bookWithCalCom(meetingDetails);
        
        response = {
          success: true,
          bookingId: calComResult.bookingId,
          message: 'Meeting booked successfully through Cal.com',
          meetingDetails: {
            id: calComResult.bookingId,
            title: meetingDetails.title,
            start: meetingDetails.start,
            end: meetingDetails.end,
            participants: meetingDetails.participants,
            location: meetingDetails.location,
            joinUrl: calComResult.joinUrl
          }
        };
      } catch (calComError) {
        console.error('Cal.com booking error:', calComError);
        
        // Fallback to deep link if Cal.com fails
        const googleLink = generateGoogleCalendarDeepLink(meetingDetails);
        
        response = {
          success: true,
          message: 'Cal.com booking failed, generated deep link as fallback',
          deepLink: googleLink,
          meetingDetails: {
            id: `meeting_${Date.now()}`,
            title: meetingDetails.title,
            start: meetingDetails.start,
            end: meetingDetails.end,
            participants: meetingDetails.participants,
            location: meetingDetails.location
          }
        };
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Meeting booking error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to book meeting. Please try again.' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve meeting details
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json(
        { success: false, message: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    // Mock meeting retrieval
    // In a real implementation, this would fetch from the database
    const mockMeeting = {
      id: meetingId,
      title: 'Sample Meeting',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      participants: [session.user.email, 'other@example.com'],
      location: 'Google Meet',
      status: 'confirmed',
      joinUrl: 'https://meet.google.com/abc-defg-hij'
    };

    return NextResponse.json({
      success: true,
      meeting: mockMeeting
    });

  } catch (error) {
    console.error('Meeting retrieval error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to retrieve meeting details' 
      },
      { status: 500 }
    );
  }
}