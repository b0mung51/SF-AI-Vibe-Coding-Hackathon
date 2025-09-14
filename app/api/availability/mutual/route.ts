import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { config as authOptions } from '@/auth';
import { multiUserAvailabilityEngine } from '@/src/lib/multiUserAvailability';

interface MutualAvailabilityRequest {
  userIds: string[];
  duration: number; // minutes
  preferredTimeRange?: { start: string; end: string }; // e.g., '09:00', '17:00'
  excludeDays?: number[]; // 0-6, Sunday-Saturday
  lookAheadDays?: number;
  requireAllUsers?: boolean;
}

interface MutualAvailabilityResponse {
  success: boolean;
  availableSlots: {
    start: string;
    end: string;
    confidence: number;
    availableUsers: string[];
    conflictingUsers: string[];
    reason: string;
    type: string;
  }[];
  conflictAnalysis: {
    totalConflicts: number;
    userConflicts: Record<string, number>;
    mostConflictedTimes: string[];
  };
  recommendations: {
    bestMutualTimes: any[];
    alternativeOptions: any[];
    suggestedDuration: number;
  };
  metadata: {
    totalUsers: number;
    syncedUsers: number;
    generatedAt: string;
  };
}



export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow unauthenticated access for viewing public profiles
    // Authentication is only required for multi-user scheduling
    const body: MutualAvailabilityRequest = await request.json();
    const { userIds } = body;
    
    // Require authentication for multi-user availability (2+ users)
    if (userIds && userIds.length > 1 && !session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Authentication required for multi-user scheduling' },
        { status: 401 }
      );
    }

    const { 
      duration, 
      preferredTimeRange = { start: '09:00', end: '17:00' },
      excludeDays = [],
      lookAheadDays = 14,
      requireAllUsers = true
    } = body;

    // Validate required fields
    if (!userIds || userIds.length < 1) {
      return NextResponse.json(
        { success: false, message: 'At least 1 user ID is required' },
        { status: 400 }
      );
    }

    if (!duration || duration < 15) {
      return NextResponse.json(
        { success: false, message: 'Duration must be at least 15 minutes' },
        { status: 400 }
      );
    }

    // Sync calendar data for all users
    console.log('Syncing calendar data for users:', userIds);
    const usersData = await multiUserAvailabilityEngine.syncMultipleUsers(userIds);
    
    if (usersData.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Failed to sync calendar data for any users' },
        { status: 500 }
      );
    }

    // Find mutual availability (works for single users too)
    const availabilityRequest = {
      userIds,
      duration,
      preferredTimeRange,
      excludeDays,
      lookAheadDays,
      requireAllUsers: userIds.length === 1 ? true : requireAllUsers // For single user, always require the user
    };

    const availabilityResult = await multiUserAvailabilityEngine.findMutualAvailability(
      usersData,
      availabilityRequest
    );

    // Format response
    const response: MutualAvailabilityResponse = {
      success: true,
      availableSlots: availabilityResult.availableSlots.map(slot => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        confidence: slot.confidence,
        availableUsers: slot.availableUsers,
        conflictingUsers: slot.conflictingUsers,
        reason: slot.reason,
        type: slot.type
      })),
      conflictAnalysis: availabilityResult.conflictAnalysis,
      recommendations: availabilityResult.recommendations,
      metadata: {
        totalUsers: userIds.length,
        syncedUsers: usersData.length,
        generatedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Mutual availability error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch mutual availability. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}