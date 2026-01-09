// Authentication Types
// Note: Better Auth handles registration and login via its API
// Use auth.api.signUpEmail() and auth.api.signInEmail() for server-side operations
// These types are kept for reference but not actively used

export interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BetterAuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Transaction Types
export interface ExtractTransactionRequest {
  text: string;
}

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance: number | null;
  confidence: number;
}

export interface TransactionResponse {
  success: boolean;
  transaction: {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    balance: number | null;
    confidence: number;
    createdAt: string;
  };
}

export interface GetTransactionsQuery {
  cursor?: string;
  limit?: number;
}

export interface GetTransactionsResponse {
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    balance: number | null;
    confidence: number;
    createdAt: string;
  }>;
  nextCursor: string | null;
  hasMore: boolean;
}

// Request Context Types
export interface AuthenticatedContext {
  userId: string;
  organizationId: string;
  email: string;
}

