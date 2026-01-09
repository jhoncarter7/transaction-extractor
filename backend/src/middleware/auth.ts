import { Context, Next } from 'hono';
import { AuthenticatedContext } from '../types';
import { auth } from '../config/auth';
import { prisma } from '../config/database';

export interface AuthContext extends Context {
  user: AuthenticatedContext;
}

/**
 * Auth Middleware
 * 
 * Uses Better Auth's session management to authenticate requests.
 * Supports both session cookies and JWT Bearer tokens.
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  try {
    // Use Better Auth's getSession API method
    // This handles both cookies and Authorization headers automatically
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session || !session.user) {
      return c.json({ error: 'Unauthorized: No valid session found' }, 401);
    }

    // Get user's organization for data isolation
    const userWithOrg = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        organizationId: true,
      },
    });

    if (!userWithOrg) {
      return c.json({ error: 'Unauthorized: User not found' }, 401);
    }

    if (!userWithOrg.organizationId) {
      return c.json({ error: 'Unauthorized: User has no organization' }, 401);
    }

    // Attach user context to the request for downstream handlers
    (c as AuthContext).user = {
      userId: session.user.id,
      organizationId: userWithOrg.organizationId,
      email: session.user.email,
    };

    return await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Unauthorized: Authentication failed' }, 401);
  }
}
