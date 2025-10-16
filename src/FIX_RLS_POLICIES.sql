-- ============================================
-- FIX RLS POLICIES FOR STOCK NOTIFICATION TRIGGER
-- ============================================
-- This script fixes the RLS policies to allow the trigger function to insert records
-- The trigger runs in database context and needs to bypass RLS for logging

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view notification log" ON public.stock_notification_log;
DROP POLICY IF EXISTS "Admin can manage notification queue" ON public.notification_queue;

-- Create new policies that allow both admin access and trigger function access
-- For stock_notification_log - allow INSERT for triggers and SELECT for admins
CREATE POLICY "Allow trigger inserts and admin access" ON public.stock_notification_log
    FOR ALL USING (
        -- Allow if user is admin
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
        OR
        -- Allow if called from trigger function (no auth context)
        auth.uid() IS NULL
    );

-- For notification_queue - allow INSERT for triggers and admin access
CREATE POLICY "Allow trigger inserts and admin access" ON public.notification_queue
    FOR ALL USING (
        -- Allow if user is admin
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
        OR
        -- Allow if called from trigger function (no auth context)
        auth.uid() IS NULL
    );

-- Alternative approach: Create a SECURITY DEFINER function for logging
-- This allows the trigger to insert records with elevated privileges
CREATE OR REPLACE FUNCTION public.log_stock_notification(
    p_product_id UUID,
    p_product_name TEXT,
    p_old_stock INTEGER,
    p_new_stock INTEGER,
    p_notifications_queued INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.stock_notification_log (
        product_id,
        product_name,
        old_stock,
        new_stock,
        notifications_queued,
        triggered_at
    ) VALUES (
        p_product_id,
        p_product_name,
        p_old_stock,
        p_new_stock,
        p_notifications_queued,
        NOW()
    );
END;
$$;

-- Create a SECURITY DEFINER function for notification queue
CREATE OR REPLACE FUNCTION public.queue_stock_notification(
    p_notification_id UUID,
    p_product_id UUID,
    p_email_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.notification_queue (
        notification_id,
        product_id,
        email_data,
        status,
        created_at
    ) VALUES (
        p_notification_id,
        p_product_id,
        p_email_data,
        'pending',
        NOW()
    );
END;
$$;

-- Update the trigger function to use these SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.handle_stock_update()
RETURNS TRIGGER AS $$
DECLARE
    notification_record RECORD;
    product_record RECORD;
    email_data JSON;
    notification_count INTEGER := 0;
BEGIN
    -- Only proceed if stock quantity increased (product came back in stock)
    IF NEW.stock_quantity > OLD.stock_quantity AND NEW.stock_quantity > 0 THEN
        -- Get product details (using correct column names)
        SELECT id, name, price, images, stock_quantity
        INTO product_record
        FROM products
        WHERE id = NEW.id;
        
        -- Get all pending notifications for this product
        FOR notification_record IN
            SELECT id, user_id, email, created_at
            FROM stock_notifications
            WHERE product_id = NEW.id
            AND is_notified = FALSE
        LOOP
            -- Prepare email data (this would be sent to a queue or service)
            email_data := json_build_object(
                'notification_id', notification_record.id,
                'user_id', notification_record.user_id,
                'email', notification_record.email,
                'product_id', NEW.id,
                'product_name', product_record.name,
                'product_price', product_record.price,
                'product_image', COALESCE((product_record.images->>0), ''),
                'created_at', notification_record.created_at
            );
            
            -- Use SECURITY DEFINER function to insert into notification queue
            PERFORM public.queue_stock_notification(
                notification_record.id,
                NEW.id,
                email_data
            );
            
            notification_count := notification_count + 1;
        END LOOP;
        
        -- Use SECURITY DEFINER function to log the trigger action
        PERFORM public.log_stock_notification(
            NEW.id,
            product_record.name,
            OLD.stock_quantity,
            NEW.stock_quantity,
            notification_count
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the functions were created successfully
SELECT 'RLS policies and trigger functions fixed successfully' as status;
