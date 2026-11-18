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
  StockAdjustment,
  StoreSettings,
} from "@/types/admin";
import {
  INITIAL_ACTIVITY,
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_PROMOTIONS,
  INITIAL_SETTINGS,
  INITIAL_STOCK_HISTORY,
} from "@/data/mock-data";
import { generateId } from "@/lib/utils";

const STORAGE_KEY = "pretty_corner_admin_v1";

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

const DEFAULT_STATE: PersistedState = {
  products: INITIAL_PRODUCTS,
  categories: INITIAL_CATEGORIES,
  orders: INITIAL_ORDERS,
  customers: INITIAL_CUSTOMERS,
  stockHistory: INITIAL_STOCK_HISTORY,
  promotions: INITIAL_PROMOTIONS,
  notifications: INITIAL_NOTIFICATIONS,
  activity: INITIAL_ACTIVITY,
  settings: INITIAL_SETTINGS,
};

interface AdminContextValue extends PersistedState {
  hydrated: boolean;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;

  // Orders
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => void;
  updatePaymentStatus: (orderId: string, status: PaymentStatus) => void;

  // Products
  addProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt" | "soldCount">) => Product;
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

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        setState({
          products: parsed.products ?? INITIAL_PRODUCTS,
          categories: parsed.categories ?? INITIAL_CATEGORIES,
          orders: parsed.orders ?? INITIAL_ORDERS,
          customers: parsed.customers ?? INITIAL_CUSTOMERS,
          stockHistory: parsed.stockHistory ?? INITIAL_STOCK_HISTORY,
          promotions: parsed.promotions ?? INITIAL_PROMOTIONS,
          notifications: parsed.notifications ?? INITIAL_NOTIFICATIONS,
          activity: parsed.activity ?? INITIAL_ACTIVITY,
          settings: parsed.settings ?? INITIAL_SETTINGS,
        });
      }
    } catch {
      // Fallback to default state if storage is unavailable
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state, hydrated]);

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

  const updateOrderStatus = useCallback(
    (orderId: string, status: OrderStatus, note?: string) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        if (!target) return prev;
        const orders = prev.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                orderStatus: status,
                updatedAt: now,
                timeline: [
                  ...o.timeline,
                  {
                    status,
                    timestamp: now,
                    note: note || `Order marked as ${status}.`,
                    actor: prev.settings.adminProfile.name,
                  },
                ],
              }
            : o
        );
        return {
          ...prev,
          orders,
          activity: pushActivity(
            prev.activity,
            `Order ${status}`,
            `${target.reference} updated to ${status}`,
            "order",
            prev.settings.adminProfile.name
          ),
        };
      });
    },
    [pushActivity]
  );

  const updatePaymentStatus = useCallback(
    (orderId: string, status: PaymentStatus) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        if (!target) return prev;
        return {
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === orderId ? { ...o, paymentStatus: status, updatedAt: now } : o
          ),
          activity: pushActivity(
            prev.activity,
            "Payment Updated",
            `${target.reference} payment status changed to ${status}`,
            "order",
            prev.settings.adminProfile.name
          ),
        };
      });
    },
    [pushActivity]
  );

  const addProduct = useCallback(
    (productData: Omit<Product, "id" | "createdAt" | "updatedAt" | "soldCount">): Product => {
      const now = new Date().toISOString();
      const newProduct: Product = {
        ...productData,
        id: generateId("prod"),
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
      return newProduct;
    },
    [pushActivity]
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
    },
    [pushActivity]
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
    },
    [pushActivity]
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
        activity: pushActivity(
          prev.activity,
          "Category Created",
          `Added category ${newCat.name}`,
          "product",
          prev.settings.adminProfile.name
        ),
      }));
      return newCat;
    },
    [pushActivity]
  );

  const updateCategory = useCallback(
    (categoryId: string, updates: Partial<Category>) => {
      setState((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === categoryId ? { ...c, ...updates } : c
        ),
      }));
    },
    []
  );

  const deleteCategory = useCallback(
    (categoryId: string) => {
      setState((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== categoryId),
      }));
    },
    []
  );

  const adjustStock = useCallback(
    (
      productId: string,
      type: "increase" | "decrease",
      quantity: number,
      reason: string
    ) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const target = prev.products.find((p) => p.id === productId);
        if (!target || quantity <= 0) return prev;
        const previousStock = target.stock;
        const newStock =
          type === "increase"
            ? previousStock + quantity
            : Math.max(0, previousStock - quantity);

        const adjustment: StockAdjustment = {
          id: generateId("stk"),
          productId,
          productName: target.name,
          sku: target.sku,
          type,
          quantity,
          previousStock,
          newStock,
          reason: reason || "Manual stock adjustment",
          performedBy: prev.settings.adminProfile.name,
          createdAt: now,
        };

        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === productId ? { ...p, stock: newStock, updatedAt: now } : p
          ),
          stockHistory: [adjustment, ...prev.stockHistory],
          activity: pushActivity(
            prev.activity,
            "Stock Adjusted",
            `${type === "increase" ? "+" : "-"}${quantity} units for ${target.name}`,
            "inventory",
            prev.settings.adminProfile.name
          ),
        };
      });
    },
    [pushActivity]
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
        activity: pushActivity(
          prev.activity,
          "Promotion Created",
          `Launched ${created.title} (${created.code})`,
          "promotion",
          prev.settings.adminProfile.name
        ),
      }));
      return created;
    },
    [pushActivity]
  );

  const updatePromotion = useCallback(
    (promoId: string, updates: Partial<Promotion>) => {
      setState((prev) => ({
        ...prev,
        promotions: prev.promotions.map((p) =>
          p.id === promoId ? { ...p, ...updates } : p
        ),
      }));
    },
    []
  );

  const deletePromotion = useCallback((promoId: string) => {
    setState((prev) => ({
      ...prev,
      promotions: prev.promotions.filter((p) => p.id !== promoId),
    }));
  }, []);

  const updateSettings = useCallback(
    (updates: Partial<StoreSettings>) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...updates },
        activity: pushActivity(
          prev.activity,
          "Settings Updated",
          "Updated store configuration",
          "settings",
          prev.settings.adminProfile.name
        ),
      }));
    },
    [pushActivity]
  );

  const markNotificationRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const resetDemoData = useCallback(() => {
    setState(DEFAULT_STATE);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AdminContextValue>(
    () => ({
      ...state,
      hydrated,
      globalSearch,
      setGlobalSearch,
      updateOrderStatus,
      updatePaymentStatus,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      adjustStock,
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
      updateOrderStatus,
      updatePaymentStatus,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      adjustStock,
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
