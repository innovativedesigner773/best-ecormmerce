-- ============================================
-- STOCK NOTIFICATIONS SETUP
-- ============================================
-- This script creates the stock_notifications table for "remind me" functionality
-- Run this to enable stock notification features

-- Create stock_notifications table
CREATE TABLE IF NOT EXISTS public.stock_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    is_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_notifications_user_id ON public.stock_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_notifications_product_id ON public.stock_notifications(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_notifications_is_notified ON public.stock_notifications(is_notified);
CREATE INDEX IF NOT EXISTS idx_stock_notifications_created_at ON public.stock_notifications(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Users can view their own stock notifications" ON public.stock_notifications;
DROP POLICY IF EXISTS "Users can create their own stock notifications" ON public.stock_notifications;
DROP POLICY IF EXISTS "Users can update their own stock notifications" ON public.stock_notifications;
DROP POLICY IF EXISTS "Users can delete their own stock notifications" ON public.stock_notifications;

-- Create RLS policies
-- Users can only see their own notifications
CREATE POLICY "Users can view their own stock notifications" ON public.stock_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own notifications
CREATE POLICY "Users can create their own stock notifications" ON public.stock_notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own notifications
CREATE POLICY "Users can update their own stock notifications" ON public.stock_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own stock notifications" ON public.stock_notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_notifications TO authenticated;

-- Create a function to check if user has already requested notification for a product
CREATE OR REPLACE FUNCTION public.user_has_stock_notification(user_id_param UUID, product_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS(
        SELECT 1 FROM public.stock_notifications 
        WHERE user_id = user_id_param 
        AND product_id = product_id_param
        AND is_notified = FALSE
    );
$$;

-- Drop the function if it exists (to allow changing return type)
DROP FUNCTION IF EXISTS public.get_user_stock_notifications(UUID);

-- Create a function to get user's stock notifications
CREATE FUNCTION public.get_user_stock_notifications(user_id_param UUID)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    product_name TEXT,
    product_image TEXT,
    product_price DECIMAL,
    product_stock_quantity INTEGER,
    product_updated_at TIMESTAMP WITH TIME ZONE,
    email VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    is_notified BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        sn.id,
        sn.product_id,
        p.name as product_name,
        CASE 
            WHEN jsonb_typeof(p.images) = 'array' AND jsonb_array_length(p.images) > 0 THEN p.images->>0
            WHEN p.images IS NULL THEN ''
            ELSE COALESCE(p.images::text, '')
        END as product_image,
        p.price as product_price,
        COALESCE(p.stock_quantity, 0) as product_stock_quantity,
        p.updated_at as product_updated_at,
        sn.email,
        sn.created_at,
        sn.is_notified
    FROM public.stock_notifications sn
    JOIN public.products p ON sn.product_id = p.id
    WHERE sn.user_id = user_id_param
    ORDER BY sn.created_at DESC;
$$;

-- Create a function to mark notifications as sent (for admin use)
CREATE OR REPLACE FUNCTION public.mark_stock_notifications_sent(product_id_param UUID)
RETURNS INTEGER
LANGUAGE sql
AS $$
    UPDATE public.stock_notifications 
    SET is_notified = TRUE, notified_at = NOW()
    WHERE product_id = product_id_param 
    AND is_notified = FALSE;
    
    SELECT COUNT(*)::INTEGER FROM public.stock_notifications 
    WHERE product_id = product_id_param 
    AND is_notified = TRUE;
$$;

-- Add comments for documentation
COMMENT ON TABLE public.stock_notifications IS 'Stores user requests to be notified when out-of-stock products become available';
COMMENT ON COLUMN public.stock_notifications.user_id IS 'ID of the user who requested the notification';
COMMENT ON COLUMN public.stock_notifications.product_id IS 'ID of the product to be notified about';
COMMENT ON COLUMN public.stock_notifications.email IS 'Email address to send notification to';
COMMENT ON COLUMN public.stock_notifications.is_notified IS 'Whether the notification has been sent';
COMMENT ON FUNCTION public.user_has_stock_notification IS 'Check if user already has a pending notification for a product';
COMMENT ON FUNCTION public.get_user_stock_notifications IS 'Get all stock notifications for a user with product details';
COMMENT ON FUNCTION public.mark_stock_notifications_sent IS 'Mark all pending notifications for a product as sent';
