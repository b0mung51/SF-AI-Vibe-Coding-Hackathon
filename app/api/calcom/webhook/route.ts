import { NextRequest, NextResponse } from 'next/server';
import { calcomSyncService } from '@/src/lib/calcomSync';
import crypto from 'crypto';

/**
 * Webhook endpoint for Cal.com real-time events
 * Handles booking creation, updates, cancellations, and meeting events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-cal-signature-256');
    
    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    
    // Handle the webhook event
    await calcomSyncService.handleWebhook(payload);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Verify webhook signature from Cal.com
 */
function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  
  const webhookSecret = process.env.CALCOM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('CALCOM_WEBHOOK_SECRET not configured');
    return false;
  }
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * GET endpoint to verify webhook is working
 */
export async function GET() {
  return NextResponse.json({
    message: 'Cal.com webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}