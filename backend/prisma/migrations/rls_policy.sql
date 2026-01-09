-- Row-Level Security (RLS) Policy for Transactions Table
-- This adds database-level data isolation as a defense-in-depth measure

-- Enable RLS on transactions table
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner (important for security)
ALTER TABLE "Transaction" FORCE ROW LEVEL SECURITY;

-- Create policy: Users can only SELECT their organization's transactions
CREATE POLICY "Users can view own organization transactions"
ON "Transaction"
FOR SELECT
TO PUBLIC
USING ("organizationId" = current_setting('app.current_organization_id', true));

-- Create policy: Users can only INSERT into their own organization
CREATE POLICY "Users can insert own organization transactions"
ON "Transaction"
FOR INSERT
TO PUBLIC
WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

-- Create policy: Users can only UPDATE their organization's transactions
CREATE POLICY "Users can update own organization transactions"
ON "Transaction"
FOR UPDATE
TO PUBLIC
USING ("organizationId" = current_setting('app.current_organization_id', true))
WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

-- Create policy: Users can only DELETE their organization's transactions
CREATE POLICY "Users can delete own organization transactions"
ON "Transaction"
FOR DELETE
TO PUBLIC
USING ("organizationId" = current_setting('app.current_organization_id', true));

-- Note: To use these policies, the application must set the session variable before each query:
-- SET app.current_organization_id = 'organization-id-here';
-- This is typically done in a middleware or at the start of each request.
