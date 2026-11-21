import {
  Category,
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
import { DevStoreData } from "./seed";
import { slugify } from "./mappers";

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
  created_at: string;
}

interface SbOrderRow {
  id: string;
  customer_name: string;
  phone: string;
  delivery_address: string;
  landmark_note: string | null;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  fulfillment_status: string;
  payment_slip_url: string | null;
  created_at: string;
  updated_at: string;
  order_items?: SbOrderItemRow[];
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
    soldCount: 0,
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

function mapOrderRow(row: SbOrderRow): Order {
  const items = (row.order_items ?? []).map((it) => ({
    id: it.id,
    productId: it.product_id || it.product_name,
    productName: it.product_name,
    productImage: it.product_image || "/assets/dew-drop-serum.png",
    sku: "",
    quantity: Number(it.quantity) || 1,
    unitPrice: Number(it.unit_price) || 0,
  }));

  const subtotal = items.reduce(
    (sum, it) => sum + it.unitPrice * it.quantity,
    0
  );
  const total = Number(row.total_amount) || subtotal;
  const orderStatus = mapOrderStatusFromSb(row.fulfillment_status);

  return {
    id: row.id,
    reference: row.id,
    customerId: `cust-${row.phone.replace(/\s+/g, "")}`,
    customerName: row.customer_name,
    customerPhone: row.phone,
    deliveryAddress: row.delivery_address,
    township: "Yangon",
    city: "Yangon",
    nearbyLandmark: row.landmark_note ?? undefined,
    deliveryMethod: "courier",
    items,
    subtotal: subtotal || total,
    deliveryFee: Math.max(0, total - (subtotal || total)),
    discountAmount: 0,
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
 * stockHistory, customers) fall back to the local JSON store.
 */
export class SupabaseStoreRepository implements StoreRepository {
  private localFallback = new JsonFileStoreRepository();

  async getAllData(): Promise<DevStoreData> {
    const [local, categories, products, orders] = await Promise.all([
      this.localFallback.getAllData(),
      this.listCategories(),
      this.listProducts(),
      this.listOrders(),
    ]);

    return {
      ...local,
      categories,
      products,
      orders,
    };
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
    return ((data ?? []) as SbOrderRow[]).map(mapOrderRow);
  }

  async getOrder(idOrRef: string): Promise<Order | null> {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("orders")
      .select("*, order_items(*)")
      .ilike("id", idOrRef.trim())
      .maybeSingle();

    if (error || !data) return null;
    return mapOrderRow(data as SbOrderRow);
  }

  async createStorefrontOrder(input: StorefrontOrderCreateInput): Promise<Order> {
    const sb = getSupabaseClient();
    const rand = Math.floor(100 + Math.random() * 900);
    const orderId = `PC-${new Date()
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, "")}-${rand}`;

    const { error: orderErr } = await sb.from("orders").insert({
      id: orderId,
      customer_name: input.customerName,
      phone: input.phone,
      delivery_address: input.deliveryAddress,
      landmark_note: input.landmarkNote || null,
      total_amount: input.total,
      payment_method: input.paymentMethod,
      payment_status: input.paymentStatus ?? "pending",
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
  ): Promise<Order | null> {
    const sb = getSupabaseClient();
    const existing = await this.getOrder(id);
    if (!existing) return null;

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.orderStatus) {
      patch.fulfillment_status = mapOrderStatusToSb(input.orderStatus);
    }
    if (input.paymentStatus) {
      patch.payment_status = mapPaymentStatusToSb(input.paymentStatus);
    }

    const { error } = await sb.from("orders").update(patch).eq("id", existing.id);
    if (error) return null;

    return this.getOrder(existing.id);
  }

  async adjustStock(input: {
    productId: string;
    variantId?: string;
    type: "increase" | "decrease";
    quantity: number;
    reason: string;
  }): Promise<{ product: Product; adjustment: StockAdjustment } | null> {
    const existing = await this.getProduct(input.productId);
    if (!existing) return null;

    const newStock =
      input.type === "increase"
        ? existing.stock + input.quantity
        : Math.max(0, existing.stock - input.quantity);

    const updated = await this.updateProduct(existing.id, { stock: newStock });
    if (!updated) return null;

    const adjustment: StockAdjustment = {
      id: generateId("stk"),
      productId: updated.id,
      productName: updated.name,
      sku: updated.sku,
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

  async createPromotion(
    input: Omit<Promotion, "id" | "usageCount">
  ): Promise<Promotion> {
    return this.localFallback.createPromotion(input);
  }

  async updatePromotion(
    id: string,
    updates: Partial<Promotion>
  ): Promise<Promotion | null> {
    return this.localFallback.updatePromotion(id, updates);
  }

  async deletePromotion(id: string): Promise<boolean> {
    return this.localFallback.deletePromotion(id);
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
