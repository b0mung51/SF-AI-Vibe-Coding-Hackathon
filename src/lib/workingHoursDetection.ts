/**
 * Working Hours Detection Service
 * Automatically detects working hours from calendar history using AI and pattern analysis
 */

import { calcomClient, CalcomBooking } from './calcom';

export interface WorkingHoursPattern {
  day: string;
  start: string; // HH:MM format
  end: string; // HH:MM format
  enabled: boolean;
  confidence: number; // 0-1 scale
  meetingCount: number;
  averageGapBetweenMeetings: number; // in minutes
}

export interface LunchWindowPattern {
  start: string;
  end: string;
  enabled: boolean;
  confidence: number;
  detectedFromGaps: boolean;
}

export interface WorkingHoursAnalysis {
  workingHours: Record<string, WorkingHoursPattern>;
  lunchWindow: LunchWindowPattern;
  overallConfidence: number;
  analysisMetadata: {
    totalBookings: number;
    dateRange: {
      from: string;
      to: string;
    };
    uniqueDaysWithMeetings: number;
    averageMeetingsPerDay: number;
    mostActiveDays: string[];
    preferredMeetingTimes: Array<{
      hour: number;
      frequency: number;
    }>;
  };
}

class WorkingHoursDetectionService {
  private readonly dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  private readonly businessDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  
  /**
   * Analyze calendar history and detect working hours patterns
   */
  async analyzeWorkingHours(
    userId: number,
    lookbackDays: number = 60,
    _timeZone: string = 'UTC'
  ): Promise<WorkingHoursAnalysis> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    try {
      // Fetch bookings from Cal.com
      const bookings = await calcomClient.getBookings({
        userId,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
        status: 'ACCEPTED'
      });

      if (bookings.length === 0) {
        return this.getDefaultWorkingHours(timeZone);
      }

      // Analyze patterns
      const analysis = this.analyzeBookingPatterns(bookings, timeZone);
      const workingHours = this.detectDailyWorkingHours(analysis);
      const lunchWindow = this.detectLunchWindow(analysis);
      const overallConfidence = this.calculateOverallConfidence(analysis, workingHours);

      return {
        workingHours,
        lunchWindow,
        overallConfidence,
        analysisMetadata: {
          totalBookings: bookings.length,
          dateRange: {
            from: startDate.toISOString(),
            to: endDate.toISOString()
          },
          uniqueDaysWithMeetings: analysis.uniqueDaysWithMeetings,
          averageMeetingsPerDay: analysis.averageMeetingsPerDay,
          mostActiveDays: analysis.mostActiveDays,
          preferredMeetingTimes: analysis.preferredMeetingTimes
        }
      };
    } catch (error) {
      console.error('Error analyzing working hours:', error);
      return this.getDefaultWorkingHours(timeZone);
    }
  }

  /**
   * Analyze booking patterns to extract insights
   */
  private analyzeBookingPatterns(bookings: CalcomBooking[], _timeZone: string) {
    const dayPatterns: Record<string, Array<{ start: number; end: number; date: string }>> = {
      sunday: [],
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: []
    };

    const hourlyFrequency: Record<number, number> = {};
    const uniqueDates = new Set<string>();
    const gapAnalysis: Array<{ start: number; end: number; day: string }> = [];

    // Process each booking
    bookings.forEach(booking => {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      const dayName = this.dayNames[start.getDay()];
      const dateString = start.toDateString();
      
      uniqueDates.add(dateString);
      
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();
      
      dayPatterns[dayName].push({
        start: startMinutes,
        end: endMinutes,
        date: dateString
      });

      // Track hourly frequency
      const hour = start.getHours();
      hourlyFrequency[hour] = (hourlyFrequency[hour] || 0) + 1;
    });

    // Analyze gaps between meetings for lunch detection
    Object.entries(dayPatterns).forEach(([day, meetings]) => {
      if (meetings.length > 1) {
        const sortedMeetings = meetings.sort((a, b) => a.start - b.start);
        
        for (let i = 0; i < sortedMeetings.length - 1; i++) {
          const currentEnd = sortedMeetings[i].end;
          const nextStart = sortedMeetings[i + 1].start;
          const gap = nextStart - currentEnd;
          
          // Consider gaps between 30 minutes and 2 hours as potential lunch breaks
          if (gap >= 30 && gap <= 120) {
            gapAnalysis.push({
              start: currentEnd,
              end: nextStart,
              day
            });
          }
        }
      }
    });

    // Calculate preferred meeting times
    const preferredMeetingTimes = Object.entries(hourlyFrequency)
      .map(([hour, frequency]) => ({ hour: parseInt(hour), frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    // Find most active days
    const dayActivity = Object.entries(dayPatterns)
      .map(([day, meetings]) => ({ day, count: meetings.length }))
      .sort((a, b) => b.count - a.count);
    
    const mostActiveDays = dayActivity
      .filter(d => d.count > 0)
      .slice(0, 3)
      .map(d => d.day);

    return {
      dayPatterns,
      hourlyFrequency,
      uniqueDaysWithMeetings: uniqueDates.size,
      averageMeetingsPerDay: bookings.length / Math.max(uniqueDates.size, 1),
      mostActiveDays,
      preferredMeetingTimes,
      gapAnalysis
    };
  }

  /**
   * Detect daily working hours from patterns
   */
  private detectDailyWorkingHours(analysis: {
    dayPatterns: Record<string, Array<{ start: number; end: number; date: string }>>;
    hourlyFrequency: Record<number, number>;
    uniqueDaysWithMeetings: number;
    averageMeetingsPerDay: number;
    mostActiveDays: string[];
    preferredMeetingTimes: Array<{ hour: number; frequency: number }>;
    gapAnalysis: Array<{ start: number; end: number; day: string }>;
  }): Record<string, WorkingHoursPattern> {
    const workingHours: Record<string, WorkingHoursPattern> = {};

    this.dayNames.forEach(day => {
      const meetings = analysis.dayPatterns[day];
      
      if (meetings.length === 0) {
        // No meetings on this day
        workingHours[day] = {
          day,
          start: '09:00',
          end: '17:00',
          enabled: this.businessDays.includes(day), // Enable business days by default
          confidence: 0,
          meetingCount: 0,
          averageGapBetweenMeetings: 0
        };
      } else {
        // Calculate working hours based on meeting patterns
        const startTimes = meetings.map(m => m.start);
        const endTimes = meetings.map(m => m.end);
        
        const earliestStart = Math.min(...startTimes);
        const latestEnd = Math.max(...endTimes);
        
        // Add buffer time (30 minutes before first meeting, 30 minutes after last)
        const workStart = Math.max(0, earliestStart - 30);
        const workEnd = Math.min(24 * 60, latestEnd + 30);
        
        // Calculate average gap between meetings
        const sortedMeetings = meetings.sort((a, b) => a.start - b.start);
        let totalGap = 0;
        let gapCount = 0;
        
        for (let i = 0; i < sortedMeetings.length - 1; i++) {
          const gap = sortedMeetings[i + 1].start - sortedMeetings[i].end;
          if (gap > 0) {
            totalGap += gap;
            gapCount++;
          }
        }
        
        const averageGap = gapCount > 0 ? totalGap / gapCount : 0;
        
        // Calculate confidence based on data consistency
        const timeSpread = latestEnd - earliestStart;
        const meetingDensity = meetings.length / Math.max(timeSpread / 60, 1); // meetings per hour
        const confidence = Math.min(1, (meetings.length / 10) * (meetingDensity / 2));
        
        workingHours[day] = {
          day,
          start: this.minutesToTime(workStart),
          end: this.minutesToTime(workEnd),
          enabled: true,
          confidence,
          meetingCount: meetings.length,
          averageGapBetweenMeetings: averageGap
        };
      }
    });

    return workingHours;
  }

  /**
   * Detect lunch window from gap analysis
   */
  private detectLunchWindow(analysis: {
    gapAnalysis: Array<{ start: number; end: number; day: string }>;
  }): LunchWindowPattern {
    const { gapAnalysis } = analysis;
    
    if (gapAnalysis.length === 0) {
      return {
        start: '12:00',
        end: '13:00',
        enabled: true,
        confidence: 0.3, // Low confidence default
        detectedFromGaps: false
      };
    }

    // Find common lunch time patterns (typically between 11:30 AM and 2:00 PM)
    const lunchTimeGaps = gapAnalysis.filter(gap => {
      const startHour = gap.start / 60;
      const endHour = gap.end / 60;
      return startHour >= 11.5 && endHour <= 14;
    });

    if (lunchTimeGaps.length === 0) {
      return {
        start: '12:00',
        end: '13:00',
        enabled: false,
        confidence: 0.1,
        detectedFromGaps: false
      };
    }

    // Calculate average lunch window
    const avgStart = lunchTimeGaps.reduce((sum, gap) => sum + gap.start, 0) / lunchTimeGaps.length;
    const avgEnd = lunchTimeGaps.reduce((sum, gap) => sum + gap.end, 0) / lunchTimeGaps.length;
    
    // Calculate confidence based on consistency
    const startVariance = lunchTimeGaps.reduce((sum, gap) => sum + Math.pow(gap.start - avgStart, 2), 0) / lunchTimeGaps.length;
    const endVariance = lunchTimeGaps.reduce((sum, gap) => sum + Math.pow(gap.end - avgEnd, 2), 0) / lunchTimeGaps.length;
    
    const consistency = 1 / (1 + (startVariance + endVariance) / 3600); // Normalize variance
    const frequency = lunchTimeGaps.length / Math.max(analysis.uniqueDaysWithMeetings, 1);
    const confidence = Math.min(1, consistency * frequency * 2);

    return {
      start: this.minutesToTime(Math.round(avgStart)),
      end: this.minutesToTime(Math.round(avgEnd)),
      enabled: confidence > 0.3,
      confidence,
      detectedFromGaps: true
    };
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    analysis: {
      uniqueDaysWithMeetings: number;
      averageMeetingsPerDay: number;
    },
    workingHours: Record<string, WorkingHoursPattern>
  ): number {
    const { totalBookings, uniqueDaysWithMeetings, averageMeetingsPerDay } = analysis.analysisMetadata || {
      totalBookings: analysis.dayPatterns ? Object.values(analysis.dayPatterns).flat().length : 0,
      uniqueDaysWithMeetings: analysis.uniqueDaysWithMeetings || 0,
      averageMeetingsPerDay: analysis.averageMeetingsPerDay || 0
    };

    // Factors that increase confidence
    const dataVolumeScore = Math.min(1, totalBookings / 50); // More bookings = higher confidence
    const timeSpanScore = Math.min(1, uniqueDaysWithMeetings / 30); // More days = higher confidence
    const consistencyScore = Math.min(1, averageMeetingsPerDay / 3); // Regular meetings = higher confidence
    
    // Average confidence from individual day patterns
    const dayConfidences = Object.values(workingHours)
      .filter(day => day.enabled)
      .map(day => day.confidence);
    
    const avgDayConfidence = dayConfidences.length > 0 
      ? dayConfidences.reduce((sum, conf) => sum + conf, 0) / dayConfidences.length 
      : 0;

    // Weighted overall confidence
    const overallConfidence = (
      dataVolumeScore * 0.3 +
      timeSpanScore * 0.3 +
      consistencyScore * 0.2 +
      avgDayConfidence * 0.2
    );

    return Math.round(overallConfidence * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get default working hours when no data is available
   */
  private getDefaultWorkingHours(_timeZone: string): WorkingHoursAnalysis {
    const defaultHours: Record<string, WorkingHoursPattern> = {};
    
    this.dayNames.forEach(day => {
      const isBusinessDay = this.businessDays.includes(day);
      defaultHours[day] = {
        day,
        start: '09:00',
        end: '17:00',
        enabled: isBusinessDay,
        confidence: 0,
        meetingCount: 0,
        averageGapBetweenMeetings: 0
      };
    });

    return {
      workingHours: defaultHours,
      lunchWindow: {
        start: '12:00',
        end: '13:00',
        enabled: true,
        confidence: 0.3,
        detectedFromGaps: false
      },
      overallConfidence: 0,
      analysisMetadata: {
        totalBookings: 0,
        dateRange: {
          from: new Date().toISOString(),
          to: new Date().toISOString()
        },
        uniqueDaysWithMeetings: 0,
        averageMeetingsPerDay: 0,
        mostActiveDays: [],
        preferredMeetingTimes: []
      }
    };
  }

  /**
   * Convert minutes from midnight to HH:MM format
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Convert HH:MM format to minutes from midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Suggest optimal meeting times based on analysis
   */
  async suggestOptimalMeetingTimes(
    userId: number,
    duration: number, // in minutes
    lookbackDays: number = 30
  ): Promise<Array<{
    time: string;
    confidence: number;
    reason: string;
  }>> {
    const analysis = await this.analyzeWorkingHours(userId, lookbackDays);
    const suggestions: Array<{ time: string; confidence: number; reason: string }> = [];

    // Analyze preferred meeting times from historical data
    const { preferredMeetingTimes } = analysis.analysisMetadata;
    
    preferredMeetingTimes.forEach(({ hour, frequency }) => {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      const confidence = Math.min(1, frequency / 10); // Normalize frequency
      
      suggestions.push({
        time,
        confidence,
        reason: `Historically active time (${frequency} meetings)`
      });
    });

    // Add suggestions based on working hours patterns
    Object.values(analysis.workingHours)
      .filter(day => day.enabled && day.confidence > 0.5)
      .forEach(day => {
        const startMinutes = this.timeToMinutes(day.start);
        const endMinutes = this.timeToMinutes(day.end);
        
        // Suggest times with good gaps for the meeting duration
        if (day.averageGapBetweenMeetings >= duration) {
          const midMorning = startMinutes + 90; // 1.5 hours after start
          const midAfternoon = endMinutes - 90; // 1.5 hours before end
          
          if (midMorning + duration <= endMinutes) {
            suggestions.push({
              time: this.minutesToTime(midMorning),
              confidence: day.confidence * 0.8,
              reason: `Good fit for ${day.day} schedule`
            });
          }
          
          if (midAfternoon >= startMinutes) {
            suggestions.push({
              time: this.minutesToTime(midAfternoon),
              confidence: day.confidence * 0.7,
              reason: `Afternoon slot on ${day.day}`
            });
          }
        }
      });

    // Sort by confidence and remove duplicates
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .filter((suggestion, index, arr) => 
        arr.findIndex(s => s.time === suggestion.time) === index
      )
      .slice(0, 5); // Return top 5 suggestions
  }
}

// Export singleton instance
export const workingHoursDetection = new WorkingHoursDetectionService();

// Export utility functions
export const workingHoursUtils = {
  /**
   * Convert working hours analysis to the format expected by the app
   */
  convertToAppFormat(analysis: WorkingHoursAnalysis): {
    workingHours: Record<string, { start: string; end: string; enabled: boolean }>;
    lunchWindow: { start: string; end: string; enabled: boolean };
    confidence: number;
  } {
    const workingHours: Record<string, { start: string; end: string; enabled: boolean }> = {};
    
    Object.entries(analysis.workingHours).forEach(([day, pattern]) => {
      workingHours[day] = {
        start: pattern.start,
        end: pattern.end,
        enabled: pattern.enabled
      };
    });

    return {
      workingHours,
      lunchWindow: {
        start: analysis.lunchWindow.start,
        end: analysis.lunchWindow.end,
        enabled: analysis.lunchWindow.enabled
      },
      confidence: analysis.overallConfidence
    };
  },

  /**
   * Generate a human-readable summary of the analysis
   */
  generateSummary(analysis: WorkingHoursAnalysis): string {
    const { overallConfidence, analysisMetadata } = analysis;
    const { totalBookings, uniqueDaysWithMeetings } = analysisMetadata;
    
    const confidenceLevel = overallConfidence > 0.8 ? 'high' : 
                           overallConfidence > 0.5 ? 'medium' : 'low';
    
    const activeDays = Object.values(analysis.workingHours)
      .filter(day => day.enabled && day.meetingCount > 0)
      .map(day => day.day)
      .join(', ');

    return `Analyzed ${totalBookings} meetings across ${uniqueDaysWithMeetings} days. ` +
           `Detected working pattern with ${confidenceLevel} confidence. ` +
           `Most active days: ${activeDays || 'None detected'}.`;
  }
};