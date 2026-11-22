import fs from "node:fs/promises";
import path from "node:path";
import {
  ActivityLogItem,
  Category,
  Customer,
  NotificationItem,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  Promotion,
  RefundDetails,
  StockAdjustment,
  StoreSettings,
} from "@/types/admin";
import { generateId } from "@/lib/utils";
import {
  applyStockAdjustment,
  reconcileProductStock,
} from "@/modules/catalog/catalog-sync";
import {
  executeOrderUpdate,
  OrderMutationResult,
} from "@/modules/orders/order-lifecycle";
import { createSeedData, DevStoreData } from "./seed";
import { slugify, deriveCustomersFromOrders } from "./mappers";

export interface StorefrontOrderCreateInput {
  customerName: string;
  phone: string;
  township: string;
  deliveryAddress: string;
  coordinates?: { lat: number; lng: number };
  landmarkNote?: string;
  items: Array<{
    productId: string;
    name: string;
    size: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus?: "paid" | "pending" | "failed" | "expired";
}

export interface OrderUpdateInput {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  transactionReference?: string;
  note?: string;
  refund?: Omit<RefundDetails, "refundedAt" | "processedBy">;
}

/**
 * Persistence-agnostic repository contract.
 * Replace JsonFileStoreRepository with a database-backed implementation
 * (e.g., Prisma/Postgres) without changing API routes or frontend code.
 */
export interface StoreRepository {
  getAllData(): Promise<DevStoreData>;
  resetToSeed(): Promise<DevStoreData>;

  listProducts(filters?: {
    category?: string;
    status?: string;
    q?: string;
  }): Promise<Product[]>;
  getProduct(idOrSlug: string): Promise<Product | null>;
  createProduct(
    input: Omit<Product, "id" | "createdAt" | "updatedAt" | "soldCount"> & {
      id?: string;
      soldCount?: number;
    }
  ): Promise<Product>;
  updateProduct(
    id: string,
    updates: Partial<Product>
  ): Promise<Product | null>;
  deleteProduct(id: string): Promise<boolean>;

  listCategories(): Promise<Category[]>;
  createCategory(
    input: Omit<Category, "id" | "createdAt">
  ): Promise<Category>;
  updateCategory(
    id: string,
    updates: Partial<Category>
  ): Promise<Category | null>;
  deleteCategory(id: string): Promise<boolean>;

  listCustomers(): Promise<Customer[]>;

  listOrders(): Promise<Order[]>;
  getOrder(idOrRef: string): Promise<Order | null>;
  createStorefrontOrder(input: StorefrontOrderCreateInput): Promise<Order>;
  updateOrder(
    id: string,
    input: OrderUpdateInput
  ): Promise<OrderMutationResult | null>;

  adjustStock(input: {
    productId: string;
    variantId?: string;
    type: "increase" | "decrease";
    quantity: number;
    reason: string;
  }): Promise<{ product: Product; adjustment: StockAdjustment } | null>;

  listStockAdjustments(): Promise<StockAdjustment[]>;

  createPromotion(
    input: Omit<Promotion, "id" | "usageCount">
  ): Promise<Promotion>;
  updatePromotion(
    id: string,
    updates: Partial<Promotion>
  ): Promise<Promotion | null>;
  deletePromotion(id: string): Promise<boolean>;

  updateSettings(updates: Partial<StoreSettings>): Promise<StoreSettings>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
}

const STORE_FILE_PATH = path.join(process.cwd(), ".data", "dev-store.json");

function appendActivity(
  prev: ActivityLogItem[],
  action: string,
  detail: string,
  category: ActivityLogItem["category"],
  actor: string
): ActivityLogItem[] {
  return [
    {
      id: generateId("act"),
      action,
      detail,
      actor,
      timestamp: new Date().toISOString(),
      category,
    },
    ...prev.slice(0, 29),
  ];
}

function appendNotification(
  prev: NotificationItem[],
  draft: Omit<NotificationItem, "id" | "read" | "createdAt"> | null
): NotificationItem[] {
  if (!draft) return prev;
  if (prev.some((n) => !n.read && n.title === draft.title)) {
    return prev;
  }
  return [
    {
      ...draft,
      id: generateId("notif"),
      read: false,
      createdAt: new Date().toISOString(),
    },
    ...prev.slice(0, 49),
  ];
}

export class JsonFileStoreRepository implements StoreRepository {
  private filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath: string = STORE_FILE_PATH) {
    this.filePath = filePath;
  }

  private async ensureInitialized(): Promise<DevStoreData> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<DevStoreData>;
      if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.categories)) {
        const seed = createSeedData();
        return {
          products: parsed.products,
          categories: parsed.categories,
          orders: parsed.orders ?? seed.orders,
          customers: parsed.customers ?? seed.customers,
          stockHistory: parsed.stockHistory ?? seed.stockHistory,
          promotions: parsed.promotions ?? seed.promotions,
          notifications: parsed.notifications ?? seed.notifications,
          activity: parsed.activity ?? seed.activity,
          settings: parsed.settings ?? seed.settings,
        };
      }
    } catch {
      // File missing or invalid; create from seed below
    }

    const seed = createSeedData();
    await this.writeData(seed);
    return seed;
  }

  private async writeData(data: DevStoreData): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  private async withWriteLock<T>(
    mutator: (data: DevStoreData) => Promise<{ next: DevStoreData; result: T }> | { next: DevStoreData; result: T }
  ): Promise<T> {
    let result!: T;
    const run = async () => {
      const current = await this.ensureInitialized();
      const outcome = await mutator(current);
      await this.writeData(outcome.next);
      result = outcome.result;
    };

    const nextPromise = this.writeQueue.then(run, run);
    this.writeQueue = nextPromise.catch(() => {});
    await nextPromise;
    return result;
  }

  async getAllData(): Promise<DevStoreData> {
    const data = await this.ensureInitialized();
    const derived = deriveCustomersFromOrders(data.orders ?? []);
    return {
      ...data,
      customers: derived.length > 0 ? derived : data.customers,
    };
  }

  async resetToSeed(): Promise<DevStoreData> {
    return this.withWriteLock(() => {
      const seed = createSeedData();
      return { next: seed, result: seed };
    });
  }

  async listProducts(filters?: {
    category?: string;
    status?: string;
    q?: string;
  }): Promise<Product[]> {
    const data = await this.ensureInitialized();
    let list = data.products;

    if (filters?.status) {
      list = list.filter((p) => p.status === filters.status);
    }
    if (filters?.category && filters.category !== "all") {
      const cat = data.categories.find(
        (c) => c.id === filters.category || c.slug === filters.category
      );
      if (cat) {
        list = list.filter((p) => p.categoryId === cat.id);
      } else {
        list = list.filter((p) => p.categoryId === filters.category);
      }
    }
    if (filters?.q?.trim()) {
      const q = filters.q.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }
    return list;
  }

  async getProduct(idOrSlug: string): Promise<Product | null> {
    const data = await this.ensureInitialized();
    return (
      data.products.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null
    );
  }

  async createProduct(
    input: Omit<Product, "id" | "createdAt" | "updatedAt" | "soldCount"> & {
      id?: string;
      soldCount?: number;
    }
  ): Promise<Product> {
    return this.withWriteLock((data) => {
      const now = new Date().toISOString();
      const baseSlug = input.slug || slugify(input.name) || generateId("prod");
      const uniqueId =
        input.id ||
        (data.products.some((p) => p.id === baseSlug)
          ? `${baseSlug}-${Date.now().toString(36)}`
          : baseSlug);

      const newProduct: Product = {
        ...input,
        id: uniqueId,
        slug: input.slug || uniqueId,
        stock: reconcileProductStock(input as Product),
        soldCount: input.soldCount ?? 0,
        createdAt: now,
        updatedAt: now,
      };

      const next: DevStoreData = {
        ...data,
        products: [newProduct, ...data.products],
        activity: appendActivity(
          data.activity,
          "Product Created",
          `${newProduct.name} (${newProduct.sku}) added to catalog`,
          "product",
          data.settings.adminProfile.name
        ),
      };

      return { next, result: newProduct };
    });
  }

  async updateProduct(
    id: string,
    updates: Partial<Product>
  ): Promise<Product | null> {
    return this.withWriteLock((data) => {
      const existing = data.products.find((p) => p.id === id || p.slug === id);
      if (!existing) {
        return { next: data, result: null };
      }

      const now = new Date().toISOString();
      const merged: Product = {
        ...existing,
        ...updates,
        id: existing.id,
        updatedAt: now,
      };
      if (updates.variants !== undefined) {
        merged.stock = reconcileProductStock(merged);
      }

      const next: DevStoreData = {
        ...data,
        products: data.products.map((p) => (p.id === existing.id ? merged : p)),
        activity: appendActivity(
          data.activity,
          "Product Updated",
          `Updated ${merged.name}`,
          "product",
          data.settings.adminProfile.name
        ),
      };

      return { next, result: merged };
    });
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.withWriteLock((data) => {
      const target = data.products.find((p) => p.id === id || p.slug === id);
      if (!target) {
        return { next: data, result: false };
      }

      const next: DevStoreData = {
        ...data,
        products: data.products.filter((p) => p.id !== target.id),
        activity: appendActivity(
          data.activity,
          "Product Deleted",
          `Removed ${target.name} from catalog`,
          "product",
          data.settings.adminProfile.name
        ),
      };

      return { next, result: true };
    });
  }

  async listCategories(): Promise<Category[]> {
    const data = await this.ensureInitialized();
    return data.categories;
  }

  async createCategory(
    input: Omit<Category, "id" | "createdAt">
  ): Promise<Category> {
    return this.withWriteLock((data) => {
      const newCategory: Category = {
        ...input,
        id: generateId("cat"),
        createdAt: new Date().toISOString(),
      };
      const next: DevStoreData = {
        ...data,
        categories: [...data.categories, newCategory],
        activity: appendActivity(
          data.activity,
          "Category Created",
          `Added category "${newCategory.name}"`,
          "product",
          data.settings.adminProfile.name
        ),
      };
      return { next, result: newCategory };
    });
  }

  async updateCategory(
    id: string,
    updates: Partial<Category>
  ): Promise<Category | null> {
    return this.withWriteLock((data) => {
      const target = data.categories.find((c) => c.id === id);
      if (!target) return { next: data, result: null };
      const updated: Category = { ...target, ...updates, id: target.id };
      const next: DevStoreData = {
        ...data,
        categories: data.categories.map((c) => (c.id === id ? updated : c)),
      };
      return { next, result: updated };
    });
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.withWriteLock((data) => {
      const exists = data.categories.some((c) => c.id === id);
      if (!exists) return { next: data, result: false };
      const next: DevStoreData = {
        ...data,
        categories: data.categories.filter((c) => c.id !== id),
      };
      return { next, result: true };
    });
  }

  async listCustomers(): Promise<Customer[]> {
    const data = await this.ensureInitialized();
    const derived = deriveCustomersFromOrders(data.orders ?? []);
    if (derived.length > 0) return derived;
    return data.customers ?? [];
  }

  async listOrders(): Promise<Order[]> {
    const data = await this.ensureInitialized();
    return data.orders;
  }

  async getOrder(idOrRef: string): Promise<Order | null> {
    const data = await this.ensureInitialized();
    const normalized = idOrRef.trim().toLowerCase();
    return (
      data.orders.find(
        (o) =>
          o.id.toLowerCase() === normalized ||
          o.reference.toLowerCase() === normalized
      ) ?? null
    );
  }

  async createStorefrontOrder(input: StorefrontOrderCreateInput): Promise<Order> {
    return this.withWriteLock((data) => {
      const now = new Date().toISOString();
      const rand = Math.floor(100 + Math.random() * 900);
      const ref = `PC-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${rand}`;

      const paymentMethodMap: Record<string, Order["paymentMethod"]> = {
        KBZPay: "KBZPay",
        WavePay: "WavePay",
        "CB Pay": "CB Pay",
        "AYA Pay": "AYA Pay",
        "Cash on Delivery": "Cash on Delivery",
      };
      const mappedPaymentMethod: Order["paymentMethod"] =
        paymentMethodMap[input.paymentMethod] ?? "KBZPay";

      const paymentStatusMap: Record<string, PaymentStatus> = {
        paid: "Paid",
        failed: "Failed",
        expired: "Expired",
        pending: "Pending",
      };
      const mappedPaymentStatus: PaymentStatus =
        paymentStatusMap[input.paymentStatus ?? "pending"] ?? "Pending";

      const newOrder: Order = {
        id: ref,
        reference: ref,
        customerId: `cust-web-${Date.now().toString(36)}`,
        customerName: input.customerName,
        customerPhone: input.phone,
        deliveryAddress: input.deliveryAddress,
        township: input.township,
        city: input.township.includes("Mandalay") ? "Mandalay" : "Yangon",
        nearbyLandmark: input.landmarkNote,
        deliveryMethod: "courier",
        coordinates: input.coordinates,
        items: input.items.map((item, idx) => {
          const prod = data.products.find((p) => p.id === item.productId);
          return {
            id: `oi-${Date.now().toString(36)}-${idx}`,
            productId: item.productId,
            productName: item.name,
            productImage: item.image || prod?.images[0] || "/assets/dew-drop-serum.png",
            sku: prod?.sku || item.productId.toUpperCase(),
            variantLabel: item.size || undefined,
            quantity: item.quantity,
            unitPrice: item.price,
          };
        }),
        subtotal: input.subtotal,
        deliveryFee: input.deliveryFee,
        discountAmount: 0,
        total: input.total,
        paymentMethod: mappedPaymentMethod,
        paymentStatus: mappedPaymentStatus,
        orderStatus: "Pending",
        timeline: [
          {
            status: "Pending",
            timestamp: now,
            note: "Order placed from customer storefront",
            actor: input.customerName,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      // Deduct stock from purchased products and matching variants
      const updatedProducts = [...data.products];
      const newAdjustments: StockAdjustment[] = [];
      let notifications = appendNotification(data.notifications, {
        type: "order",
        title: `New order ${newOrder.reference}`,
        message: `${newOrder.customerName} placed an order for ${newOrder.total.toLocaleString()} MMK.`,
        href: `/admin/orders/${newOrder.id}`,
      });

      for (const orderItem of newOrder.items) {
        const productIndex = updatedProducts.findIndex(
          (p) => p.id === orderItem.productId
        );
        if (productIndex === -1) continue;

        const product = updatedProducts[productIndex];
        let matchedVariantId: string | undefined;

        if (product.variants && product.variants.length > 0) {
          const matchedVariant = orderItem.variantLabel
            ? product.variants.find((v) => v.label === orderItem.variantLabel)
            : product.variants[0];
          matchedVariantId = matchedVariant?.id ?? product.variants[0].id;
        }

        const { updatedProduct, adjustment } = applyStockAdjustment(
          product,
          matchedVariantId,
          "decrease",
          orderItem.quantity,
          input.customerName,
          `Order ${newOrder.reference} placed`
        );

        updatedProducts[productIndex] = updatedProduct;
        newAdjustments.push(adjustment);

        if (data.settings.notifications.lowStockAlert) {
          if (
            updatedProduct.stock === 0 &&
            product.stock > 0
          ) {
            notifications = appendNotification(notifications, {
              type: "stock",
              title: `Out of stock — ${updatedProduct.name}`,
              message: `${updatedProduct.name} (${updatedProduct.sku}) is out of stock.`,
              href: "/admin/inventory",
            });
          } else if (
            updatedProduct.stock > 0 &&
            updatedProduct.stock <= updatedProduct.lowStockThreshold &&
            product.stock > updatedProduct.lowStockThreshold
          ) {
            notifications = appendNotification(notifications, {
              type: "stock",
              title: `Low stock — ${updatedProduct.name}`,
              message: `${updatedProduct.name} has only ${updatedProduct.stock} units remaining (threshold ${updatedProduct.lowStockThreshold}).`,
              href: "/admin/inventory",
            });
          }
        }
      }

      const next: DevStoreData = {
        ...data,
        products: updatedProducts,
        orders: [newOrder, ...data.orders],
        stockHistory: [...newAdjustments, ...data.stockHistory],
        notifications,
        activity: appendActivity(
          data.activity,
          "New Storefront Order",
          `${newOrder.reference} placed by ${newOrder.customerName}`,
          "order",
          input.customerName
        ),
      };

      return { next, result: newOrder };
    });
  }

  async updateOrder(
    id: string,
    input: OrderUpdateInput
  ): Promise<OrderMutationResult | null> {
    return this.withWriteLock((data) => {
      const target = data.orders.find((o) => o.id === id || o.reference === id);
      if (!target) return { next: data, result: null };

      const actor = data.settings.adminProfile.name;
      const mutation = executeOrderUpdate(target, input, data.products, {
        actorName: actor,
        lowStockAlertEnabled: data.settings.notifications.lowStockAlert,
      });

      let nextNotifications = data.notifications;
      for (const notif of mutation.newNotifications) {
        nextNotifications = appendNotification(nextNotifications, notif);
      }

      let nextActivity = data.activity;
      if (mutation.newActivity) {
        nextActivity = [mutation.newActivity, ...data.activity.slice(0, 29)];
      }

      const next: DevStoreData = {
        ...data,
        orders: data.orders.map((o) =>
          o.id === mutation.updatedOrder.id ? mutation.updatedOrder : o
        ),
        products: mutation.updatedProducts,
        stockHistory: [...mutation.newAdjustments, ...data.stockHistory],
        notifications: nextNotifications,
        activity: nextActivity,
      };

      return { next, result: mutation };
    });
  }

  async adjustStock(input: {
    productId: string;
    variantId?: string;
    type: "increase" | "decrease";
    quantity: number;
    reason: string;
  }): Promise<{ product: Product; adjustment: StockAdjustment } | null> {
    return this.withWriteLock((data) => {
      const target = data.products.find((p) => p.id === input.productId);
      if (!target) return { next: data, result: null };

      const { updatedProduct, adjustment } = applyStockAdjustment(
        target,
        input.variantId,
        input.type,
        input.quantity,
        data.settings.adminProfile.name,
        input.reason
      );

      const next: DevStoreData = {
        ...data,
        products: data.products.map((p) =>
          p.id === target.id ? updatedProduct : p
        ),
        stockHistory: [adjustment, ...data.stockHistory],
        activity: appendActivity(
          data.activity,
          "Stock Adjusted",
          `${updatedProduct.name} ${input.type === "increase" ? "+" : "-"}${input.quantity} (${input.reason})`,
          "inventory",
          data.settings.adminProfile.name
        ),
      };

      return { next, result: { product: updatedProduct, adjustment } };
    });
  }

  async listStockAdjustments(): Promise<StockAdjustment[]> {
    const data = await this.ensureInitialized();
    return data.stockHistory;
  }

  async createPromotion(
    input: Omit<Promotion, "id" | "usageCount">
  ): Promise<Promotion> {
    return this.withWriteLock((data) => {
      const promo: Promotion = {
        ...input,
        id: generateId("promo"),
        usageCount: 0,
      };
      const next: DevStoreData = {
        ...data,
        promotions: [promo, ...data.promotions],
        activity: appendActivity(
          data.activity,
          "Promotion Created",
          `Created ${promo.title} (${promo.code})`,
          "promotion",
          data.settings.adminProfile.name
        ),
      };
      return { next, result: promo };
    });
  }

  async updatePromotion(
    id: string,
    updates: Partial<Promotion>
  ): Promise<Promotion | null> {
    return this.withWriteLock((data) => {
      const target = data.promotions.find((p) => p.id === id);
      if (!target) return { next: data, result: null };
      const updated: Promotion = { ...target, ...updates, id: target.id };
      const next: DevStoreData = {
        ...data,
        promotions: data.promotions.map((p) => (p.id === id ? updated : p)),
      };
      return { next, result: updated };
    });
  }

  async deletePromotion(id: string): Promise<boolean> {
    return this.withWriteLock((data) => {
      const exists = data.promotions.some((p) => p.id === id);
      if (!exists) return { next: data, result: false };
      const next: DevStoreData = {
        ...data,
        promotions: data.promotions.filter((p) => p.id !== id),
      };
      return { next, result: true };
    });
  }

  async updateSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
    return this.withWriteLock((data) => {
      const merged: StoreSettings = {
        ...data.settings,
        ...updates,
        pickupOptions: {
          ...data.settings.pickupOptions,
          ...updates.pickupOptions,
        },
        paymentMethods: {
          ...data.settings.paymentMethods,
          ...updates.paymentMethods,
        },
        notifications: {
          ...data.settings.notifications,
          ...updates.notifications,
        },
        adminProfile: {
          ...data.settings.adminProfile,
          ...updates.adminProfile,
        },
        socialLinks: {
          ...data.settings.socialLinks,
          ...updates.socialLinks,
        },
      };
      const next: DevStoreData = {
        ...data,
        settings: merged,
        activity: appendActivity(
          data.activity,
          "Settings Updated",
          "Updated store configuration",
          "settings",
          merged.adminProfile.name
        ),
      };
      return { next, result: merged };
    });
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.withWriteLock((data) => ({
      next: {
        ...data,
        notifications: data.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      },
      result: undefined,
    }));
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.withWriteLock((data) => ({
      next: {
        ...data,
        notifications: data.notifications.map((n) => ({ ...n, read: true })),
      },
      result: undefined,
    }));
  }
}

import { isSupabaseConfigured } from "@/lib/supabase";
import { SupabaseStoreRepository } from "./supabase-repository";

const globalForStore = globalThis as unknown as {
  __prettyCornerRepo?: StoreRepository;
};

export function getStoreRepository(): StoreRepository {
  const useSupabase = isSupabaseConfigured();
  if (
    !globalForStore.__prettyCornerRepo ||
    (useSupabase &&
      !(globalForStore.__prettyCornerRepo instanceof SupabaseStoreRepository))
  ) {
    globalForStore.__prettyCornerRepo = useSupabase
      ? new SupabaseStoreRepository()
      : new JsonFileStoreRepository();
  }
  return globalForStore.__prettyCornerRepo!;
}
