import type { PrismaConfig } from 'prisma'

// Use process.env directly to avoid import issues during build
// On Render.com, DATABASE_URL is provided as an environment variable
// For local development, ensure DATABASE_URL is set in your environment

export default {
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: process.env.DATABASE_URL!,
    },
} satisfies PrismaConfig
