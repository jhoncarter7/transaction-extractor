import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const sqlPath = path.join(process.cwd(), 'prisma', 'migrations', 'rls_policy.sql');
        console.log(`Reading SQL from: ${sqlPath}`);

        if (!fs.existsSync(sqlPath)) {
            console.error('Error: SQL file not found at', sqlPath);
            process.exit(1);
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

        // Split by semicolon and filter out empty/whitespace-only statements
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`Found ${statements.length} SQL statements to execute.`);

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await prisma.$executeRawUnsafe(statement);
        }

        console.log('✅ RLS policies applied successfully!');
    } catch (error) {
        console.error('❌ Failed to apply RLS policies:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
