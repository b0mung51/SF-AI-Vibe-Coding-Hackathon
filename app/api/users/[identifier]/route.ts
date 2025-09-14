import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

// Mock user data for testing when Firebase is not configured
const mockUsers = [
  {
    id: '103425456070435237757',
    name: 'John Doe',
    username: 'john',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    timezone: 'America/New_York',
    email: 'john@example.com'
  },
  {
    id: '203425456070435237758',
    name: 'Jane Smith',
    username: 'jane',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    timezone: 'America/Los_Angeles',
    email: 'jane@example.com'
  },
  {
    id: '303425456070435237759',
    name: 'Bob Wilson',
    username: 'bob',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    timezone: 'Europe/London',
    email: 'bob@example.com'
  }
];

// Check if Firebase is properly configured
function isFirebaseConfigured() {
  try {
    return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && 
           process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'your_project_id' &&
           process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
           process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'your_api_key' &&
           db; // Ensure db is initialized
  } catch (error) {
    console.log('Firebase configuration check failed:', error);
    return false;
  }
}

/**
 * User Profile Lookup API
 * Handles lookup by username or user ID for profile sharing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const { identifier } = await params;
    
    if (!identifier) {
      return NextResponse.json(
        { error: 'User identifier is required' },
        { status: 400 }
      );
    }

    let userDoc;
    let usingMockData = false;
    
    // Try Firebase first if configured, fallback to mock data
    if (isFirebaseConfigured()) {
      try {
        console.log('Attempting Firebase lookup for:', identifier);
        
        // Try direct ID lookup first
        const userRef = doc(db, 'users', identifier);
        const userSnapshot = await getDoc(userRef);
        
        if (userSnapshot.exists()) {
          userDoc = { id: userSnapshot.id, ...userSnapshot.data() };
        } else {
          // Try username lookup
          const usersRef = collection(db, 'users');
          const usernameQuery = query(usersRef, where('username', '==', identifier));
          const querySnapshot = await getDocs(usernameQuery);
          
          if (!querySnapshot.empty) {
            const docSnapshot = querySnapshot.docs[0];
            userDoc = { id: docSnapshot.id, ...docSnapshot.data() };
          }
        }
      } catch (error) {
        console.log('Firebase lookup failed, falling back to mock data:', error);
        usingMockData = true;
      }
    } else {
      console.log('Firebase not configured, using mock data');
      usingMockData = true;
    }
    
    // Use mock data if Firebase failed or not configured
    if (usingMockData || !userDoc) {
      console.log('Using mock data for identifier:', identifier);
      
      // Find user by ID or username in mock data
      userDoc = mockUsers.find(user => 
        user.id === identifier || 
        user.username === identifier ||
        user.username === identifier.replace('@', '')
      );
    }
    
    if (!userDoc) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return public user information (exclude sensitive data)
    const publicUserInfo = {
      id: userDoc.id,
      name: userDoc.name,
      username: userDoc.username,
      avatar: userDoc.avatar,
      timezone: userDoc.timezone || 'UTC',
      // Don't expose email or other sensitive information
    };

    return NextResponse.json({
      success: true,
      user: publicUserInfo
    });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch user profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}