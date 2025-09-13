import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { calcomApiKey, calcomUserId, userId } = await request.json();

    if (!calcomApiKey || !calcomUserId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Cal.com API key, user ID, and user ID are required' },
        { status: 400 }
      );
    }

    // Check if integration already exists
    const integrationsRef = collection(db, 'calendar_integrations');
    const q = query(integrationsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Update existing integration
      const integrationDoc = querySnapshot.docs[0];
      await updateDoc(integrationDoc.ref, {
        calcomApiKey,
        calcomUserId,
        isActive: true,
        lastSync: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        integrationId: integrationDoc.id,
        syncStatus: 'updated',
      });
    } else {
      // Create new integration
      const integrationData = {
        userId,
        calcomApiKey,
        calcomUserId,
        isActive: true,
        lastSync: new Date(),
        createdAt: new Date(),
      };

      const docRef = await addDoc(integrationsRef, integrationData);

      return NextResponse.json({
        success: true,
        integrationId: docRef.id,
        syncStatus: 'created',
      });
    }
  } catch (error) {
    console.error('Cal.com integration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect Cal.com account' },
      { status: 500 }
    );
  }
}
