export interface User {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Connection {
  id: string;
  requesterId: string;
  targetId: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  createdAt: Date;
  acceptedAt?: Date;
}

export interface CalendarIntegration {
  id: string;
  userId: string;
  calcomApiKey: string;
  calcomUserId: string;
  isActive: boolean;
  lastSync: Date;
  createdAt: Date;
}

export interface Meeting {
  id: string;
  connectionId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  meetingLink?: string;
  createdAt: Date;
}

export interface AvailabilitySlot {
  id: string;
  integrationId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  createdAt: Date;
}

export interface TimeSlotSuggestion {
  startTime: string;
  endTime: string;
  confidence: number;
  date: string;
}
