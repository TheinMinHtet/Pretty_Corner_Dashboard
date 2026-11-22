"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import { INITIAL_SETTINGS } from "@/data/mock-data";
import { generateId } from "@/lib/utils";
import { executeOrderUpdate } from "@/modules/orders/order-lifecycle";
import { applyStockAdjustment } from "@/modules/catalog/catalog-sync";
import { deriveCustomersFromOrders } from "@/lib/dev-store/mappers";

const AUTH_STORAGE_KEY = "pretty_corner_auth_v1";

interface PersistedState {
  products: Product[];
  categories: Category[];
  orders: Order[];
  customers: Customer[];
  stockHistory: StockAdjustment[];
  promotions: Promotion[];
  notifications: NotificationItem[];
  activity: ActivityLogItem[];
  settings: StoreSettings;
}

const EMPTY_INITIAL_STATE: PersistedState = {
  products: [],
  categories: [],
  orders: [],
  customers: [],
  stockHistory: [],
  promotions: [],
  notifications: [],
  activity: [],
  settings: INITIAL_SETTINGS,
};

interface AdminContextValue extends PersistedState {
  hydrated: boolean;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;

  // Authentication
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  // Orders
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => void;
  updatePaymentStatus: (orderId: string, status: PaymentStatus) => void;
  updatePaymentReference: (orderId: string, reference: string) => void;
  processOrderRefund: (
    orderId: string,
    refund: Omit<RefundDetails, "refundedAt" | "processedBy">
  ) => void;

  // Products
  addProduct: (
    product: Omit<Product, "id" | "createdAt" | "updatedAt" | "soldCount">
  ) => Product;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;

  // Categories
  addCategory: (cat: Omit<Category, "id" | "createdAt">) => Category;
  updateCategory: (categoryId: string, updates: Partial<Category>) => void;
  deleteCategory: (categoryId: string) => void;

  // Inventory
  adjustStock: (
    productId: string,
    type: "increase" | "decrease",
    quantity: number,
    reason: string
  ) => void;
  adjustVariantStock: (
    productId: string,
    variantId: string,
    type: "increase" | "decrease",
    quantity: number,
    reason: string
  ) => void;

  // Promotions
  addPromotion: (promo: Omit<Promotion, "id" | "usageCount">) => Promotion;
  updatePromotion: (promoId: string, updates: Partial<Promotion>) => void;
  deletePromotion: (promoId: string) => void;

  // Settings & Notifications
  updateSettings: (updates: Partial<StoreSettings>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  resetDemoData: () => void;
}

type NotificationDraft = Omit<
  NotificationItem,
  "id" | "read" | "createdAt"
>;

const MAX_NOTIFICATIONS = 50;

function mergeSettings(saved?: Partial<StoreSettings>): StoreSettings {
  if (!saved) return INITIAL_SETTINGS;
  return {
    ...INITIAL_SETTINGS,
    ...saved,
    pickupOptions: { ...INITIAL_SETTINGS.pickupOptions, ...saved.pickupOptions },
    paymentMethods: {
      ...INITIAL_SETTINGS.paymentMethods,
      ...saved.paymentMethods,
    },
    notifications: { ...INITIAL_SETTINGS.notifications, ...saved.notifications },
    adminProfile: { ...INITIAL_SETTINGS.adminProfile, ...saved.adminProfile },
    socialLinks: { ...INITIAL_SETTINGS.socialLinks, ...saved.socialLinks },
    townshipDeliveryFees:
      saved.townshipDeliveryFees ?? INITIAL_SETTINGS.townshipDeliveryFees,
  };
}


function appendNotification(
  notifications: NotificationItem[],
  draft: NotificationDraft | null
): NotificationItem[] {
  if (!draft) return notifications;
  if (notifications.some((n) => !n.read && n.title === draft.title)) {
    return notifications;
  }
  return [
    {
      ...draft,
      id: generateId("notif"),
      read: false,
      createdAt: new Date().toISOString(),
    },
    ...notifications.slice(0, MAX_NOTIFICATIONS - 1),
  ];
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY_INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  const refreshFromApi = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bootstrap", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<PersistedState>;
      const orders = data.orders ?? [];
      const derived = deriveCustomersFromOrders(orders);
      const customers =
        data.customers && data.customers.length > 0
          ? data.customers
          : derived;
      setState({
        products: data.products ?? [],
        categories: data.categories ?? [],
        orders,
        customers,
        stockHistory: data.stockHistory ?? [],
        promotions: data.promotions ?? [],
        notifications: data.notifications ?? [],
        activity: data.activity ?? [],
        settings: mergeSettings(data.settings),
      });
    } catch (error) {
      console.error("Failed to load admin store from API:", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/bootstrap", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Partial<PersistedState> | null) => {
        if (!active || !data) return;
        const orders = data.orders ?? [];
        const derived = deriveCustomersFromOrders(orders);
        const customers =
          data.customers && data.customers.length > 0
            ? data.customers
            : derived;
        setState({
          products: data.products ?? [],
          categories: data.categories ?? [],
          orders,
          customers,
          stockHistory: data.stockHistory ?? [],
          promotions: data.promotions ?? [],
          notifications: data.notifications ?? [],
          activity: data.activity ?? [],
          settings: mergeSettings(data.settings),
        });
      })
      .catch((error) => console.error("Failed to load admin store:", error))
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const persistMutation = useCallback(
    async (url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) => {
      try {
        const res = await fetch(url, {
          method,
          headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          console.error(`API ${method} ${url} failed:`, await res.text());
        }
        await refreshFromApi();
      } catch (error) {
        console.error(`API ${method} ${url} error:`, error);
      }
    },
    [refreshFromApi]
  );

  const pushActivity = useCallback(
    (
      prev: ActivityLogItem[],
      action: string,
      detail: string,
      category: ActivityLogItem["category"],
      actor: string
    ): ActivityLogItem[] => [
      {
        id: generateId("act"),
        action,
        detail,
        actor,
        timestamp: new Date().toISOString(),
        category,
      },
      ...prev.slice(0, 29),
    ],
    []
  );

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem(AUTH_STORAGE_KEY) !== "false";
    } catch {
      return true;
    }
  });

  const login = useCallback((email: string, pass: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPass = pass.trim();
    const validEmail = normalizedEmail === "admin@prettycorner.com";
    const validPass =
      normalizedPass === "admin123" || normalizedPass === "pretty2026";

    if (validEmail && validPass) {
      setIsAuthenticated(true);
      try {
        window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
      } catch {
        // ignore
      }
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, "false");
    } catch {
      // ignore
    }
  }, []);

  const updateOrderStatus = useCallback(
    (orderId: string, status: OrderStatus, note?: string) => {
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        if (!target || target.orderStatus === status) return prev;

        const mutation = executeOrderUpdate(
          target,
          { orderStatus: status, note },
          prev.products,
          {
            actorName: prev.settings.adminProfile.name,
            lowStockAlertEnabled: prev.settings.notifications.lowStockAlert,
          }
        );

        let nextNotifications = prev.notifications;
        for (const notif of mutation.newNotifications) {
          nextNotifications = appendNotification(nextNotifications, notif);
        }

        return {
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === orderId ? mutation.updatedOrder : o
          ),
          products: mutation.updatedProducts,
          stockHistory: [...mutation.newAdjustments, ...prev.stockHistory],
          notifications: nextNotifications,
          activity: mutation.newActivity
            ? [mutation.newActivity, ...prev.activity.slice(0, 29)]
            : prev.activity,
        };
      });

      void persistMutation(`/api/orders/${encodeURIComponent(orderId)}`, "PATCH", {
        orderStatus: status,
        note,
      });
    },
    [persistMutation]
  );

  const updatePaymentStatus = useCallback(
    (orderId: string, status: PaymentStatus) => {
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        if (!target || target.paymentStatus === status) return prev;

        const mutation = executeOrderUpdate(
          target,
          { paymentStatus: status },
          prev.products,
          {
            actorName: prev.settings.adminProfile.name,
            lowStockAlertEnabled: prev.settings.notifications.lowStockAlert,
          }
        );

        return {
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === orderId ? mutation.updatedOrder : o
          ),
          activity: mutation.newActivity
            ? [mutation.newActivity, ...prev.activity.slice(0, 29)]
            : prev.activity,
        };
      });

      void persistMutation(`/api/orders/${encodeURIComponent(orderId)}`, "PATCH", {
        paymentStatus: status,
      });
    },
    [persistMutation]
  );

  const updatePaymentReference = useCallback(
    (orderId: string, reference: string) => {
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        if (!target) return prev;

        const mutation = executeOrderUpdate(
          target,
          { transactionReference: reference },
          prev.products,
          { actorName: prev.settings.adminProfile.name }
        );

        return {
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === orderId ? mutation.updatedOrder : o
          ),
        };
      });

      void persistMutation(`/api/orders/${encodeURIComponent(orderId)}`, "PATCH", {
        transactionReference: reference,
      });
    },
    [persistMutation]
  );

  const processOrderRefund = useCallback(
    (
      orderId: string,
      refund: Omit<RefundDetails, "refundedAt" | "processedBy">
    ) => {
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        if (!target) return prev;

        const mutation = executeOrderUpdate(
          target,
          { refund },
          prev.products,
          { actorName: prev.settings.adminProfile.name }
        );

        return {
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === orderId ? mutation.updatedOrder : o
          ),
          activity: mutation.newActivity
            ? [mutation.newActivity, ...prev.activity.slice(0, 29)]
            : prev.activity,
        };
      });

      void persistMutation(`/api/orders/${encodeURIComponent(orderId)}`, "PATCH", {
        refund,
      });
    },
    [persistMutation]
  );

  const addProduct = useCallback(
    (
      productData: Omit<Product, "id" | "createdAt" | "updatedAt" | "soldCount">
    ): Product => {
      const now = new Date().toISOString();
      const tempId = generateId("prod");
      const newProduct: Product = {
        ...productData,
        id: tempId,
        slug: productData.slug || tempId,
        soldCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      setState((prev) => ({
        ...prev,
        products: [newProduct, ...prev.products],
        activity: pushActivity(
          prev.activity,
          "Product Added",
          `Created ${newProduct.name} (${newProduct.sku})`,
          "product",
          prev.settings.adminProfile.name
        ),
      }));

      void persistMutation("/api/products", "POST", {
        ...productData,
        id: tempId,
      });

      return newProduct;
    },
    [persistMutation, pushActivity]
  );

  const updateProduct = useCallback(
    (productId: string, updates: Partial<Product>) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const target = prev.products.find((p) => p.id === productId);
        if (!target) return prev;
        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === productId ? { ...p, ...updates, updatedAt: now } : p
          ),
          activity: pushActivity(
            prev.activity,
            "Product Updated",
            `Updated ${updates.name ?? target.name}`,
            "product",
            prev.settings.adminProfile.name
          ),
        };
      });

      void persistMutation(
        `/api/products/${encodeURIComponent(productId)}`,
        "PATCH",
        updates
      );
    },
    [persistMutation, pushActivity]
  );

  const deleteProduct = useCallback(
    (productId: string) => {
      setState((prev) => {
        const target = prev.products.find((p) => p.id === productId);
        if (!target) return prev;
        return {
          ...prev,
          products: prev.products.filter((p) => p.id !== productId),
          activity: pushActivity(
            prev.activity,
            "Product Deleted",
            `Removed ${target.name}`,
            "product",
            prev.settings.adminProfile.name
          ),
        };
      });

      void persistMutation(
        `/api/products/${encodeURIComponent(productId)}`,
        "DELETE"
      );
    },
    [persistMutation, pushActivity]
  );

  const addCategory = useCallback(
    (cat: Omit<Category, "id" | "createdAt">): Category => {
      const newCat: Category = {
        ...cat,
        id: generateId("cat"),
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        categories: [...prev.categories, newCat],
      }));
      void persistMutation("/api/categories", "POST", cat);
      return newCat;
    },
    [persistMutation]
  );

  const updateCategory = useCallback(
    (categoryId: string, updates: Partial<Category>) => {
      setState((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === categoryId ? { ...c, ...updates } : c
        ),
      }));
      void persistMutation(
        `/api/categories/${encodeURIComponent(categoryId)}`,
        "PATCH",
        updates
      );
    },
    [persistMutation]
  );

  const deleteCategory = useCallback(
    (categoryId: string) => {
      setState((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== categoryId),
      }));
      void persistMutation(
        `/api/categories/${encodeURIComponent(categoryId)}`,
        "DELETE"
      );
    },
    [persistMutation]
  );

  const adjustStock = useCallback(
    (
      productId: string,
      type: "increase" | "decrease",
      quantity: number,
      reason: string
    ) => {
      setState((prev) => {
        const target = prev.products.find((p) => p.id === productId);
        if (!target || quantity <= 0) return prev;
        const { updatedProduct, adjustment } = applyStockAdjustment(
          target,
          undefined,
          type,
          quantity,
          prev.settings.adminProfile.name,
          reason
        );
        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === productId ? updatedProduct : p
          ),
          stockHistory: [adjustment, ...prev.stockHistory],
        };
      });

      void persistMutation("/api/inventory/adjust", "POST", {
        productId,
        type,
        quantity,
        reason,
      });
    },
    [persistMutation]
  );

  const adjustVariantStock = useCallback(
    (
      productId: string,
      variantId: string,
      type: "increase" | "decrease",
      quantity: number,
      reason: string
    ) => {
      setState((prev) => {
        const targetProduct = prev.products.find((p) => p.id === productId);
        if (!targetProduct || quantity <= 0) return prev;
        const { updatedProduct, adjustment } = applyStockAdjustment(
          targetProduct,
          variantId,
          type,
          quantity,
          prev.settings.adminProfile.name,
          reason
        );
        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === productId ? updatedProduct : p
          ),
          stockHistory: [adjustment, ...prev.stockHistory],
        };
      });

      void persistMutation("/api/inventory/adjust", "POST", {
        productId,
        variantId,
        type,
        quantity,
        reason,
      });
    },
    [persistMutation]
  );

  const addPromotion = useCallback(
    (promo: Omit<Promotion, "id" | "usageCount">): Promotion => {
      const created: Promotion = {
        ...promo,
        id: generateId("promo"),
        usageCount: 0,
      };
      setState((prev) => ({
        ...prev,
        promotions: [created, ...prev.promotions],
      }));
      void persistMutation("/api/promotions", "POST", promo);
      return created;
    },
    [persistMutation]
  );

  const updatePromotion = useCallback(
    (promoId: string, updates: Partial<Promotion>) => {
      setState((prev) => ({
        ...prev,
        promotions: prev.promotions.map((p) =>
          p.id === promoId ? { ...p, ...updates } : p
        ),
      }));
      void persistMutation(
        `/api/promotions/${encodeURIComponent(promoId)}`,
        "PATCH",
        updates
      );
    },
    [persistMutation]
  );

  const deletePromotion = useCallback(
    (promoId: string) => {
      setState((prev) => ({
        ...prev,
        promotions: prev.promotions.filter((p) => p.id !== promoId),
      }));
      void persistMutation(
        `/api/promotions/${encodeURIComponent(promoId)}`,
        "DELETE"
      );
    },
    [persistMutation]
  );

  const updateSettings = useCallback(
    (updates: Partial<StoreSettings>) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...updates },
      }));
      void persistMutation("/api/settings", "PATCH", updates);
    },
    [persistMutation]
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      }));
      void persistMutation("/api/notifications/read", "POST", { id });
    },
    [persistMutation]
  );

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
    void persistMutation("/api/notifications/read", "POST", {});
  }, [persistMutation]);

  const resetDemoData = useCallback(() => {
    void persistMutation("/api/admin/reset", "POST");
  }, [persistMutation]);

  const value = useMemo<AdminContextValue>(
    () => ({
      ...state,
      hydrated,
      globalSearch,
      setGlobalSearch,
      isAuthenticated,
      login,
      logout,
      updateOrderStatus,
      updatePaymentStatus,
      updatePaymentReference,
      processOrderRefund,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      adjustStock,
      adjustVariantStock,
      addPromotion,
      updatePromotion,
      deletePromotion,
      updateSettings,
      markNotificationRead,
      markAllNotificationsRead,
      resetDemoData,
    }),
    [
      state,
      hydrated,
      globalSearch,
      isAuthenticated,
      login,
      logout,
      updateOrderStatus,
      updatePaymentStatus,
      updatePaymentReference,
      processOrderRefund,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      adjustStock,
      adjustVariantStock,
      addPromotion,
      updatePromotion,
      deletePromotion,
      updateSettings,
      markNotificationRead,
      markAllNotificationsRead,
      resetDemoData,
    ]
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdminStore() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdminStore must be used within AdminProvider");
  }
  return ctx;
}
