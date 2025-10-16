-- Complete fix for shareable cart functionality
-- This script addresses the base64url encoding issue and ensures proper table setup

-- 1. Create the shareable_carts table if it doesn't exist
CREATE TABLE IF NOT EXISTS shareable_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_token TEXT NOT NULL UNIQUE, -- Unique token for sharing
    original_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    original_session_id TEXT, -- For guest users
    cart_data JSONB NOT NULL, -- Complete cart snapshot
    cart_metadata JSONB NOT NULL DEFAULT '{}', -- Additional metadata
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'), -- 7 days expiration
    paid_by_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL, -- Who paid for it
    paid_at TIMESTAMPTZ,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Link to created order
    access_count INTEGER DEFAULT 0, -- Track how many times link was accessed
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shareable_carts_token ON shareable_carts(share_token);
CREATE INDEX IF NOT EXISTS idx_shareable_carts_original_user ON shareable_carts(original_user_id);
CREATE INDEX IF NOT EXISTS idx_shareable_carts_status ON shareable_carts(status);
CREATE INDEX IF NOT EXISTS idx_shareable_carts_expires ON shareable_carts(expires_at);
CREATE INDEX IF NOT EXISTS idx_shareable_carts_paid_by ON shareable_carts(paid_by_user_id);

-- 3. Drop and recreate the function with proper encoding
DROP FUNCTION IF EXISTS generate_share_token();

CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
    token TEXT;
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generate a secure random token using base64 and convert to base64url
        -- Replace + with -, / with _, and remove = padding
        token := replace(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', '');
        
        -- Check if token already exists
        SELECT COUNT(*) INTO exists_count 
        FROM shareable_carts 
        WHERE share_token = token;
        
        -- If token doesn't exist, we can use it
        IF exists_count = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN token;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to clean up expired carts
CREATE OR REPLACE FUNCTION cleanup_expired_shareable_carts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired carts that are not paid
    DELETE FROM shareable_carts 
    WHERE expires_at < NOW() 
    AND status IN ('active', 'expired');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Update status of carts that are about to expire
    UPDATE shareable_carts 
    SET status = 'expired' 
    WHERE expires_at < NOW() 
    AND status = 'active';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically generate share_token
CREATE OR REPLACE FUNCTION set_share_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.share_token IS NULL OR NEW.share_token = '' THEN
        NEW.share_token := generate_share_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_share_token ON shareable_carts;

CREATE TRIGGER trigger_set_share_token
    BEFORE INSERT ON shareable_carts
    FOR EACH ROW
    EXECUTE FUNCTION set_share_token();

-- 6. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_shareable_carts_updated_at ON shareable_carts;

CREATE TRIGGER trigger_update_shareable_carts_updated_at
    BEFORE UPDATE ON shareable_carts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable RLS and create policies
ALTER TABLE shareable_carts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own shareable carts" ON shareable_carts;
DROP POLICY IF EXISTS "Users can create shareable carts" ON shareable_carts;
DROP POLICY IF EXISTS "Users can update own shareable carts" ON shareable_carts;
DROP POLICY IF EXISTS "Anyone can view active shareable carts by token" ON shareable_carts;

-- Policy: Users can view their own shareable carts
CREATE POLICY "Users can view own shareable carts" ON shareable_carts
    FOR SELECT USING (
        auth.uid() = original_user_id OR 
        auth.uid() = paid_by_user_id
    );

-- Policy: Users can create shareable carts (more permissive for authenticated users)
CREATE POLICY "Users can create shareable carts" ON shareable_carts
    FOR INSERT WITH CHECK (
        auth.uid() = original_user_id OR 
        original_user_id IS NULL OR
        auth.uid() IS NOT NULL -- Allow any authenticated user to create
    );

-- Policy: Users can update their own shareable carts
CREATE POLICY "Users can update own shareable carts" ON shareable_carts
    FOR UPDATE USING (
        auth.uid() = original_user_id OR 
        auth.uid() = paid_by_user_id
    );

-- Policy: Anyone can view active shareable carts by token (for recipients)
CREATE POLICY "Anyone can view active shareable carts by token" ON shareable_carts
    FOR SELECT USING (
        status = 'active' AND 
        expires_at > NOW()
    );

-- 8. Create view for shareable cart analytics
CREATE OR REPLACE VIEW shareable_cart_analytics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_created,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as total_paid,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as total_expired,
    AVG(access_count) as avg_access_count,
    SUM(CASE WHEN status = 'paid' THEN (cart_data->>'total')::DECIMAL ELSE 0 END) as total_revenue
FROM shareable_carts
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 9. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON shareable_carts TO authenticated;
GRANT SELECT ON shareable_cart_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION generate_share_token() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_shareable_carts() TO authenticated;

-- 10. Test the function
SELECT generate_share_token() as test_token;

-- 11. Add comments
COMMENT ON TABLE shareable_carts IS 'Stores shareable cart data with unique tokens for sharing';
COMMENT ON COLUMN shareable_carts.share_token IS 'Unique token used in shareable URLs';
COMMENT ON COLUMN shareable_carts.cart_data IS 'Complete cart snapshot including items, totals, and promotions';
COMMENT ON COLUMN shareable_carts.cart_metadata IS 'Additional metadata like original user info, sharing preferences';
COMMENT ON COLUMN shareable_carts.status IS 'Current status: active, paid, expired, cancelled';
COMMENT ON COLUMN shareable_carts.expires_at IS 'When the shareable cart expires (default 7 days)';
COMMENT ON COLUMN shareable_carts.paid_by_user_id IS 'User who paid for the shared cart';
COMMENT ON COLUMN shareable_carts.order_id IS 'Order created from the shared cart';
COMMENT ON COLUMN shareable_carts.access_count IS 'Number of times the share link was accessed';
