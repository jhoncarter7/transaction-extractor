import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for protected routes
 * 
 * Note: Since we're using Better Auth with cross-origin cookies,
 * we can't fully validate sessions in middleware (cookies are httpOnly).
 * This middleware provides a first line of defense by checking for the
 * session cookie existence. Full validation happens server-side/client-side.
 */
export function middleware(request: NextRequest) {
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
        // No session cookie found, redirect to login
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Session cookie exists, allow request to proceed
    // Full validation will happen via Better Auth client on the page
    return NextResponse.next()
}

// Configure which routes the middleware runs on
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
