/**
 * Cal.com API Client
 * Handles all interactions with Cal.com API for calendar management
 */

export interface CalcomUser {
  id: number;
  username: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
  timeZone: string;
  weekStart: string;
  brandColor: string;
  darkBrandColor: string;
  theme?: string;
}

export interface CalcomEventType {
  id: number;
  title: string;
  slug: string;
  description?: string;
  length: number;
  hidden: boolean;
  position: number;
  userId: number;
  teamId?: number;
  eventName?: string;
  timeZone?: string;
  periodType: 'UNLIMITED' | 'ROLLING' | 'RANGE';
  periodStartDate?: string;
  periodEndDate?: string;
  periodDays?: number;
  periodCountCalendarDays?: boolean;
  requiresConfirmation: boolean;
  recurringEvent?: Record<string, unknown>;
  disableGuests: boolean;
  hideCalendarNotes: boolean;
  minimumBookingNotice: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  schedulingType?: 'ROUND_ROBIN' | 'COLLECTIVE';
  price: number;
  currency: string;
  slotInterval?: number;
  metadata?: Record<string, unknown>;
  successRedirectUrl?: string;
}

export interface CalcomBooking {
  id: number;
  uid: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees: Array<{
    email: string;
    name: string;
    timeZone: string;
  }>;
  user: {
    email: string;
    name: string;
    timeZone: string;
  };
  eventType: {
    id: number;
    title: string;
    slug: string;
  };
  status: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED';
  paid: boolean;
  payment?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
  cancellationReason?: string;
}

export interface CalcomAvailability {
  dateRanges: Array<{
    start: string;
    end: string;
  }>;
  timeZone: string;
  workingHours: Array<{
    days: number[];
    startTime: number; // minutes from midnight
    endTime: number; // minutes from midnight
    userId?: number;
  }>;
  busy: Array<{
    start: string;
    end: string;
    title?: string;
  }>;
}

export interface CalcomSchedule {
  id: number;
  name: string;
  isManaged: boolean;
  workingHours: Array<{
    days: number[];
    startTime: number;
    endTime: number;
    userId?: number;
  }>;
  timeZone: string;
  availability: Array<{
    id: number;
    eventTypeId?: number;
    days: number[];
    startTime: string;
    endTime: string;
    date?: string;
  }>;
}

class CalcomAPIClient {
  private clientId: string;
  private clientSecret: string;
  private organizationId: string;
  private baseURL: string;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    this.clientId = process.env.CALCOM_CLIENT_ID || '';
    this.clientSecret = process.env.CALCOM_CLIENT_SECRET || '';
    this.organizationId = process.env.CALCOM_ORGANIZATION_ID || '';
    this.baseURL = 'https://api.cal.com/v2';
    
    if (!this.clientId || !this.clientSecret || !this.organizationId) {
      console.warn('Cal.com OAuth credentials not found. Some features may not work.');
    }
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Get new access token using client credentials flow
    const tokenUrl = 'https://api.cal.com/v2/oauth/token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'read write'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cal.com OAuth error: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json();
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // Subtract 1 minute for safety
    
    if (!this.accessToken) {
      throw new Error('Access token is null');
    }
    return this.accessToken;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cal.com API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // User Management
  async getUser(userId?: number): Promise<CalcomUser> {
    const endpoint = userId ? `/users/${userId}` : '/me';
    return this.makeRequest<CalcomUser>(endpoint);
  }

  async updateUser(userId: number, data: Partial<CalcomUser>): Promise<CalcomUser> {
    return this.makeRequest<CalcomUser>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Event Types
  async getEventTypes(userId?: number): Promise<CalcomEventType[]> {
    const params = userId ? `?userId=${userId}` : '';
    const response = await this.makeRequest<{ event_types: CalcomEventType[] }>(`/event-types${params}`);
    return response.event_types;
  }

  async createEventType(data: Partial<CalcomEventType>): Promise<CalcomEventType> {
    return this.makeRequest<CalcomEventType>('/event-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEventType(eventTypeId: number, data: Partial<CalcomEventType>): Promise<CalcomEventType> {
    return this.makeRequest<CalcomEventType>(`/event-types/${eventTypeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Bookings
  async getBookings(params?: {
    userId?: number;
    eventTypeId?: number;
    status?: string;
    from?: string;
    to?: string;
  }): Promise<CalcomBooking[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });
    }
    
    const response = await this.makeRequest<{ bookings: CalcomBooking[] }>(
      `/bookings?${queryParams.toString()}`
    );
    return response.bookings;
  }

  async createBooking(data: {
    eventTypeId: number;
    start: string;
    end: string;
    attendee: {
      email: string;
      name: string;
      timeZone: string;
    };
    metadata?: Record<string, unknown>;
  }): Promise<CalcomBooking> {
    return this.makeRequest<CalcomBooking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelBooking(bookingId: number, reason?: string): Promise<CalcomBooking> {
    return this.makeRequest<CalcomBooking>(`/bookings/${bookingId}/cancel`, {
      method: 'DELETE',
      body: JSON.stringify({ cancellationReason: reason }),
    });
  }

  // Availability
  async getAvailability(params: {
    userId?: number;
    eventTypeId?: number;
    dateFrom: string;
    dateTo: string;
    timeZone?: string;
  }): Promise<CalcomAvailability> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value.toString());
    });
    
    return this.makeRequest<CalcomAvailability>(
      `/availability?${queryParams.toString()}`
    );
  }

  async getBusyTimes(params: {
    userId?: number;
    dateFrom: string;
    dateTo: string;
    timeZone?: string;
  }): Promise<Array<{ start: string; end: string; title?: string }>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value.toString());
    });
    
    const response = await this.makeRequest<{ busy: Array<{ start: string; end: string; title?: string }> }>(
      `/busy?${queryParams.toString()}`
    );
    return response.busy;
  }

  // Schedules
  async getSchedules(userId?: number): Promise<CalcomSchedule[]> {
    const params = userId ? `?userId=${userId}` : '';
    const response = await this.makeRequest<{ schedules: CalcomSchedule[] }>(`/schedules${params}`);
    return response.schedules;
  }

  async createSchedule(data: {
    name: string;
    timeZone: string;
    availability: Array<{
      days: number[];
      startTime: string;
      endTime: string;
    }>;
  }): Promise<CalcomSchedule> {
    return this.makeRequest<CalcomSchedule>('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Helper Methods
  async detectWorkingHours(userId: number, lookbackDays: number = 30): Promise<{
    workingHours: Record<string, { start: string; end: string; enabled: boolean }>;
    lunchWindow: { start: string; end: string; enabled: boolean };
    confidence: number;
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    try {
      const bookings = await this.getBookings({
        userId,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
        status: 'ACCEPTED'
      });

      // Analyze booking patterns to detect working hours
      const dayPatterns: Record<string, Array<{ start: number; end: number }>> = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      };

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

      bookings.forEach(booking => {
        const start = new Date(booking.startTime);
        const dayName = dayNames[start.getDay()];
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const endMinutes = new Date(booking.endTime).getHours() * 60 + new Date(booking.endTime).getMinutes();
        
        dayPatterns[dayName].push({ start: startMinutes, end: endMinutes });
      });

      // Calculate working hours for each day
      const workingHours: Record<string, { start: string; end: string; enabled: boolean }> = {};
      let totalDaysWithMeetings = 0;

      Object.entries(dayPatterns).forEach(([day, meetings]) => {
        if (meetings.length > 0) {
          totalDaysWithMeetings++;
          const earliestStart = Math.min(...meetings.map(m => m.start));
          const latestEnd = Math.max(...meetings.map(m => m.end));
          
          // Add buffer time (30 minutes before first meeting, 30 minutes after last)
          const workStart = Math.max(0, earliestStart - 30);
          const workEnd = Math.min(24 * 60, latestEnd + 30);
          
          workingHours[day] = {
            start: `${Math.floor(workStart / 60).toString().padStart(2, '0')}:${(workStart % 60).toString().padStart(2, '0')}`,
            end: `${Math.floor(workEnd / 60).toString().padStart(2, '0')}:${(workEnd % 60).toString().padStart(2, '0')}`,
            enabled: true
          };
        } else {
          workingHours[day] = {
            start: '09:00',
            end: '17:00',
            enabled: false
          };
        }
      });

      // Detect lunch window (common gap between 11:30 AM and 2:00 PM)
      const allMeetings = Object.values(dayPatterns).flat();
      const lunchStart = 11.5 * 60; // 11:30 AM
      const lunchEnd = 14 * 60; // 2:00 PM
      
      const lunchMeetings = allMeetings.filter(m => 
        (m.start >= lunchStart && m.start <= lunchEnd) || 
        (m.end >= lunchStart && m.end <= lunchEnd)
      );
      
      const hasLunchBreak = lunchMeetings.length < allMeetings.length * 0.3; // Less than 30% of meetings during lunch
      
      const lunchWindow = {
        start: '12:00',
        end: '13:00',
        enabled: hasLunchBreak
      };

      // Calculate confidence based on data availability
      const confidence = Math.min(1, totalDaysWithMeetings / 10); // Higher confidence with more data

      return {
        workingHours,
        lunchWindow,
        confidence
      };
    } catch (error) {
      console.error('Error detecting working hours:', error);
      
      // Return default working hours if detection fails
      return {
        workingHours: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '17:00', enabled: false },
          sunday: { start: '09:00', end: '17:00', enabled: false }
        },
        lunchWindow: { start: '12:00', end: '13:00', enabled: true },
        confidence: 0
      };
    }
  }

  async syncUserCalendar(userId: number): Promise<{
    success: boolean;
    eventsCount: number;
    lastSync: string;
  }> {
    try {
      // This would trigger a calendar sync in Cal.com
      // For now, we'll simulate the sync process
      const user = await this.getUser(userId);
      const bookings = await this.getBookings({ userId });
      
      return {
        success: true,
        eventsCount: bookings.length,
        lastSync: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error syncing calendar:', error);
      return {
        success: false,
        eventsCount: 0,
        lastSync: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const calcomClient = new CalcomAPIClient();

// Export utility functions
export const calcomUtils = {
  /**
   * Convert minutes from midnight to HH:MM format
   */
  minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  },

  /**
   * Convert HH:MM format to minutes from midnight
   */
  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  },

  /**
   * Check if a time slot is available based on working hours and busy times
   */
  isTimeSlotAvailable(
    startTime: string,
    endTime: string,
    workingHours: CalcomSchedule['workingHours'],
    busyTimes: Array<{ start: string; end: string }>,
    timeZone: string = 'UTC'
  ): boolean {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const dayOfWeek = start.getDay();
    
    // Check if within working hours
    const dayWorkingHours = workingHours.find(wh => wh.days.includes(dayOfWeek));
    if (!dayWorkingHours) return false;
    
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    
    if (startMinutes < dayWorkingHours.startTime || endMinutes > dayWorkingHours.endTime) {
      return false;
    }
    
    // Check for conflicts with busy times
    return !busyTimes.some(busy => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return (start < busyEnd && end > busyStart);
    });
  },

  /**
   * Generate available time slots for a given date range
   */
  generateAvailableSlots(
    dateFrom: string,
    dateTo: string,
    duration: number, // in minutes
    workingHours: CalcomSchedule['workingHours'],
    busyTimes: Array<{ start: string; end: string }>,
    timeZone: string = 'UTC'
  ): Array<{ start: string; end: string }> {
    const slots: Array<{ start: string; end: string }> = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      const dayWorkingHours = workingHours.find(wh => wh.days.includes(dayOfWeek));
      
      if (!dayWorkingHours) continue;
      
      const dayStart = new Date(date);
      dayStart.setHours(Math.floor(dayWorkingHours.startTime / 60), dayWorkingHours.startTime % 60, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(Math.floor(dayWorkingHours.endTime / 60), dayWorkingHours.endTime % 60, 0, 0);
      
      // Generate slots in 15-minute intervals
      for (let slotStart = new Date(dayStart); slotStart < dayEnd; slotStart.setMinutes(slotStart.getMinutes() + 15)) {
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);
        
        if (slotEnd <= dayEnd && this.isTimeSlotAvailable(
          slotStart.toISOString(),
          slotEnd.toISOString(),
          workingHours,
          busyTimes,
          timeZone
        )) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString()
          });
        }
      }
    }
    
    return slots;
  }
};