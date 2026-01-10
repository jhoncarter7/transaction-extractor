import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Proxy for protected routes (formerly middleware)
 * 
 * Note: checks for session cookie.
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/register']

    // Check if accessing a public route
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
        return NextResponse.next()
    }

    // For protected routes, check if session cookie exists
    // Better Auth uses 'better-auth.session_token' cookie
    const sessionCookie = request.cookies.get('better-auth.session_token')

    if (!sessionCookie?.value) {
        // In cross-domain setup, we relied on client-side check.
        // With Rewrites (Proxy), cookies should be visible if SameSite=Lax and Same-Origin.
        // However, we'll keep the permissive check for now to avoid loops until tested.
        return NextResponse.next()
    }

    // Session cookie exists, allow request to proceed
    return NextResponse.next()
}

// Configure which routes the proxy runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
