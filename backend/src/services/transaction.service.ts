import { Transaction } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { TransactionParserService } from './transaction-parser.service';
import { ParsedTransaction, GetTransactionsQuery } from '../types';
import { AuthenticatedContext } from '../types';

export class TransactionService {
  /**
   * Extract and save a transaction from raw text
   * CRITICAL: Must include organizationId from authenticated user context
   */
  static async extractTransaction(
    text: string,
    userContext: AuthenticatedContext
  ) {
    // Parse the transaction text
    const parsed: ParsedTransaction = TransactionParserService.parseTransaction(text);

    // Save to database with organizationId for data isolation
    const transaction = await prisma.transaction.create({
      data: {
        userId: userContext.userId,
        organizationId: userContext.organizationId, // CRITICAL: ensures data isolation
        date: parsed.date,
        description: parsed.description,
        amount: parsed.amount,
        type: parsed.type,
        balance: parsed.balance,
        rawText: text,
        confidence: parsed.confidence,
      },
    });

    return {
      success: true,
      transaction: {
        id: transaction.id,
        date: transaction.date.toISOString(),
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type as 'debit' | 'credit',
        balance: transaction.balance,
        confidence: transaction.confidence,
        createdAt: transaction.createdAt.toISOString(),
      },
    };
  }

  /**
   * Get transactions for authenticated user with cursor pagination
   * CRITICAL: Must filter by organizationId from JWT
   */
  static async getTransactions(
    query: GetTransactionsQuery,
    userContext: AuthenticatedContext
  ) {
    const limit = Math.min(query.limit ?? 20, 100); // Max 100 per page
    const cursor = query.cursor;

    // CRITICAL: Filter by organizationId from JWT (not from request)
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId: userContext.organizationId, // Data isolation enforced here
      },
      take: limit + 1, // Fetch one extra to check if there's more
      skip: cursor ? 1 : 0, // Skip the cursor record itself when paginating
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const hasMore = transactions.length > limit;
    const results = transactions.slice(0, limit);
    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].id : null;

    return {
      transactions: results.map((txn: Transaction) => ({
        id: txn.id,
        date: txn.date.toISOString(),
        description: txn.description,
        amount: txn.amount,
        type: txn.type as 'debit' | 'credit',
        balance: txn.balance,
        confidence: txn.confidence,
        createdAt: txn.createdAt.toISOString(),
      })),
      nextCursor,
      hasMore,
    };
  }
}

