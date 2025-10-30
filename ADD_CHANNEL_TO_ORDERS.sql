-- Ensure enum type exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'order_channel'
  ) THEN
    CREATE TYPE order_channel AS ENUM ('online', 'pos');
  END IF;
END $$;

-- Add channel column if missing
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS channel order_channel NOT NULL DEFAULT 'online';

-- Backfill POS channel based on payment_details marker
UPDATE public.orders
SET channel = 'pos'
WHERE channel <> 'pos'
  AND (
    (payment_details ->> 'pos_location') = 'Store POS'
    OR (payment_details ? 'cashier_id')
  );

-- Index to speed up dashboard queries
CREATE INDEX IF NOT EXISTS idx_orders_channel_created
  ON public.orders(channel, created_at);

