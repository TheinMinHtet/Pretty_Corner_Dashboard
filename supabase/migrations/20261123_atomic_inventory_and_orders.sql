-- ==============================================================
-- Pretty Corner: Phase 1 Concurrency & Atomic Order Placement
-- Migration: 20261123_atomic_inventory_and_orders.sql
-- ==============================================================

-- 1. Performance indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_product_id ON inventory_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_created_at ON inventory_adjustments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_lookup ON orders(payment_status, fulfillment_status);

-- 2. Atomic Stock Decrement with Invariant Guard (prevents overselling)
CREATE OR REPLACE FUNCTION deduct_product_stock(
  p_product_id UUID,
  p_quantity INT,
  p_order_id TEXT DEFAULT NULL,
  p_performer TEXT DEFAULT 'Customer'
)
RETURNS JSONB AS $$
DECLARE
  v_prev_stock INT;
  v_new_stock INT;
  v_prod_name TEXT;
  v_sku TEXT;
BEGIN
  -- Row lock product to serialize concurrent updates
  SELECT name, COALESCE('PC-' || UPPER(REPLACE(slug, '-', '')), 'PC-SKU'), stock_quantity
  INTO v_prod_name, v_sku, v_prev_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRODUCT_NOT_FOUND');
  END IF;

  IF v_prev_stock < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_STOCK',
      'available', v_prev_stock,
      'requested', p_quantity
    );
  END IF;

  v_new_stock := v_prev_stock - p_quantity;

  UPDATE products
  SET stock_quantity = v_new_stock,
      updated_at = NOW()
  WHERE id = p_product_id;

  INSERT INTO inventory_adjustments (
    id,
    product_id,
    product_name,
    sku,
    type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    performed_by,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_product_id,
    v_prod_name,
    v_sku,
    'decrease',
    p_quantity,
    v_prev_stock,
    v_new_stock,
    CASE WHEN p_order_id IS NOT NULL THEN 'Storefront Order ' || p_order_id ELSE 'Stock decrement' END,
    COALESCE(p_performer, 'Customer'),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'productId', p_product_id,
    'previousStock', v_prev_stock,
    'newStock', v_new_stock
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Atomic Stock Restoration (for order cancellations / returns)
CREATE OR REPLACE FUNCTION restore_product_stock(
  p_product_id UUID,
  p_quantity INT,
  p_order_id TEXT DEFAULT NULL,
  p_performer TEXT DEFAULT 'Admin'
)
RETURNS JSONB AS $$
DECLARE
  v_prev_stock INT;
  v_new_stock INT;
  v_prod_name TEXT;
  v_sku TEXT;
BEGIN
  SELECT name, COALESCE('PC-' || UPPER(REPLACE(slug, '-', '')), 'PC-SKU'), stock_quantity
  INTO v_prod_name, v_sku, v_prev_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRODUCT_NOT_FOUND');
  END IF;

  v_new_stock := v_prev_stock + p_quantity;

  UPDATE products
  SET stock_quantity = v_new_stock,
      updated_at = NOW()
  WHERE id = p_product_id;

  INSERT INTO inventory_adjustments (
    id,
    product_id,
    product_name,
    sku,
    type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    performed_by,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_product_id,
    v_prod_name,
    v_sku,
    'increase',
    p_quantity,
    v_prev_stock,
    v_new_stock,
    CASE WHEN p_order_id IS NOT NULL THEN 'Restock from Order ' || p_order_id ELSE 'Stock restock' END,
    COALESCE(p_performer, 'Admin'),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'productId', p_product_id,
    'previousStock', v_prev_stock,
    'newStock', v_new_stock
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Atomic Storefront Order Placement Transaction
CREATE OR REPLACE FUNCTION create_storefront_order_transaction(p_payload JSONB)
RETURNS JSONB AS $$
DECLARE
  v_order_id TEXT;
  v_customer_name TEXT;
  v_phone TEXT;
  v_delivery_address TEXT;
  v_landmark_note TEXT;
  v_total_amount INT;
  v_payment_method TEXT;
  v_payment_status TEXT;
  v_fulfillment_status TEXT;
  v_promo_code TEXT;
  v_discount_amount INT;
  v_items JSONB;
  v_item JSONB;
  v_prod_id UUID;
  v_prod_name TEXT;
  v_prod_sku TEXT;
  v_unit_price INT;
  v_qty INT;
  v_item_total INT;
  v_img TEXT;
  v_item_discount INT;
  v_curr_stock INT;
  v_new_stock INT;
  v_promo_id UUID;
  v_promo_active BOOLEAN;
  v_promo_usage_count INT;
  v_promo_limit INT;
BEGIN
  v_order_id := p_payload->>'id';
  v_customer_name := p_payload->>'customerName';
  v_phone := p_payload->>'phone';
  v_delivery_address := p_payload->>'deliveryAddress';
  v_landmark_note := p_payload->>'landmarkNote';
  v_total_amount := (p_payload->>'total')::INT;
  v_payment_method := p_payload->>'paymentMethod';
  v_payment_status := COALESCE(p_payload->>'paymentStatus', 'pending');
  v_fulfillment_status := COALESCE(p_payload->>'fulfillmentStatus', 'pending_review');
  v_promo_code := p_payload->>'promoCode';
  v_discount_amount := COALESCE((p_payload->>'discountAmount')::INT, 0);
  v_items := p_payload->'items';

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'ORDER_EMPTY: An order must contain at least one item';
  END IF;

  -- 1. Promotion validation and atomic quota reservation
  IF v_promo_code IS NOT NULL AND TRIM(v_promo_code) <> '' THEN
    SELECT id, is_active, usage_count, usage_limit
    INTO v_promo_id, v_promo_active, v_promo_usage_count, v_promo_limit
    FROM promotions
    WHERE code = v_promo_code
    FOR UPDATE;

    IF v_promo_id IS NOT NULL THEN
      IF NOT v_promo_active THEN
        RAISE EXCEPTION 'PROMOTION_INACTIVE: Promotion % is not active', v_promo_code;
      END IF;
      IF v_promo_limit IS NOT NULL AND v_promo_usage_count >= v_promo_limit THEN
        RAISE EXCEPTION 'PROMOTION_EXHAUSTED: Promotion % has reached its usage limit', v_promo_code;
      END IF;

      UPDATE promotions
      SET usage_count = usage_count + 1,
          updated_at = NOW()
      WHERE id = v_promo_id;
    END IF;
  END IF;

  -- 2. Insert Order Header
  INSERT INTO orders (
    id,
    customer_name,
    phone,
    delivery_address,
    landmark_note,
    total_amount,
    payment_method,
    payment_status,
    fulfillment_status,
    promo_code,
    discount_amount,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    v_customer_name,
    v_phone,
    v_delivery_address,
    v_landmark_note,
    v_total_amount,
    v_payment_method,
    v_payment_status,
    v_fulfillment_status,
    v_promo_code,
    v_discount_amount,
    NOW(),
    NOW()
  );

  -- 2b. Automatically upsert persistent customer profile
  PERFORM upsert_customer_from_order(
    v_customer_name,
    v_phone,
    v_delivery_address,
    NULL,
    'Yangon',
    v_landmark_note,
    v_total_amount,
    NOW()
  );

  -- 3. Iterate through items, lock product row, check stock, decrement, log ledger, insert order_item
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_prod_id := NULL;
    IF (v_item->>'productId') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_prod_id := (v_item->>'productId')::UUID;
    END IF;

    v_prod_name := v_item->>'name';
    v_unit_price := (v_item->>'price')::INT;
    v_qty := (v_item->>'quantity')::INT;
    v_item_total := v_unit_price * v_qty;
    v_img := v_item->>'image';
    v_item_discount := COALESCE((v_item->>'discountAmount')::INT, 0);

    -- Find and lock product row
    IF v_prod_id IS NOT NULL THEN
      SELECT name, COALESCE('PC-' || UPPER(REPLACE(slug, '-', '')), 'PC-SKU'), stock_quantity
      INTO v_prod_name, v_prod_sku, v_curr_stock
      FROM products
      WHERE id = v_prod_id
      FOR UPDATE;
    ELSE
      SELECT id, name, COALESCE('PC-' || UPPER(REPLACE(slug, '-', '')), 'PC-SKU'), stock_quantity
      INTO v_prod_id, v_prod_name, v_prod_sku, v_curr_stock
      FROM products
      WHERE slug = v_item->>'productId' OR name = v_item->>'name'
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF v_prod_id IS NOT NULL THEN
      IF v_curr_stock < v_qty THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: % (available: %, requested: %)', v_prod_name, v_curr_stock, v_qty;
      END IF;

      v_new_stock := v_curr_stock - v_qty;

      UPDATE products
      SET stock_quantity = v_new_stock,
          updated_at = NOW()
      WHERE id = v_prod_id;

      INSERT INTO inventory_adjustments (
        id,
        product_id,
        product_name,
        sku,
        type,
        quantity,
        previous_stock,
        new_stock,
        reason,
        performed_by,
        created_at
      ) VALUES (
        gen_random_uuid(),
        v_prod_id,
        v_prod_name,
        v_prod_sku,
        'decrease',
        v_qty,
        v_curr_stock,
        v_new_stock,
        'Storefront Order ' || v_order_id,
        COALESCE(v_customer_name, 'Customer'),
        NOW()
      );
    END IF;

    INSERT INTO order_items (
      id,
      order_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      item_total,
      product_image,
      discount_amount,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_order_id,
      v_prod_id,
      v_prod_name,
      v_unit_price,
      v_qty,
      v_item_total,
      v_img,
      v_item_discount,
      NOW()
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', v_order_id
  );
END;
$$ LANGUAGE plpgsql;
