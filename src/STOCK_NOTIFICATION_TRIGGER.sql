-- ============================================
-- STOCK NOTIFICATION TRIGGER SETUP
-- ============================================
-- This script creates a trigger to automatically send stock availability notifications
-- when products come back in stock

-- Create a function to handle stock updates and send notifications
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
        -- Get product details
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
            
            -- Insert into notification queue (you can create this table)
            INSERT INTO notification_queue (
                notification_id,
                product_id,
                email_data,
                status,
                created_at
            ) VALUES (
                notification_record.id,
                NEW.id,
                email_data,
                'pending',
                NOW()
            );
            
            notification_count := notification_count + 1;
        END LOOP;
        
        -- Log the trigger action
        INSERT INTO stock_notification_log (
            product_id,
            product_name,
            old_stock,
            new_stock,
            notifications_queued,
            triggered_at
        ) VALUES (
            NEW.id,
            product_record.name,
            OLD.stock_quantity,
            NEW.stock_quantity,
            notification_count,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create notification queue table
CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.stock_notifications(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    email_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Create notification log table
CREATE TABLE IF NOT EXISTS public.stock_notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    old_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    notifications_queued INTEGER DEFAULT 0,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON public.notification_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_product_id ON public.notification_queue(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_notification_log_product_id ON public.stock_notification_log(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_notification_log_triggered_at ON public.stock_notification_log(triggered_at);

-- Enable RLS on new tables
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_notification_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification_queue (admin only)
CREATE POLICY "Admin can manage notification queue" ON public.notification_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create RLS policies for stock_notification_log (admin only)
CREATE POLICY "Admin can view notification log" ON public.stock_notification_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create the trigger
DROP TRIGGER IF EXISTS stock_update_notification_trigger ON public.products;
CREATE TRIGGER stock_update_notification_trigger
    AFTER UPDATE OF stock_quantity ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_stock_update();

-- Create a function to process the notification queue
CREATE OR REPLACE FUNCTION public.process_notification_queue()
RETURNS TABLE (
    processed_count INTEGER,
    success_count INTEGER,
    failed_count INTEGER
) AS $$
DECLARE
    queue_record RECORD;
    processed_count INTEGER := 0;
    success_count INTEGER := 0;
    failed_count INTEGER := 0;
BEGIN
    -- Process pending notifications (limit to 10 at a time to avoid overwhelming)
    FOR queue_record IN
        SELECT id, notification_id, product_id, email_data, attempts
        FROM notification_queue
        WHERE status = 'pending'
        AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT 10
    LOOP
        -- Mark as processing
        UPDATE notification_queue
        SET status = 'processing',
            attempts = attempts + 1,
            processed_at = NOW()
        WHERE id = queue_record.id;
        
        processed_count := processed_count + 1;
        
        -- Here you would call your email service
        -- For now, we'll simulate success and mark as sent
        UPDATE notification_queue
        SET status = 'sent',
            sent_at = NOW()
        WHERE id = queue_record.id;
        
        -- Mark the original notification as sent
        UPDATE stock_notifications
        SET is_notified = TRUE,
            notified_at = NOW()
        WHERE id = queue_record.notification_id;
        
        success_count := success_count + 1;
        
        -- Add a small delay to avoid overwhelming the system
        PERFORM pg_sleep(0.1);
    END LOOP;
    
    RETURN QUERY SELECT processed_count, success_count, failed_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get notification queue status
CREATE OR REPLACE FUNCTION public.get_notification_queue_status()
RETURNS TABLE (
    pending_count INTEGER,
    processing_count INTEGER,
    sent_count INTEGER,
    failed_count INTEGER,
    total_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as pending_count,
        COUNT(*) FILTER (WHERE status = 'processing')::INTEGER as processing_count,
        COUNT(*) FILTER (WHERE status = 'sent')::INTEGER as sent_count,
        COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_count,
        COUNT(*)::INTEGER as total_count
    FROM notification_queue;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_queue TO authenticated;
GRANT SELECT ON public.stock_notification_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_notification_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_queue_status() TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.notification_queue IS 'Queue for processing stock availability notifications';
COMMENT ON TABLE public.stock_notification_log IS 'Log of stock update triggers and notification queuing';
COMMENT ON FUNCTION public.handle_stock_update() IS 'Trigger function to queue notifications when stock increases';
COMMENT ON FUNCTION public.process_notification_queue() IS 'Process pending notifications from the queue';
COMMENT ON FUNCTION public.get_notification_queue_status() IS 'Get current status of the notification queue';
