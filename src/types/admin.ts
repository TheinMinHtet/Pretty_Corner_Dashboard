export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type PaymentStatus =
  | "Pending"
  | "Paid"
  | "Failed"
  | "Expired"
  | "Refunded";

export type ProductStatus = "Active" | "Draft" | "Archived";

export interface ProductVariant {
  id: string;
  label: string;
  color?: string;
  lensPower?: string;
  quantity: number;
  priceOverride?: number;
  skuSuffix?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  brand: string;
  sku: string;
  regularPrice: number;
  salePrice?: number;
  images: string[];
  stock: number;
  lowStockThreshold: number;
  status: ProductStatus;
  isContactLens?: boolean;
  variants: ProductVariant[];
  soldCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  active: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  sku: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note: string;
  actor: string;
}

export interface Order {
  id: string;
  reference: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  township: string;
  city: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  paymentMethod: "KBZPay" | "WavePay" | "CB Pay" | "AYA Pay" | "Cash on Delivery";
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  notes?: string;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: string;
  label: string;
  address: string;
  township: string;
  city: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatarColor?: string;
  addresses: CustomerAddress[];
  joinedAt: string;
  notes?: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: "increase" | "decrease";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  performedBy: string;
  createdAt: string;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  active: boolean;
  bannerColor: string;
  featuredProductIds: string[];
  usageCount: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "order" | "stock" | "system";
  read: boolean;
  createdAt: string;
  href?: string;
}

export interface ActivityLogItem {
  id: string;
  action: string;
  detail: string;
  actor: string;
  timestamp: string;
  category: "order" | "product" | "inventory" | "promotion" | "settings";
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  viberPhone: string;
  address: string;
  currency: string;
  yangonDeliveryFee: number;
  mandalayDeliveryFee: number;
  otherRegionDeliveryFee: number;
  freeShippingThreshold: number;
  defaultLowStockThreshold: number;
  paymentMethods: {
    kbzPay: boolean;
    wavePay: boolean;
    cbPay: boolean;
    ayaPay: boolean;
    cod: boolean;
  };
  notifications: {
    newOrderAlert: boolean;
    lowStockAlert: boolean;
    dailySummaryEmail: boolean;
    paymentFailureAlert: boolean;
  };
  adminProfile: {
    name: string;
    email: string;
    role: string;
    phone: string;
  };
}
