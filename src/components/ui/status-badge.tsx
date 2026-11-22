"use client";

import { Badge } from "@/components/ui/badge";
import { OrderStatus, PaymentStatus, ProductStatus } from "@/types/admin";
import { useLanguage } from "@/context/language-context";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useLanguage();

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

  const labelMap: Record<OrderStatus, string> = {
    Pending: t.statusPending,
    Confirmed: t.statusConfirmed,
    Processing: t.statusProcessing,
    Shipped: t.statusShipped,
    Delivered: t.statusDelivered,
    Cancelled: t.statusCancelled,
  };

  return <Badge variant={variantMap[status]}>{labelMap[status] ?? status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useLanguage();

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

  const labelMap: Record<PaymentStatus, string> = {
    Pending: t.payPending,
    Paid: t.payPaid,
    Failed: t.payFailed,
    Expired: t.payExpired,
    Refunded: t.payRefunded,
    Cancelled: t.payCancelled,
  };

  return <Badge variant={variantMap[status]}>{labelMap[status] ?? status}</Badge>;
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const { t } = useLanguage();

  const variantMap: Record<ProductStatus, "success" | "warning" | "secondary"> = {
    Active: "success",
    Draft: "warning",
    Archived: "secondary",
  };

  const labelMap: Record<ProductStatus, string> = {
    Active: t.prodActive,
    Draft: t.prodDraft,
    Archived: t.prodArchived,
  };

  return <Badge variant={variantMap[status]}>{labelMap[status] ?? status}</Badge>;
}
