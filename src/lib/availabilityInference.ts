import { CalendarEvent } from './calcomSync';

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  confidence: number; // 0-1, how confident we are this is a good time
  reason: string;
  type: 'focus' | 'meeting' | 'flexible';
}

export interface MeetingPattern {
  dayOfWeek: number; // 0-6, Sunday-Saturday
  timeSlot: string; // e.g., '09:00-10:00'
  frequency: number; // how often this pattern occurs
  averageDuration: number; // in minutes
  meetingTypes: string[];
  confidence: number;
}

export interface AvailabilityInsights {
  preferredMeetingTimes: MeetingPattern[];
  focusTimeBlocks: AvailabilitySlot[];
  busyPatterns: MeetingPattern[];
  recommendations: {
    bestTimeForMeetings: string;
    bestTimeForFocus: string;
    leastBusyDay: string;
    mostBusyDay: string;
    averageMeetingDuration: number;
    meetingFrequency: number;
  };
}

export class AvailabilityInferenceService {
  /**
   * Analyze calendar events to infer smart availability patterns
   */
  async inferAvailability(
    events: CalendarEvent[],
    timezone: string = 'UTC',
    lookAheadDays: number = 14
  ): Promise<AvailabilityInsights> {
    const patterns = this.analyzeMeetingPatterns(events);
    const focusBlocks = this.identifyFocusTimeBlocks(events);
    const busyPatterns = this.analyzeBusyPatterns(events);
    const recommendations = this.generateRecommendations(events, patterns);

    return {
      preferredMeetingTimes: patterns,
      focusTimeBlocks: focusBlocks,
      busyPatterns,
      recommendations
    };
  }

  /**
   * Generate optimal meeting time suggestions
   */
  async suggestMeetingTimes(
    events: CalendarEvent[],
    duration: number, // in minutes
    preferredTimeRange?: { start: string; end: string },
    excludeDays?: number[]
  ): Promise<AvailabilitySlot[]> {
    const suggestions: AvailabilitySlot[] = [];
    const now = new Date();
    const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks ahead

    // Analyze historical patterns
    const patterns = this.analyzeMeetingPatterns(events);
    const busyTimes = this.getBusyTimeSlots(events);

    // Generate suggestions for each day
    for (let date = new Date(now); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      
      // Skip excluded days
      if (excludeDays?.includes(dayOfWeek)) continue;
      
      // Skip weekends unless explicitly allowed
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const daySlots = this.generateDaySlots(
        new Date(date),
        duration,
        preferredTimeRange || { start: '09:00', end: '17:00' },
        busyTimes,
        patterns
      );

      suggestions.push(...daySlots);
    }

    // Sort by confidence score
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }

  /**
   * Analyze meeting patterns from historical data
   */
  private analyzeMeetingPatterns(events: CalendarEvent[]): MeetingPattern[] {
    const patterns = new Map<string, {
      count: number;
      durations: number[];
      types: string[];
    }>();

    // Group events by day of week and time slot
    events.forEach(event => {
      const dayOfWeek = event.startTime.getDay();
      const hour = event.startTime.getHours();
      const timeSlot = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
      const key = `${dayOfWeek}-${timeSlot}`;
      
      const duration = (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60);
      
      if (!patterns.has(key)) {
        patterns.set(key, { count: 0, durations: [], types: [] });
      }
      
      const pattern = patterns.get(key)!;
      pattern.count++;
      pattern.durations.push(duration);
      pattern.types.push(event.type);
    });

    // Convert to MeetingPattern objects
    const result: MeetingPattern[] = [];
    patterns.forEach((data, key) => {
      const [dayOfWeek, timeSlot] = key.split('-');
      const avgDuration = data.durations.reduce((a, b) => a + b, 0) / data.durations.length;
      const frequency = data.count / this.getWeeksInData(events);
      
      result.push({
        dayOfWeek: parseInt(dayOfWeek),
        timeSlot,
        frequency,
        averageDuration: avgDuration,
        meetingTypes: [...new Set(data.types)],
        confidence: Math.min(frequency / 2, 1) // Higher frequency = higher confidence
      });
    });

    return result.filter(p => p.frequency > 0.1); // Only patterns that occur at least 10% of the time
  }

  /**
   * Identify focus time blocks (periods without meetings)
   */
  private identifyFocusTimeBlocks(events: CalendarEvent[]): AvailabilitySlot[] {
    const focusBlocks: AvailabilitySlot[] = [];
    const workingHours = { start: 9, end: 17 }; // 9 AM to 5 PM
    
    // Analyze each day for focus time patterns
    const dayGroups = this.groupEventsByDay(events);
    
    dayGroups.forEach((dayEvents, dateKey) => {
      const date = new Date(dateKey);
      const dayOfWeek = date.getDay();
      
      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) return;
      
      // Find gaps between meetings
      const sortedEvents = dayEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const currentEnd = sortedEvents[i].endTime;
        const nextStart = sortedEvents[i + 1].startTime;
        const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);
        
        // If gap is 60+ minutes, it's potential focus time
        if (gapMinutes >= 60) {
          focusBlocks.push({
            start: new Date(currentEnd),
            end: new Date(nextStart),
            confidence: Math.min(gapMinutes / 120, 1), // Longer gaps = higher confidence
            reason: `${gapMinutes}min gap between meetings`,
            type: 'focus'
          });
        }
      }
    });

    return focusBlocks.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze busy patterns to avoid scheduling conflicts
   */
  private analyzeBusyPatterns(events: CalendarEvent[]): MeetingPattern[] {
    const busySlots = new Map<string, number>();
    
    events.forEach(event => {
      const dayOfWeek = event.startTime.getDay();
      const hour = event.startTime.getHours();
      const key = `${dayOfWeek}-${hour}`;
      
      busySlots.set(key, (busySlots.get(key) || 0) + 1);
    });

    const totalWeeks = this.getWeeksInData(events);
    const busyPatterns: MeetingPattern[] = [];

    busySlots.forEach((count, key) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      const frequency = count / totalWeeks;
      
      if (frequency > 0.5) { // Busy more than 50% of the time
        busyPatterns.push({
          dayOfWeek,
          timeSlot: `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`,
          frequency,
          averageDuration: 60, // Assume 1 hour
          meetingTypes: ['busy'],
          confidence: frequency
        });
      }
    });

    return busyPatterns;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    events: CalendarEvent[],
    patterns: MeetingPattern[]
  ): AvailabilityInsights['recommendations'] {
    const meetingEvents = events.filter(e => e.type === 'meeting');
    const totalDuration = meetingEvents.reduce((sum, e) => 
      sum + (e.endTime.getTime() - e.startTime.getTime()), 0
    );
    const avgDuration = totalDuration / meetingEvents.length / (1000 * 60);
    
    // Find best times
    const bestMeetingPattern = patterns.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    , patterns[0]);
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Analyze day-wise meeting frequency
    const dayFrequency = new Array(7).fill(0);
    events.forEach(event => {
      dayFrequency[event.startTime.getDay()]++;
    });
    
    const leastBusyDay = dayFrequency.indexOf(Math.min(...dayFrequency.slice(1, 6))); // Exclude weekends
    const mostBusyDay = dayFrequency.indexOf(Math.max(...dayFrequency.slice(1, 6)));
    
    return {
      bestTimeForMeetings: bestMeetingPattern?.timeSlot || '10:00-11:00',
      bestTimeForFocus: '09:00-11:00', // Early morning typically best for focus
      leastBusyDay: dayNames[leastBusyDay],
      mostBusyDay: dayNames[mostBusyDay],
      averageMeetingDuration: Math.round(avgDuration),
      meetingFrequency: meetingEvents.length / this.getWeeksInData(events)
    };
  }

  /**
   * Generate available slots for a specific day
   */
  private generateDaySlots(
    date: Date,
    duration: number,
    timeRange: { start: string; end: string },
    busyTimes: Date[],
    patterns: MeetingPattern[]
  ): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    const dayOfWeek = date.getDay();
    
    // Parse time range
    const [startHour] = timeRange.start.split(':').map(Number);
    const [endHour] = timeRange.end.split(':').map(Number);
    
    // Generate 30-minute slots
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
        
        // Check if slot conflicts with busy times
        const hasConflict = busyTimes.some(busyTime => 
          slotStart < busyTime && slotEnd > busyTime
        );
        
        if (!hasConflict && slotEnd.getHours() <= endHour) {
          // Calculate confidence based on patterns
          const confidence = this.calculateSlotConfidence(slotStart, patterns, dayOfWeek);
          
          slots.push({
            start: slotStart,
            end: slotEnd,
            confidence,
            reason: this.getSlotReason(confidence, patterns, dayOfWeek, hour),
            type: 'meeting'
          });
        }
      }
    }
    
    return slots;
  }

  /**
   * Calculate confidence score for a time slot
   */
  private calculateSlotConfidence(
    slotStart: Date,
    patterns: MeetingPattern[],
    dayOfWeek: number
  ): number {
    const hour = slotStart.getHours();
    const timeSlot = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
    
    // Find matching pattern
    const matchingPattern = patterns.find(p => 
      p.dayOfWeek === dayOfWeek && p.timeSlot === timeSlot
    );
    
    if (matchingPattern) {
      return matchingPattern.confidence;
    }
    
    // Default confidence based on time of day
    if (hour >= 10 && hour <= 11) return 0.8; // Morning meetings
    if (hour >= 14 && hour <= 15) return 0.7; // Early afternoon
    if (hour >= 9 && hour <= 16) return 0.6; // General working hours
    return 0.3; // Outside preferred times
  }

  /**
   * Get reason for slot recommendation
   */
  private getSlotReason(
    confidence: number,
    patterns: MeetingPattern[],
    dayOfWeek: number,
    hour: number
  ): string {
    if (confidence > 0.8) return 'High success rate for meetings at this time';
    if (confidence > 0.6) return 'Good time based on your meeting patterns';
    if (hour >= 10 && hour <= 11) return 'Optimal morning meeting time';
    if (hour >= 14 && hour <= 15) return 'Good afternoon slot';
    return 'Available time slot';
  }

  /**
   * Get busy time slots from events
   */
  private getBusyTimeSlots(events: CalendarEvent[]): Date[] {
    const busyTimes: Date[] = [];
    
    events.forEach(event => {
      const current = new Date(event.startTime);
      while (current < event.endTime) {
        busyTimes.push(new Date(current));
        current.setMinutes(current.getMinutes() + 15); // 15-minute intervals
      }
    });
    
    return busyTimes;
  }

  /**
   * Group events by day
   */
  private groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
    const groups = new Map<string, CalendarEvent[]>();
    
    events.forEach(event => {
      const dateKey = event.startTime.toDateString();
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(event);
    });
    
    return groups;
  }

  /**
   * Calculate number of weeks in the data set
   */
  private getWeeksInData(events: CalendarEvent[]): number {
    if (events.length === 0) return 1;
    
    const dates = events.map(e => e.startTime.getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const weeks = (maxDate - minDate) / (1000 * 60 * 60 * 24 * 7);
    
    return Math.max(weeks, 1);
  }
}

// Export singleton instance
export const availabilityInferenceService = new AvailabilityInferenceService();