import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { targetEmail, message, requesterId } = await request.json();

    if (!targetEmail || !requesterId) {
      return NextResponse.json(
        { success: false, error: 'Target email and requester ID are required' },
        { status: 400 }
      );
    }

    // Find the target user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', targetEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const targetUser = querySnapshot.docs[0];
    const targetId = targetUser.id;

    // Check if connection already exists
    const connectionsRef = collection(db, 'connections');
    const existingConnectionQuery = query(
      connectionsRef,
      where('requesterId', '==', requesterId),
      where('targetId', '==', targetId)
    );
    const existingConnections = await getDocs(existingConnectionQuery);

    if (!existingConnections.empty) {
      return NextResponse.json(
        { success: false, error: 'Connection request already exists' },
        { status: 409 }
      );
    }

    // Create connection request
    const connectionData = {
      requesterId,
      targetId,
      status: 'pending',
      message: message || '',
      createdAt: new Date(),
    };

    const docRef = await addDoc(connectionsRef, connectionData);

    return NextResponse.json({
      success: true,
      connectionId: docRef.id,
    });
  } catch (error) {
    console.error('Connection request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create connection request' },
      { status: 500 }
    );
  }
}
