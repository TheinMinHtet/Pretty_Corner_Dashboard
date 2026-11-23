import {
  Category,
  Customer,
  NotificationItem,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
} from "@/types/admin";

export interface StorefrontProductSize {
  name: string;
  price: number;
  inStock: boolean;
}

export interface StorefrontProduct {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  category: string;
  subcategory?: string;
  badge?: string;
  tagline?: string;
  subtitle?: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  stockQuantity: number;
  sizes: StorefrontProductSize[];
  image: string;
  gallery: string[];
  description: string;
  benefits: string[];
  usage: string;
  ingredients?: string;
  specs?: string;
  inStock: boolean;
  rating?: number;
  reviewsCount?: number;
}

export interface StorefrontOrder {
  id: string;
  customerName: string;
  phone: string;
  township: string;
  deliveryAddress: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  landmarkNote?: string;
  items: Array<{
    id: string;
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
  paymentStatus: "paid" | "pending" | "failed" | "expired";
  fulfillmentStatus:
    | "pending_review"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered";
  createdAt: string;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Maps an admin Product + Category list into the customer storefront shape.
 * Preserves all storefront content fields while reflecting live admin price,
 * stock, variants, and status changes.
 */
export function toStorefrontProduct(
  product: Product,
  categories: Category[]
): StorefrontProduct {
  const categoryObj = categories.find((c) => c.id === product.categoryId);
  const categorySlug = categoryObj?.slug ?? "more";
  const effectivePrice = product.salePrice ?? product.regularPrice;

  const sizes: StorefrontProductSize[] = [
    {
      name: "Standard",
      price: effectivePrice,
      inStock: product.stock > 0 && product.status === "Active",
    },
  ];

  const gallery =
    product.images && product.images.length > 0
      ? product.images
      : ["/assets/dew-drop-serum.png"];

  return {
    id: product.id,
    slug: product.slug || slugify(product.name) || product.id,
    name: product.name,
    brand: product.brand,
    category: categorySlug,
    subcategory: product.subcategory || categoryObj?.name,
    badge: product.badge,
    tagline: product.tagline,
    subtitle: product.subtitle || product.description.slice(0, 90),
    price: effectivePrice,
    regularPrice: product.regularPrice,
    salePrice: product.salePrice,
    stockQuantity: product.stock,
    sizes,
    image: gallery[0],
    gallery,
    description: product.description,
    benefits:
      product.benefits && product.benefits.length > 0
        ? product.benefits
        : ["Curated quality from Pretty Corner"],
    usage:
      product.usage ||
      "Use as directed in your daily beauty or lifestyle routine.",
    ingredients: product.ingredients,
    specs: product.specs,
    inStock: product.stock > 0 && product.status === "Active",
    rating: product.rating ?? 4.8,
    reviewsCount: product.reviewsCount ?? product.soldCount ?? 0,
  };
}

function mapPaymentStatusToStorefront(
  status: PaymentStatus
): StorefrontOrder["paymentStatus"] {
  switch (status) {
    case "Paid":
      return "paid";
    case "Failed":
      return "failed";
    case "Expired":
      return "expired";
    default:
      return "pending";
  }
}

function mapOrderStatusToStorefront(
  status: OrderStatus
): StorefrontOrder["fulfillmentStatus"] {
  switch (status) {
    case "Confirmed":
      return "confirmed";
    case "Processing":
      return "processing";
    case "Shipped":
      return "shipped";
    default:
      return "pending_review";
  }
}

export function toStorefrontOrder(order: Order): StorefrontOrder {
  return {
    id: order.reference || order.id,
    customerName: order.customerName,
    phone: order.customerPhone,
    township: order.township,
    deliveryAddress: order.deliveryAddress,
    coordinates: order.coordinates ?? { lat: 16.8302, lng: 96.1301 },
    landmarkNote: order.nearbyLandmark,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.productName,
      size: "Standard",
      price: item.unitPrice,
      quantity: item.quantity,
      image: item.productImage,
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: mapPaymentStatusToStorefront(order.paymentStatus),
    fulfillmentStatus: mapOrderStatusToStorefront(order.orderStatus),
    createdAt: order.createdAt,
  };
}

import {
  normalizePhoneNumber,
  getCustomerDossiers,
} from "@/modules/customers/customer-dossier";

export { normalizePhoneNumber };

/**
 * Extracts and unifies distinct customer profiles from order records.
 * Delegated to the deep CustomerDossier module.
 */
export function deriveCustomersFromOrders(orders: Order[]): Customer[] {
  if (!orders || orders.length === 0) return [];
  return getCustomerDossiers(orders);
}

/**
 * Builds live admin notifications directly from actual store orders and product inventories,
 * replacing hardcoded mock alerts with real operational events.
 */
export function deriveNotificationsFromOrdersAndProducts(
  orders: Order[],
  products: Product[],
  readIds: string[] = []
): NotificationItem[] {
  const readSet = new Set(readIds);
  const notifications: NotificationItem[] = [];

  // 1. Order notifications from recent real orders
  const sortedOrders = [...orders].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  for (const ord of sortedOrders.slice(0, 10)) {
    const isPaid = ord.paymentStatus === "Paid";
    notifications.push({
      id: `notif-order-${ord.id}`,
      title: isPaid
        ? `Paid Order · ${ord.reference}`
        : `New Order · ${ord.reference}`,
      message: `${ord.customerName} placed an order for ${ord.total.toLocaleString()} MMK (${ord.paymentMethod} · ${ord.orderStatus}).`,
      type: "order",
      read: false,
      createdAt: ord.createdAt,
      href: `/admin/orders/${ord.id}`,
    });
  }

  // 2. Stock alerts from real products
  for (const prod of products) {
    if (prod.status === "Active" && prod.stock <= prod.lowStockThreshold) {
      const isOut = prod.stock === 0;
      notifications.push({
        id: `notif-stock-${prod.id}`,
        title: isOut
          ? `Out of Stock: ${prod.name}`
          : `Low Stock Alert: ${prod.name}`,
        message: isOut
          ? `${prod.name} (${prod.sku || "N/A"}) is completely sold out.`
          : `${prod.name} has only ${prod.stock} units remaining (threshold: ${prod.lowStockThreshold}).`,
        type: "stock",
        read: false,
        createdAt: prod.updatedAt || prod.createdAt || new Date().toISOString(),
        href: "/admin/inventory",
      });
    }
  }

  // Sort by createdAt descending and omit read/dismissed notifications
  return notifications
    .filter((n) => !readSet.has(n.id))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function resolveUnifiedOrderStatus(
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _paymentMethod?: string
): "pending" | "paid" | "failed" | "expired" | "cancelled" {
  if (orderStatus === "Cancelled" || paymentStatus === "Cancelled") {
    return "cancelled";
  }
  if (orderStatus === "Expired" || paymentStatus === "Expired") {
    return "expired";
  }
  if (paymentStatus === "Failed") {
    return "failed";
  }
  if (paymentStatus === "Paid" || orderStatus === "Shipped") {
    return "paid";
  }
  return "pending";
}

