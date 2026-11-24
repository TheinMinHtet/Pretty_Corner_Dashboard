import {
  Category,
  Customer,
  CustomerAddress,
  InventoryStats,
  Order,
  OrderStatus,
  PaginatedResult,
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
  ListOrdersPaginatedParams,
  ListOrdersPaginatedResult,
  OrderUpdateInput,
  StorefrontOrderCreateInput,
  StoreRepository,
} from "./repository";
import { executeOrderUpdate, OrderMutationResult } from "@/modules/orders/order-lifecycle";
import { evaluatePromotionStockout } from "@/modules/catalog/catalog-sync";
import { createSeedData, DevStoreData } from "./seed";
import { INITIAL_SETTINGS } from "@/data/mock-data";
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
    case "delivered":
      return "Shipped";
    case "expired":
      return "Expired";
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
    case "Expired":
      return "expired";
    case "Cancelled":
      return "cancelled";
    default:
      return "pending_review";
  }
}

function mapPaymentMethodFromSb(method: string): Order["paymentMethod"] {
  if (
    method === "Cash on Delivery" ||
    method?.toLowerCase() === "cash on delivery" ||
    method?.toLowerCase() === "cod"
  ) {
    return "Cash on Delivery";
  }
  return "Mobile Banking";
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

function sanitizeImageUrl(url: string | null | undefined): string {
  if (!url) return "/assets/dew-drop-serum.png";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/") || trimmed.length > 500) {
    return "/assets/dew-drop-serum.png";
  }
  return trimmed;
}

function sanitizeProductImage(img: string | undefined): string {
  if (!img) return "/assets/dew-drop-serum.png";
  if (img.startsWith("data:image/") && img.length > 100000) {
    return "/assets/dew-drop-serum.png";
  }
  return img;
}

function mapOrderRow(row: SbOrderRow, allProducts?: Product[]): Order {
  const items = (row.order_items ?? []).map((it) => {
    let resolvedProductId = it.product_id;
    let resolvedProductName = it.product_name;
    let resolvedImage = sanitizeImageUrl(it.product_image);
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
          resolvedImage = sanitizeImageUrl(matched.images[0]) || resolvedImage;
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
  private inMemoryReadNotificationIds = new Set<string>();

  private async getLocalFallbackData(): Promise<DevStoreData> {
    try {
      return await this.localFallback.getAllData();
    } catch {
      return createSeedData();
    }
  }

  async getSettings(): Promise<StoreSettings> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from("settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (!error && data) {
        return {
          ...INITIAL_SETTINGS,
          storeName: data.store_name || INITIAL_SETTINGS.storeName,
          tagline: data.tagline || INITIAL_SETTINGS.tagline,
          supportPhone: data.phone || data.support_phone || INITIAL_SETTINGS.supportPhone,
          supportEmail: data.email || data.support_email || INITIAL_SETTINGS.supportEmail,
          viberPhone: data.viber_phone || data.phone || INITIAL_SETTINGS.viberPhone,
          address: data.address || INITIAL_SETTINGS.address,
          currency: data.currency || INITIAL_SETTINGS.currency,
          defaultLowStockThreshold:
            Number(data.default_low_stock_threshold) ||
            INITIAL_SETTINGS.defaultLowStockThreshold,
          townshipDeliveryFees:
            data.township_delivery_fees ||
            INITIAL_SETTINGS.townshipDeliveryFees,
          pickupOptions:
            data.pickup_options || INITIAL_SETTINGS.pickupOptions,
          paymentMethods:
            data.payment_methods || INITIAL_SETTINGS.paymentMethods,
          socialLinks: data.social_links || INITIAL_SETTINGS.socialLinks,
          adminProfile:
            data.admin_profile || INITIAL_SETTINGS.adminProfile,
        };
      }
    } catch (e) {
      console.warn("Failed to fetch settings from Supabase, using fallback:", e);
    }
    return INITIAL_SETTINGS;
  }

  private async getLiveSocialLinks(
    fallbackLinks: StoreSettings["socialLinks"]
  ): Promise<StoreSettings["socialLinks"]> {
    try {
      const client = getSupabaseClient();
      if (!client) return fallbackLinks;
      const { data, error } = await client
        .from("social_channels")
        .select("*")
        .eq("is_active", true);

      if (!error && Array.isArray(data) && data.length > 0) {
        const fb = data.find(
          (c) => c.id === "facebook" || c.platform?.toLowerCase() === "facebook"
        );
        const tt = data.find(
          (c) => c.id === "tiktok" || c.platform?.toLowerCase() === "tiktok"
        );
        return {
          ...fallbackLinks,
          facebook: fb?.url ?? fallbackLinks.facebook,
          tiktok: tt?.url ?? fallbackLinks.tiktok,
        };
      }
    } catch (e) {
      console.warn("Failed to fetch live social links from Supabase:", e);
    }
    return fallbackLinks;
  }

  async getAllData(): Promise<DevStoreData> {
    const local = await this.getLocalFallbackData();
    const [categories, products, orders, promotions, stockHistory, dbSettings] = await Promise.all([
      this.listCategories().catch(() => local.categories ?? []),
      this.listProducts().catch(() => local.products ?? []),
      this.listOrders().catch(() => local.orders ?? []),
      this.listPromotions().catch(() => local.promotions ?? []),
      this.listStockAdjustments().catch(() => local.stockHistory ?? []),
      this.getSettings().catch(() => local.settings ?? INITIAL_SETTINGS),
    ]);

    const liveSocial = await this.getLiveSocialLinks(dbSettings.socialLinks);
    const settings = {
      ...dbSettings,
      socialLinks: liveSocial,
    };

    const derivedCustomers = deriveCustomersFromOrders(orders);
    const customers =
      derivedCustomers.length > 0 ? derivedCustomers : (local.customers ?? []);
    const combinedReadIds = Array.from(
      new Set([
        ...(local.readNotificationIds ?? []),
        ...this.inMemoryReadNotificationIds,
      ])
    );
    const notifications = deriveNotificationsFromOrdersAndProducts(
      orders,
      products,
      combinedReadIds
    );

    return {
      ...local,
      settings,
      categories,
      products,
      orders,
      promotions,
      customers,
      stockHistory: stockHistory.length > 0 ? stockHistory : (local.stockHistory ?? []),
      notifications,
    };
  }

  private async getInventoryStats(): Promise<InventoryStats> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from("products")
        .select("stock_quantity");

      if (error || !data) {
        return { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 };
      }

      let inStock = 0;
      let lowStock = 0;
      let outOfStock = 0;

      for (const row of data) {
        const q = Number(row.stock_quantity) || 0;
        if (q === 0) outOfStock++;
        else if (q <= 10) lowStock++;
        else inStock++;
      }

      return {
        total: data.length,
        inStock,
        lowStock,
        outOfStock,
      };
    } catch {
      return { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 };
    }
  }

  async listRecentOrders(limit = 200): Promise<Order[]> {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Supabase listRecentOrders failed, falling back to full list:", error.message);
      return this.listOrders();
    }
    return ((data ?? []) as SbOrderRow[]).map((row) => mapOrderRow(row));
  }

  async getBootstrapData(): Promise<DevStoreData & { inventoryStats: InventoryStats }> {
    const local = await this.getLocalFallbackData();
    try {
      const fetchWithTimeout = async () => {
        const [categories, orders, promotions, stockHistory, inventoryStats, products, dbSettings] = await Promise.all([
          this.listCategories(),
          this.listRecentOrders(200),
          this.listPromotions(),
          this.listStockAdjustments(),
          this.getInventoryStats(),
          this.listProducts().catch(() => local.products ?? []),
          this.getSettings().catch(() => local.settings ?? INITIAL_SETTINGS),
        ]);

        const derivedCustomers = deriveCustomersFromOrders(orders);
        const customers =
          derivedCustomers.length > 0 ? derivedCustomers : (local.customers ?? []);
        const combinedReadIds = Array.from(
          new Set([
            ...(local.readNotificationIds ?? []),
            ...this.inMemoryReadNotificationIds,
          ])
        );
        const notifications = deriveNotificationsFromOrdersAndProducts(
          orders,
          [],
          combinedReadIds
        );
        const catalogIndex = products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          slug: p.slug,
          categoryId: p.categoryId,
        }));

        const liveSocial = await this.getLiveSocialLinks(dbSettings.socialLinks);
        const settings = {
          ...dbSettings,
          socialLinks: liveSocial,
        };

        return {
          ...local,
          settings,
          categories,
          products,
          orders,
          promotions,
          customers,
          stockHistory: stockHistory.length > 0 ? stockHistory : (local.stockHistory ?? []),
          notifications,
          inventoryStats,
          catalogIndex,
        };
      };

      return await Promise.race([
        fetchWithTimeout(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Supabase bootstrap timeout (12s)")), 12000)
        ),
      ]);
    } catch (err) {
      console.warn("Supabase bootstrap failed or timed out, falling back to local store:", err);
      const inventoryStats: InventoryStats = {
        total: local.products?.length ?? 0,
        inStock: local.products?.filter((p) => (p.stock ?? 0) > 0).length ?? 0,
        lowStock: local.products?.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10).length ?? 0,
        outOfStock: local.products?.filter((p) => (p.stock ?? 0) <= 0).length ?? 0,
      };
      return {
        ...local,
        inventoryStats,
        catalogIndex: (local.products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          slug: p.slug,
          categoryId: p.categoryId,
        })),
      };
    }
  }

  async listProductsPaginated(params: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    stock?: "all" | "in" | "low" | "out" | "alert";
    merchandising?: "all" | "new" | "bestseller" | "promo" | "lowstock";
    q?: string;
    sortKey?: "name" | "price" | "stock" | "createdAt" | "soldCount";
    sortDir?: "asc" | "desc";
  }): Promise<PaginatedResult<Product> & { stats: InventoryStats }> {
    try {
      const sb = getSupabaseClient();
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(10, Math.max(1, params.limit || 10));
      const offset = (page - 1) * limit;

      let query = sb.from("products").select("*", { count: "exact" });

      if (params.category && params.category !== "all") {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.category);
        if (isUuid) {
          query = query.eq("category_id", params.category);
        } else {
          const cats = await this.listCategories();
          const found = cats.find((c) => c.slug === params.category || c.id === params.category);
          if (found) {
            query = query.eq("category_id", found.id);
          } else {
            query = query.eq("category_id", params.category);
          }
        }
      }

      if (params.status === "Active") {
        query = query.eq("is_active", true);
      } else if (params.status === "Archived") {
        query = query.eq("is_active", false);
      }

      if (params.stock === "out") {
        query = query.eq("stock_quantity", 0);
      } else if (params.stock === "low") {
        query = query.gt("stock_quantity", 0).lte("stock_quantity", 10);
      } else if (params.stock === "in") {
        query = query.gt("stock_quantity", 10);
      } else if (params.stock === "alert") {
        query = query.lte("stock_quantity", 10);
      }

      if (params.merchandising === "new") {
        const since = new Date(Date.now() - 30 * 86400000).toISOString();
        query = query.gte("created_at", since);
      } else if (params.merchandising === "bestseller") {
        query = query.gt("sold_count", 0);
      } else if (params.merchandising === "lowstock") {
        query = query.lte("stock_quantity", 10);
      }

      if (params.q?.trim()) {
        const q = params.q.trim();
        query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const sortDir = params.sortDir === "desc" ? { ascending: false } : { ascending: true };
      switch (params.sortKey) {
        case "price":
          query = query.order("price", sortDir);
          break;
        case "stock":
          query = query.order("stock_quantity", sortDir);
          break;
        case "createdAt":
          query = query.order("created_at", sortDir);
          break;
        case "soldCount":
          query = query.order("sold_count", sortDir);
          break;
        case "name":
        default:
          query = query.order("name", sortDir);
          break;
      }

      query = query.range(offset, offset + limit - 1);

      const [{ data, count, error }, stats] = await Promise.all([
        query,
        this.getInventoryStats(),
      ]);

      if (error) {
        console.error("Supabase listProductsPaginated error:", error);
        return this.localFallback.listProductsPaginated(params);
      }

      const total = count ?? (data?.length ?? 0);
      const items = ((data ?? []) as SbProductRow[]).map(mapProductRow);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        stats,
      };
    } catch (err) {
      console.error("Supabase listProductsPaginated catch:", err);
      return this.localFallback.listProductsPaginated(params);
    }
  }

  async listCategoriesPaginated(params: {
    page?: number;
    limit?: number;
    q?: string;
  }): Promise<PaginatedResult<Category & { productCount: number }>> {
    try {
      const sb = getSupabaseClient();
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(10, Math.max(1, params.limit || 10));
      const offset = (page - 1) * limit;

      let query = sb.from("categories").select("*", { count: "exact" });
      if (params.q?.trim()) {
        const q = params.q.trim();
        query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
      }
      query = query.order("created_at", { ascending: true });
      query = query.range(offset, offset + limit - 1);

      const [{ data, count, error }, prodsRes] = await Promise.all([
        query,
        sb.from("products").select("category_id"),
      ]);

      if (error) {
        console.error("Supabase listCategoriesPaginated error:", error);
        return this.localFallback.listCategoriesPaginated(params);
      }

      const counts: Record<string, number> = {};
      if (prodsRes.data) {
        for (const p of prodsRes.data) {
          if (p.category_id) {
            counts[p.category_id] = (counts[p.category_id] || 0) + 1;
          }
        }
      }

      const total = count ?? (data?.length ?? 0);
      const items = ((data ?? []) as SbCategoryRow[]).map((row) => ({
        ...mapCategoryRow(row),
        productCount: counts[row.id] ?? 0,
      }));

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    } catch (err) {
      console.error("Supabase listCategoriesPaginated catch:", err);
      return this.localFallback.listCategoriesPaginated(params);
    }
  }

  async listCustomersPaginated(params: {
    page?: number;
    limit?: number;
    q?: string;
  }): Promise<PaginatedResult<Customer>> {
    try {
      const sb = getSupabaseClient();
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(10, Math.max(1, params.limit || 10));
      const offset = (page - 1) * limit;

      let query = sb
        .from("customers")
        .select("*", { count: "exact" })
        .order("total_spent", { ascending: false });

      if (params.q?.trim()) {
        const q = params.q.trim();
        query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,phone_e164.ilike.%${q}%`);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error || !data || data.length === 0) {
        return this.localFallback.listCustomersPaginated(params);
      }

      const total = count ?? data.length;
      const items: Customer[] = (data as Array<{
        id: string;
        name: string;
        phone: string;
        email?: string | null;
        avatar_color?: string | null;
        addresses?: unknown;
        joined_at: string;
        notes?: string | null;
      }>).map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email ?? undefined,
        avatarColor: row.avatar_color ?? undefined,
        addresses: Array.isArray(row.addresses) ? row.addresses : [],
        joinedAt: row.joined_at,
        notes: row.notes ?? undefined,
      }));

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    } catch {
      return this.localFallback.listCustomersPaginated(params);
    }
  }

  async listStockAdjustmentsPaginated(params: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<StockAdjustment>> {
    try {
      const sb = getSupabaseClient();
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(10, Math.max(1, params.limit || 10));
      const offset = (page - 1) * limit;

      const { data, count, error } = await sb
        .from("inventory_adjustments")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Supabase listStockAdjustmentsPaginated error:", error);
        return this.localFallback.listStockAdjustmentsPaginated(params);
      }

      const total = count ?? (data?.length ?? 0);
      const items: StockAdjustment[] = ((data ?? []) as SbStockAdjustmentRow[]).map((row) => ({
        id: row.id,
        productId: row.product_id || row.id,
        productName: row.product_name,
        sku: row.sku,
        type: (row.type === "decrease" ? "decrease" : "increase") as "increase" | "decrease",
        quantity: Number(row.quantity),
        previousStock: Number(row.previous_stock),
        newStock: Number(row.new_stock),
        reason: row.reason,
        performedBy: row.performed_by || "Admin",
        createdAt: row.created_at,
      }));

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    } catch (err) {
      console.error("Supabase listStockAdjustmentsPaginated catch:", err);
      return this.localFallback.listStockAdjustmentsPaginated(params);
    }
  }

  async listStockAdjustments(): Promise<StockAdjustment[]> {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("inventory_adjustments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase listStockAdjustments error:", error);
      return (await this.getLocalFallbackData()).stockHistory ?? [];
    }

    return ((data ?? []) as SbStockAdjustmentRow[]).map((row) => ({
      id: row.id,
      productId: row.product_id || row.id,
      productName: row.product_name,
      sku: row.sku,
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
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from("customers")
        .select("*")
        .order("total_spent", { ascending: false });

      if (error || !data || data.length === 0) {
        const orders = await this.listRecentOrders(200);
        const derived = deriveCustomersFromOrders(orders);
        if (derived.length > 0) return derived;
        const local = await this.getLocalFallbackData();
        return local.customers ?? [];
      }

      return (data as Array<{
        id: string;
        name: string;
        phone: string;
        email?: string | null;
        avatar_color?: string | null;
        addresses?: unknown;
        joined_at: string;
        notes?: string | null;
      }>).map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email ?? undefined,
        avatarColor: row.avatar_color ?? undefined,
        addresses: Array.isArray(row.addresses) ? (row.addresses as CustomerAddress[]) : [],
        joinedAt: row.joined_at,
        notes: row.notes ?? undefined,
      }));
    } catch {
      const local = await this.getLocalFallbackData();
      return local.customers ?? [];
    }
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
    } else if (filters?.status === "Archived") {
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
    const images = (
      input.images && input.images.length > 0
        ? input.images
        : ["/assets/dew-drop-serum.png"]
    ).map(sanitizeProductImage);

    let targetCategoryId: string | null = null;
    if (input.categoryId) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          input.categoryId
        );
      if (isUuid) {
        targetCategoryId = input.categoryId;
      } else {
        const cats = await this.listCategories();
        const matched = cats.find(
          (c) =>
            c.id === input.categoryId ||
            c.slug === input.categoryId ||
            c.slug === input.categoryId.replace(/^cat-/, "")
        );
        targetCategoryId = matched?.id ?? null;
      }
    }

    const { data, error } = await sb
      .from("products")
      .insert({
        category_id: targetCategoryId,
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
        is_active: input.status !== "Archived",
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
    if (updates.categoryId !== undefined) {
      if (!updates.categoryId) {
        patch.category_id = null;
      } else {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            updates.categoryId
          );
        if (isUuid) {
          patch.category_id = updates.categoryId;
        } else {
          const cats = await this.listCategories();
          const matched = cats.find(
            (c) =>
              c.id === updates.categoryId ||
              c.slug === updates.categoryId ||
              c.slug === updates.categoryId?.replace(/^cat-/, "")
          );
          patch.category_id = matched?.id ?? null;
        }
      }
    }
    if (updates.badge !== undefined) patch.badge = updates.badge || null;
    if (updates.salePrice !== undefined || updates.regularPrice !== undefined) {
      patch.price =
        updates.salePrice ?? updates.regularPrice ?? existing.regularPrice;
    }
    if (updates.stock !== undefined) patch.stock_quantity = updates.stock;
    if (updates.benefits !== undefined) patch.benefits = updates.benefits;
    if (updates.usage !== undefined) patch.usage = updates.usage || null;
    if (updates.images !== undefined && updates.images.length > 0) {
      const sanitized = updates.images.map(sanitizeProductImage);
      patch.main_image = sanitized[0];
      patch.gallery = sanitized;
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
    return ((data ?? []) as SbOrderRow[]).map((row) => mapOrderRow(row));
  }

  async listOrdersPaginated(
    params: ListOrdersPaginatedParams
  ): Promise<ListOrdersPaginatedResult> {
    try {
      const sb = getSupabaseClient();
      const page = Math.max(1, Number(params.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));
      const offset = (page - 1) * limit;

      let query = sb
        .from("orders")
        .select("*, order_items(*)", { count: "exact" });

      if (params.highValueOnly) {
        query = query.gte("total_amount", 100000);
      }

      if (params.dateFilter && params.dateFilter !== "all") {
        if (params.dateFilter === "today") {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          query = query.gte("created_at", start.toISOString());
        } else if (params.dateFilter === "yesterday") {
          const start = new Date();
          start.setDate(start.getDate() - 1);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setHours(23, 59, 59, 999);
          query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
        } else {
          const days = params.dateFilter === "7d" ? 7 : 30;
          const since = new Date(Date.now() - days * 86400000).toISOString();
          query = query.gte("created_at", since);
        }
      }

      if (params.unifiedStatus && params.unifiedStatus !== "All") {
        const target = params.unifiedStatus.toLowerCase();
        if (target === "paid") {
          query = query.or("payment_status.eq.paid,fulfillment_status.eq.shipped,fulfillment_status.eq.delivered");
        } else if (target === "expired" || target === "time expired") {
          query = query.or("payment_status.eq.expired,fulfillment_status.eq.expired");
        } else if (target === "cancelled") {
          query = query.or("payment_status.eq.cancelled,fulfillment_status.eq.cancelled");
        } else if (target === "failed") {
          query = query.eq("payment_status", "failed");
        } else if (target === "pending") {
          query = query
            .eq("payment_status", "pending")
            .neq("fulfillment_status", "shipped")
            .neq("fulfillment_status", "delivered")
            .neq("fulfillment_status", "cancelled")
            .neq("fulfillment_status", "expired");
        }
      }

      if (params.township && params.township !== "All") {
        query = query.ilike("delivery_address", `%${params.township}%`);
      }

      if (params.q?.trim()) {
        const q = params.q.trim();
        query = query.or(
          `id.ilike.%${q}%,customer_name.ilike.%${q}%,phone.ilike.%${q}%,delivery_address.ilike.%${q}%,landmark_note.ilike.%${q}%`
        );
      }

      const sortDir = params.sortDir === "asc" ? { ascending: true } : { ascending: false };
      if (params.sortField === "total") {
        query = query.order("total_amount", sortDir);
      } else if (params.sortField === "reference") {
        query = query.order("id", sortDir);
      } else {
        query = query.order("created_at", sortDir);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        console.error("Supabase listOrdersPaginated database query error:", error);
        return this.localFallback.listOrdersPaginated(params);
      }

      const total = count ?? (data?.length ?? 0);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const items = ((data ?? []) as SbOrderRow[]).map((row) => mapOrderRow(row));

      const allTownships = [
        "Ahlone", "Bahan", "Botataung", "Dagon", "Dagon Myothit", "Dawbon",
        "East Dagon", "Hlaing", "Insein", "Kamayut", "Kyauktada", "Lanmadaw",
        "Mayangone", "North Dagon", "North Okkalapa", "Pabedan", "Sanchaung",
        "South Dagon", "South Okkalapa", "Tamwe", "Thaketa", "Thingangyun", "Yankin"
      ];

      return {
        items,
        total,
        page,
        limit,
        totalPages,
        allTownships,
      };
    } catch (err) {
      console.error("Supabase listOrdersPaginated catch:", err);
      return this.localFallback.listOrdersPaginated(params);
    }
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
    const defaultPaymentStatus =
      input.paymentMethod === "Cash on Delivery" ? "pending" : "paid";

    let orderId = "";
    let orderCreated = false;

    // Retry loop with 6-digit entropy (900,000 combinations/day) to prevent unique key collisions
    for (let attempt = 0; attempt < 5; attempt++) {
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
      const rand = Math.floor(100000 + Math.random() * 900000);
      orderId = `PC-${dateStr}-${rand}`;

      // Execute via Atomic PostgreSQL Transaction RPC
      const { error: rpcErr } = await sb.rpc(
        "create_storefront_order_transaction",
        {
          p_payload: {
            id: orderId,
            customerName: input.customerName,
            phone: input.phone,
            deliveryAddress: input.deliveryAddress,
            landmarkNote: input.landmarkNote || null,
            total: input.total,
            paymentMethod: input.paymentMethod,
            paymentStatus: input.paymentStatus ?? defaultPaymentStatus,
            fulfillmentStatus: "pending_review",
            promoCode: input.promoCode || null,
            discountAmount: input.discountAmount || 0,
            items: input.items.map((it) => ({
              productId: it.productId,
              name: it.name,
              price: it.price,
              quantity: it.quantity,
              image: sanitizeImageUrl(it.image),
              discountAmount: it.discountAmount || 0,
            })),
          },
        }
      );

      if (!rpcErr) {
        orderCreated = true;
        break;
      }

      // If Postgres unique constraint violation, retry with a new random ID
      if (rpcErr.code === "23505" || rpcErr.message?.includes("unique constraint")) {
        console.warn(`Order ID collision on ${orderId}, retrying attempt ${attempt + 1}...`);
        continue;
      }

      // If insufficient stock or promotion exhausted, throw explicit domain error
      if (
        rpcErr.message?.includes("INSUFFICIENT_STOCK") ||
        rpcErr.message?.includes("PROMOTION_")
      ) {
        throw new Error(rpcErr.message);
      }

      console.warn(
        "create_storefront_order_transaction RPC failed, falling back to multi-step insert:",
        rpcErr
      );
      break;
    }

    if (!orderCreated) {
      // Fallback multi-step execution if stored procedure was bypassed
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
          product_image: sanitizeImageUrl(item.image || matched?.images[0]),
          discount_amount: item.discountAmount || 0,
        };
      });

      if (itemsToInsert.length > 0) {
        await sb.from("order_items").insert(itemsToInsert);
      }

      // Deduct stock via atomic deduct_product_stock RPC
      for (const item of input.items) {
        const matched = allProducts.find(
          (p) =>
            p.id === item.productId ||
            p.slug === item.productId ||
            p.name === item.name
        );
        if (matched && isUuid(matched.id)) {
          await sb.rpc("deduct_product_stock", {
            p_product_id: matched.id,
            p_quantity: item.quantity,
            p_order_id: orderId,
            p_performer: input.customerName || "Customer",
          });
        }
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
    const allPromotions = await this.listPromotions().catch(() => []);
    const mutation = executeOrderUpdate(existing, input, allProducts, {
      actorName: "Staff",
      lowStockAlertEnabled: true,
      promotions: allPromotions,
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

    // Persist affected promotion quota & stockout restorations
    if (mutation.updatedPromotions && mutation.updatedPromotions.length > 0) {
      for (const promo of mutation.updatedPromotions) {
        const prev = allPromotions.find((p) => p.id === promo.id);
        if (
          prev &&
          (prev.usageCount !== promo.usageCount ||
            prev.isOutOfStock !== promo.isOutOfStock)
        ) {
          await sb
            .from("promotions")
            .update({
              usage_count: promo.usageCount,
              is_out_of_stock: promo.isOutOfStock,
              updated_at: new Date().toISOString(),
            })
            .eq("id", promo.id);
        }
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
    type: "increase" | "decrease";
    quantity: number;
    reason: string;
  }): Promise<{ product: Product; adjustment: StockAdjustment } | null> {
    const sb = getSupabaseClient();
    const existing = await this.getProduct(input.productId);
    if (!existing) return null;

    // Use atomic PostgreSQL RPC with row-level locks
    if (isUuid(existing.id)) {
      const rpcName =
        input.type === "decrease" ? "deduct_product_stock" : "restore_product_stock";
      const { data: rpcData, error: rpcErr } = await sb.rpc(rpcName, {
        p_product_id: existing.id,
        p_quantity: input.quantity,
        p_order_id: null,
        p_performer: "Admin",
      });

      if (!rpcErr && rpcData?.success) {
        const updated = await this.getProduct(existing.id);
        if (updated) {
          const adjustment: StockAdjustment = {
            id: generateId("stk"),
            productId: updated.id,
            productName: updated.name,
            sku: updated.sku || "PC-SKU",
            type: input.type,
            quantity: input.quantity,
            previousStock: rpcData.previousStock,
            newStock: rpcData.newStock,
            reason: input.reason,
            performedBy: "Admin",
            createdAt: new Date().toISOString(),
          };

          // Evaluate and sync promotion stockout state in Supabase
          try {
            const allPromotions = await this.listPromotions().catch(() => []);
            for (const promo of allPromotions) {
              const isOut = evaluatePromotionStockout(promo, [updated]);
              if (promo.isOutOfStock !== isOut) {
                await sb
                  .from("promotions")
                  .update({
                    is_out_of_stock: isOut,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", promo.id);
              }
            }
          } catch (e) {
            console.warn("Failed to sync promotion stockout state:", e);
          }

          return { product: updated, adjustment };
        }
      }
    }

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

    // Evaluate and sync promotion stockout state in Supabase
    try {
      const allPromotions = await this.listPromotions().catch(() => []);
      for (const promo of allPromotions) {
        const isOut = evaluatePromotionStockout(promo, [updated]);
        if (promo.isOutOfStock !== isOut) {
          await sb
            .from("promotions")
            .update({
              is_out_of_stock: isOut,
              updated_at: new Date().toISOString(),
            })
            .eq("id", promo.id);
        }
      }
    } catch (e) {
      console.warn("Failed to sync promotion stockout state:", e);
    }

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
      return (await this.getLocalFallbackData()).promotions;
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
    const current = await this.getSettings();
    const merged: StoreSettings = {
      ...current,
      ...updates,
      pickupOptions: { ...current.pickupOptions, ...(updates.pickupOptions || {}) },
      paymentMethods: { ...current.paymentMethods, ...(updates.paymentMethods || {}) },
      socialLinks: { ...current.socialLinks, ...(updates.socialLinks || {}) },
      adminProfile: { ...current.adminProfile, ...(updates.adminProfile || {}) },
      townshipDeliveryFees: updates.townshipDeliveryFees ?? current.townshipDeliveryFees,
    };

    try {
      const sb = getSupabaseClient();
      await sb.from("settings").upsert({
        id: "default",
        store_name: merged.storeName,
        brand: merged.storeName,
        tagline: merged.tagline,
        phone: merged.supportPhone,
        email: merged.supportEmail,
        address: merged.address,
        currency: merged.currency,
        default_low_stock_threshold: merged.defaultLowStockThreshold,
        township_delivery_fees: merged.townshipDeliveryFees,
        pickup_options: merged.pickupOptions,
        payment_methods: merged.paymentMethods,
        social_links: merged.socialLinks,
        admin_profile: merged.adminProfile,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Failed to persist settings in Supabase:", err);
    }

    try {
      await this.localFallback.updateSettings(updates);
    } catch (e) {
      console.warn("Local fallback updateSettings suppressed:", e);
    }

    try {
      const client = getSupabaseClient();
      if (client && updates.socialLinks) {
        const now = new Date().toISOString();
        if (updates.socialLinks.facebook !== undefined) {
          await client.from("social_channels").upsert({
            id: "facebook",
            platform: "Facebook",
            url: updates.socialLinks.facebook,
            is_active: true,
            display_order: 1,
            updated_at: now,
          });
        }
        if (updates.socialLinks.tiktok !== undefined) {
          await client.from("social_channels").upsert({
            id: "tiktok",
            platform: "TikTok",
            url: updates.socialLinks.tiktok,
            is_active: true,
            display_order: 2,
            updated_at: now,
          });
        }
      }
    } catch (err) {
      console.warn("Failed to sync social_channels to Supabase:", err);
    }

    return merged;
  }

  async markNotificationRead(id: string): Promise<void> {
    this.inMemoryReadNotificationIds.add(id);
    try {
      await this.localFallback.markNotificationRead(id);
    } catch (e) {
      console.warn("Local fallback notification read sync suppressed:", e);
    }
  }

  async markAllNotificationsRead(ids?: string[]): Promise<void> {
    if (ids && ids.length > 0) {
      for (const id of ids) {
        this.inMemoryReadNotificationIds.add(id);
      }
      try {
        await this.localFallback.markAllNotificationsRead(ids);
      } catch (e) {
        console.warn("Local fallback notifications read sync suppressed:", e);
      }
      return;
    }
    const orders = await this.listOrders().catch(() => []);
    const derivedIds = deriveNotificationsFromOrdersAndProducts(orders, []).map(
      (n) => n.id
    );
    for (const id of derivedIds) {
      this.inMemoryReadNotificationIds.add(id);
    }
    try {
      await this.localFallback.markAllNotificationsRead(derivedIds);
    } catch (e) {
      console.warn("Local fallback notifications read sync suppressed:", e);
    }
  }
}
