import { Hono, Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { TransactionService } from '../services/transaction.service';
import { AuthenticatedContext } from '../types';

const transactionRoutes = new Hono();

// Apply auth middleware to all transaction routes
transactionRoutes.use('/*', authMiddleware);

// Validation schemas
const extractTransactionSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

const getTransactionsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// Helper function to safely get user from context
function getUserFromContext(c: Context): AuthenticatedContext {
  const authContext = c as Context & { user: AuthenticatedContext };
  if (!authContext.user) {
    throw new Error('User context not found - authentication middleware may not have run');
  }
  return authContext.user;
}

/**
 * POST /api/transactions/extract
 * Parse raw bank statement text and save as structured transaction
 * Protected route - requires authentication
 */
transactionRoutes.post(
  '/extract',
  zValidator('json', extractTransactionSchema),
  async (c) => {
    try {
      const { text } = c.req.valid('json');
      const user = getUserFromContext(c);
      const result = await TransactionService.extractTransaction(text, user);
      return c.json(result, 200);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: 'Failed to extract transaction' }, 500);
    }
  }
);

/**
 * GET /api/transactions
 * Retrieve all transactions belonging to the authenticated user
 * Uses cursor-based pagination for scalability
 * Protected route - requires authentication
 */
transactionRoutes.get(
  '/',
  zValidator('query', getTransactionsSchema),
  async (c) => {
    try {
      const query = c.req.valid('query');
      const user = getUserFromContext(c);
      const result = await TransactionService.getTransactions(query, user);
      return c.json(result, 200);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: 'Failed to fetch transactions' }, 500);
    }
  }
);

export default transactionRoutes;

