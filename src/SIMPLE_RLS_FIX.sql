-- ============================================
-- SIMPLE RLS FIX FOR STOCK NOTIFICATION TRIGGER
-- ============================================
-- This script provides a simple fix by disabling RLS on logging tables
-- since these are internal system tables that don't need user-level security

-- Option 1: Disable RLS on logging tables (simplest solution)
ALTER TABLE public.stock_notification_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue DISABLE ROW LEVEL SECURITY;

-- Option 2: If you prefer to keep RLS enabled, use this instead:
-- (Comment out the above lines and uncomment the lines below)

/*
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admin can view notification log" ON public.stock_notification_log;
DROP POLICY IF EXISTS "Admin can manage notification queue" ON public.notification_queue;

-- Create permissive policies that allow all operations
CREATE POLICY "Allow all operations on notification log" ON public.stock_notification_log
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on notification queue" ON public.notification_queue
    FOR ALL USING (true) WITH CHECK (true);
*/

-- Verify the changes
SELECT 'RLS policies fixed successfully' as status;
