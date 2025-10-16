-- ============================================
-- FIX STOCK NOTIFICATION TRIGGER
-- ============================================
-- This script fixes the stock notification trigger to use the correct column names
-- The products table uses 'images' (JSONB array) not 'image_url'

-- Drop the existing trigger first, then the function
DROP TRIGGER IF EXISTS stock_update_notification_trigger ON products;
DROP FUNCTION IF EXISTS public.handle_stock_update();

-- Create the corrected function
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

-- Recreate the trigger with the correct name
CREATE TRIGGER stock_update_notification_trigger
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_stock_update();

-- Verify the function was created successfully
SELECT 'Stock notification trigger fixed successfully' as status;
