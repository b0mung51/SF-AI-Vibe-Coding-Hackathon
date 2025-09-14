import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

/**
 * Connection Management API
 * Handles accepting, declining, and managing individual connections
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { connectionId } = params;
    const { action } = await request.json(); // 'accept' or 'decline'
    
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    // Get the connection document
    const connectionRef = doc(db, 'connections', connectionId);
    const connectionDoc = await getDoc(connectionRef);
    
    if (!connectionDoc.exists()) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const connectionData = connectionDoc.data();
    
    // Verify the current user is the target of this connection request
    if (connectionData.targetId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this connection' },
        { status: 403 }
      );
    }

    // Update the connection status
    const updateData = {
      status: action === 'accept' ? 'accepted' : 'declined',
      updatedAt: new Date().toISOString(),
      respondedAt: new Date().toISOString()
    };

    await updateDoc(connectionRef, updateData);

    return NextResponse.json({
      success: true,
      message: `Connection ${action}ed successfully`,
      connection: {
        id: connectionId,
        ...connectionData,
        ...updateData
      }
    });
    
  } catch (error) {
    console.error('Error updating connection:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a connection
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { connectionId } = params;
    
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Get the connection document
    const connectionRef = doc(db, 'connections', connectionId);
    const connectionDoc = await getDoc(connectionRef);
    
    if (!connectionDoc.exists()) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const connectionData = connectionDoc.data();
    
    // Verify the current user is either the requester or target
    if (connectionData.requesterId !== session.user.id && connectionData.targetId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this connection' },
        { status: 403 }
      );
    }

    // Delete the connection
    await deleteDoc(connectionRef);

    return NextResponse.json({
      success: true,
      message: 'Connection deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get a specific connection
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { connectionId } = params;
    
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Get the connection document
    const connectionRef = doc(db, 'connections', connectionId);
    const connectionDoc = await getDoc(connectionRef);
    
    if (!connectionDoc.exists()) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const connectionData = connectionDoc.data();
    
    // Verify the current user is either the requester or target
    if (connectionData.requesterId !== session.user.id && connectionData.targetId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to view this connection' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      connection: {
        id: connectionId,
        ...connectionData
      }
    });
    
  } catch (error) {
    console.error('Error fetching connection:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}