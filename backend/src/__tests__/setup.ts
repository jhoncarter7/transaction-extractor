// Test setup file
// Load environment variables from .env file to use actual database
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from backend root directory
config({ path: resolve(__dirname, '../../.env') });

// Set test environment - only override if not already set
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'test-better-auth-secret-minimum-32-characters';
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
process.env.NODE_ENV = 'test';

export { };

