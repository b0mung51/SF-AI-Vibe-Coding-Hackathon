export interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
  photoURL?: string;
  location?: {
    city: string;
    region: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  defaultCalendars?: {
    work?: string;
    personal?: string;
  };
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Calendar {
  id: string;
  userId: string;
  provider: 'google' | 'outlook' | 'icloud' | 'other';
  email: string;
  category: 'work' | 'personal';
  isDefault: boolean;
  schedulableHours: SchedulableHours;
  calcomIntegrationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchedulableHours {
  monday: TimeWindow[];
  tuesday: TimeWindow[];
  wednesday: TimeWindow[];
  thursday: TimeWindow[];
  friday: TimeWindow[];
  saturday: TimeWindow[];
  sunday: TimeWindow[];
}

export interface TimeWindow {
  start: string;
  end: string;
}

export interface Connection {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'connected';
  createdAt: Date;
  updatedAt: Date;
}

export interface Meeting {
  id: string;
  organizerId: string;
  attendeeId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  intent: 'first30m' | 'first1h' | 'coffee' | 'lunch' | 'dinner' | 'custom';
  status: 'scheduled' | 'cancelled';
  meetingLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface SuggestionChip {
  id: string;
  label: string;
  intent: 'first30m' | 'first1h' | 'coffee' | 'lunch' | 'dinner';
  duration: number;
  bufferBefore?: number;
  bufferAfter?: number;
  timeWindow?: {
    start: string;
    end: string;
  };
  disabled?: boolean;
}

export interface AvailabilityRequest {
  user1Id: string;
  user2Id: string;
  startDate: string;
  endDate: string;
  duration: number;
  intent?: string;
}

export interface AvailabilityResponse {
  slots: TimeSlot[];
  timezone: string;
}
