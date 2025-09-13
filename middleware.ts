import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Simplified middleware for now to avoid edge runtime issues
 * Will be enhanced once authentication is fully working
 */
export function middleware(request: NextRequest) {
  // For now, just allow all requests to pass through
  // We'll add authentication checks later once NextAuth is stable
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};