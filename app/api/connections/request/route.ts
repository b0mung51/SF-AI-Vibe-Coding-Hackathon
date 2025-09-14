import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth';
import { db } from '@/app/lib/firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * Connection Request API
 * Handles sending and managing connection requests between users
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

    const { targetUserId, message } = await request.json();
    
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      );
    }

    // Prevent self-connection
    if (session.user.id === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot connect with yourself' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUserRef = doc(db, 'users', targetUserId);
    const targetUserDoc = await getDoc(targetUserRef);
    
    if (!targetUserDoc.exists()) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Check if connection already exists
    const connectionsRef = collection(db, 'connections');
    const existingConnectionQuery = query(
      connectionsRef,
      where('requesterId', '==', session.user.id),
      where('targetId', '==', targetUserId)
    );
    const existingConnections = await getDocs(existingConnectionQuery);
    
    if (!existingConnections.empty) {
      return NextResponse.json(
        { error: 'Connection request already exists' },
        { status: 409 }
      );
    }

    // Check for reverse connection
    const reverseConnectionQuery = query(
      connectionsRef,
      where('requesterId', '==', targetUserId),
      where('targetId', '==', session.user.id)
    );
    const reverseConnections = await getDocs(reverseConnectionQuery);
    
    if (!reverseConnections.empty) {
      return NextResponse.json(
        { error: 'A connection request from this user already exists' },
        { status: 409 }
      );
    }

    // Create connection request
    const connectionData = {
      requesterId: session.user.id,
      requesterName: session.user.name,
      requesterEmail: session.user.email,
      targetId: targetUserId,
      targetName: targetUserDoc.data()?.name,
      targetEmail: targetUserDoc.data()?.email,
      message: message || `Hi! I'd like to connect and sync our calendars for easier meeting scheduling.`,
      status: 'pending', // pending, accepted, declined
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(connectionsRef, connectionData);

    return NextResponse.json({
      success: true,
      connectionId: docRef.id,
      message: 'Connection request sent successfully'
    });
    
  } catch (error) {
    console.error('Error creating connection request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send connection request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get connection requests for the current user
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
    const type = searchParams.get('type') || 'all'; // 'sent', 'received', 'all'

    const connectionsRef = collection(db, 'connections');
    let queries = [];

    if (type === 'sent' || type === 'all') {
      const sentQuery = query(
        connectionsRef,
        where('requesterId', '==', session.user.id)
      );
      queries.push(getDocs(sentQuery));
    }

    if (type === 'received' || type === 'all') {
      const receivedQuery = query(
        connectionsRef,
        where('targetId', '==', session.user.id)
      );
      queries.push(getDocs(receivedQuery));
    }

    const results = await Promise.all(queries);
    const connections: any[] = [];

    results.forEach(querySnapshot => {
      querySnapshot.forEach(doc => {
        connections.push({
          id: doc.id,
          ...doc.data()
        });
      });
    });

    // Sort by creation date (newest first)
    connections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      connections
    });
    
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch connections',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}