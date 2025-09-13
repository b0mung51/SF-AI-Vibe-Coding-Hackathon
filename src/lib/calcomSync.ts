import { calcomClient } from './calcom';
import { workingHoursDetection } from './workingHoursDetection';

export interface SyncStatus {
  isConnected: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  syncInterval: number; // in minutes
  errors: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  description?: string;
  type: 'meeting' | 'focus' | 'break' | 'other';
  source: 'google' | 'outlook' | 'calcom';
}

export interface UserAvailability {
  userId: string;
  timezone: string;
  workingHours: {
    [key: string]: { // day of week
      enabled: boolean;
      start: string;
      end: string;
    }
  };
  lunchWindow: {
    enabled: boolean;
    start: string;
    end: string;
  };
  bufferTime: number; // minutes between meetings
  lastUpdated: Date;
}

export class CalcomSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private webhookEndpoint: string;

  constructor() {
    this.webhookEndpoint = '/api/calcom/webhook';
  }

  /**
   * Start real-time sync for a user
   */
  async startSync(userId: string, intervalMinutes: number = 15): Promise<void> {
    try {
      // Initial sync
      await this.performFullSync(userId);

      // Set up periodic sync
      this.syncInterval = setInterval(async () => {
        try {
          await this.performIncrementalSync(userId);
        } catch (error) {
          console.error('Incremental sync failed:', error);
        }
      }, intervalMinutes * 60 * 1000);

      console.log(`Real-time sync started for user ${userId} with ${intervalMinutes}min interval`);
    } catch (error) {
      console.error('Failed to start sync:', error);
      throw error;
    }
  }

  /**
   * Stop real-time sync
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Real-time sync stopped');
    }
  }

  /**
   * Perform full sync - fetch all calendar data
   */
  async performFullSync(userId: string): Promise<{
    events: CalendarEvent[];
    availability: UserAvailability;
    workingHours: {
      workingHours: Record<string, { start: string; end: string; enabled: boolean }>;
      lunchWindow: { start: string; end: string; enabled: boolean };
      confidence: number;
    };
  }> {
    try {
      // Fetch user's calendars and events
      const [userInfo, bookings] = await Promise.all([
        calcomClient.getUser(),
        calcomClient.getBookings({
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Next 30 days
        })
      ]);

      // Convert bookings to calendar events
      const events: CalendarEvent[] = bookings.map(booking => ({
        id: booking.id.toString(),
        title: booking.title || 'Meeting',
        startTime: new Date(booking.startTime),
        endTime: new Date(booking.endTime),
        attendees: booking.attendees?.map(a => a.email) || [],
        location: booking.location,
        description: booking.description,
        type: this.categorizeEvent(booking.title || ''),
        source: 'calcom'
      }));

      // Detect working hours from calendar history
      const detectedHours = await workingHoursDetection.analyzeWorkingHours(userInfo.id, 60);

      // Create availability object
      const availability: UserAvailability = {
        userId,
        timezone: userInfo.timeZone || 'UTC',
        workingHours: Object.fromEntries(
          Object.entries(detectedHours.workingHours).map(([day, pattern]) => [
            day,
            {
              enabled: pattern.enabled,
              start: pattern.start,
              end: pattern.end
            }
          ])
        ),
        lunchWindow: {
          enabled: detectedHours.lunchWindow.enabled,
          start: detectedHours.lunchWindow.start,
          end: detectedHours.lunchWindow.end
        },
        bufferTime: 15, // Default 15 minutes
        lastUpdated: new Date()
      };

      // Store in database/cache (implement based on your storage solution)
      await this.storeUserData(userId, { events, availability, workingHours: detectedHours });

      return { events, availability, workingHours: detectedHours };
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }
  }

  /**
   * Perform incremental sync - fetch only recent changes
   */
  async performIncrementalSync(userId: string): Promise<void> {
    try {
      const lastSync = await this.getLastSyncTime(userId);
      const now = new Date();

      // Fetch recent bookings
      const recentBookings = await calcomClient.getBookings({
        from: (lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000)).toISOString(),
        to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      if (recentBookings.length > 0) {
        // Convert to events
        const newEvents: CalendarEvent[] = recentBookings.map(booking => ({
          id: booking.id.toString(),
          title: booking.title || 'Meeting',
          startTime: new Date(booking.startTime),
          endTime: new Date(booking.endTime),
          attendees: booking.attendees?.map(a => a.email) || [],
          location: booking.location,
          description: booking.description,
          type: this.categorizeEvent(booking.title || ''),
          source: 'calcom'
        }));

        // Update stored events
        await this.updateUserEvents(userId, newEvents);

        // Re-analyze working hours if significant changes
        if (newEvents.length > 5) {
          const updatedHours = await workingHoursDetection.analyzeWorkingHours(parseInt(userId), 60);
          await this.updateUserAvailability(userId, updatedHours);
        }
      }

      // Update last sync time
      await this.updateLastSyncTime(userId, now);
    } catch (error) {
      console.error('Incremental sync failed:', error);
      throw error;
    }
  }

  /**
   * Get current sync status for a user
   */
  async getSyncStatus(userId: string): Promise<SyncStatus> {
    try {
      const lastSync = await this.getLastSyncTime(userId);
      const isConnected = await this.checkConnection();
      
      return {
        isConnected,
        lastSync,
        nextSync: lastSync ? new Date(lastSync.getTime() + 15 * 60 * 1000) : null,
        syncInterval: 15,
        errors: []
      };
    } catch (error) {
      return {
        isConnected: false,
        lastSync: null,
        nextSync: null,
        syncInterval: 15,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Handle webhook events from Cal.com
   */
  async handleWebhook(payload: {
    triggerEvent: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    try {
      const { triggerEvent, payload: eventData } = payload;

      switch (triggerEvent) {
        case 'BOOKING_CREATED':
        case 'BOOKING_RESCHEDULED':
        case 'BOOKING_CANCELLED':
          await this.handleBookingEvent(eventData);
          break;
        case 'MEETING_ENDED':
          await this.handleMeetingEnded(eventData);
          break;
        default:
          console.log('Unhandled webhook event:', triggerEvent);
      }
    } catch (error) {
      console.error('Webhook handling failed:', error);
      throw error;
    }
  }

  /**
   * Categorize event type based on title and content
   */
  private categorizeEvent(title: string): 'meeting' | 'focus' | 'break' | 'other' {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('meeting') || lowerTitle.includes('call') || lowerTitle.includes('sync')) {
      return 'meeting';
    }
    if (lowerTitle.includes('focus') || lowerTitle.includes('deep work') || lowerTitle.includes('coding')) {
      return 'focus';
    }
    if (lowerTitle.includes('lunch') || lowerTitle.includes('break') || lowerTitle.includes('coffee')) {
      return 'break';
    }
    return 'other';
  }

  /**
   * Handle booking-related webhook events
   */
  private async handleBookingEvent(eventData: Record<string, unknown>): Promise<void> {
    const userId = eventData.organizer?.id || eventData.userId;
    if (!userId) return;

    // Trigger incremental sync for the affected user
    await this.performIncrementalSync(userId.toString());
  }

  /**
   * Handle meeting ended events for analytics
   */
  private async handleMeetingEnded(eventData: Record<string, unknown>): Promise<void> {
    // Could be used for meeting analytics, productivity insights, etc.
    console.log('Meeting ended:', eventData);
  }

  /**
   * Check if Cal.com connection is active
   */
  private async checkConnection(): Promise<boolean> {
    try {
      await calcomClient.getUser();
      return true;
    } catch {
      return false;
    }
  }

  // Storage methods - implement based on your database/storage solution
  private async storeUserData(userId: string, data: {
    events: CalendarEvent[];
    availability: UserAvailability;
    workingHours: Record<string, unknown>;
  }): Promise<void> {
    // Implement storage logic (database, Redis, etc.)
    console.log(`Storing data for user ${userId}:`, data);
  }

  private async updateUserEvents(userId: string, events: CalendarEvent[]): Promise<void> {
    // Implement event update logic
    console.log(`Updating events for user ${userId}:`, events.length);
  }

  private async updateUserAvailability(userId: string, availability: Record<string, unknown>): Promise<void> {
    // Implement availability update logic
    console.log(`Updating availability for user ${userId}:`, availability);
  }

  private async getUserEvents(_userId: string): Promise<CalendarEvent[]> {
    // Implement event retrieval logic
    return [];
  }

  private async getLastSyncTime(_userId: string): Promise<Date | null> {
    // Implement last sync time retrieval
    return null;
  }

  private async updateLastSyncTime(userId: string, time: Date): Promise<void> {
    // Implement last sync time update
    console.log(`Updated last sync time for user ${userId}:`, time);
  }
}

// Export singleton instance
export const calcomSyncService = new CalcomSyncService();