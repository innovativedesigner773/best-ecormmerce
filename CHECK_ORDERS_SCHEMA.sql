-- ============================================
-- CHECK ORDERS TABLE SCHEMA
-- ============================================
-- Run this to see the actual structure of the orders table

-- Check the columns in the orders table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check if there are any sample orders to see the structure
SELECT 
    id,
    order_number,
    customer_id,
    customer_email,
    status,
    payment_status,
    total,
    created_at
FROM orders 
LIMIT 3;
