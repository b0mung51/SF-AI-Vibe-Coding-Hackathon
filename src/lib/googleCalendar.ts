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
      throw new Error('No valid session or access token found');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    oauth2Client.setCredentials({
      access_token: session.accessToken as string,
      refresh_token: session.refreshToken as string,
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Create a new calendar event
   */
  async createEvent(params: CreateEventParams): Promise<{ eventId: string; meetLink?: string }> {
    try {
      const calendar = await this.getCalendarClient();
      const timezone = params.timezone || 'UTC';

      const event: CalendarEvent = {
        summary: params.title,
        description: params.description,
        start: {
          dateTime: params.startTime.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: params.endTime.toISOString(),
          timeZone: timezone,
        },
        location: params.location,
      };

      // Add attendees if provided
      if (params.attendees && params.attendees.length > 0) {
        event.attendees = params.attendees.map(email => ({
          email,
          responseStatus: 'needsAction',
        }));
      }

      // Add Google Meet link if requested
      if (params.createMeetLink) {
        event.conferenceData = {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        };
      }

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: params.createMeetLink ? 1 : 0,
        sendUpdates: 'all', // Send invitations to all attendees
      });

      const eventId = (response as any).data?.id;
      const meetLink = (response as any).data?.conferenceData?.entryPoints?.[0]?.uri;

      if (!eventId) {
        throw new Error('Failed to create calendar event - no event ID returned');
      }

      return {
        eventId,
        meetLink,
      };
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
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