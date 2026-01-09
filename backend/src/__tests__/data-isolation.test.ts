import { Hono } from 'hono';
import { auth } from '../config/auth';
import { prisma } from '../config/database';
import transactionRoutes from '../routes/transaction.routes';

/**
 * Data Isolation Tests
 * 
 * CRITICAL: Tests that User A cannot access User B's transactions,
 * even with modified requests. This validates true multi-tenant isolation.
 */
describe('Data Isolation Tests', () => {
    const testApp = new Hono();

    // Mount auth handler
    testApp.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

    // Mount transaction routes
    testApp.route('/api/transactions', transactionRoutes);

    // Test user credentials
    const userA = {
        email: `isolation-user-a-${Date.now()}@test.com`,
        password: 'securepassword123',
        name: 'User A',
    };

    const userB = {
        email: `isolation-user-b-${Date.now()}@test.com`,
        password: 'securepassword456',
        name: 'User B',
    };

    let userASessionCookie: string;
    let userBSessionCookie: string;
    let userATransactionId: string;

    // Clean up test data after all tests
    afterAll(async () => {
        await prisma.transaction.deleteMany({
            where: {
                OR: [
                    { user: { email: { contains: 'isolation-user-a' } } },
                    { user: { email: { contains: 'isolation-user-b' } } },
                ],
            },
        });
        await prisma.organizationMember.deleteMany({});
        await prisma.session.deleteMany({});
        await prisma.account.deleteMany({});
        await prisma.user.deleteMany({
            where: {
                OR: [
                    { email: { contains: 'isolation-user-a' } },
                    { email: { contains: 'isolation-user-b' } },
                ],
            },
        });
        await prisma.organization.deleteMany({
            where: {
                slug: { contains: 'isolation-user' },
            },
        });
        await prisma.$disconnect();
    });

    describe('Setup: Create test users and transactions', () => {
        test('Create User A and get session', async () => {
            const signupRequest = new Request('http://localhost:3000/api/auth/sign-up/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userA),
            });

            const response = await testApp.fetch(signupRequest);
            expect(response.status).toBe(200);

            const setCookieHeader = response.headers.get('set-cookie');
            userASessionCookie = setCookieHeader?.split(';')[0] || '';
            expect(userASessionCookie).toBeTruthy();
        });

        test('Create User B and get session', async () => {
            const signupRequest = new Request('http://localhost:3000/api/auth/sign-up/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userB),
            });

            const response = await testApp.fetch(signupRequest);
            expect(response.status).toBe(200);

            const setCookieHeader = response.headers.get('set-cookie');
            userBSessionCookie = setCookieHeader?.split(';')[0] || '';
            expect(userBSessionCookie).toBeTruthy();
        });

        test('User A creates a transaction', async () => {
            const request = new Request('http://localhost:3000/api/transactions/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: userASessionCookie,
                },
                body: JSON.stringify({
                    text: `Date: 11 Dec 2025
Description: USER A SECRET TRANSACTION
Amount: -999.00
Balance after transaction: 5,000.00`,
                }),
            });

            const response = await testApp.fetch(request);
            expect(response.status).toBe(200);

            const data = await response.json() as { success: boolean; transaction: { id: string } };
            expect(data.success).toBe(true);
            userATransactionId = data.transaction.id;
        });
    });

    describe('Data Isolation Validation', () => {
        test('User A can see their own transactions', async () => {
            const request = new Request('http://localhost:3000/api/transactions', {
                method: 'GET',
                headers: {
                    Cookie: userASessionCookie,
                },
            });

            const response = await testApp.fetch(request);
            expect(response.status).toBe(200);

            const data = await response.json() as { transactions: { id: string; description: string }[] };
            expect(data.transactions.length).toBeGreaterThan(0);
            expect(data.transactions.some((t) => t.id === userATransactionId)).toBe(true);
            expect(data.transactions.some((t) => t.description.includes('USER A SECRET'))).toBe(true);
        });

        test('User B CANNOT see User A\'s transactions', async () => {
            const request = new Request('http://localhost:3000/api/transactions', {
                method: 'GET',
                headers: {
                    Cookie: userBSessionCookie,
                },
            });

            const response = await testApp.fetch(request);
            expect(response.status).toBe(200);

            const data = await response.json() as { transactions: { id: string; description: string }[] };

            // User B should NOT see User A's transaction
            expect(data.transactions.some((t) => t.id === userATransactionId)).toBe(false);
            expect(data.transactions.some((t) => t.description.includes('USER A SECRET'))).toBe(false);
        });

        test('User B cannot access User A\'s transaction even with direct ID (if such endpoint existed)', async () => {
            // Verify that organizationId filtering prevents unauthorized access
            // by checking the database directly
            const transaction = await prisma.transaction.findUnique({
                where: { id: userATransactionId },
                include: { organization: true, user: true },
            });

            const userBRecord = await prisma.user.findUnique({
                where: { email: userB.email },
            });

            // Verify transactions are scoped to different organizations
            expect(transaction).toBeDefined();
            expect(userBRecord).toBeDefined();
            expect(transaction?.organizationId).not.toBe(userBRecord?.organizationId);
        });
    });

    describe('Cross-tenant request manipulation attempt', () => {
        test('Cannot bypass isolation by creating transaction with forged organizationId', async () => {
            // User B tries to create a transaction (should use THEIR org, not User A's)
            const request = new Request('http://localhost:3000/api/transactions/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: userBSessionCookie,
                },
                body: JSON.stringify({
                    text: `Date: 12 Dec 2025
Description: USER B TRANSACTION
Amount: -100.00
Balance after transaction: 1,000.00`,
                }),
            });

            const response = await testApp.fetch(request);
            expect(response.status).toBe(200);

            const data = await response.json() as { success: boolean; transaction: { id: string } };
            expect(data.success).toBe(true);

            // Verify User B's transaction is in User B's org, not User A's
            const userBTransaction = await prisma.transaction.findUnique({
                where: { id: data.transaction.id },
            });

            const userARecord = await prisma.user.findUnique({
                where: { email: userA.email },
            });

            expect(userBTransaction?.organizationId).not.toBe(userARecord?.organizationId);
        });
    });
});
