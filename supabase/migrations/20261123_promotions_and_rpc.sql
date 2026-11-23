-- ==============================================================
-- Pretty Corner: Promotion Routing, Target Tiers & Atomic RPC
-- Migration: 20261123_promotions_and_rpc.sql
-- ==============================================================

-- 1. Extend promotions table with routing and target metadata
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'ENTIRE_STORE',
  ADD COLUMN IF NOT EXISTS target_slug TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS redemption_method TEXT NOT NULL DEFAULT 'CODE',
  ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS minimum_order_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_out_of_stock BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Backfill existing live rows to guaranteed safe defaults
UPDATE promotions
SET target_type = 'ENTIRE_STORE',
    is_out_of_stock = FALSE
WHERE target_type IS NULL OR is_out_of_stock IS NULL;

-- 3. Create performance indexes for storefront lookup queries
CREATE INDEX IF NOT EXISTS idx_promotions_slug ON promotions(slug);
CREATE INDEX IF NOT EXISTS idx_promotions_target_type ON promotions(target_type);
CREATE INDEX IF NOT EXISTS idx_promotions_active_lookup ON promotions(is_active, is_out_of_stock, start_date, end_date);

-- 4. Atomic PostgreSQL stored procedure for concurrent quota increment
CREATE OR REPLACE FUNCTION increment_promotion_usage(p_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE promotions
  SET usage_count = usage_count + 1
  WHERE id = p_id AND (usage_limit IS NULL OR usage_count < usage_limit);
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- 5. Stored procedure for quota restoration upon order cancellation
CREATE OR REPLACE FUNCTION decrement_promotion_usage(p_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE promotions
  SET usage_count = GREATEST(0, usage_count - 1)
  WHERE id = p_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;
