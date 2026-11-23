"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Clock,
  CheckCircle2,
  Package,
  Copy,
  Check,
  ReceiptText,
  Store,
  Truck,
  Navigation,
  RotateCcw,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/context/admin-store";
import { OrderStatus, PaymentStatus } from "@/types/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  UnifiedOrderStatusBadge,
} from "@/components/ui/status-badge";
import { formatDateTime, formatMMK, cn } from "@/lib/utils";

const ALL_ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const ALL_PAYMENT_STATUSES: PaymentStatus[] = [
  "Pending",
  "Paid",
  "Failed",
  "Expired",
  "Refunded",
];

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const {
    orders,
    updateOrderStatus,
    updatePaymentStatus,
    updatePaymentReference,
    processOrderRefund,
  } = useAdminStore();
  const order = orders.find((o) => o.id === params.id);

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(
    order?.orderStatus ?? "Pending"
  );
  const [statusNote, setStatusNote] = useState("");

  // Payment Reference Editing state
  const [isEditingTrx, setIsEditingTrx] = useState(false);
  const [trxInput, setTrxInput] = useState(order?.transactionReference ?? "");
  const [copiedTrx, setCopiedTrx] = useState(false);

  // Refund Modal state
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState(
    order ? String(order.total) : "0"
  );
  const [isFullRefund, setIsFullRefund] = useState(true);
  const [refundReason, setRefundReason] = useState(
    "Customer requested cancellation"
  );
  const [refundTrxRef, setRefundTrxRef] = useState("");
  const [refundNotes, setRefundNotes] = useState("");

  if (!order) {
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

  const handleMarkDeliveredAndPaid = () => {
    updateOrderStatus(order.id, "Delivered");
    updatePaymentStatus(order.id, "Paid");
    toast.success(`Order ${order.reference} marked as Delivered & Paid! 🎉`);
  };

  const handleMarkDelivered = () => {
    updateOrderStatus(order.id, "Delivered");
    toast.success(`Order ${order.reference} marked as Delivered! 🎉`);
  };

  const handleCancelOrder = () => {
    const confirmed = window.confirm(
      "Cancelling this order will automatically restore all item quantities back to active inventory and log an audit adjustment. Proceed?"
    );
    if (!confirmed) return;
    updateOrderStatus(order.id, "Cancelled", "Cancelled by admin");
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
        order.orderStatus === "Delivered" || order.paymentMethod !== "Cash on Delivery"
          ? "Paid"
          : "Pending";
      updatePaymentStatus(order.id, restoredStatus);
      toast.success(
        `Payment reactivated and restored to ${restoredStatus}`
      );
    }
  };

  const handleProcessRefund = () => {
    const amt = Number(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }
    if (!refundReason.trim()) {
      toast.error("Please provide a refund reason");
      return;
    }
    processOrderRefund(order.id, {
      amount: amt,
      isFullRefund,
      reason: refundReason.trim(),
      transactionReference:
        refundTrxRef.trim() || order.transactionReference || "REFUND-VOUCHER",
      notes: refundNotes.trim() || undefined,
    });
    setIsRefundModalOpen(false);
    toast.success(`Refund of ${formatMMK(amt)} processed successfully`);
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
              <OrderStatusBadge status={order.orderStatus} />
              <PaymentStatusBadge status={order.paymentStatus} />
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
                Purchased Products ({order.items.length})
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
                            {item.variantLabel && (
                              <span className="rounded-md bg-[#FCEEF2] px-2 py-0.5 text-[11px] font-medium text-[#D96B91]">
                                {item.variantLabel}
                              </span>
                            )}
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
                Order Status Timeline
              </CardTitle>
              <CardDescription>
                Chronological history of order & fulfillment updates
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
          {/* Unified Order & Payment Status Card */}
          <Card className="rounded-[32px] border-[#F0E1E6] overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#F0E1E6]/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-[#33272C] flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#D96B91]" />
                  Order & Payment Status
                </CardTitle>
                <UnifiedOrderStatusBadge
                  orderStatus={order.orderStatus}
                  paymentStatus={order.paymentStatus}
                  paymentMethod={order.paymentMethod}
                />
              </div>
              <CardDescription>
                Unified 1-click status & payment collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Dynamic Status Banner */}
              {order.paymentStatus === "Failed" ? (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3.5 space-y-1">
                  <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    Payment / Delivery Failed
                  </p>
                  <p className="text-[11px] text-rose-800">
                    Delivery refused by customer or transaction declined.
                  </p>
                </div>
              ) : order.orderStatus === "Cancelled" ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-1">
                  <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    Order Cancelled
                  </p>
                  <p className="text-[11px] text-rose-700">
                    All items have been restored to inventory.
                  </p>
                </div>
              ) : order.orderStatus === "Delivered" ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Delivered & Paid
                    </p>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                      Completed
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    {order.paymentMethod === "Cash on Delivery"
                      ? "Cash collected upon delivery"
                      : "Delivered to customer · Paid upfront"}
                  </p>
                </div>
              ) : order.paymentMethod === "Cash on Delivery" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-amber-600" />
                      Pending Delivery (COD)
                    </p>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full">
                      {formatMMK(order.total)}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Collect cash when handoff to customer completes.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Paid upfront ({order.paymentMethod})
                    </p>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                      In Transit
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Payment confirmed. Hand parcel to customer upon delivery.
                  </p>
                </div>
              )}

              {/* THE ONE BUTTON */}
              {order.orderStatus !== "Delivered" && order.orderStatus !== "Cancelled" && (
                order.paymentMethod === "Cash on Delivery" ? (
                  <Button
                    onClick={handleMarkDeliveredAndPaid}
                    className="w-full h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Mark Delivered & Paid</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleMarkDelivered}
                    className="w-full h-12 text-sm font-bold bg-[#D96B91] hover:bg-[#c2567c] text-white rounded-2xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Mark as Delivered</span>
                  </Button>
                )
              )}

              {/* 1-Click Failed Toggle */}
              {order.paymentStatus !== "Failed" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleFailedPayment}
                  className="w-full h-9 text-xs rounded-xl border-rose-200 text-rose-700 bg-rose-50/40 hover:bg-rose-100/70 hover:text-rose-800 flex items-center justify-center gap-1.5 cursor-pointer font-medium"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                  Mark as Failed / Refused
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleFailedPayment}
                  className="w-full h-9 text-xs rounded-xl border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center gap-1.5 cursor-pointer font-semibold shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Re-activate Order (Restore to {order.orderStatus === "Delivered" || order.paymentMethod !== "Cash on Delivery" ? "Paid" : "Pending"})
                </Button>
              )}

              {/* Gateway Provider & Transaction Reference */}
              <div className="rounded-2xl border border-[#F0E1E6] bg-[#FDF6F8] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#33272C] flex items-center gap-1.5">
                    <ReceiptText className="h-3.5 w-3.5 text-[#D96B91]" />
                    Payment Reference
                  </span>
                  {!isEditingTrx && (
                    <button
                      type="button"
                      onClick={() => {
                        setTrxInput(order.transactionReference || "");
                        setIsEditingTrx(true);
                      }}
                      className="text-[11px] font-medium text-[#D96B91] hover:underline cursor-pointer"
                    >
                      {order.transactionReference ? "Edit" : "+ Record Trx"}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#806B73]">Method:</span>
                  <span className="font-semibold text-[#33272C]">{order.paymentMethod}</span>
                </div>

                {isEditingTrx ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={trxInput}
                      onChange={(e) => setTrxInput(e.target.value)}
                      placeholder="e.g. KBZ-TRX-12345678"
                      className="h-8 text-xs rounded-xl border-[#F0E1E6]"
                    />
                    <Button
                      size="sm"
                      className="h-8 text-xs rounded-xl bg-[#D96B91] hover:bg-[#c2567c] text-white"
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
                      className="h-8 text-xs rounded-xl"
                      onClick={() => setIsEditingTrx(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#33272C]">
                      {order.transactionReference || (
                        <span className="text-[#806B73] italic">
                          No provider transaction reference recorded
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
                        className="inline-flex items-center gap-1 text-[11px] text-[#806B73] hover:text-[#D96B91] cursor-pointer"
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

              {/* Refund Audit Section / Cancel Order */}
              {order.refundDetails ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                      Refund Processed ({order.refundDetails.isFullRefund ? "Full" : "Partial"})
                    </span>
                    <span className="font-semibold text-rose-900 text-xs">
                      {formatMMK(order.refundDetails.amount)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#806B73]">
                    Reason: {order.refundDetails.reason} · Trx: {order.refundDetails.transactionReference}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  {order.paymentStatus === "Paid" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRefundAmount(String(order.total));
                        setIsRefundModalOpen(true);
                      }}
                      className="flex-1 text-xs h-8 rounded-xl border-[#F0E1E6] text-[#806B73] hover:text-[#D96B91] hover:bg-[#FCEEF2]"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1 text-[#D96B91]" />
                      Process Refund
                    </Button>
                  )}
                  {order.orderStatus !== "Cancelled" && order.orderStatus !== "Delivered" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelOrder}
                      className="text-xs h-8 text-[#806B73] hover:text-rose-600 hover:bg-rose-50"
                    >
                      Cancel Order
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Customer Information</CardTitle>
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

          {/* Delivery Address, Landmark & Rider Dispatch (PC-OM-006) */}
          <Card className="rounded-[32px] border-[#F0E1E6] overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#F0E1E6]/60">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-[#D96B91]" />
                  Delivery & Rider Dispatch
                </CardTitle>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                    order.deliveryMethod === "pickup"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-[#FCEEF2] text-[#D96B91]"
                  )}
                >
                  {order.deliveryMethod === "pickup" ? (
                    <>
                      <Store className="h-3.5 w-3.5" />
                      In-Store Pickup
                    </>
                  ) : (
                    <>
                      <Truck className="h-3.5 w-3.5" />
                      Courier Dispatch
                    </>
                  )}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs pt-4">
              <div>
                <p className="text-sm text-[#33272C] font-semibold">
                  {order.deliveryAddress}
                </p>
                <p className="text-[#806B73] mt-0.5">
                  {order.township}, {order.city}
                </p>
              </div>

              {/* Nearby Landmark for Myanmar Riders */}
              {order.nearbyLandmark && (
                <div className="rounded-2xl border border-[#F0E1E6] bg-[#FDF6F8] p-3 flex items-start gap-2.5">
                  <Navigation className="h-4 w-4 text-[#D96B91] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#33272C] text-xs">
                      Delivery Landmark / Dispatch Note
                    </p>
                    <p className="text-[#806B73] text-xs mt-0.5">
                      {order.nearbyLandmark}
                    </p>
                  </div>
                </div>
              )}

              {/* Building / apartment + delivery instructions (Section 6.2) */}
              {(order.building || order.deliveryInstructions) && (
                <div className="rounded-2xl border border-[#F0E1E6] bg-white p-3 space-y-1.5">
                  {order.building && (
                    <p className="text-xs text-[#33272C]">
                      <span className="font-semibold">Building / Apartment:</span>{" "}
                      {order.building}
                    </p>
                  )}
                  {order.deliveryInstructions && (
                    <p className="text-xs text-[#33272C]">
                      <span className="font-semibold">
                        Delivery instructions:
                      </span>{" "}
                      {order.deliveryInstructions}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Process Refund Dialog Modal */}
      <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-[#33272C]">
              <RotateCcw className="h-4 w-4 text-[#D96B91]" />
              Process Refund — {order.reference}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#806B73]">
              Record refund details, bank/wallet transaction reference, and update financial reporting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-2xl bg-[#FDF6F8] border border-[#F0E1E6] flex items-center justify-between">
              <div>
                <p className="text-[#806B73]">Original Order Total</p>
                <p className="text-sm font-semibold text-[#33272C]">{formatMMK(order.total)}</p>
              </div>
              <div className="text-right">
                <p className="text-[#806B73]">Payment Provider</p>
                <p className="text-sm font-semibold text-[#33272C]">{order.paymentMethod}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="refund-amt">Refund Amount (MMK) *</Label>
                <Input
                  id="refund-amt"
                  type="number"
                  min={1}
                  max={order.total}
                  value={refundAmount}
                  onChange={(e) => {
                    setRefundAmount(e.target.value);
                    setIsFullRefund(Number(e.target.value) >= order.total);
                  }}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="refund-type">Refund Scope</Label>
                <Select
                  value={isFullRefund ? "full" : "partial"}
                  onValueChange={(val) => {
                    const full = val === "full";
                    setIsFullRefund(full);
                    if (full) setRefundAmount(String(order.total));
                  }}
                >
                  <SelectTrigger id="refund-type" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Refund ({formatMMK(order.total)})</SelectItem>
                    <SelectItem value="partial">Partial Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="refund-reason">Refund Reason *</Label>
              <Input
                id="refund-reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Out of stock shade, customer cancellation"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="refund-trx">Bank / Wallet Refund Reference</Label>
              <Input
                id="refund-trx"
                value={refundTrxRef}
                onChange={(e) => setRefundTrxRef(e.target.value)}
                placeholder="e.g. KBZ-RFND-987654321"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="refund-notes">Internal Audit Notes</Label>
              <Textarea
                id="refund-notes"
                rows={2}
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                placeholder="Optional notes for boutique accounting records..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRefundModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleProcessRefund}
              className="bg-[#D96B91] hover:bg-[#c2567c] text-white"
            >
              Authorize Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
