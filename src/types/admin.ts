export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Shipped"
  | "Expired"
  | "Cancelled";

export type PaymentStatus =
  | "Pending"
  | "Paid"
  | "Failed"
  | "Expired"
  | "Cancelled";

export type ProductStatus = "Active" | "Archived";

export interface Product {
  id: string;
  slug?: string;
  name: string;
  description: string;
  categoryId: string;
  subcategory?: string;
  brand: string;
  sku: string;
  regularPrice: number;
  salePrice?: number;
  images: string[];
  stock: number;
  lowStockThreshold: number;
  status: ProductStatus;
  soldCount: number;
  badge?: string;
  tagline?: string;
  subtitle?: string;
  benefits?: string[];
  usage?: string;
  ingredients?: string;
  specs?: string;
  rating?: number;
  reviewsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogIndexItem {
  id: string;
  name: string;
  sku: string;
  slug?: string;
  categoryId: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note: string;
  actor: string;
}

export type PaymentMethod = "Mobile Banking" | "Cash on Delivery";

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
  nearbyLandmark?: string;
  building?: string;
  deliveryInstructions?: string;
  deliveryMethod?: "courier" | "pickup";
  coordinates?: {
    lat: number;
    lng: number;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  promoCode?: string;
  appliedPromotionId?: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionReference?: string;
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
  nearbyLandmark?: string;
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

export type PromotionTargetType =
  | "SINGLE_PRODUCT"
  | "CATEGORY"
  | "ENTIRE_STORE";

export type RedemptionMethod = "CODE" | "AUTOMATIC";

export interface Promotion {
  id: string;
  slug?: string | null;
  title: string;
  subtitle?: string | null;
  code: string;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  active: boolean;
  targetType: PromotionTargetType;
  targetSlug?: string | null;
  redemptionMethod: RedemptionMethod;
  usageLimit?: number | null;
  usageCount: number;
  minimumOrderAmount?: number | null;
  bannerColor: string;
  bannerImage?: string | null;
  bannerBadge?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  featuredProductIds: string[];
  isOutOfStock: boolean;
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

export interface StorePickupOptions {
  enabled: boolean;
  storeName: string;
  address: string;
  township: string;
  city: string;
  operatingHours: string;
  contactPhone: string;
  instructions: string;
}

export interface TownshipDeliveryFee {
  id: string;
  township: string;
  city: string;
  fee: number;
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
  townshipDeliveryFees: TownshipDeliveryFee[];
  freeShippingThreshold: number;
  defaultLowStockThreshold: number;
  pickupOptions: StorePickupOptions;
  socialLinks: {
    facebook: string;
    instagram: string;
    tiktok: string;
  };
  paymentMethods: {
    mobileBanking: boolean;
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

export interface AdminUserSessionProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AdminSession {
  user: AdminUserSessionProfile;
  token: string;
  expiresAt: number;
  lastActiveAt: number;
  rememberMe: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InventoryStats {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}
