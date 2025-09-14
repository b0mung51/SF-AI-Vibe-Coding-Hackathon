import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import QRCode from 'qrcode';

/**
 * QR Code Generation API
 * Generates QR codes for user profile sharing
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

    const { profileUrl, size = 200 } = await request.json();
    
    if (!profileUrl) {
      return NextResponse.json(
        { error: 'Profile URL is required' },
        { status: 400 }
      );
    }

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(profileUrl, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataUrl
    });
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate QR code',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get QR code for current user's profile
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
    const size = parseInt(searchParams.get('size') || '200');
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    // Create profile URL using user ID
    const profileUrl = `${baseUrl}/profile/${session.user.id}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(profileUrl, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });

    return NextResponse.json({
      success: true,
      profileUrl,
      qrCode: qrCodeDataUrl
    });
    
  } catch (error) {
    console.error('Error generating user QR code:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate QR code',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}