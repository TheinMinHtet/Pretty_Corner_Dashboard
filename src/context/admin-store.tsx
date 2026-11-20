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
import {
  transitionOrderStatus,
  settleOrderPayment,
} from "@/modules/orders/order-lifecycle";
import { applyStockAdjustment } from "@/modules/catalog/catalog-sync";

const STORAGE_KEY = "pretty_corner_admin_v1";
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

/** Deep-merges persisted settings so newly added fields get defaults. */
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

/**
 * Raises an out-of-stock or low-stock alert only when a product (or variant)
 * *crosses* its configured threshold, so routine adjustments stay quiet.
 */
function buildStockAlert(
  product: Product,
  previousStock: number,
  newStock: number,
  variant?: { label: string; skuSuffix?: string }
): NotificationDraft | null {
  if (previousStock === newStock) return null;

  const threshold = product.lowStockThreshold;
  const label = variant ? `${product.name} · ${variant.label}` : product.name;
  const sku = variant?.skuSuffix
    ? `${product.sku}-${variant.skuSuffix}`
    : product.sku;

  if (newStock === 0 && previousStock > 0) {
    return {
      type: "stock",
      title: `Out of stock — ${label}`,
      message: `${label} (${sku}) is out of stock.`,
      href: "/admin/inventory",
    };
  }

  if (newStock > 0 && newStock <= threshold && previousStock > threshold) {
    return {
      type: "stock",
      title: `Low stock — ${label}`,
      message: `${label} has only ${newStock} units remaining (threshold ${threshold}).`,
      href: "/admin/inventory",
    };
  }

  return null;
}

/** Prepends a notification, de-duplicating unread alerts with the same title. */
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
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
        setState({
          products: parsed.products ?? INITIAL_PRODUCTS,
          categories: parsed.categories ?? INITIAL_CATEGORIES,
          orders: parsed.orders ?? INITIAL_ORDERS,
          customers: parsed.customers ?? INITIAL_CUSTOMERS,
          stockHistory: parsed.stockHistory ?? INITIAL_STOCK_HISTORY,
          promotions: parsed.promotions ?? INITIAL_PROMOTIONS,
          notifications: parsed.notifications ?? INITIAL_NOTIFICATIONS,
          activity: parsed.activity ?? INITIAL_ACTIVITY,
          settings: mergeSettings(parsed.settings),
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

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  useEffect(() => {
    try {
      const auth = window.localStorage.getItem(AUTH_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
      if (auth === "false") {
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    } catch {
      setIsAuthenticated(true);
    }
  }, []);

  const login = useCallback((email: string, pass: string): boolean => {
    // Demo credential check. A production build must replace this with a
    // server-verified session (PC-NFR-003).
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPass = pass.trim();
    const validEmail = normalizedEmail === "admin@prettycorner.com";
    const validPass = normalizedPass === "admin123" || normalizedPass === "pretty2026";

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
        if (!target) return prev;
        const prevStatus = target.orderStatus;
        if (prevStatus === status) return prev;

        const {
          updatedOrder,
          updatedProducts: transitionProducts,
          newAdjustments,
          timelineNote,
        } = transitionOrderStatus(
          target,
          status,
          prev.products,
          prev.settings.adminProfile.name,
          note
        );

        let updatedProducts = transitionProducts;

        // Best-seller counts follow delivery state (PC-SD-005)
        if ((prevStatus === "Delivered") !== (status === "Delivered")) {
          const delta = status === "Delivered" ? 1 : -1;
          updatedProducts = updatedProducts.map((p) => {
            const quantity = target.items
              .filter((item) => item.productId === p.id)
              .reduce((sum, item) => sum + item.quantity, 0);
            if (quantity === 0) return p;
            return {
              ...p,
              soldCount: Math.max(0, p.soldCount + delta * quantity),
            };
          });
        }

        const orders = prev.orders.map((o) =>
          o.id === orderId ? updatedOrder : o
        );

        let notifications = prev.notifications;
        if (prev.settings.notifications.lowStockAlert) {
          for (const product of updatedProducts) {
            const before = prev.products.find((p) => p.id === product.id);
            if (!before) continue;
            notifications = appendNotification(
              notifications,
              buildStockAlert(product, before.stock, product.stock)
            );
          }
        }

        notifications = appendNotification(notifications, {
          type: "order",
          title: `Order ${target.reference} ${status}`,
          message:
            timelineNote ||
            `${target.customerName}'s order is now ${status}${
              status === "Cancelled" ? " and stock has been restored" : ""
            }.`,
          href: `/admin/orders/${orderId}`,
        });

        return {
          ...prev,
          orders,
          products: updatedProducts,
          stockHistory: [...newAdjustments, ...prev.stockHistory],
          notifications,
          activity: pushActivity(
            prev.activity,
            `Order ${status}`,
            `${target.reference} updated to ${status}${status === "Cancelled" ? " (Stock Restored)" : ""}`,
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
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        if (!target) return prev;

        const isFailure = status === "Failed" || status === "Expired";
        const notifications =
          isFailure && prev.settings.notifications.paymentFailureAlert
            ? appendNotification(prev.notifications, {
                type: "order",
                title: `Payment ${status.toLowerCase()} — ${target.reference}`,
                message: `${target.paymentMethod} payment for ${target.customerName} (${target.total.toLocaleString()} MMK) did not complete.`,
                href: `/admin/orders/${orderId}`,
              })
            : prev.notifications;

        const updatedOrder = settleOrderPayment(
          target,
          { status },
          prev.settings.adminProfile.name
        );

        return {
          ...prev,
          orders: prev.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
          notifications,
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

  const updatePaymentReference = useCallback((orderId: string, reference: string) => {
    setState((prev) => {
      const target = prev.orders.find((o) => o.id === orderId);
      if (!target) return prev;

      const updatedOrder = settleOrderPayment(
        target,
        { reference },
        prev.settings.adminProfile.name
      );

      return {
        ...prev,
        orders: prev.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
      };
    });
  }, []);

  const processOrderRefund = useCallback(
    (
      orderId: string,
      refund: Omit<RefundDetails, "refundedAt" | "processedBy">
    ) => {
      setState((prev) => {
        const target = prev.orders.find((o) => o.id === orderId);
        if (!target) return prev;

        const updatedOrder = settleOrderPayment(
          target,
          { refund },
          prev.settings.adminProfile.name
        );

        const notifications = appendNotification(prev.notifications, {
          type: "order",
          title: `Refund processed — ${target.reference}`,
          message: `${refund.isFullRefund ? "Full" : "Partial"} refund of ${refund.amount.toLocaleString()} MMK issued to ${target.customerName}.`,
          href: `/admin/orders/${orderId}`,
        });

        return {
          ...prev,
          orders: prev.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
          notifications,
          activity: pushActivity(
            prev.activity,
            "Refund Processed",
            `${target.reference} refunded ${refund.amount.toLocaleString()} MMK`,
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

        const notifications = prev.settings.notifications.lowStockAlert
          ? appendNotification(
              prev.notifications,
              buildStockAlert(target, target.stock, updatedProduct.stock)
            )
          : prev.notifications;

        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === productId ? updatedProduct : p
          ),
          stockHistory: [adjustment, ...prev.stockHistory],
          notifications,
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
        const targetVariant = targetProduct.variants?.find((v) => v.id === variantId);
        if (!targetVariant) return prev;

        const prevVariantQty = targetVariant.quantity;

        const { updatedProduct, adjustment } = applyStockAdjustment(
          targetProduct,
          variantId,
          type,
          quantity,
          prev.settings.adminProfile.name,
          reason
        );

        const newVariantQty =
          updatedProduct.variants?.find((v) => v.id === variantId)?.quantity ??
          prevVariantQty;

        const notifications = prev.settings.notifications.lowStockAlert
          ? appendNotification(
              prev.notifications,
              buildStockAlert(
                targetProduct,
                prevVariantQty,
                newVariantQty,
                {
                  label: targetVariant.label,
                  skuSuffix: targetVariant.skuSuffix,
                }
              )
            )
          : prev.notifications;

        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === productId ? updatedProduct : p
          ),
          stockHistory: [adjustment, ...prev.stockHistory],
          notifications,
          activity: pushActivity(
            prev.activity,
            "Variant Stock Adjusted",
            `${targetProduct.name} [${targetVariant.label}] ${type === "increase" ? "+" : "-"}${quantity} units`,
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
