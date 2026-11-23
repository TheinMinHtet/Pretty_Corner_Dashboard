"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Package,
  Copy,
  Check,
  ReceiptText,
  Truck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { useLanguage } from "@/context/language-context";
import { PaymentStatus } from "@/types/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UnifiedOrderStatusBadge,
  UnifiedStatusSelector,
  UNIFIED_STATUS_CONFIG,
} from "@/components/ui/status-badge";
import { formatDateTime, formatMMK } from "@/lib/utils";
import { OrderDetailsSkeleton } from "@/components/skeletons/order-details-skeleton";

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const {
    orders,
    updateOrderStatus,
    updatePaymentStatus,
    updateUnifiedStatus,
    updatePaymentReference,
    hydrated,
  } = useAdminStore();
  const { t } = useLanguage();
  const order = orders.find((o) => o.id === params.id);

  // Payment Reference Editing state
  const [isEditingTrx, setIsEditingTrx] = useState(false);
  const [trxInput, setTrxInput] = useState(order?.transactionReference ?? "");
  const [copiedTrx, setCopiedTrx] = useState(false);

  if (!order) {
    if (!hydrated) {
      return <OrderDetailsSkeleton />;
    }

    return (
      <Card className="p-8 text-center">
        <p className="text-base font-semibold text-[#33272C]">
          Order not found
        </p>
        <p className="text-xs text-[#806B73] mt-1">
          The requested order ID does not exist in local state.
        </p>
        <Button asChild className="mt-4">
          <Link href="/admin/orders">Back to Orders</Link>
        </Button>
      </Card>
    );
  }

  const itemsSum = order.items.reduce(
    (sum, it) => sum + (it.unitPrice || 0) * (it.quantity || 0),
    0
  );
  const displaySubtotal = order.subtotal > 0 ? order.subtotal : itemsSum;
  const displayDeliveryFee = order.deliveryFee ?? 0;
  const effectiveDiscount =
    order.discountAmount && order.discountAmount > 0
      ? order.discountAmount
      : Math.max(0, (displaySubtotal + displayDeliveryFee) - order.total);

  const handleMarkPaidInTransit = () => {
    updateOrderStatus(order.id, "Shipped");
    updatePaymentStatus(order.id, "Paid");
    toast.success(`Order ${order.reference} marked as Paid! 🚚`);
  };

  const handleCancelOrder = () => {
    const confirmed = window.confirm(
      "Cancelling this order will automatically restore all item quantities back to active inventory and log an audit adjustment. Proceed?"
    );
    if (!confirmed) return;
    updateUnifiedStatus(order.id, "cancelled", "Cancelled by admin");
    toast.error(`Order ${order.reference} cancelled and stock restored`);
  };

  const handleToggleFailedPayment = () => {
    if (order.paymentStatus !== "Failed") {
      const defaultReason =
        order.paymentMethod === "Cash on Delivery"
          ? "Customer refused parcel upon delivery"
          : "Payment gateway transaction failed";
      const reason = window.prompt(
        "Optional note or reason for payment failure (e.g., Customer rejected parcel / Card declined):",
        defaultReason
      );
      if (reason === null) return;
      updatePaymentStatus(order.id, "Failed");
      toast.error(`Order ${order.reference} payment marked as Failed`);
    } else {
      const restoredStatus: PaymentStatus =
        order.paymentMethod !== "Cash on Delivery"
          ? "Paid"
          : "Pending";
      updatePaymentStatus(order.id, restoredStatus);
      toast.success(
        `Payment reactivated and restored to ${restoredStatus}`
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/orders" aria-label="Back to orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-serif text-2xl font-semibold text-[#33272C]">
                {order.reference}
              </h2>
              <UnifiedOrderStatusBadge
                orderStatus={order.orderStatus}
                paymentStatus={order.paymentStatus}
                paymentMethod={order.paymentMethod}
              />
            </div>
            <p className="text-xs text-[#806B73] mt-0.5">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-5">
          {/* Purchased Products */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[#D96B91]" />
                {t.purchasedProductsTitle} ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="divide-y divide-[#F0E1E6]">
                {order.items.map((item) => {
                  const hasDiscount = (item.discountAmount ?? 0) > 0;
                  const itemSubtotal = item.unitPrice * item.quantity;
                  const itemFinal = Math.max(0, itemSubtotal - (item.discountAmount ?? 0));

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Image
                          src={item.productImage}
                          alt={item.productName}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-xl border border-[#F0E1E6] object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#33272C] truncate">
                            {item.productName}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-[#806B73]">
                            <span>SKU: {item.sku}</span>
                            {hasDiscount ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                ✨ Promo Applied {order.promoCode ? `(${order.promoCode})` : ""} (-{formatMMK(item.discountAmount!)})
                              </span>
                            ) : order.promoCode ? (
                              <span className="inline-flex items-center rounded-md bg-stone-50 border border-stone-200 px-2 py-0.5 text-[11px] font-normal text-stone-500">
                                Regular Item
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {hasDiscount ? (
                          <>
                            <p className="text-sm font-semibold text-emerald-600">
                              {formatMMK(itemFinal)}
                            </p>
                            <p className="text-xs text-[#806B73] line-through">
                              {formatMMK(itemSubtotal)}
                            </p>
                            <p className="text-[11px] text-[#806B73]">
                              {item.quantity} × {formatMMK(item.unitPrice)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-[#33272C]">
                              {formatMMK(itemSubtotal)}
                            </p>
                            <p className="text-xs text-[#806B73]">
                              {item.quantity} × {formatMMK(item.unitPrice)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Breakdown */}
              <div className="rounded-xl bg-[#FDF6F8] border border-[#F0E1E6] p-4 space-y-2 text-sm">
                {order.promoCode && effectiveDiscount > 0 && (
                  <div className="space-y-1.5 pb-2 mb-2 border-b border-[#F0E1E6]/70 text-xs">
                    <div className="flex justify-between text-[#806B73]">
                      <span>Promotional Items Subtotal</span>
                      <span>
                        {formatMMK(
                          order.items
                            .filter((it) => (it.discountAmount ?? 0) > 0)
                            .reduce((s, it) => s + it.unitPrice * it.quantity, 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span>Promotion Discount</span>
                        <span className="rounded-md bg-emerald-100/80 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold">
                          {order.promoCode}
                        </span>
                      </span>
                      <span>-{formatMMK(effectiveDiscount)}</span>
                    </div>
                    <div className="flex justify-between text-[#806B73]">
                      <span>Regular Items Subtotal</span>
                      <span>
                        {formatMMK(
                          order.items
                            .filter((it) => (it.discountAmount ?? 0) === 0)
                            .reduce((s, it) => s + it.unitPrice * it.quantity, 0)
                        )}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-[#806B73]">
                  <span>Subtotal</span>
                  <span>{formatMMK(displaySubtotal)}</span>
                </div>
                <div className="flex justify-between text-[#806B73]">
                  <span>Delivery Fee</span>
                  <span>
                    {displayDeliveryFee === 0
                      ? "Free"
                      : formatMMK(displayDeliveryFee)}
                  </span>
                </div>
                {effectiveDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span>Discount Deduction</span>
                      {order.promoCode && (
                        <span className="rounded-md bg-emerald-100/80 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 text-[11px] font-semibold">
                          {order.promoCode}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">-{formatMMK(effectiveDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#F0E1E6] pt-2 text-base font-bold text-[#33272C]">
                  <span>Total</span>
                  <span className="text-[#D96B91]">{formatMMK(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Status Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#D96B91]" />
                {t.orderTimelineTitle}
              </CardTitle>
              <CardDescription>
                {t.orderTimelineDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l border-[#F0E1E6] ml-2.5 space-y-5">
                {order.timeline.map((event, idx) => (
                  <li key={`${event.status}-${idx}`} className="ml-5">
                    <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#FCEEF2] ring-4 ring-white">
                      <CheckCircle2 className="h-3 w-3 text-[#D96B91]" />
                    </span>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#33272C]">
                        {event.status}
                      </span>
                      <span className="text-xs text-[#806B73]">
                        {formatDateTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-[#806B73] mt-0.5">{event.note}</p>
                    <p className="text-[11px] text-[#806B73]/80 mt-0.5">
                      Updated by {event.actor}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Actions + Customer + Delivery + Payment */}
        <div className="space-y-5">
          {/* Order & Payment Status Card (Quieter Refinement) */}
          <div className="rounded-[32px] border border-[#EEDFE5] bg-white p-5 space-y-4 shadow-xs">
            {/* Header: Title + Current Status Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E1E6]/70">
              <div>
                <h3 className="text-sm font-bold text-[#38262E] tracking-tight">
                  {t.orderPaymentStatusTitle}
                </h3>
                <p className="text-[11px] text-[#7A6870] mt-0.5">
                  Fulfillment & payment reconciliation
                </p>
              </div>
              <UnifiedOrderStatusBadge
                orderStatus={order.orderStatus}
                paymentStatus={order.paymentStatus}
                paymentMethod={order.paymentMethod}
              />
            </div>

            {/* Status Selector Bar */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#7A6870] block">
                Update Status
              </label>
              <div className="pt-0.5">
                <UnifiedStatusSelector
                  orderStatus={order.orderStatus}
                  paymentStatus={order.paymentStatus}
                  paymentMethod={order.paymentMethod}
                  onStatusChange={(newKey) => {
                    updateUnifiedStatus(order.id, newKey);
                    const label = UNIFIED_STATUS_CONFIG[newKey].label;
                    toast.success(`Order ${order.reference} status updated to ${label}`);
                  }}
                />
              </div>
            </div>

            {/* Quieter Contextual Status Note (Understated, neutral background with subtle dot indicator) */}
            <div className="rounded-2xl border border-[#EEDFE5] bg-[#FAF7F8] p-3 text-xs flex items-start gap-2.5">
              {order.paymentStatus === "Failed" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#38262E]">Payment / Delivery Failed</p>
                    <p className="text-[11px] text-[#7A6870] mt-0.5">
                      Delivery was refused by customer or transaction was declined.
                    </p>
                  </div>
                </>
              ) : order.orderStatus === "Cancelled" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0 mt-1" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#38262E]">Order Cancelled</p>
                    <p className="text-[11px] text-[#7A6870] mt-0.5">
                      All item quantities have been restored to active inventory.
                    </p>
                  </div>
                </>
              ) : order.paymentStatus === "Paid" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#38262E]">Payment Verified</p>
                    <p className="text-[11px] text-[#7A6870] mt-0.5">
                      {order.paymentMethod === "Cash on Delivery"
                        ? "Cash collected upon transit handoff."
                        : "Paid upfront · In transit to customer."}
                    </p>
                  </div>
                </>
              ) : order.orderStatus === "Expired" || order.paymentStatus === "Expired" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0 mt-1" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#38262E]">Time Expired</p>
                    <p className="text-[11px] text-[#7A6870] mt-0.5">
                      Payment session window elapsed without customer completion.
                    </p>
                  </div>
                </>
              ) : order.paymentMethod === "Cash on Delivery" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#38262E]">Pending Cash Collection</p>
                    <p className="text-[11px] text-[#7A6870] mt-0.5">
                      Collect {formatMMK(order.total)} in cash upon customer delivery.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#38262E]">Paid upfront ({order.paymentMethod})</p>
                    <p className="text-[11px] text-[#7A6870] mt-0.5">
                      Payment confirmed. Ready for parcel dispatch.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Actions: Refined, restrained buttons */}
            <div className="space-y-2 pt-1">
              {order.orderStatus !== "Cancelled" && order.orderStatus !== "Expired" && order.paymentStatus !== "Paid" && (
                <Button
                  onClick={handleMarkPaidInTransit}
                  className="w-full h-10 text-xs font-semibold bg-[#B73D67] hover:bg-[#982F53] text-white rounded-xl shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Truck className="h-4 w-4" />
                  <span>Mark as Paid</span>
                </Button>
              )}

              {/* 1-Click Failed Toggle */}
              {order.paymentStatus !== "Failed" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleFailedPayment}
                  className="w-full h-8.5 text-xs rounded-xl border-[#EEDFE5] text-[#7A6870] hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50/40 flex items-center justify-center gap-1.5 cursor-pointer font-medium transition-colors"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-[#7A6870]" />
                  Mark as Failed / Refused
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleFailedPayment}
                  className="w-full h-8.5 text-xs rounded-xl border-emerald-300 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 flex items-center justify-center gap-1.5 cursor-pointer font-semibold transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Re-activate Order (Restore to {order.paymentMethod !== "Cash on Delivery" ? "Paid" : "Pending"})
                </Button>
              )}
            </div>

            {/* Gateway Provider & Transaction Reference (Flat, clean, un-nested) */}
            <div className="pt-3 border-t border-[#F0E1E6]/70 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#38262E] flex items-center gap-1.5">
                  <ReceiptText className="h-3.5 w-3.5 text-[#7A6870]" />
                  Payment Reference
                </span>
                {!isEditingTrx && (
                  <button
                    type="button"
                    onClick={() => {
                      setTrxInput(order.transactionReference || "");
                      setIsEditingTrx(true);
                    }}
                    className="text-[11px] font-medium text-[#B73D67] hover:underline cursor-pointer"
                  >
                    {order.transactionReference ? "Edit" : "+ Record Trx"}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[#7A6870]">
                <span>Method</span>
                <span className="font-medium text-[#38262E]">{order.paymentMethod}</span>
              </div>

              {isEditingTrx ? (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={trxInput}
                    onChange={(e) => setTrxInput(e.target.value)}
                    placeholder="e.g. KBZ-TRX-12345678"
                    className="h-8 text-xs rounded-xl border-[#EEDFE5]"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs rounded-xl bg-[#B73D67] hover:bg-[#982F53] text-white"
                    onClick={() => {
                      updatePaymentReference(order.id, trxInput.trim());
                      setIsEditingTrx(false);
                      toast.success("Payment transaction reference saved");
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs rounded-xl border-[#EEDFE5]"
                    onClick={() => setIsEditingTrx(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#38262E]">
                    {order.transactionReference || (
                      <span className="text-[#7A6870]/70 italic">
                        No reference recorded
                      </span>
                    )}
                  </span>
                  {order.transactionReference && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(order.transactionReference!);
                        setCopiedTrx(true);
                        toast.success("Copied transaction reference to clipboard");
                        setTimeout(() => setCopiedTrx(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-[#7A6870] hover:text-[#B73D67] cursor-pointer"
                      title="Copy reference"
                    >
                      {copiedTrx ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cancel Order (Discrete & Non-Intrusive) */}
            {order.orderStatus !== "Cancelled" && (
              <div className="pt-2 border-t border-[#F0E1E6]/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelOrder}
                  className="w-full text-xs h-7 text-[#7A6870]/70 hover:text-rose-600 hover:bg-rose-50/50 cursor-pointer font-normal"
                >
                  Cancel Order
                </Button>
              </div>
            )}
          </div>

          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t.customerInfoTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <p className="font-semibold text-[#33272C]">
                {order.customerName}
              </p>
              <p className="flex items-center gap-2 text-xs text-[#806B73]">
                <Phone className="h-3.5 w-3.5 text-[#D96B91]" />
                {order.customerPhone}
              </p>
              {order.customerEmail && (
                <p className="flex items-center gap-2 text-xs text-[#806B73]">
                  <Mail className="h-3.5 w-3.5 text-[#D96B91]" />
                  {order.customerEmail}
                </p>
              )}
              {order.notes && (
                <div className="rounded-lg bg-[#FDF6F8] border border-[#F0E1E6] p-2.5 text-xs text-[#33272C] mt-2">
                  <span className="font-semibold">Customer Note:</span>{" "}
                  {order.notes}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
