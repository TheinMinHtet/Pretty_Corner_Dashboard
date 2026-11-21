import { z } from "zod";

export const ProductStatusSchema = z.enum(["Active", "Draft", "Archived"]);

export const OrderStatusSchema = z.enum([
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
]);

export const PaymentStatusSchema = z.enum([
  "Pending",
  "Paid",
  "Failed",
  "Expired",
  "Refunded",
  "Cancelled",
]);

export const ProductVariantSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().optional(),
  lensPower: z.string().optional(),
  quantity: z.number().int().min(0),
  priceOverride: z.number().positive().optional(),
  skuSuffix: z.string().optional(),
});

export const ProductSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1).optional(),
  name: z.string().min(1, "Product name is required"),
  description: z.string().default(""),
  categoryId: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  brand: z.string().min(1).default("Pretty Corner"),
  sku: z.string().min(1, "SKU is required"),
  regularPrice: z.number().positive("Regular price must be greater than 0"),
  salePrice: z.number().positive().optional(),
  images: z.array(z.string().min(1)).default([]),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(10),
  status: ProductStatusSchema.default("Active"),
  isContactLens: z.boolean().optional(),
  variants: z.array(ProductVariantSchema).default([]),
  soldCount: z.number().int().min(0).default(0),
  badge: z.string().optional(),
  tagline: z.string().optional(),
  subtitle: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  usage: z.string().optional(),
  ingredients: z.string().optional(),
  specs: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewsCount: z.number().int().min(0).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  soldCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().min(1).optional(),
  soldCount: z.number().int().min(0).optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Category name is required"),
  slug: z.string().min(1, "Category slug is required"),
  description: z.string().default(""),
  image: z.string().default(""),
  active: z.boolean().default(true),
  createdAt: z.string(),
});

export const CreateCategorySchema = CategorySchema.omit({
  id: true,
  createdAt: true,
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const OrderItemSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  productImage: z.string().default(""),
  sku: z.string().default(""),
  variantLabel: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

export const CreateStorefrontOrderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  phone: z.string().min(5, "Phone number is required"),
  township: z.string().min(1, "Township is required"),
  deliveryAddress: z.string().min(1, "Delivery address is required"),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  landmarkNote: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        name: z.string().min(1),
        size: z.string().optional().default(""),
        price: z.number().nonnegative(),
        quantity: z.number().int().positive(),
        image: z.string().optional().default(""),
      })
    )
    .min(1, "Order must contain at least one item"),
  subtotal: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  total: z.number().nonnegative(),
  paymentMethod: z.string().min(1),
  paymentStatus: z.enum(["paid", "pending", "failed", "expired"]).optional(),
});

export const UpdateOrderSchema = z.object({
  orderStatus: OrderStatusSchema.optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  transactionReference: z.string().optional(),
  note: z.string().optional(),
  refund: z
    .object({
      amount: z.number().positive(),
      isFullRefund: z.boolean(),
      reason: z.string().min(1),
      transactionReference: z.string().min(1),
      notes: z.string().optional(),
    })
    .optional(),
});

export const StockAdjustmentRequestSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  type: z.enum(["increase", "decrease"]),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  reason: z.string().min(1, "Reason is required"),
});

export const CreatePromotionSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().default(""),
  code: z.string().min(1),
  discountPercentage: z.number().min(1).max(100),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  active: z.boolean().default(true),
  bannerColor: z.string().default("#FCEEF2"),
  featuredProductIds: z.array(z.string()).default([]),
});

export const UpdatePromotionSchema = CreatePromotionSchema.partial();

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
    .join("; ");
}
