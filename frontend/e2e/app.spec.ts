import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Transaction Extractor
 * 
 * Tests the complete user flow including:
 * - Registration
 * - Login
 * - Transaction extraction
 * - Data isolation between users
 */

// Test user credentials
const testUserA = {
    name: 'E2E Test User A',
    email: `e2e-user-a-${Date.now()}@test.com`,
    password: 'securepassword123',
};

const testUserB = {
    name: 'E2E Test User B',
    email: `e2e-user-b-${Date.now()}@test.com`,
    password: 'securepassword456',
};

test.describe('Authentication Flow', () => {
    test('should register a new user', async ({ page }) => {
        await page.goto('/register');

        // Fill registration form
        await page.fill('input[name="name"]', testUserA.name);
        await page.fill('input[name="email"]', testUserA.email);
        await page.fill('input[name="password"]', testUserA.password);
        await page.fill('input[name="confirmPassword"]', testUserA.password);

        // Submit form
        await page.click('button[type="submit"]');

        // Wait for success toast first (confirms registration worked)
        await page.waitForURL('/', { timeout: 20000, waitUntil: 'networkidle' });

        // Verify we see the dashboard elements
        await expect(page.locator('text=Transaction Extractor')).toBeVisible();
        await expect(page.locator('text=Sign Out')).toBeVisible();
    });

    test('should login with existing user', async ({ page }) => {
        // First register
        await page.goto('/register');
        await page.fill('input[name="name"]', testUserB.name);
        await page.fill('input[name="email"]', testUserB.email);
        await page.fill('input[name="password"]', testUserB.password);
        await page.fill('input[name="confirmPassword"]', testUserB.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/', { timeout: 20000, waitUntil: 'networkidle' });

        // Logout
        await page.click('text=Sign Out');
        await expect(page).toHaveURL('/login', { timeout: 5000 });

        // Login again
        await page.fill('input[name="email"]', testUserB.email);
        await page.fill('input[name="password"]', testUserB.password);
        await page.click('button[type="submit"]');

        // Verify we're back on dashboard
        await expect(page).toHaveURL('/', { timeout: 10000 });
        await expect(page.locator('text=Sign Out')).toBeVisible();
    });

    test('should redirect to login for unauthenticated users', async ({ page }) => {
        // Try to access protected route
        await page.goto('/');

        // Should be redirected to login
        await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });
});

test.describe('Transaction Extraction', () => {
    test.beforeEach(async ({ page }) => {
        // Register a new user for each test
        const uniqueEmail = `e2e-txn-${Date.now()}@test.com`;
        await page.goto('/register');
        await page.fill('input[name="name"]', 'Transaction Test User');
        await page.fill('input[name="email"]', uniqueEmail);
        await page.fill('input[name="password"]', 'securepassword123');
        await page.fill('input[name="confirmPassword"]', 'securepassword123');
        await page.click('button[type="submit"]');

        // Wait for registration to complete and redirect (may take a few seconds)
        await page.waitForURL('/', { timeout: 20000, waitUntil: 'networkidle' });
    });

    test('should parse and save Sample 1 transaction', async ({ page }) => {
        const sampleText = `Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`;

        // Fill the textarea
        await page.fill('textarea[name="text"]', sampleText);

        // Click Parse & Save
        await page.click('button:has-text("Parse & Save")');

        // Wait for success toast
        await expect(page.locator('text=Transaction parsed and saved')).toBeVisible({ timeout: 10000 });

        // Verify transaction appears in table
        await expect(page.locator('text=STARBUCKS COFFEE MUMBAI')).toBeVisible();
    });

    test('should parse and save Sample 2 transaction', async ({ page }) => {
        const sampleText = `Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50`;

        await page.fill('textarea[name="text"]', sampleText);
        await page.click('button:has-text("Parse & Save")');

        await expect(page.locator('text=Transaction parsed and saved')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Uber')).toBeVisible();
    });

    test('should parse and save Sample 3 (messy) transaction', async ({ page }) => {
        const sampleText = `txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`;

        await page.fill('textarea[name="text"]', sampleText);
        await page.click('button:has-text("Parse & Save")');

        await expect(page.locator('text=Transaction parsed and saved')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Amazon')).toBeVisible();
    });
});

test.describe('Data Isolation', () => {
    test('users cannot see each other\'s transactions', async ({ browser }) => {
        // Create two separate browser contexts (like two different browsers)
        const contextA = await browser.newContext();
        const contextB = await browser.newContext();

        const pageA = await contextA.newPage();
        const pageB = await contextB.newPage();

        const userAEmail = `isolation-a-${Date.now()}@test.com`;
        const userBEmail = `isolation-b-${Date.now()}@test.com`;

        // Register User A
        await pageA.goto('/register');
        await pageA.fill('input[name="name"]', 'User A');
        await pageA.fill('input[name="email"]', userAEmail);
        await pageA.fill('input[name="password"]', 'password123');
        await pageA.fill('input[name="confirmPassword"]', 'password123');
        await pageA.click('button[type="submit"]');
        await pageA.waitForURL('/', { timeout: 20000, waitUntil: 'networkidle' });

        // User A creates a secret transaction
        await pageA.fill('textarea[name="text"]', `Date: 11 Dec 2025
Description: USER A SECRET PAYMENT
Amount: -9999.00
Balance after transaction: 1,000.00`);
        await pageA.click('button:has-text("Parse & Save")');
        await expect(pageA.locator('text=USER A SECRET')).toBeVisible({ timeout: 10000 });

        // Register User B in separate context
        await pageB.goto('/register');
        await pageB.fill('input[name="name"]', 'User B');
        await pageB.fill('input[name="email"]', userBEmail);
        await pageB.fill('input[name="password"]', 'password123');
        await pageB.fill('input[name="confirmPassword"]', 'password123');
        await pageB.click('button[type="submit"]');
        await pageB.waitForURL('/', { timeout: 20000, waitUntil: 'networkidle' });

        // User B should NOT see User A's transaction
        await expect(pageB.locator('text=USER A SECRET')).not.toBeVisible();

        // User B should see "No transactions" or their own transactions only
        const userBTransactions = await pageB.locator('table tbody tr').count();
        expect(userBTransactions).toBe(0);

        // Cleanup
        await contextA.close();
        await contextB.close();
    });
});
