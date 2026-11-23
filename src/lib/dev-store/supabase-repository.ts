import {
  Category,
  Customer,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  Promotion,
  StockAdjustment,
  StoreSettings,
} from "@/types/admin";
import { getSupabaseClient } from "@/lib/supabase";
import { generateId } from "@/lib/utils";
import {
  JsonFileStoreRepository,
  OrderUpdateInput,
  StorefrontOrderCreateInput,
  StoreRepository,
} from "./repository";
import { executeOrderUpdate, OrderMutationResult } from "@/modules/orders/order-lifecycle";
import { DevStoreData } from "./seed";
import {
  slugify,
  deriveCustomersFromOrders,
  normalizePhoneNumber,
  deriveNotificationsFromOrdersAndProducts,
} from "./mappers";

interface SbCategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface SbProductRow {
  id: string;
  category_id: string | null;
  slug: string;
  name: string;
  badge: string | null;
  price: number;
  stock_quantity: number;
  description: string | null;
  benefits: string[] | null;
  usage: string | null;
  main_image: string | null;
  gallery: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sold_count?: number | null;
}

interface SbOrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  item_total: number;
  product_image: string | null;
  discount_amount?: number | null;
  created_at: string;
}

interface SbOrderRow {
  id: string;
  customer_name: string;
  phone: string;
  delivery_address: string;
  landmark_note: string | null;
  total_amount: number;
  promo_code?: string | null;
  discount_amount?: number | null;
  payment_method: string;
  payment_status: string;
  fulfillment_status: string;
  payment_slip_url: string | null;
  created_at: string;
  updated_at: string;
  order_items?: SbOrderItemRow[];
}

interface SbPromotionRow {
  id: string;
  code: string;
  title: string;
  subtitle: string | null;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  usage_count: number | null;
  featured_product_ids: string[] | null;
  image_url: string | null;
  banner_badge: string | null;
  cta_text: string | null;
  cta_link: string | null;
  slug?: string | null;
  target_type?: string | null;
  target_slug?: string | null;
  redemption_method?: string | null;
  usage_limit?: number | null;
  minimum_order_amount?: number | null;
  is_out_of_stock?: boolean | null;
  created_at: string;
  updated_at: string;
}

interface SbStockAdjustmentRow {
  id: string;
  product_id: string | null;
  product_name: string;
  sku: string;
  variant_id: string | null;
  variant_label: string | null;
  type: "increase" | "decrease";
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  performed_by: string;
  created_at: string;
}

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function mapPromotionRow(row: SbPromotionRow): Promotion {
  return {
    id: row.id,
    slug: row.slug ?? undefined,
    title: row.title,
    subtitle: row.subtitle ?? "",
    code: row.code,
    discountPercentage: Number(row.discount_percentage) || 0,
    startDate: row.start_date,
    endDate: row.end_date,
    active: row.is_active ?? true,
    targetType: (row.target_type as Promotion["targetType"]) || "ENTIRE_STORE",
    targetSlug: row.target_slug ?? undefined,
    redemptionMethod: (row.redemption_method as Promotion["redemptionMethod"]) || "CODE",
    usageLimit: row.usage_limit ? Number(row.usage_limit) : undefined,
    usageCount: Number(row.usage_count) || 0,
    minimumOrderAmount: row.minimum_order_amount ? Number(row.minimum_order_amount) : 0,
    bannerColor: "#FCEEF2",
    bannerImage: row.image_url ?? undefined,
    bannerBadge: row.banner_badge ?? undefined,
    ctaText: row.cta_text ?? undefined,
    ctaLink: row.cta_link ?? undefined,
    featuredProductIds: Array.isArray(row.featured_product_ids)
      ? row.featured_product_ids
      : [],
    isOutOfStock: row.is_out_of_stock ?? false,
  };
}

function mapCategoryRow(row: SbCategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    image: "/assets/dew-drop-serum.png",
    active: row.is_active ?? true,
    createdAt: row.created_at,
  };
}

function mapProductRow(row: SbProductRow): Product {
  const mainImage = row.main_image || "/assets/dew-drop-serum.png";
  const gallery =
    Array.isArray(row.gallery) && row.gallery.length > 0
      ? row.gallery
      : [mainImage];

  return {
    id: row.id,
    slug: row.slug || row.id,
    name: row.name,
    description: row.description ?? "",
    categoryId: row.category_id ?? "",
    brand: "Pretty Corner",
    sku: `PC-${(row.slug || row.id).slice(0, 8).toUpperCase()}`,
    regularPrice: Number(row.price) || 0,
    images: gallery,
    stock: Number(row.stock_quantity) || 0,
    lowStockThreshold: 10,
    status: row.is_active ? "Active" : "Archived",
    variants: [],
    soldCount: Number(row.sold_count) || 0,
    badge: row.badge ?? undefined,
    benefits: Array.isArray(row.benefits) ? row.benefits : [],
    usage: row.usage ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPaymentStatusFromSb(status: string): PaymentStatus {
  switch (status?.toLowerCase()) {
    case "paid":
      return "Paid";
    case "failed":
      return "Failed";
    case "expired":
      return "Expired";
    case "refunded":
      return "Refunded";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

function mapPaymentStatusToSb(status: PaymentStatus): string {
  return status.toLowerCase();
}

function mapOrderStatusFromSb(status: string): OrderStatus {
  switch (status?.toLowerCase()) {
    case "confirmed":
      return "Confirmed";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

function mapOrderStatusToSb(status: OrderStatus): string {
  switch (status) {
    case "Confirmed":
      return "confirmed";
    case "Processing":
      return "processing";
    case "Shipped":
      return "shipped";
    case "Delivered":
      return "delivered";
    case "Cancelled":
      return "cancelled";
    default:
      return "pending_review";
  }
}

function mapPaymentMethodFromSb(method: string): Order["paymentMethod"] {
  if (
    method === "KBZPay" ||
    method === "WavePay" ||
    method === "CB Pay" ||
    method === "AYA Pay" ||
    method === "Cash on Delivery"
  ) {
    return method;
  }
  return "KBZPay";
}

function extractTownshipFromAddress(addr: string): string {
  if (!addr) return "Yangon";
  const townships = [
    "Dagon Myothit",
    "South Dagon",
    "North Dagon",
    "East Dagon",
    "Dagon Seikkan",
    "Bahan",
    "Sanchaung",
    "Kamayut",
    "Hlaing",
    "Mayangone",
    "Yankin",
    "Kyauktada",
    "Pabedan",
    "Botataung",
    "Tamwe",
    "Thingangyun",
    "South Okkalapa",
    "North Okkalapa",
    "Insein",
    "Thaketa",
    "Dawbon",
    "Ahlone",
    "Lanmadaw",
    "Latha",
    "Pazundaung",
    "Mingalar Taung Nyunt",
    "Mingaladon",
    "Shwepyitha",
    "Hlaingtharya",
  ];
  for (const t of townships) {
    if (new RegExp(t, "i").test(addr)) {
      return t;
    }
  }
  return "Yangon";
}

function mapOrderRow(row: SbOrderRow, allProducts?: Product[]): Order {
  const items = (row.order_items ?? []).map((it) => {
    let resolvedProductId = it.product_id;
    let resolvedProductName = it.product_name;
    let resolvedImage = it.product_image;
    let resolvedSku = "";

    if (allProducts && allProducts.length > 0) {
      const matched = allProducts.find((p) => {
        if (it.product_id && (p.id === it.product_id || p.slug === it.product_id)) {
          return true;
        }
        if (
          it.product_name &&
          p.name &&
          p.name.trim().toLowerCase() === it.product_name.trim().toLowerCase()
        ) {
          return true;
        }
        if (
          it.product_name &&
          p.name &&
          (p.name.toLowerCase().includes(it.product_name.trim().toLowerCase()) ||
            it.product_name.toLowerCase().includes(p.name.trim().toLowerCase()))
        ) {
          return true;
        }
        return false;
      });

      if (matched) {
        resolvedProductId = matched.id;
        resolvedProductName = matched.name;
        resolvedSku = matched.sku || "";
        if (!resolvedImage || resolvedImage === "/assets/dew-drop-serum.png") {
          resolvedImage = matched.images[0] || resolvedImage;
        }
      }
    }

    return {
      id: it.id,
      productId: resolvedProductId || it.product_name,
      productName: resolvedProductName,
      productImage: resolvedImage || "/assets/dew-drop-serum.png",
      sku: resolvedSku,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unit_price) || 0,
      discountAmount: Number(it.discount_amount) || 0,
    };
  });

  const subtotal = items.reduce(
    (sum, it) => sum + it.unitPrice * it.quantity,
    0
  );
  const total = Number(row.total_amount) || subtotal;
  const orderStatus = mapOrderStatusFromSb(row.fulfillment_status);
  const normPhone = normalizePhoneNumber(row.phone);
  const discountAmount =
    row.discount_amount !== undefined && row.discount_amount !== null
      ? Number(row.discount_amount)
      : Math.max(0, (subtotal || total) - total);

  return {
    id: row.id,
    reference: row.id,
    customerId: normPhone ? `cust-${normPhone}` : `cust-${row.id}`,
    customerName: row.customer_name,
    customerPhone: row.phone,
    deliveryAddress: row.delivery_address,
    township: extractTownshipFromAddress(row.delivery_address),
    city: "Yangon",
    nearbyLandmark: row.landmark_note ?? undefined,
    deliveryMethod: "courier",
    items,
    subtotal: subtotal || total,
    deliveryFee: Math.max(0, total - (subtotal || total)),
    discountAmount,
    promoCode: row.promo_code ?? undefined,
    total,
    paymentMethod: mapPaymentMethodFromSb(row.payment_method),
    paymentStatus: mapPaymentStatusFromSb(row.payment_status),
    orderStatus,
    timeline: [
      {
        status: orderStatus,
        timestamp: row.updated_at || row.created_at,
        note: "Synced with Supabase",
        actor: "System",
      },
    ],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase-backed repository for shared catalog (categories, products) and orders.
 * Admin-only local UI collections (settings, promotions, notifications, activity,
 * stockHistory) fall back to the local JSON store, while customers are dynamically
 * unified and derived directly from live orders.
 */
export class SupabaseStoreRepository implements StoreRepository {
  private localFallback = new JsonFileStoreRepository();

  async getAllData(): Promise<DevStoreData> {
    const [local, categories, products, orders, promotions, stockHistory] = await Promise.all([
      this.localFallback.getAllData(),
      this.listCategories(),
      this.listProducts(),
      this.listOrders(),
      this.listPromotions(),
      this.listStockAdjustments(),
    ]);

    const derivedCustomers = deriveCustomersFromOrders(orders);
    const customers =
      derivedCustomers.length > 0 ? derivedCustomers : (local.customers ?? []);
    const notifications = deriveNotificationsFromOrdersAndProducts(orders, products);

    return {
      ...local,
      categories,
      products,
      orders,
      promotions,
      customers,
      stockHistory: stockHistory.length > 0 ? stockHistory : (local.stockHistory ?? []),
      notifications,
    };
  }

  async listStockAdjustments(): Promise<StockAdjustment[]> {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("inventory_adjustments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase listStockAdjustments error:", error);
      return (await this.localFallback.getAllData()).stockHistory ?? [];
    }

    return ((data ?? []) as SbStockAdjustmentRow[]).map((row) => ({
      id: row.id,
      productId: row.product_id || row.id,
      productName: row.product_name,
      sku: row.sku,
      variantId: row.variant_id ?? undefined,
      variantLabel: row.variant_label ?? undefined,
      type: row.type === "decrease" ? "decrease" : "increase",
      quantity: Number(row.quantity),
      previousStock: Number(row.previous_stock),
      newStock: Number(row.new_stock),
      reason: row.reason,
      performedBy: row.performed_by || "Admin",
      createdAt: row.created_at,
    }));
  }

  async listCustomers(): Promise<Customer[]> {
    const orders = await this.listOrders();
    const derived = deriveCustomersFromOrders(orders);
    if (derived.length > 0) return derived;
    const local = await this.localFallback.getAllData();
    return local.customers ?? [];
  }

  async resetToSeed(): Promise<DevStoreData> {
    return this.getAllData();
  }

  async listCategories(): Promise<Category[]> {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Supabase listCategories failed: ${error.message}`);
    }
    return ((data ?? []) as SbCategoryRow[]).map(mapCategoryRow);
  }

  async createCategory(
    input: Omit<Category, "id" | "createdAt">
  ): Promise<Category> {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("categories")
      .insert({
        name: input.name,
        slug: input.slug || slugify(input.name),
        description: input.description || null,
        is_active: input.active ?? true,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Supabase createCategory failed: ${error?.message}`);
    }
    return mapCategoryRow(data as SbCategoryRow);
  }

  async updateCategory(
    id: string,
    updates: Partial<Category>
  ): Promise<Category | null> {
    const sb = getSupabaseClient();
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.slug !== undefined) patch.slug = updates.slug;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.active !== undefined) patch.is_active = updates.active;

    const { data, error } = await sb
      .from("categories")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error || !data) return null;
    return mapCategoryRow(data as SbCategoryRow);
  }

  async deleteCategory(id: string): Promise<boolean> {
    const sb = getSupabaseClient();
    const { error } = await sb.from("categories").delete().eq("id", id);
    return !error;
  }

  async listProducts(filters?: {
    category?: string;
    status?: string;
    q?: string;
  }): Promise<Product[]> {
    const sb = getSupabaseClient();
    let query = sb
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });

    if (filters?.status === "Active") {
      query = query.eq("is_active", true);
    } else if (filters?.status === "Archived" || filters?.status === "Draft") {
      query = query.eq("is_active", false);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Supabase listProducts failed: ${error.message}`);
    }

    let list = ((data ?? []) as SbProductRow[]).map(mapProductRow);

    if (filters?.category && filters.category !== "all") {
      const cats = await this.listCategories();
      const cat = cats.find(
        (c) => c.id === filters.category || c.slug === filters.category
      );
      const targetCatId = cat?.id ?? filters.category;
      list = list.filter((p) => p.categoryId === targetCatId);
    }

    if (filters?.q?.trim()) {
      const q = filters.q.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }

    return list;
  }

  async getProduct(idOrSlug: string): Promise<Product | null> {
    const sb = getSupabaseClient();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug
      );

    const { data, error } = await sb
      .from("products")
      .select("*")
      .eq(isUuid ? "id" : "slug", idOrSlug)
      .maybeSingle();

    if (error || !data) return null;
    return mapProductRow(data as SbProductRow);
  }

  async createProduct(
    input: Omit<Product, "id" | "createdAt" | "updatedAt" | "soldCount"> & {
      id?: string;
      soldCount?: number;
    }
  ): Promise<Product> {
    const sb = getSupabaseClient();
    const baseSlug = input.slug || slugify(input.name) || generateId("prod");
    const price = input.salePrice ?? input.regularPrice;
    const images =
      input.images && input.images.length > 0
        ? input.images
        : ["/assets/dew-drop-serum.png"];

    const { data, error } = await sb
      .from("products")
      .insert({
        category_id: input.categoryId || null,
        slug: baseSlug,
        name: input.name,
        badge: input.badge || null,
        price,
        stock_quantity: input.stock ?? 0,
        description: input.description || null,
        benefits: input.benefits ?? [],
        usage: input.usage || null,
        main_image: images[0],
        gallery: images,
        is_active: input.status !== "Archived" && input.status !== "Draft",
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Supabase createProduct failed: ${error?.message}`);
    }
    return mapProductRow(data as SbProductRow);
  }

  async updateProduct(
    id: string,
    updates: Partial<Product>
  ): Promise<Product | null> {
    const sb = getSupabaseClient();
    const existing = await this.getProduct(id);
    if (!existing) return null;

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.slug !== undefined) patch.slug = updates.slug;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.categoryId !== undefined)
      patch.category_id = updates.categoryId || null;
    if (updates.badge !== undefined) patch.badge = updates.badge || null;
    if (updates.salePrice !== undefined || updates.regularPrice !== undefined) {
      patch.price =
        updates.salePrice ?? updates.regularPrice ?? existing.regularPrice;
    }
    if (updates.stock !== undefined) patch.stock_quantity = updates.stock;
    if (updates.benefits !== undefined) patch.benefits = updates.benefits;
    if (updates.usage !== undefined) patch.usage = updates.usage || null;
    if (updates.images !== undefined && updates.images.length > 0) {
      patch.main_image = updates.images[0];
      patch.gallery = updates.images;
    }
    if (updates.status !== undefined) {
      patch.is_active = updates.status === "Active";
    }

    const { data, error } = await sb
      .from("products")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase updateProduct failed: ${error.message}`);
    }
    if (!data) {
      throw new Error(
        "Supabase blocked updating this product (Row-Level Security). Add SUPABASE_SERVICE_ROLE_KEY to PrettyCornerDashboard/.env.local for admin write access."
      );
    }
    return mapProductRow(data as SbProductRow);
  }

  async deleteProduct(id: string): Promise<boolean> {
    const sb = getSupabaseClient();
    const existing = await this.getProduct(id);
    if (!existing) return false;
    const { error } = await sb.from("products").delete().eq("id", existing.id);
    return !error;
  }

  async listOrders(): Promise<Order[]> {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Supabase listOrders failed: ${error.message}`);
    }
    const products = await this.listProducts();
    return ((data ?? []) as SbOrderRow[]).map((row) => mapOrderRow(row, products));
  }

  async getOrder(idOrRef: string): Promise<Order | null> {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("orders")
      .select("*, order_items(*)")
      .ilike("id", idOrRef.trim())
      .maybeSingle();

    if (error || !data) return null;
    const products = await this.listProducts();
    return mapOrderRow(data as SbOrderRow, products);
  }

  async createStorefrontOrder(input: StorefrontOrderCreateInput): Promise<Order> {
    const sb = getSupabaseClient();
    const rand = Math.floor(100 + Math.random() * 900);
    const orderId = `PC-${new Date()
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, "")}-${rand}`;

    const defaultPaymentStatus =
      input.paymentMethod === "Cash on Delivery" ? "pending" : "paid";

    const { error: orderErr } = await sb.from("orders").insert({
      id: orderId,
      customer_name: input.customerName,
      phone: input.phone,
      delivery_address: input.deliveryAddress,
      landmark_note: input.landmarkNote || null,
      total_amount: input.total,
      promo_code: input.promoCode || null,
      discount_amount: input.discountAmount || 0,
      payment_method: input.paymentMethod,
      payment_status: input.paymentStatus ?? defaultPaymentStatus,
      fulfillment_status: "pending_review",
      payment_slip_url: null,
    });

    if (orderErr) {
      throw new Error(`Supabase createOrder failed: ${orderErr.message}`);
    }

    const allProducts = await this.listProducts();
    const itemsToInsert = input.items.map((item) => {
      const matched = allProducts.find(
        (p) =>
          p.id === item.productId ||
          p.slug === item.productId ||
          p.name === item.name
      );
      return {
        order_id: orderId,
        product_id: matched?.id ?? null,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.quantity,
        item_total: item.price * item.quantity,
        product_image: item.image || matched?.images[0] || null,
        discount_amount: item.discountAmount || 0,
      };
    });

    if (itemsToInsert.length > 0) {
      await sb.from("order_items").insert(itemsToInsert);
    }

    // Deduct stock in Supabase for each purchased product
    for (const item of input.items) {
      const matched = allProducts.find(
        (p) =>
          p.id === item.productId ||
          p.slug === item.productId ||
          p.name === item.name
      );
      if (matched) {
        const newStock = Math.max(0, matched.stock - item.quantity);
        await sb
          .from("products")
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matched.id);
      }
    }

    const created = await this.getOrder(orderId);
    if (!created) {
      throw new Error("Order created in Supabase but could not be reloaded");
    }
    return created;
  }

  async updateOrder(
    id: string,
    input: OrderUpdateInput
  ): Promise<OrderMutationResult | null> {
    const sb = getSupabaseClient();
    const existing = await this.getOrder(id);
    if (!existing) return null;

    const allProducts = await this.listProducts();
    const mutation = executeOrderUpdate(existing, input, allProducts, {
      actorName: "Staff",
      lowStockAlertEnabled: true,
    });

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (mutation.updatedOrder.orderStatus) {
      patch.fulfillment_status = mapOrderStatusToSb(mutation.updatedOrder.orderStatus);
    }
    if (mutation.updatedOrder.paymentStatus) {
      patch.payment_status = mapPaymentStatusToSb(mutation.updatedOrder.paymentStatus);
    }
    if (mutation.updatedOrder.transactionReference) {
      patch.payment_slip_url = mutation.updatedOrder.transactionReference;
    }

    const { error } = await sb.from("orders").update(patch).eq("id", existing.id);
    if (error) {
      console.error("Supabase updateOrder error:", error);
      return null;
    }

    // Persist affected product stock mutations
    for (const prod of mutation.updatedProducts) {
      const prev = allProducts.find((p) => p.id === prod.id);
      if (prev && (prev.stock !== prod.stock || prev.soldCount !== prod.soldCount)) {
        await sb
          .from("products")
          .update({
            stock_quantity: prod.stock,
            sold_count: prod.soldCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", prod.id);
      }
    }

    // Persist stock adjustment logs
    for (const adj of mutation.newAdjustments) {
      await sb.from("inventory_adjustments").insert({
        product_id: isUuid(adj.productId) ? adj.productId : null,
        product_name: adj.productName,
        sku: adj.sku,
        type: adj.type,
        quantity: adj.quantity,
        previous_stock: adj.previousStock,
        new_stock: adj.newStock,
        reason: adj.reason,
        performed_by: adj.performedBy,
      });
    }

    return mutation;
  }

  async adjustStock(input: {
    productId: string;
    variantId?: string;
    type: "increase" | "decrease";
    quantity: number;
    reason: string;
  }): Promise<{ product: Product; adjustment: StockAdjustment } | null> {
    const sb = getSupabaseClient();
    const existing = await this.getProduct(input.productId);
    if (!existing) return null;

    const newStock =
      input.type === "increase"
        ? existing.stock + input.quantity
        : Math.max(0, existing.stock - input.quantity);

    const updated = await this.updateProduct(existing.id, { stock: newStock });
    if (!updated) return null;

    const sku = existing.sku || "PC-SKU";
    let insertedAdjustment: StockAdjustment | null = null;
    try {
      const isProductUuid = isUuid(existing.id);
      const { data: adjData } = await sb
        .from("inventory_adjustments")
        .insert({
          product_id: isProductUuid ? existing.id : null,
          product_name: existing.name,
          sku,
          variant_id: input.variantId || null,
          type: input.type,
          quantity: input.quantity,
          previous_stock: existing.stock,
          new_stock: newStock,
          reason: input.reason,
          performed_by: "Admin",
        })
        .select("*")
        .single();

      if (adjData) {
        insertedAdjustment = {
          id: adjData.id,
          productId: adjData.product_id || updated.id,
          productName: adjData.product_name,
          sku: adjData.sku,
          variantId: adjData.variant_id ?? undefined,
          type: adjData.type,
          quantity: Number(adjData.quantity),
          previousStock: Number(adjData.previous_stock),
          newStock: Number(adjData.new_stock),
          reason: adjData.reason,
          performedBy: adjData.performed_by,
          createdAt: adjData.created_at,
        };
      }
    } catch (e) {
      console.warn("Failed to insert into inventory_adjustments:", e);
    }

    const adjustment: StockAdjustment = insertedAdjustment ?? {
      id: generateId("stk"),
      productId: updated.id,
      productName: updated.name,
      sku,
      type: input.type,
      quantity: input.quantity,
      previousStock: existing.stock,
      newStock,
      reason: input.reason,
      performedBy: "Admin",
      createdAt: new Date().toISOString(),
    };

    return { product: updated, adjustment };
  }

  async listPromotions(): Promise<Promotion[]> {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase listPromotions error:", error);
      return (await this.localFallback.getAllData()).promotions;
    }

    return ((data ?? []) as SbPromotionRow[]).map(mapPromotionRow);
  }

  async createPromotion(
    input: Omit<Promotion, "id" | "usageCount">
  ): Promise<Promotion> {
    const sb = getSupabaseClient();
    const payload: Record<string, unknown> = {
      title: input.title,
      subtitle: input.subtitle || null,
      code: input.code.toUpperCase(),
      discount_percentage: input.discountPercentage,
      start_date: input.startDate,
      end_date: input.endDate,
      is_active: input.active ?? true,
      usage_count: 0,
      image_url: input.bannerImage || null,
      banner_badge: input.bannerBadge || null,
      cta_text: input.ctaText || null,
      cta_link: input.ctaLink || null,
      featured_product_ids: input.featuredProductIds || [],
      slug: input.slug || null,
      target_type: input.targetType || "ENTIRE_STORE",
      target_slug: input.targetSlug || null,
      redemption_method: input.redemptionMethod || "CODE",
      usage_limit: input.usageLimit ?? null,
      minimum_order_amount: input.minimumOrderAmount ?? 0,
      is_out_of_stock: input.isOutOfStock ?? false,
    };

    const { data, error } = await sb
      .from("promotions")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase createPromotion error:", error);
      throw new Error(
        `Supabase createPromotion failed: ${error?.message || "No data returned"}`
      );
    }

    return mapPromotionRow(data as SbPromotionRow);
  }

  async updatePromotion(
    id: string,
    updates: Partial<Promotion>
  ): Promise<Promotion | null> {
    const sb = getSupabaseClient();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.subtitle !== undefined) patch.subtitle = updates.subtitle || null;
    if (updates.code !== undefined) patch.code = updates.code.toUpperCase();
    if (updates.discountPercentage !== undefined) {
      patch.discount_percentage = updates.discountPercentage;
    }
    if (updates.startDate !== undefined) patch.start_date = updates.startDate;
    if (updates.endDate !== undefined) patch.end_date = updates.endDate;
    if (updates.active !== undefined) patch.is_active = updates.active;
    if (updates.bannerImage !== undefined) {
      patch.image_url = updates.bannerImage || null;
    }
    if (updates.bannerBadge !== undefined) {
      patch.banner_badge = updates.bannerBadge || null;
    }
    if (updates.ctaText !== undefined) {
      patch.cta_text = updates.ctaText || null;
    }
    if (updates.ctaLink !== undefined) {
      patch.cta_link = updates.ctaLink || null;
    }
    if (updates.featuredProductIds !== undefined) {
      patch.featured_product_ids = updates.featuredProductIds;
    }
    if (updates.slug !== undefined) patch.slug = updates.slug || null;
    if (updates.targetType !== undefined) patch.target_type = updates.targetType;
    if (updates.targetSlug !== undefined) patch.target_slug = updates.targetSlug || null;
    if (updates.redemptionMethod !== undefined) patch.redemption_method = updates.redemptionMethod;
    if (updates.usageLimit !== undefined) patch.usage_limit = updates.usageLimit ?? null;
    if (updates.minimumOrderAmount !== undefined) patch.minimum_order_amount = updates.minimumOrderAmount;
    if (updates.isOutOfStock !== undefined) patch.is_out_of_stock = updates.isOutOfStock;
    if (updates.usageCount !== undefined) patch.usage_count = updates.usageCount;

    let query = sb.from("promotions").update(patch);
    if (isUuid(id)) {
      query = query.eq("id", id);
    } else {
      query = query.eq("code", id.toUpperCase());
    }

    const { data, error } = await query.select("*").maybeSingle();

    if (error || !data) {
      console.error("Supabase updatePromotion error:", error);
      return null;
    }

    return mapPromotionRow(data as SbPromotionRow);
  }

  async deletePromotion(id: string): Promise<boolean> {
    const sb = getSupabaseClient();
    let query = sb.from("promotions").delete();
    if (isUuid(id)) {
      query = query.eq("id", id);
    } else {
      query = query.eq("code", id.toUpperCase());
    }

    const { error } = await query;
    if (error) {
      console.error("Supabase deletePromotion error:", error);
      return false;
    }

    return true;
  }

  async updateSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
    return this.localFallback.updateSettings(updates);
  }

  async markNotificationRead(id: string): Promise<void> {
    return this.localFallback.markNotificationRead(id);
  }

  async markAllNotificationsRead(): Promise<void> {
    return this.localFallback.markAllNotificationsRead();
  }
}
