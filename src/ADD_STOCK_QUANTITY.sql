-- ============================================
-- ADD STOCK QUANTITY TO PRODUCTS TABLE
-- ============================================
-- This script adds stock_quantity field to the products table
-- Run this to enable stock management functionality

-- Add stock_quantity column if it doesn't exist
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON public.products(stock_quantity);

-- Update existing products to have stock_quantity = 0 by default
UPDATE public.products 
SET stock_quantity = 0 
WHERE stock_quantity IS NULL;

-- Set stock_quantity to NOT NULL after updating existing records
ALTER TABLE public.products 
ALTER COLUMN stock_quantity SET NOT NULL;

-- Add a check constraint to ensure stock_quantity is not negative
ALTER TABLE public.products 
ADD CONSTRAINT check_stock_quantity_non_negative 
CHECK (stock_quantity >= 0);

-- Fix barcode constraint issue - allow multiple NULL values but unique non-null values
-- First drop existing unique constraint if it exists
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_barcode_key;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS unique_barcode;

-- Create a partial unique index that allows multiple NULL values
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique 
ON public.products (barcode) 
WHERE barcode IS NOT NULL AND barcode != '';

-- Optional: Create a function to check if product is in stock
CREATE OR REPLACE FUNCTION public.is_product_in_stock(product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT 
    CASE 
      WHEN stock_tracking = true THEN stock_quantity > 0
      ELSE true
    END
  FROM public.products 
  WHERE id = product_id;
$$;

-- Optional: Create a view for products with stock status
CREATE OR REPLACE VIEW public.products_with_stock_status AS
SELECT 
  p.*,
  CASE 
    WHEN p.stock_tracking = false THEN 'unlimited'
    WHEN p.stock_quantity = 0 THEN 'out_of_stock'
    WHEN p.stock_quantity <= 5 THEN 'low_stock'
    WHEN p.stock_quantity <= 10 THEN 'running_low'
    ELSE 'in_stock'
  END as stock_status,
  CASE 
    WHEN p.stock_tracking = false THEN 'Unlimited Stock'
    WHEN p.stock_quantity = 0 THEN 'Out of Stock'
    WHEN p.stock_quantity <= 5 THEN CONCAT(p.stock_quantity, ' left - Low Stock!')
    WHEN p.stock_quantity <= 10 THEN CONCAT(p.stock_quantity, ' in stock - Running Low')
    ELSE CONCAT(p.stock_quantity, ' in stock')
  END as stock_message
FROM public.products p;

-- Grant permissions to use the view
GRANT SELECT ON public.products_with_stock_status TO authenticated;

COMMENT ON COLUMN public.products.stock_quantity IS 'Number of items in stock. Used only when stock_tracking is true.';
COMMENT ON FUNCTION public.is_product_in_stock IS 'Returns true if product is in stock or if stock tracking is disabled.';
COMMENT ON VIEW public.products_with_stock_status IS 'Products with computed stock status and message for easy display.';
