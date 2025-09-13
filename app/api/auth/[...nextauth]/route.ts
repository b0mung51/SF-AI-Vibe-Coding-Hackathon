import NextAuth from '@/auth';

/**
 * NextAuth.js v4 API Route Handler
 * Handles all authentication requests
 */
const handler = NextAuth;

export { handler as GET, handler as POST };

// Force Node.js runtime to avoid Edge runtime issues with openid-client
export const runtime = 'nodejs';