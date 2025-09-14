import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth';

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  location?: string;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: 'hangoutsMeet';
      };
    };
  };
}

interface CreateEventParams {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  location?: string;
  timezone?: string;
  createMeetLink?: boolean;
}

class GoogleCalendarService {
  private async getCalendarClient() {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      throw new Error('No valid session or access token found. Please sign in again.');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.AUTH_GOOGLE_ID,
      process.env.AUTH_GOOGLE_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    // Set credentials with proper token structure
    oauth2Client.setCredentials({
      access_token: session.accessToken as string,
      refresh_token: session.refreshToken as string,
      expiry_date: session.expiresAt ? session.expiresAt * 1000 : undefined,
    });

    // Handle token refresh automatically
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        // Store the new refresh token if provided
        console.log('New refresh token received');
      }
      if (tokens.access_token) {
        console.log('Access token refreshed');
      }
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Create a new calendar event
   */
  async createEvent(params: CreateEventParams): Promise<{ eventId: string; meetLink?: string }> {
    try {
      const calendar = await this.getCalendarClient();
      const timezone = params.timezone || 'America/Los_Angeles'; // Use a valid timezone

      // Validate input parameters
      if (!params.title || !params.startTime || !params.endTime) {
        throw new Error('Missing required parameters: title, startTime, endTime');
      }

      if (params.startTime >= params.endTime) {
        throw new Error('End time must be after start time');
      }

      // Create event object with proper structure
      const event: any = {
        summary: params.title,
        start: {
          dateTime: params.startTime.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: params.endTime.toISOString(),
          timeZone: timezone,
        },
      };

      // Add optional fields only if they exist
      if (params.description) {
        event.description = params.description;
      }

      if (params.location) {
        event.location = params.location;
      }

      // Add attendees if provided (filter out invalid emails)
      if (params.attendees && params.attendees.length > 0) {
        const validAttendees = params.attendees
          .filter(email => email && email.includes('@'))
          .map(email => ({
            email: email.trim(),
            responseStatus: 'needsAction',
          }));
        
        if (validAttendees.length > 0) {
          event.attendees = validAttendees;
        }
      }

      // Add Google Meet link if requested
      if (params.createMeetLink) {
        event.conferenceData = {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        };
      }

      console.log('Creating calendar event with data:', JSON.stringify(event, null, 2));

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: params.createMeetLink ? 1 : 0,
        sendUpdates: 'all',
      });

      const eventData = response.data;
      const eventId = eventData?.id;
      const meetLink = eventData?.conferenceData?.entryPoints?.[0]?.uri;

      if (!eventId) {
        console.error('No event ID in response:', eventData);
        throw new Error('Failed to create calendar event - no event ID returned');
      }

      console.log('Calendar event created successfully:', { eventId, meetLink });

      return {
        eventId,
        meetLink,
      };
    } catch (error: any) {
      console.error('Error creating Google Calendar event:', {
        error: error.message,
        code: error.code,
        status: error.status,
        details: error.response?.data,
      });
      
      // Provide more specific error messages
      if (error.code === 401) {
        throw new Error('Authentication failed. Please sign in again.');
      } else if (error.code === 403) {
        throw new Error('Calendar access denied. Please grant calendar permissions.');
      } else if (error.code === 400) {
        throw new Error(`Invalid request: ${error.message || 'Please check your input data'}`);
      } else {
        throw new Error(`Failed to create calendar event: ${error.message || 'Unknown error'}`);
      }
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId: string, params: Partial<CreateEventParams>): Promise<void> {
    try {
      const calendar = await this.getCalendarClient();
      const timezone = params.timezone || 'UTC';

      const updateData: Partial<CalendarEvent> = {};

      if (params.title) updateData.summary = params.title;
      if (params.description) updateData.description = params.description;
      if (params.location) updateData.location = params.location;

      if (params.startTime) {
        updateData.start = {
          dateTime: params.startTime.toISOString(),
          timeZone: timezone,
        };
      }

      if (params.endTime) {
        updateData.end = {
          dateTime: params.endTime.toISOString(),
          timeZone: timezone,
        };
      }

      if (params.attendees) {
        updateData.attendees = params.attendees.map(email => ({
          email,
          responseStatus: 'needsAction',
        }));
      }

      const updateResponse = await calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: updateData,
        sendUpdates: 'all',
      });
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw new Error(`Failed to update calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      const calendar = await this.getCalendarClient();

      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all', // Notify all attendees
      });
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw new Error(`Failed to delete calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get event details
   */
  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    try {
      const calendar = await this.getCalendarClient();

      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId,
      });

      return response.data as CalendarEvent;
    } catch (error) {
      console.error('Error fetching Google Calendar event:', error);
      return null;
    }
  }

  /**
   * Check for conflicts in the user's calendar
   */
  async checkConflicts(startTime: Date, endTime: Date): Promise<boolean> {
    try {
      const calendar = await this.getCalendarClient();

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      return events.length > 0;
    } catch (error) {
      console.error('Error checking calendar conflicts:', error);
      return false; // Assume no conflicts if we can't check
    }
  }

  /**
   * Get user's busy times for a date range
   */
  async getBusyTimes(startDate: Date, endDate: Date): Promise<Array<{ start: Date; end: Date }>> {
    try {
      const calendar = await this.getCalendarClient();

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      return events
        .filter(event => event.start?.dateTime && event.end?.dateTime)
        .map(event => ({
          start: new Date(event.start!.dateTime!),
          end: new Date(event.end!.dateTime!),
        }));
    } catch (error) {
      console.error('Error fetching busy times:', error);
      return [];
    }
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();
export type { CreateEventParams, CalendarEvent };