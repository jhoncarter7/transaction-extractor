import { prisma } from '../config/database';
import { TransactionService } from '../services/transaction.service';
import { AuthenticatedContext } from '../types';

describe('Transaction Service', () => {
  let user1Context: AuthenticatedContext;
  let user2Context: AuthenticatedContext;

  beforeAll(async () => {
    // Clean up stale test data from previous runs
    await prisma.transaction.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { contains: 'user1-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'user2-' } },
    });
    await prisma.organization.deleteMany({
      where: { slug: { contains: 'test-org-' } },
    });

    // Create two test organizations
    const org1 = await prisma.organization.create({
      data: {
        name: 'Test Org 1',
        slug: `test-org-1-${Date.now()}`,
      },
    });

    const org2 = await prisma.organization.create({
      data: {
        name: 'Test Org 2',
        slug: `test-org-2-${Date.now()}`,
      },
    });

    // Create test users directly in database
    const user1 = await prisma.user.create({
      data: {
        email: `user1-${Date.now()}@example.com`,
        organizationId: org1.id,
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: `user2-${Date.now()}@example.com`,
        organizationId: org2.id,
      },
    });

    user1Context = {
      userId: user1.id,
      organizationId: org1.id,
      email: user1.email,
    };

    user2Context = {
      userId: user2.id,
      organizationId: org2.id,
      email: user2.email,
    };
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.$disconnect();
  });

  describe('Extract Transaction', () => {
    test('Extracts and saves transaction with organizationId', async () => {
      const text = `Date: 11 Dec 2025
Description: TEST TRANSACTION
Amount: -100.00
Balance after transaction: 1000.00`;

      const result = await TransactionService.extractTransaction(text, user1Context);

      expect(result.success).toBe(true);
      expect(result.transaction.id).toBeDefined();
      expect(result.transaction.description).toBeDefined();
      expect(result.transaction.amount).toBe(100.0);
      expect(result.transaction.type).toBe('debit');

      // Verify transaction is saved in database
      const savedTransaction = await prisma.transaction.findUnique({
        where: { id: result.transaction.id },
      });

      expect(savedTransaction).toBeDefined();
      expect(savedTransaction?.organizationId).toBe(user1Context.organizationId);
      expect(savedTransaction?.userId).toBe(user1Context.userId);
    });
  });

  describe('Get Transactions', () => {
    test('GET /api/transactions returns only user transactions', async () => {
      // Create transactions for both users
      const text1 = `Date: 11 Dec 2025
Description: User 1 Transaction
Amount: -50.00`;

      const text2 = `Date: 12 Dec 2025
Description: User 2 Transaction
Amount: -75.00`;

      await TransactionService.extractTransaction(text1, user1Context);
      await TransactionService.extractTransaction(text2, user2Context);

      // User 1 fetches their transactions
      const result = await TransactionService.getTransactions({}, user1Context);

      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.transactions.every((txn) =>
        txn.description === 'User 1 Transaction' || txn.description.includes('TEST')
      )).toBe(true);
      expect(result.transactions.some((txn) =>
        txn.description === 'User 2 Transaction'
      )).toBe(false);
    });

    test('Cursor pagination works correctly', async () => {
      // Clean slate: ensure we have a known number of transactions
      // by creating exactly what we need for this test

      // Create multiple transactions for user1
      for (let i = 0; i < 5; i++) {
        await TransactionService.extractTransaction(
          `Date: ${11 + i} Dec 2025\nDescription: Pagination Test ${i}\nAmount: -${10 + i}.00`,
          user1Context
        );
      }

      // Get first page
      const page1 = await TransactionService.getTransactions({ limit: 2 }, user1Context);

      expect(page1.transactions.length).toBe(2);
      // Should have more transactions (5 new + existing)
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBeDefined();

      // Get second page
      if (page1.nextCursor) {
        const page2 = await TransactionService.getTransactions(
          { limit: 2, cursor: page1.nextCursor },
          user1Context
        );

        expect(page2.transactions.length).toBeGreaterThan(0);
        // Verify no overlap between pages
        const page1Ids = page1.transactions.map((t) => t.id);
        const page2Ids = page2.transactions.map((t) => t.id);
        const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
        expect(hasOverlap).toBe(false);
      }
    });
  });

  describe('Data Isolation', () => {
    test('User A cannot access User B data', async () => {
      // User 2 creates a transaction
      const text = `Date: 13 Dec 2025
Description: Secret Transaction
Amount: -200.00`;

      const createResult = await TransactionService.extractTransaction(text, user2Context);
      const secretTransactionId = createResult.transaction.id;

      // User 1 tries to fetch transactions
      const user1Transactions = await TransactionService.getTransactions({}, user1Context);

      // User 1 should not see User 2's transaction
      expect(
        user1Transactions.transactions.some((txn) => txn.id === secretTransactionId)
      ).toBe(false);

      // Verify transaction exists but belongs to user2
      const transaction = await prisma.transaction.findUnique({
        where: { id: secretTransactionId },
      });

      expect(transaction).toBeDefined();
      expect(transaction?.organizationId).toBe(user2Context.organizationId);
      expect(transaction?.organizationId).not.toBe(user1Context.organizationId);
    });
  });
});

