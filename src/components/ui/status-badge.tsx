import { Badge } from "@/components/ui/badge";
import { OrderStatus, PaymentStatus, ProductStatus } from "@/types/admin";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variantMap: Record<
    OrderStatus,
    "warning" | "info" | "purple" | "default" | "success" | "destructive"
  > = {
    Pending: "warning",
    Confirmed: "info",
    Processing: "purple",
    Shipped: "default",
    Delivered: "success",
    Cancelled: "destructive",
  };

  return <Badge variant={variantMap[status]}>{status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variantMap: Record<
    PaymentStatus,
    "warning" | "success" | "destructive" | "secondary" | "purple"
  > = {
    Pending: "warning",
    Paid: "success",
    Failed: "destructive",
    Expired: "secondary",
    Refunded: "purple",
    Cancelled: "secondary",
  };

  return <Badge variant={variantMap[status]}>{status}</Badge>;
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const variantMap: Record<ProductStatus, "success" | "warning" | "secondary"> = {
    Active: "success",
    Draft: "warning",
    Archived: "secondary",
  };

  return <Badge variant={variantMap[status]}>{status}</Badge>;
}
