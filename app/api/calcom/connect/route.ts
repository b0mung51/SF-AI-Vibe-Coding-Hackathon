import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { config as authOptions } from '@/auth';
import { calcomClient } from '@/src/lib/calcom';

/**
 * Cal.com Connection API
 * Handles initial Cal.com account connection and setup
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

    const { action, ...data } = await request.json();

    switch (action) {
      case 'connect_account': {
        try {
          // In a real implementation, this would handle OAuth flow with Cal.com
          // For now, we'll simulate the connection process
          
          const { calcomUserId, calcomApiKey } = data;
          
          if (!calcomUserId) {
            return NextResponse.json(
              { error: 'Cal.com user ID is required' },
              { status: 400 }
            );
          }

          // Verify the Cal.com account exists and is accessible
          const calcomUser = await calcomClient.getUser(calcomUserId);
          
          if (!calcomUser) {
            return NextResponse.json(
              { error: 'Cal.com account not found or inaccessible' },
              { status: 404 }
            );
          }

          // Store the connection in your database
          // This is a mock implementation - replace with actual database storage
          const connectionData = {
            userId: session.user.id,
            calcomUserId: calcomUser.id,
            calcomUsername: calcomUser.username,
            calcomEmail: calcomUser.email,
            timeZone: calcomUser.timeZone,
            connectedAt: new Date().toISOString(),
            status: 'connected'
          };

          // Automatically detect working hours from Cal.com data
          const workingHoursData = await calcomClient.detectWorkingHours(calcomUser.id);

          return NextResponse.json({
            success: true,
            data: {
              connection: connectionData,
              workingHours: workingHoursData,
              user: {
                id: calcomUser.id,
                username: calcomUser.username,
                name: calcomUser.name,
                email: calcomUser.email,
                timeZone: calcomUser.timeZone,
                avatar: calcomUser.avatar
              }
            },
            message: 'Successfully connected to Cal.com'
          });
        } catch (error) {
          console.error('Error connecting Cal.com account:', error);
          return NextResponse.json(
            { 
              error: 'Failed to connect Cal.com account',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'setup_event_types': {
        try {
          const { calcomUserId } = data;
          
          if (!calcomUserId) {
            return NextResponse.json(
              { error: 'Cal.com user ID is required' },
              { status: 400 }
            );
          }

          // Create default event types for the scheduling app
          const defaultEventTypes = [
            {
              title: 'Quick 30-min Meeting',
              slug: 'quick-30min',
              description: 'A quick 30-minute meeting for brief discussions',
              length: 30,
              hidden: false,
              requiresConfirmation: false,
              minimumBookingNotice: 60, // 1 hour
              beforeEventBuffer: 5,
              afterEventBuffer: 5
            },
            {
              title: 'Standard 1-hour Meeting',
              slug: 'standard-1hour',
              description: 'A standard 1-hour meeting for detailed discussions',
              length: 60,
              hidden: false,
              requiresConfirmation: false,
              minimumBookingNotice: 120, // 2 hours
              beforeEventBuffer: 5,
              afterEventBuffer: 5
            },
            {
              title: 'Coffee Chat',
              slug: 'coffee-chat',
              description: 'Informal coffee chat meeting',
              length: 30,
              hidden: false,
              requiresConfirmation: false,
              minimumBookingNotice: 60,
              beforeEventBuffer: 0,
              afterEventBuffer: 0
            },
            {
              title: 'Lunch Meeting',
              slug: 'lunch-meeting',
              description: 'Business lunch meeting',
              length: 90,
              hidden: false,
              requiresConfirmation: true,
              minimumBookingNotice: 1440, // 24 hours
              beforeEventBuffer: 15,
              afterEventBuffer: 15
            },
            {
              title: 'Dinner Meeting',
              slug: 'dinner-meeting',
              description: 'Business dinner meeting',
              length: 120,
              hidden: false,
              requiresConfirmation: true,
              minimumBookingNotice: 2880, // 48 hours
              beforeEventBuffer: 15,
              afterEventBuffer: 15
            }
          ];

          const createdEventTypes = [];
          
          for (const eventType of defaultEventTypes) {
            try {
              const created = await calcomClient.createEventType(eventType);
              createdEventTypes.push(created);
            } catch (error) {
              console.warn(`Failed to create event type ${eventType.title}:`, error);
            }
          }

          return NextResponse.json({
            success: true,
            data: {
              eventTypes: createdEventTypes,
              count: createdEventTypes.length
            },
            message: `Successfully created ${createdEventTypes.length} event types`
          });
        } catch (error) {
          console.error('Error setting up event types:', error);
          return NextResponse.json(
            { 
              error: 'Failed to setup event types',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'sync_initial_data': {
        try {
          const { calcomUserId } = data;
          
          if (!calcomUserId) {
            return NextResponse.json(
              { error: 'Cal.com user ID is required' },
              { status: 400 }
            );
          }

          // Perform initial data sync
          const [user, eventTypes, schedules, syncResult] = await Promise.all([
            calcomClient.getUser(calcomUserId),
            calcomClient.getEventTypes(calcomUserId),
            calcomClient.getSchedules(calcomUserId),
            calcomClient.syncUserCalendar(calcomUserId)
          ]);

          // Detect working hours from existing data
          const workingHoursData = await calcomClient.detectWorkingHours(calcomUserId);

          return NextResponse.json({
            success: true,
            data: {
              user,
              eventTypes,
              schedules,
              workingHours: workingHoursData,
              sync: syncResult
            },
            message: 'Initial data sync completed successfully'
          });
        } catch (error) {
          console.error('Error syncing initial data:', error);
          return NextResponse.json(
            { 
              error: 'Failed to sync initial data',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: connect_account, setup_event_types, sync_initial_data' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cal.com connect API error:', error);
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
 * Get Cal.com connection status
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
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status': {
        try {
          // In a real implementation, check database for connection status
          // For now, we'll return a mock status
          const connectionStatus = {
            connected: false, // This would be checked from database
            calcomUserId: null,
            calcomUsername: null,
            lastSync: null,
            eventTypesCount: 0,
            schedulesCount: 0
          };

          return NextResponse.json({
            success: true,
            data: connectionStatus
          });
        } catch (error) {
          console.error('Error getting connection status:', error);
          return NextResponse.json(
            { 
              error: 'Failed to get connection status',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      case 'oauth_url': {
        try {
          // Generate Cal.com OAuth URL
          // This would typically involve Cal.com's OAuth flow
          const clientId = process.env.CALCOM_CLIENT_ID;
          const redirectUri = `${process.env.NEXTAUTH_URL}/api/calcom/callback`;
          const state = Buffer.from(JSON.stringify({ userId: session.user.id })).toString('base64');
          
          const oauthUrl = `https://app.cal.com/oauth/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=read:user,read:bookings,write:bookings&` +
            `state=${state}`;

          return NextResponse.json({
            success: true,
            data: { oauthUrl }
          });
        } catch (error) {
          console.error('Error generating OAuth URL:', error);
          return NextResponse.json(
            { 
              error: 'Failed to generate OAuth URL',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: status, oauth_url' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cal.com connect API error:', error);
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
 * Disconnect Cal.com account
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // In a real implementation, remove the connection from database
    // and revoke any stored tokens
    
    return NextResponse.json({
      success: true,
      message: 'Cal.com account disconnected successfully'
    });
  } catch (error) {
    console.error('Cal.com disconnect API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}