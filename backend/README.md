# Transaction Extractor Backend

Secure Multi-Tenant Transaction Extractor Backend built with Hono, Prisma, and PostgreSQL.

## Tech Stack

- **Framework**: Hono (TypeScript)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: Better Auth with JWT plugin for multi-tenant authentication
- **Validation**: Zod

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files (auth, database, env)
│   ├── middleware/      # Auth middleware
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic (transactions, parsing)
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Main application entry point
├── prisma/
│   └── schema.prisma    # Database schema
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/transaction_extractor?schema=public"
BETTER_AUTH_SECRET="your-secret-key-here-minimum-32-characters"
BETTER_AUTH_URL="http://localhost:3000"
PORT=3000
NODE_ENV=development
```

> **Note:** `JWT_SECRET` is no longer needed - Better Auth handles JWT signing internally.

### 3. Set Up Database

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema to database (for development)
pnpm db:push

# Or run migrations (for production)
pnpm db:migrate
```

### 4. Run the Server

```bash
# Development mode (with hot reload)
pnpm dev

# Production mode
pnpm build
pnpm start
```

## API Endpoints

### Authentication (Better Auth)

All authentication endpoints are provided by Better Auth and mounted at `/api/auth/*`.

#### POST `/api/auth/sign-up/email`
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "createdAt": "2026-01-09T10:00:00.000Z"
  },
  "session": {
    "id": "session_xyz",
    "userId": "user_abc123",
    "expiresAt": "2026-01-16T10:00:00.000Z"
  }
}
```

> **Note:** Session cookie is automatically set in response headers.

#### POST `/api/auth/sign-in/email`
Authenticate user and create session.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "id": "session_xyz",
    "expiresAt": "2026-01-16T10:00:00.000Z"
  }
}
```

> **Note:** Session cookie is automatically set. Session lasts 7 days.

#### GET `/api/auth/token`
Get JWT token from current session (for external API calls).

**Headers:**
```
Cookie: better-auth.session_token=<session_token>
```

**Response:**
```json
{
  "token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
}
```

> **Note:** JWT includes `userId`, `email`, and `organizationId` in payload.

#### POST `/api/auth/sign-out`
Logout user and destroy session.

**Response:**
```json
{
  "success": true
}
```

#### GET `/api/auth/session`
Get current session details.

**Response:**
```json
{
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "id": "session_xyz",
    "expiresAt": "2026-01-16T10:00:00.000Z"
  }
}
```

### Transactions

#### POST `/api/transactions/extract`
Parse and save a transaction from raw text. **Requires authentication.**

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "text": "Date: 11 Dec 2025\nDescription: STARBUCKS COFFEE MUMBAI\nAmount: -420.00\nBalance after transaction: 18,420.50"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "txn_123abc",
    "date": "2025-12-11T00:00:00.000Z",
    "description": "STARBUCKS COFFEE MUMBAI",
    "amount": 420.00,
    "type": "debit",
    "balance": 18420.50,
    "confidence": 100,
    "createdAt": "2026-01-09T10:30:00.000Z"
  }
}
```

#### GET `/api/transactions`
Get user's transactions with cursor pagination. **Requires authentication.**

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `cursor` (optional): ID of the last transaction from previous page
- `limit` (optional): Number of results per page (default 20, max 100)

**Response:**
```json
{
  "transactions": [...],
  "nextCursor": "txn_101jkl",
  "hasMore": true
}
```

## Data Isolation & Security

- **Multi-Tenancy:** Every user is automatically assigned to an organization upon registration
- **Data Isolation:** All transactions are scoped to the user's organization
- **JWT Support:** JWT tokens include `organizationId` in the payload for external API authentication
- **Session Security:** 7-day sessions with automatic refresh, handled by Better Auth
- **Query Filtering:** All database queries filter by `organizationId` from the authenticated session
- **Built-in Security:** Better Auth provides rate limiting, password hashing (Argon2), and CSRF protection

This ensures complete data isolation between users, even under adversarial conditions.

## Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## Database Management

```bash
# Open Prisma Studio (GUI for database)
pnpm db:studio
```

