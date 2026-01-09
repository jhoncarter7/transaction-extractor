import { Hono } from 'hono';
import { auth } from '../config/auth';
import { prisma } from '../config/database';
import transactionRoutes from '../routes/transaction.routes';

/**
 * Auth Integration Tests
 * Tests the authentication flow and protected route access
 */
describe('Auth Integration Tests', () => {
    const testApp = new Hono();

    // Mount auth handler
    testApp.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

    // Mount transaction routes
    testApp.route('/api/transactions', transactionRoutes);

    // Clean up test users after all tests
    afterAll(async () => {
        await prisma.transaction.deleteMany({});
        await prisma.organizationMember.deleteMany({});
        await prisma.session.deleteMany({});
        await prisma.account.deleteMany({});
        await prisma.user.deleteMany({
            where: { email: { contains: 'auth-test' } },
        });
        await prisma.organization.deleteMany({
            where: { slug: { contains: 'auth-test' } },
        });
        await prisma.$disconnect();
    });

    describe('User Registration', () => {
        test('POST /api/auth/sign-up/email creates user with organization', async () => {
            const email = `auth-test-${Date.now()}@example.com`;
            const password = 'securepassword123';

            const request = new Request('http://localhost:3000/api/auth/sign-up/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    name: 'Test User',
                }),
            });

            const response = await testApp.fetch(request);

            expect(response.status).toBe(200);

            // Verify user was created with organization
            const user = await prisma.user.findUnique({
                where: { email },
                include: { organization: true },
            });

            expect(user).toBeDefined();
            expect(user?.organizationId).toBeDefined();
            expect(user?.organization).toBeDefined();
        });
    });

    describe('User Login', () => {
        test('POST /api/auth/sign-in/email returns session for valid credentials', async () => {
            // First create a user
            const email = `auth-test-login-${Date.now()}@example.com`;
            const password = 'securepassword123';

            // Sign up
            const signupRequest = new Request('http://localhost:3000/api/auth/sign-up/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name: 'Login Test User' }),
            });
            await testApp.fetch(signupRequest);

            // Sign in
            const loginRequest = new Request('http://localhost:3000/api/auth/sign-in/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const response = await testApp.fetch(loginRequest);

            expect(response.status).toBe(200);

            const data = await response.json() as { user: { email: string } };
            expect(data.user).toBeDefined();
            expect(data.user.email).toBe(email);
        });

        test('POST /api/auth/sign-in/email returns 401 for invalid credentials', async () => {
            const request = new Request('http://localhost:3000/api/auth/sign-in/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'nonexistent@example.com',
                    password: 'wrongpassword',
                }),
            });

            const response = await testApp.fetch(request);

            // Better Auth returns 401 for invalid credentials
            expect([400, 401]).toContain(response.status);
        });
    });

    describe('Protected Routes', () => {
        test('GET /api/transactions without auth returns 401', async () => {
            const request = new Request('http://localhost:3000/api/transactions', {
                method: 'GET',
            });

            const response = await testApp.fetch(request);

            expect(response.status).toBe(401);
        });

        test('GET /api/transactions with valid session returns 200', async () => {
            // Create user and get session
            const email = `auth-test-protected-${Date.now()}@example.com`;
            const password = 'securepassword123';

            // Sign up (auto sign-in is enabled)
            const signupRequest = new Request('http://localhost:3000/api/auth/sign-up/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name: 'Protected Route Test User' }),
            });

            const signupResponse = await testApp.fetch(signupRequest);
            const setCookieHeader = signupResponse.headers.get('set-cookie');

            // Extract session cookie
            const sessionCookie = setCookieHeader?.split(';')[0] || '';

            // Access protected route with session cookie
            const transactionsRequest = new Request('http://localhost:3000/api/transactions', {
                method: 'GET',
                headers: {
                    Cookie: sessionCookie,
                },
            });

            const response = await testApp.fetch(transactionsRequest);

            expect(response.status).toBe(200);

            const data = await response.json() as { transactions: unknown[] };
            expect(data.transactions).toBeDefined();
            expect(Array.isArray(data.transactions)).toBe(true);
        });
    });
});
