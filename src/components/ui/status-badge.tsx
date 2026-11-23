"use client";

import { Badge } from "@/components/ui/badge";
import { OrderStatus, PaymentStatus, ProductStatus } from "@/types/admin";
import { useLanguage } from "@/context/language-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export type UnifiedStatusKey = "pending" | "paid" | "failed" | "expired" | "cancelled";

export interface UnifiedStatusConfig {
  key: UnifiedStatusKey;
  label: string;
  burmese: string;
  badgeVariant: "warning" | "success" | "destructive" | "secondary";
  color: string;
}

export const UNIFIED_STATUS_CONFIG: Record<UnifiedStatusKey, UnifiedStatusConfig> = {
  pending: {
    key: "pending",
    label: "Pending",
    burmese: "ငွေပေးချေရန်ကျန်",
    badgeVariant: "warning",
    color: "#F59E0B",
  },
  paid: {
    key: "paid",
    label: "Paid",
    burmese: "ငွေပေးချေပြီး",
    badgeVariant: "success",
    color: "#10B981",
  },
  failed: {
    key: "failed",
    label: "Failed",
    burmese: "ငွေပေးချေမှု မအောင်မြင်ပါ",
    badgeVariant: "destructive",
    color: "#EF4444",
  },
  expired: {
    key: "expired",
    label: "Time Expired",
    burmese: "အချိန်ပြည့် သက်တမ်းကုန်ဆုံး",
    badgeVariant: "secondary",
    color: "#64748B",
  },
  cancelled: {
    key: "cancelled",
    label: "Cancelled",
    burmese: "ပယ်ဖျက်ပြီး",
    badgeVariant: "destructive",
    color: "#F43F5E",
  },
};

export function resolveUnifiedOrderStatus(
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _paymentMethod?: string
): UnifiedStatusKey {
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

export function resolveStatusesFromUnifiedKey(key: UnifiedStatusKey): {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
} {
  switch (key) {
    case "paid":
      return { orderStatus: "Shipped", paymentStatus: "Paid" };
    case "pending":
      return { orderStatus: "Pending", paymentStatus: "Pending" };
    case "failed":
      return { orderStatus: "Pending", paymentStatus: "Failed" };
    case "expired":
      return { orderStatus: "Expired", paymentStatus: "Expired" };
    case "cancelled":
      return { orderStatus: "Cancelled", paymentStatus: "Cancelled" };
  }
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useLanguage();

  const variantMap: Record<
    OrderStatus,
    "warning" | "info" | "purple" | "default" | "secondary" | "destructive"
  > = {
    Pending: "warning",
    Confirmed: "info",
    Processing: "purple",
    Shipped: "default",
    Expired: "secondary",
    Cancelled: "destructive",
  };

  const labelMap: Record<OrderStatus, string> = {
    Pending: t.statusPending,
    Confirmed: t.statusConfirmed,
    Processing: t.statusProcessing,
    Shipped: t.statusShipped,
    Expired: t.statusExpired,
    Cancelled: t.statusCancelled,
  };

  return <Badge variant={variantMap[status]}>{labelMap[status] ?? status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useLanguage();

  const variantMap: Record<
    PaymentStatus,
    "warning" | "success" | "destructive" | "secondary"
  > = {
    Pending: "warning",
    Paid: "success",
    Failed: "destructive",
    Expired: "secondary",
    Cancelled: "secondary",
  };

  const labelMap: Record<PaymentStatus, string> = {
    Pending: t.payPending,
    Paid: t.payPaid,
    Failed: t.payFailed,
    Expired: t.payExpired,
    Cancelled: t.payCancelled,
  };

  return <Badge variant={variantMap[status]}>{labelMap[status] ?? status}</Badge>;
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const { t } = useLanguage();

  const variantMap: Record<ProductStatus, "success" | "warning" | "secondary"> = {
    Active: "success",
    Archived: "secondary",
  };

  const labelMap: Record<ProductStatus, string> = {
    Active: t.prodActive,
    Archived: t.prodArchived,
  };

  return <Badge variant={variantMap[status]}>{labelMap[status] ?? status}</Badge>;
}

export function UnifiedOrderStatusBadge({
  orderStatus,
  paymentStatus,
  paymentMethod,
}: {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
}) {
  const key = resolveUnifiedOrderStatus(orderStatus, paymentStatus, paymentMethod);
  const cfg = UNIFIED_STATUS_CONFIG[key];
  return <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>;
}

export function UnifiedStatusSelector({
  orderStatus,
  paymentStatus,
  paymentMethod,
  disabled = false,
  onStatusChange,
}: {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  disabled?: boolean;
  onStatusChange?: (newStatus: UnifiedStatusKey) => void;
}) {
  const currentKey = resolveUnifiedOrderStatus(orderStatus, paymentStatus, paymentMethod);
  const currentConfig = UNIFIED_STATUS_CONFIG[currentKey];

  return (
    <Select
      value={currentKey}
      onValueChange={(val) => {
        if (val !== currentKey && onStatusChange) {
          onStatusChange(val as UnifiedStatusKey);
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={`h-7 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all duration-150 inline-flex items-center gap-1.5 shadow-2xs w-auto min-w-[140px] max-w-[170px] justify-between cursor-pointer ${
          currentKey === "paid"
            ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
            : currentKey === "pending"
            ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
            : currentKey === "failed" || currentKey === "cancelled"
            ? "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
            : "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200"
        }`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: currentConfig.color }}
          />
          <span className="truncate">{currentConfig.label}</span>
        </span>
      </SelectTrigger>
      <SelectContent className="rounded-2xl border-[#EEDFE5] shadow-lg p-1 min-w-[210px]">
        {(Object.keys(UNIFIED_STATUS_CONFIG) as UnifiedStatusKey[]).map((key) => {
          const cfg = UNIFIED_STATUS_CONFIG[key];
          return (
            <SelectItem
              key={key}
              value={key}
              className="rounded-xl cursor-pointer text-xs py-2 my-0.5"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2 font-medium">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <span>{cfg.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground pl-4">
                  {cfg.burmese}
                </span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
