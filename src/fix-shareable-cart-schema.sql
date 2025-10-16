-- Fix for shareable cart base64url encoding issue
-- This script updates the generate_share_token function to use base64 instead of base64url

-- Drop and recreate the function with proper encoding
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_share_token() TO authenticated;

-- Test the function
SELECT generate_share_token() as test_token;
