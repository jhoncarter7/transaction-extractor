import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './database';
import { env } from './env';
import { organization } from 'better-auth/plugins';
import { jwt } from 'better-auth/plugins';

/**
 * Better Auth Configuration
 * 
 * Features:
 * - Email & Password authentication
 * - Organization plugin for multi-tenancy (auto-creates org on signup)
 * - JWT plugin for token-based authentication
 * - Prisma database adapter
 * - Session management with 7-day expiry
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true, // Auto sign-in after registration
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // Trusted origins for cross-origin cookie sharing
  trustedOrigins: [
    'http://localhost:3001',
    process.env.FRONTEND_URL || 'http://localhost:3001',
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
  // Rate limiting to prevent abuse
  rateLimit: {
    enabled: true,
    window: 60, // 60 seconds window
    max: 100, // Max 100 requests per window per IP
    // Custom rate limits for specific endpoints
    customRules: {
      '/api/auth/sign-in/*': {
        window: 60,
        max: 10, // More restrictive for login attempts
      },
      '/api/auth/sign-up/*': {
        window: 60,
        max: 5, // Even more restrictive for registration
      },
    },
  },
  // Auto-create personal organization on user signup
  databaseHooks: {
    user: {
      create: {
        after: async (user, _context) => {
          // Create personal organization for new user
          const slug = `user-${user.id}-${Date.now()}`;
          const org = await prisma.organization.create({
            data: {
              name: `${user.email}'s Organization`,
              slug,
            },
          });

          // Link user to organization
          await prisma.user.update({
            where: { id: user.id },
            data: { organizationId: org.id },
          });

          // Create organization member record
          await prisma.organizationMember.create({
            data: {
              userId: user.id,
              organizationId: org.id,
              role: 'owner',
            },
          });

          // after hook expects Promise<void>, no return needed
        },
      },
    },
  },
  plugins: [
    organization({
      // Organization created hook - called after organization is created
      async createdAt() {
        return new Date();
      },
      // Send invitation emails (optional - implement if needed)
      async sendInvitationEmail(data) {
        console.log(`Organization invitation sent to ${data.email}`);
        // TODO: Implement email sending logic
      },
    }),
    jwt({
      // JWT plugin provides /api/auth/token endpoint
      jwt: {
        // Customize JWT payload to include organizationId
        definePayload: async ({ user }) => {
          // Get user's organization from database
          const userWithOrg = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              id: true,
              email: true,
              organizationId: true,
            },
          });

          return {
            userId: user.id,
            email: user.email,
            organizationId: userWithOrg?.organizationId || '',
          };
        },
        expirationTime: '7d', // 7-day JWT expiry
      },
    }),
  ],
});

/**
 * Type helper for Better Auth session
 */
export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
