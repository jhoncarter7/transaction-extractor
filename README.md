# Transaction Extractor

A secure multi-tenant personal finance transaction extractor built with modern web technologies.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│              Next.js 15 + shadcn/ui + Tailwind CSS              │
│                    (Port 3001)                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (Cookies)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│                   Hono + Better Auth                            │
│                    (Port 3000)                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Prisma ORM
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database                                  │
│               PostgreSQL + Row-Level Security                    │
└─────────────────────────────────────────────────────────────────┘
```

## 🔑 Key Features

- **Multi-Tenant Data Isolation**: Each user's transactions are scoped to their organization
- **Smart Transaction Parsing**: Handles structured, SMS-style, and messy transaction formats
- **Confidence Scoring**: AI-powered confidence score for parsed transactions
- **Cursor-Based Pagination**: Scalable pagination for large datasets
- **Session-Based Auth**: Secure 7-day sessions with Better Auth

## 📋 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Hono (TypeScript) |
| Database | PostgreSQL + Prisma ORM |
| Auth | Better Auth (sessions + JWT) |
| Frontend | Next.js 15 (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database

### 1. Clone and Install

```bash
git clone <repository-url>
cd transaction-extractor

# Install backend dependencies
cd backend
pnpm install

# Install frontend dependencies
cd ../frontend
pnpm install
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL and BETTER_AUTH_SECRET

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Setup Database

```bash
cd backend
pnpm db:generate
pnpm db:push
```

### 4. Run Development Servers

```bash
# Terminal 1: Backend (port 3000)
cd backend
pnpm dev

# Terminal 2: Frontend (port 3001)
cd frontend
pnpm dev
```

### 5. Access the Application

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000

## 👥 Test Users

The following test accounts are pre-configured for evaluation:

| User | Email | Password |
|------|-------|----------|
| User A | `test@test.com` | `t1234567@` |
| User B | `test1@test.com` | `t1234567@` |

> **Note:** Each user has their own organization automatically created on registration. User A cannot see User B's transactions and vice versa.

## 🔐 Better Auth Integration Approach

Our multi-tenant isolation strategy leverages Better Auth's organization plugin combined with application-level filtering:

1. **Automatic Organization Creation**: When a user registers, a personal organization is automatically created and linked to their account via a `databaseHook` in Better Auth configuration.

2. **Session-Based Context**: Every authenticated request carries the user's session, which includes their `organizationId`. The auth middleware extracts this context and attaches it to the request.

3. **Query-Level Isolation**: All database queries for transactions filter by `organizationId` from the authenticated session context—never from user-provided input. This ensures true data isolation even if requests are manipulated.

This approach scales horizontally as organizations are isolated at the database query level, and Better Auth handles session management, password hashing, and CSRF protection out of the box.

## 📊 Sample Transaction Texts

The parser handles these formats perfectly:

**Sample 1: Structured Statement**
```
Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50
```

**Sample 2: SMS-Style**
```
Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50
```

**Sample 3: Messy Log**
```
txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping
```

## 🧪 Running Tests

```bash
cd backend
pnpm test
```

## 📁 Project Structure

```
transaction-extractor/
├── backend/                 # Hono API server
│   ├── src/
│   │   ├── config/         # Auth, database, environment config
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Transaction parser & service
│   │   ├── types/          # TypeScript definitions
│   │   └── __tests__/      # Jest test suites
│   └── prisma/             # Database schema
│
└── frontend/               # Next.js application
    └── src/
        ├── app/            # App Router pages
        ├── components/     # React components (shadcn/ui)
        └── lib/            # Auth client, API helpers
```

## 📄 License

MIT
