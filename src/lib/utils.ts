import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwindcss-merge"
import { startOfDay, format, parseISO } from 'date-fns'
import type { TimeSlot, SuggestionType } from '@/types';

/**
 * Utility function to merge class names with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format date to ISO string
 */
export function formatToISO(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO string to Date
 */
export function parseFromISO(isoString: string): Date {
  return parseISO(isoString);
}

/**
 * Format date for display
 */
export function formatDisplayDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy');
}

/**
 * Format time for display
 */
export function formatDisplayTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'h:mm a');
}

/**
 * Format date and time for display
 */
export function formatDisplayDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy h:mm a');
}

/**
 * Get next 3 days starting from today
 */
export function getNext3Days(): Date[] {
  const today = startOfDay(new Date());
  return [today, addDays(today, 1), addDays(today, 2)];
}

/**
 * Check if a date is today
 */
export function isDateToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isToday(dateObj);
}

/**
 * Check if a date is weekend
 */
export function isDateWeekend(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isWeekend(dateObj);
}

/**
 * Generate time slots for a given day
 */
export function generateTimeSlots(
  date: Date,
  startHour: number = 9,
  endHour: number = 17,
  intervalMinutes: number = 30
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const dayStart = new Date(date);
  dayStart.setHours(startHour, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, 0, 0, 0);
  
  let currentTime = new Date(dayStart);
  
  while (currentTime < dayEnd) {
    const slotEnd = new Date(currentTime);
    slotEnd.setMinutes(currentTime.getMinutes() + intervalMinutes);
    
    slots.push({
      start: currentTime.toISOString(),
      end: slotEnd.toISOString(),
      available: true
    });
    
    currentTime = new Date(slotEnd);
  }
  
  return slots;
}

/**
 * Check if two time slots overlap
 */
export function slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  const start1 = parseISO(slot1.start);
  const end1 = parseISO(slot1.end);
  const start2 = parseISO(slot2.start);
  const end2 = parseISO(slot2.end);
  
  return start1 < end2 && start2 < end1;
}

/**
 * Find mutual available slots between two users
 */
export function findMutualSlots(
  user1Slots: TimeSlot[],
  user2Slots: TimeSlot[],
  duration: number = 30
): TimeSlot[] {
  const mutualSlots: TimeSlot[] = [];
  
  // Get available slots for both users
  const user1Available = user1Slots.filter(slot => slot.available);
  const user2Available = user2Slots.filter(slot => slot.available);
  
  // Find overlapping available slots
  user1Available.forEach(slot1 => {
    user2Available.forEach(slot2 => {
      if (slotsOverlap(slot1, slot2)) {
        const start = new Date(Math.max(
          parseISO(slot1.start).getTime(),
          parseISO(slot2.start).getTime()
        ));
        const end = new Date(Math.min(
          parseISO(slot1.end).getTime(),
          parseISO(slot2.end).getTime()
        ));
        
        // Check if the overlap is long enough for the meeting duration
        if (end.getTime() - start.getTime() >= duration * 60 * 1000) {
          mutualSlots.push({
            start: start.toISOString(),
            end: end.toISOString(),
            available: true
          });
        }
      }
    });
  });
  
  return mutualSlots;
}

/**
 * Get suggestion chip configuration
 */
export function getSuggestionChips() {
  return [
    {
      type: 'first_30min' as SuggestionType,
      label: 'Quick 30min',
      icon: '⚡',
      description: 'First available 30-minute slot'
    },
    {
      type: 'first_1hour' as SuggestionType,
      label: 'First Hour',
      icon: '🕐',
      description: 'First available 1-hour slot'
    },
    {
      type: 'morning_coffee' as SuggestionType,
      label: 'Morning Coffee',
      icon: '☕',
      description: 'Morning coffee chat (9-11 AM)'
    },
    {
      type: 'lunch' as SuggestionType,
      label: 'Lunch Meeting',
      icon: '🍽️',
      description: 'Lunch time meeting (12-2 PM)'
    },
    {
      type: 'dinner' as SuggestionType,
      label: 'Dinner',
      icon: '🍽️',
      description: 'Evening dinner meeting (6-8 PM)'
    }
  ];
}

/**
 * Generate a shareable username from email
 */
export function generateUsername(email: string): string {
  const localPart = email.split('@')[0];
  const cleanUsername = localPart.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${cleanUsername}${randomSuffix}`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate time format (HH:mm)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Convert 24-hour time to 12-hour format
 */
export function convertTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Convert 12-hour time to 24-hour format
 */
export function convertTo24Hour(time12: string): string {
  const [time, period] = time12.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let hours24 = hours;
  
  if (period === 'PM' && hours !== 12) {
    hours24 += 12;
  } else if (period === 'AM' && hours === 12) {
    hours24 = 0;
  }
  
  return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Generate Google Calendar deep link
 */
export function generateGoogleCalendarLink({
  title,
  startTime,
  endTime,
  description,
  location
}: {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
}): string {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startTime.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endTime.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    ...(description && { details: description }),
    ...(location && { location })
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate Outlook Calendar deep link
 */
export function generateOutlookCalendarLink({
  title,
  startTime,
  endTime,
  description,
  location
}: {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
}): string {
  const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
  const params = new URLSearchParams({
    subject: title,
    startdt: startTime,
    enddt: endTime,
    ...(description && { body: description }),
    ...(location && { location })
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}