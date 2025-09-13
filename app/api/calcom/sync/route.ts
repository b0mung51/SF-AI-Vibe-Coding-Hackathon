import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { config as authOptions } from '@/auth';
import { calcomClient } from '@/src/lib/calcom';

/**
 * Cal.com Calendar Sync API
 * Handles automatic calendar synchronization and working hours detection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { action, userId, lookbackDays = 30 } = await request.json();

    switch (action) {
      case 'detect_working_hours': {
        try {
          const workingHoursData = await calcomClient.detectWorkingHours(
            userId || parseInt(session.user.id || '0'),
            lookbackDays
          );

          return NextResponse.json({
            success: true,
            data: workingHoursData,
            message: `Working hours detected with ${Math.round(workingHoursData.confidence * 100)}% confidence`
          });
        } catch (error) {
          console.error('Error detecting working hours:', error);
          return NextResponse.json(
            { 
              error: 'Failed to detect working hours',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'sync_calendar': {
        try {
          const syncResult = await calcomClient.syncUserCalendar(
            userId || parseInt(session.user.id || '0')
          );

          return NextResponse.json({
            success: syncResult.success,
            data: {
              eventsCount: syncResult.eventsCount,
              lastSync: syncResult.lastSync
            },
            message: syncResult.success 
              ? `Successfully synced ${syncResult.eventsCount} events`
              : 'Calendar sync failed'
          });
        } catch (error) {
          console.error('Error syncing calendar:', error);
          return NextResponse.json(
            { 
              error: 'Failed to sync calendar',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'get_availability': {
        try {
          const { dateFrom, dateTo, timeZone } = await request.json();
          
          if (!dateFrom || !dateTo) {
            return NextResponse.json(
              { error: 'dateFrom and dateTo are required' },
              { status: 400 }
            );
          }

          const availability = await calcomClient.getAvailability({
            userId: userId || parseInt(session.user.id || '0'),
            dateFrom,
            dateTo,
            timeZone
          });

          return NextResponse.json({
            success: true,
            data: availability
          });
        } catch (error) {
          console.error('Error getting availability:', error);
          return NextResponse.json(
            { 
              error: 'Failed to get availability',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'get_busy_times': {
        try {
          const { dateFrom, dateTo, timeZone } = await request.json();
          
          if (!dateFrom || !dateTo) {
            return NextResponse.json(
              { error: 'dateFrom and dateTo are required' },
              { status: 400 }
            );
          }

          const busyTimes = await calcomClient.getBusyTimes({
            userId: userId || parseInt(session.user.id || '0'),
            dateFrom,
            dateTo,
            timeZone
          });

          return NextResponse.json({
            success: true,
            data: { busy: busyTimes }
          });
        } catch (error) {
          console.error('Error getting busy times:', error);
          return NextResponse.json(
            { 
              error: 'Failed to get busy times',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: detect_working_hours, sync_calendar, get_availability, get_busy_times' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cal.com sync API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get Cal.com user information and schedules
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    switch (action) {
      case 'user_info': {
        try {
          const user = await calcomClient.getUser(
            userId ? parseInt(userId) : undefined
          );

          return NextResponse.json({
            success: true,
            data: user
          });
        } catch (error) {
          console.error('Error getting user info:', error);
          return NextResponse.json(
            { 
              error: 'Failed to get user information',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'event_types': {
        try {
          const eventTypes = await calcomClient.getEventTypes(
            userId ? parseInt(userId) : undefined
          );

          return NextResponse.json({
            success: true,
            data: { eventTypes }
          });
        } catch (error) {
          console.error('Error getting event types:', error);
          return NextResponse.json(
            { 
              error: 'Failed to get event types',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'schedules': {
        try {
          const schedules = await calcomClient.getSchedules(
            userId ? parseInt(userId) : undefined
          );

          return NextResponse.json({
            success: true,
            data: { schedules }
          });
        } catch (error) {
          console.error('Error getting schedules:', error);
          return NextResponse.json(
            { 
              error: 'Failed to get schedules',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'bookings': {
        try {
          const from = searchParams.get('from');
          const to = searchParams.get('to');
          const status = searchParams.get('status');
          
          const bookings = await calcomClient.getBookings({
            userId: userId ? parseInt(userId) : undefined,
            from: from || undefined,
            to: to || undefined,
            status: status || undefined
          });

          return NextResponse.json({
            success: true,
            data: { bookings }
          });
        } catch (error) {
          console.error('Error getting bookings:', error);
          return NextResponse.json(
            { 
              error: 'Failed to get bookings',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: user_info, event_types, schedules, bookings' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cal.com sync API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}