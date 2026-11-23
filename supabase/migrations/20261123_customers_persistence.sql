-- ==============================================================
-- Pretty Corner: Phase 3 Persistent Customers Architecture
-- Migration: 20261123_customers_persistence.sql
-- ==============================================================

-- 1. Create persistent customers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_e164 TEXT NOT NULL UNIQUE,
  email TEXT,
  avatar_color TEXT DEFAULT 'bg-rose-100 text-rose-700',
  addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  order_count INT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance B-Tree indexes for instant search and sorting
CREATE INDEX IF NOT EXISTS idx_customers_phone_e164 ON customers(phone_e164);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent DESC);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers(updated_at DESC);

-- 2. Customer synchronization stored procedure
CREATE OR REPLACE FUNCTION upsert_customer_from_order(
  p_name TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_township TEXT,
  p_city TEXT,
  p_landmark TEXT,
  p_order_total NUMERIC,
  p_order_date TIMESTAMPTZ
)
RETURNS TEXT AS $$
DECLARE
  v_norm_phone TEXT;
  v_cust_id TEXT;
  v_existing_addresses JSONB;
  v_new_addr JSONB;
  v_addr_exists BOOLEAN := FALSE;
  v_addr_rec JSONB;
BEGIN
  -- Normalize phone
  v_norm_phone := REGEXP_REPLACE(p_phone, '[^\d+]', '', 'g');
  IF v_norm_phone ~ '^09' THEN
    v_norm_phone := '+959' || SUBSTRING(v_norm_phone FROM 3);
  ELSIF v_norm_phone ~ '^959' THEN
    v_norm_phone := '+' || v_norm_phone;
  ELSIF v_norm_phone ~ '^9[0-9]{7,9}$' THEN
    v_norm_phone := '+95' || v_norm_phone;
  END IF;

  IF v_norm_phone IS NULL OR v_norm_phone = '' THEN
    v_norm_phone := '+959000000000';
  END IF;

  v_cust_id := 'cust-' || REGEXP_REPLACE(v_norm_phone, '[^\w]', '', 'g');

  v_new_addr := jsonb_build_object(
    'id', 'addr-' || SUBSTRING(MD5(COALESCE(p_address, '') || COALESCE(p_township, '')) FROM 1 FOR 8),
    'label', COALESCE(p_township, 'Delivery Address'),
    'address', COALESCE(p_address, ''),
    'township', COALESCE(p_township, 'Yangon'),
    'city', COALESCE(p_city, 'Yangon'),
    'nearbyLandmark', p_landmark,
    'isDefault', TRUE
  );

  -- Check if customer exists
  SELECT addresses INTO v_existing_addresses
  FROM customers
  WHERE phone_e164 = v_norm_phone;

  IF FOUND THEN
    -- Check if this address is already recorded
    IF v_existing_addresses IS NOT NULL THEN
      FOR v_addr_rec IN SELECT * FROM jsonb_array_elements(v_existing_addresses)
      LOOP
        IF v_addr_rec->>'address' = p_address THEN
          v_addr_exists := TRUE;
          EXIT;
        END IF;
      END LOOP;
    ELSE
      v_existing_addresses := '[]'::jsonb;
    END IF;

    IF NOT v_addr_exists AND p_address IS NOT NULL AND TRIM(p_address) <> '' THEN
      v_existing_addresses := v_existing_addresses || jsonb_build_array(v_new_addr);
    END IF;

    UPDATE customers
    SET name = COALESCE(NULLIF(TRIM(p_name), ''), name),
        total_spent = total_spent + p_order_total,
        order_count = order_count + 1,
        addresses = v_existing_addresses,
        updated_at = NOW()
    WHERE phone_e164 = v_norm_phone;
  ELSE
    INSERT INTO customers (
      id,
      name,
      phone,
      phone_e164,
      addresses,
      total_spent,
      order_count,
      joined_at,
      created_at,
      updated_at
    ) VALUES (
      v_cust_id,
      COALESCE(NULLIF(TRIM(p_name), ''), 'Guest Customer'),
      p_phone,
      v_norm_phone,
      jsonb_build_array(v_new_addr),
      p_order_total,
      1,
      COALESCE(p_order_date, NOW()),
      NOW(),
      NOW()
    );
  END IF;

  RETURN v_cust_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Backfill all existing orders into customers table idempotently
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Clear existing customer rows to avoid duplicate counts during initial migration run
  TRUNCATE TABLE customers;

  FOR r IN (
    SELECT customer_name, phone, delivery_address, landmark_note, total_amount, created_at
    FROM orders
    ORDER BY created_at ASC
  )
  LOOP
    PERFORM upsert_customer_from_order(
      r.customer_name,
      r.phone,
      r.delivery_address,
      NULL,
      'Yangon',
      r.landmark_note,
      r.total_amount,
      r.created_at
    );
  END LOOP;
END;
$$;
