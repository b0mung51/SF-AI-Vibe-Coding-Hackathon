import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const { connectionId } = params;

    if (!connectionId) {
      return NextResponse.json(
        { success: false, error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Get connection details
    const connectionRef = doc(db, 'connections', connectionId);
    const connectionSnap = await getDoc(connectionRef);

    if (!connectionSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    const connection = connectionSnap.data();
    const { requesterId, targetId } = connection;

    // Get calendar integrations for both users
    const integrationsRef = collection(db, 'calendar_integrations');
    const requesterQuery = query(integrationsRef, where('userId', '==', requesterId));
    const targetQuery = query(integrationsRef, where('userId', '==', targetId));

    const [requesterIntegrations, targetIntegrations] = await Promise.all([
      getDocs(requesterQuery),
      getDocs(targetQuery),
    ]);

    // Mock time slot suggestions (in a real app, this would integrate with Cal.com API)
    const suggestions = [
      {
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
        confidence: 0.95,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        confidence: 0.88,
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        confidence: 0.92,
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ];

    return NextResponse.json({
      success: true,
      suggestions,
      timezone: 'America/New_York',
      connectionId,
    });
  } catch (error) {
    console.error('Meeting suggestions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get meeting suggestions' },
      { status: 500 }
    );
  }
}
