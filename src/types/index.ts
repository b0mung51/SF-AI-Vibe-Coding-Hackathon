// Core user and authentication types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string;
  googleId: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Time slot and availability types
export interface TimeSlot {
  start: string; // ISO 8601
  end: string; // ISO 8601
  available?: boolean;
  title?: string; // Only for viewer's events
}

export interface AvailabilitySlot extends TimeSlot {
  available: true;
}

export interface BusySlot extends TimeSlot {
  available: false;
  title?: string;
}

export interface DateRange {
  from: string; // ISO 8601
  to: string; // ISO 8601
}

// AI suggestions and scheduling types
export type SuggestionType = 'first_30min' | 'first_1hour' | 'morning_coffee' | 'lunch' | 'dinner';

export interface Suggestion {
  type: SuggestionType;
  slot: TimeSlot;
  confidence: number;
}

export interface SchedulingPrefs {
  timezone?: string;
  workingHours?: WorkingHours;
  lunchWindow?: LunchWindow;
}

// Booking and calendar types
export type BookingMethod = 'deeplink' | 'calcom';

export interface BookingRequest {
  slot: TimeSlot;
  participants: string[];
  method: BookingMethod;
  title?: string;
}

export interface BookingResponse {
  bookingUrl: string;
  status: string;
}

// Working hours and preferences
export interface WorkingHours {
  [day: string]: {
    start: string; // HH:mm format
    end: string; // HH:mm format
    enabled: boolean;
  };
}

export interface LunchWindow {
  start: string; // HH:mm format
  end: string; // HH:mm format
  enabled: boolean;
}

// Calendar source and database types
export interface CalendarSource {
  id: string;
  userId: string;
  calUserId: string; // Cal.com user ID
  providerCategory: 'work' | 'personal';
  isDefault: boolean;
  accessToken: string; // Encrypted
  refreshToken?: string; // Encrypted
  lastSync: Date;
  createdAt: Date;
}

export interface AvailabilityPrefs {
  id: string;
  userId: string;
  workingHours: WorkingHours;
  lunchWindow: LunchWindow;
  timezone: string;
  blackoutDates: Date[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CachedAvailability {
  id: string;
  userId: string;
  dateRange: string;
  slots: TimeSlot[];
  expiresAt: Date;
}

export interface Booking {
  id: string;
  organizerId: string;
  participants: string[];
  startTime: Date;
  endTime: Date;
  title: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  bookingMethod: BookingMethod;
}

// API request and response types
export interface AuthRequest {
  code: string;
  state?: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface AvailabilityRequest {
  user: string;
  from: string;
  to: string;
}

export interface AvailabilityResponse {
  slots: AvailabilitySlot[];
  busy: BusySlot[];
}

export interface MutualAvailabilityRequest {
  participants: string[];
  range: DateRange;
  duration: number;
}

export interface MutualAvailabilityResponse {
  mutualSlots: TimeSlot[];
}

export interface SuggestRequest {
  participants: string[];
  intents: SuggestionType[];
  preferences?: SchedulingPrefs;
}

export interface SuggestResponse {
  suggestions: Suggestion[];
}

// UI component types
export interface SuggestionChip {
  type: SuggestionType;
  label: string;
  icon: string;
  description: string;
}

export interface CalendarDay {
  date: Date;
  slots: TimeSlot[];
  isToday: boolean;
  isWeekend: boolean;
}

export interface CalendarOverlayProps {
  userSlots: TimeSlot[];
  otherUserSlots: TimeSlot[];
  mutualSlots: TimeSlot[];
  selectedDuration: number;
  onSlotSelect: (slot: TimeSlot) => void;
}

// Form and validation types
export interface WorkingHoursForm {
  monday: { start: string; end: string; enabled: boolean };
  tuesday: { start: string; end: string; enabled: boolean };
  wednesday: { start: string; end: string; enabled: boolean };
  thursday: { start: string; end: string; enabled: boolean };
  friday: { start: string; end: string; enabled: boolean };
  saturday: { start: string; end: string; enabled: boolean };
  sunday: { start: string; end: string; enabled: boolean };
}

export interface OnboardingData {
  workingHours: WorkingHoursForm;
  lunchWindow: LunchWindow;
  timezone: string;
}

// Error handling types
export interface ApiError {
  message: string;
  code: string;
  details?: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
}

// State management types (for Zustand)
export interface AppState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  availability: TimeSlot[];
  selectedSlot: TimeSlot | null;
  isLoading: boolean;
  error: string | null;
}

export interface AppActions {
  setUser: (user: UserProfile | null) => void;
  setAvailability: (slots: TimeSlot[]) => void;
  setSelectedSlot: (slot: TimeSlot | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export type AppStore = AppState & AppActions;