import { CalendarEvent, UserAvailability } from './calcomSync';
import { AvailabilitySlot, availabilityInferenceService } from './availabilityInference';

export interface MultiUserAvailabilitySlot {
  start: Date;
  end: Date;
  confidence: number;
  availableUsers: string[];
  conflictingUsers: string[];
  reason: string;
  type: 'meeting' | 'focus' | 'flexible';
}

export interface UserCalendarData {
  userId: string;
  events: CalendarEvent[];
  availability: UserAvailability;
  timezone: string;
}

export interface MultiUserAvailabilityRequest {
  userIds: string[];
  duration: number; // in minutes
  preferredTimeRange?: { start: string; end: string };
  excludeDays?: number[];
  lookAheadDays?: number;
  requireAllUsers?: boolean; // if true, all users must be available
}

export interface MultiUserAvailabilityResponse {
  availableSlots: MultiUserAvailabilitySlot[];
  conflictAnalysis: {
    totalConflicts: number;
    userConflicts: Record<string, number>;
    mostConflictedTimes: string[];
  };
  recommendations: {
    bestMutualTimes: MultiUserAvailabilitySlot[];
    alternativeOptions: MultiUserAvailabilitySlot[];
    suggestedDuration: number;
  };
}

export class MultiUserAvailabilityEngine {
  /**
   * Find overlapping availability between multiple users
   */
  async findMutualAvailability(
    usersData: UserCalendarData[],
    request: MultiUserAvailabilityRequest
  ): Promise<MultiUserAvailabilityResponse> {
    const {
      duration,
      preferredTimeRange = { start: '09:00', end: '17:00' },
      excludeDays = [],
      lookAheadDays = 14,
      requireAllUsers = true
    } = request;

    // Generate time slots for the specified period
    const timeSlots = this.generateTimeSlots(duration, preferredTimeRange, excludeDays, lookAheadDays);
    
    // Check availability for each slot
    const availabilityResults = await Promise.all(
      timeSlots.map(slot => this.checkSlotAvailability(slot, usersData, requireAllUsers))
    );

    // Filter out unavailable slots
    const availableSlots = availabilityResults.filter(result => result !== null) as MultiUserAvailabilitySlot[];

    // Analyze conflicts
    const conflictAnalysis = this.analyzeConflicts(usersData, timeSlots);

    // Generate recommendations
    const recommendations = this.generateRecommendations(availableSlots, usersData, duration);

    return {
      availableSlots: availableSlots.sort((a, b) => b.confidence - a.confidence),
      conflictAnalysis,
      recommendations
    };
  }

  /**
   * Sync multiple users' calendars and store their data
   */
  async syncMultipleUsers(userIds: string[]): Promise<UserCalendarData[]> {
    const { calcomSyncService } = await import('./calcomSync');
    
    const syncPromises = userIds.map(async (userId) => {
      try {
        const syncResult = await calcomSyncService.performFullSync(userId);
        return {
          userId,
          events: syncResult.events,
          availability: syncResult.availability,
          timezone: syncResult.availability.timezone
        };
      } catch (error) {
        console.error(`Failed to sync user ${userId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(syncPromises);
    return results.filter(result => result !== null) as UserCalendarData[];
  }

  /**
   * Generate time slots for the specified period
   */
  private generateTimeSlots(
    duration: number,
    timeRange: { start: string; end: string },
    excludeDays: number[],
    lookAheadDays: number
  ): { start: Date; end: Date }[] {
    const slots: { start: Date; end: Date }[] = [];
    const now = new Date();
    const endDate = new Date(now.getTime() + lookAheadDays * 24 * 60 * 60 * 1000);

    const [startHour, startMinute] = timeRange.start.split(':').map(Number);
    const [endHour, endMinute] = timeRange.end.split(':').map(Number);

    for (let date = new Date(now); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      
      // Skip excluded days and weekends
      if (excludeDays.includes(dayOfWeek) || dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      // Generate 30-minute slots for the day
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotStart = new Date(date);
          slotStart.setHours(hour, minute, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

          // Ensure slot doesn't exceed working hours
          if (slotEnd.getHours() < endHour || 
              (slotEnd.getHours() === endHour && slotEnd.getMinutes() <= endMinute)) {
            slots.push({ start: slotStart, end: slotEnd });
          }
        }
      }
    }

    return slots;
  }

  /**
   * Check if a time slot is available for the specified users
   */
  private async checkSlotAvailability(
    slot: { start: Date; end: Date },
    usersData: UserCalendarData[],
    requireAllUsers: boolean
  ): Promise<MultiUserAvailabilitySlot | null> {
    const availableUsers: string[] = [];
    const conflictingUsers: string[] = [];
    let totalConfidence = 0;

    for (const userData of usersData) {
      const isAvailable = this.isUserAvailableAtTime(slot, userData);
      
      if (isAvailable.available) {
        availableUsers.push(userData.userId);
        totalConfidence += isAvailable.confidence;
      } else {
        conflictingUsers.push(userData.userId);
      }
    }

    // If requiring all users and not all are available, return null
    if (requireAllUsers && conflictingUsers.length > 0) {
      return null;
    }

    // If not requiring all users but no one is available, return null
    if (availableUsers.length === 0) {
      return null;
    }

    const averageConfidence = totalConfidence / availableUsers.length;
    const availabilityRatio = availableUsers.length / usersData.length;

    return {
      start: slot.start,
      end: slot.end,
      confidence: averageConfidence * availabilityRatio,
      availableUsers,
      conflictingUsers,
      reason: this.generateSlotReason(availableUsers, conflictingUsers, averageConfidence),
      type: 'meeting'
    };
  }

  /**
   * Check if a specific user is available at a given time
   */
  private isUserAvailableAtTime(
    slot: { start: Date; end: Date },
    userData: UserCalendarData
  ): { available: boolean; confidence: number; reason?: string } {
    const { events, availability } = userData;

    // Check for direct conflicts with existing events
    const hasConflict = events.some(event => {
      return slot.start < event.endTime && slot.end > event.startTime;
    });

    if (hasConflict) {
      return { available: false, confidence: 0, reason: 'Existing meeting conflict' };
    }

    // Check working hours
    const dayOfWeek = slot.start.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const workingHours = availability.workingHours[dayOfWeek];

    if (!workingHours?.enabled) {
      return { available: false, confidence: 0, reason: 'Outside working hours' };
    }

    const slotStartTime = slot.start.toTimeString().substring(0, 5);
    const slotEndTime = slot.end.toTimeString().substring(0, 5);

    if (slotStartTime < workingHours.start || slotEndTime > workingHours.end) {
      return { available: false, confidence: 0, reason: 'Outside working hours' };
    }

    // Check lunch window
    if (availability.lunchWindow.enabled) {
      const lunchStart = availability.lunchWindow.start;
      const lunchEnd = availability.lunchWindow.end;
      
      if (slotStartTime < lunchEnd && slotEndTime > lunchStart) {
        return { available: false, confidence: 0, reason: 'Lunch time conflict' };
      }
    }

    // Calculate confidence based on historical patterns
    const confidence = this.calculateUserSlotConfidence(slot, userData);

    return { available: true, confidence };
  }

  /**
   * Calculate confidence score for a user at a specific time slot
   */
  private calculateUserSlotConfidence(
    slot: { start: Date; end: Date },
    userData: UserCalendarData
  ): number {
    const hour = slot.start.getHours();
    const dayOfWeek = slot.start.getDay();
    
    // Analyze historical meeting patterns for this user
    const sameTimeSlotEvents = userData.events.filter(event => {
      return event.startTime.getHours() === hour && 
             event.startTime.getDay() === dayOfWeek;
    });

    const totalSimilarSlots = userData.events.filter(event => 
      event.startTime.getDay() === dayOfWeek
    ).length;

    if (totalSimilarSlots === 0) {
      // No historical data, use default confidence
      if (hour >= 10 && hour <= 11) return 0.8;
      if (hour >= 14 && hour <= 15) return 0.7;
      if (hour >= 9 && hour <= 16) return 0.6;
      return 0.3;
    }

    // Calculate confidence based on historical usage
    const usageRatio = sameTimeSlotEvents.length / totalSimilarSlots;
    return Math.max(0.3, 1 - usageRatio); // Higher usage = lower confidence for new meetings
  }

  /**
   * Analyze conflicts across all users
   */
  private analyzeConflicts(
    usersData: UserCalendarData[],
    timeSlots: { start: Date; end: Date }[]
  ): MultiUserAvailabilityResponse['conflictAnalysis'] {
    let totalConflicts = 0;
    const userConflicts: Record<string, number> = {};
    const timeConflicts: Record<string, number> = {};

    usersData.forEach(userData => {
      userConflicts[userData.userId] = 0;
    });

    timeSlots.forEach(slot => {
      const timeKey = `${slot.start.getHours()}:${slot.start.getMinutes().toString().padStart(2, '0')}`;
      
      usersData.forEach(userData => {
        const hasConflict = userData.events.some(event => 
          slot.start < event.endTime && slot.end > event.startTime
        );
        
        if (hasConflict) {
          totalConflicts++;
          userConflicts[userData.userId]++;
          timeConflicts[timeKey] = (timeConflicts[timeKey] || 0) + 1;
        }
      });
    });

    const mostConflictedTimes = Object.entries(timeConflicts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([time]) => time);

    return {
      totalConflicts,
      userConflicts,
      mostConflictedTimes
    };
  }

  /**
   * Generate recommendations based on availability analysis
   */
  private generateRecommendations(
    availableSlots: MultiUserAvailabilitySlot[],
    usersData: UserCalendarData[],
    requestedDuration: number
  ): MultiUserAvailabilityResponse['recommendations'] {
    // Best mutual times (high confidence, all users available)
    const bestMutualTimes = availableSlots
      .filter(slot => slot.confidence > 0.7 && slot.conflictingUsers.length === 0)
      .slice(0, 5);

    // Alternative options (good confidence, most users available)
    const alternativeOptions = availableSlots
      .filter(slot => 
        slot.confidence > 0.5 && 
        slot.availableUsers.length >= Math.ceil(usersData.length * 0.7)
      )
      .slice(0, 10);

    // Suggest optimal duration based on users' meeting patterns
    const avgMeetingDurations = usersData.map(userData => {
      const meetingEvents = userData.events.filter(e => e.type === 'meeting');
      if (meetingEvents.length === 0) return requestedDuration;
      
      const totalDuration = meetingEvents.reduce((sum, event) => 
        sum + (event.endTime.getTime() - event.startTime.getTime()), 0
      );
      return totalDuration / meetingEvents.length / (1000 * 60);
    });

    const suggestedDuration = Math.round(
      avgMeetingDurations.reduce((sum, duration) => sum + duration, 0) / avgMeetingDurations.length
    );

    return {
      bestMutualTimes,
      alternativeOptions,
      suggestedDuration: Math.max(15, Math.min(120, suggestedDuration)) // Between 15min and 2 hours
    };
  }

  /**
   * Generate reason text for a slot
   */
  private generateSlotReason(
    availableUsers: string[],
    conflictingUsers: string[],
    confidence: number
  ): string {
    if (conflictingUsers.length === 0) {
      if (confidence > 0.8) {
        return 'Excellent time - all users available with high confidence';
      }
      return 'Good time - all users available';
    }
    
    if (availableUsers.length > conflictingUsers.length) {
      return `Most users available (${availableUsers.length}/${availableUsers.length + conflictingUsers.length})`;
    }
    
    return `Some users available (${availableUsers.length}/${availableUsers.length + conflictingUsers.length})`;
  }
}

// Export singleton instance
export const multiUserAvailabilityEngine = new MultiUserAvailabilityEngine();