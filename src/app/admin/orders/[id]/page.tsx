"use client";

import React, { useState } from "react";
import Link from "next/link";
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
} from "@/components/ui/status-badge";
import { formatDateTime, formatMMK, cn } from "@/lib/utils";

const ALL_ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
];

const ALL_PAYMENT_STATUSES: PaymentStatus[] = [
  "Pending",
  "Paid",
  "Failed",
  "Expired",
];

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const {
    orders,
    updateOrderStatus,
    updatePaymentStatus,
    updatePaymentReference,
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

  const handleUpdateStatus = () => {
    updateOrderStatus(order.id, selectedStatus, statusNote.trim() || undefined);
    setStatusNote("");
    toast.success(`Order ${order.reference} updated to ${selectedStatus}`);
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
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.productImage}
                        alt={item.productName}
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
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[#33272C]">
                        {formatMMK(item.unitPrice * item.quantity)}
                      </p>
                      <p className="text-xs text-[#806B73]">
                        {item.quantity} × {formatMMK(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="rounded-xl bg-[#FDF6F8] border border-[#F0E1E6] p-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#806B73]">
                  <span>Subtotal</span>
                  <span>{formatMMK(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#806B73]">
                  <span>Delivery Fee</span>
                  <span>
                    {order.deliveryFee === 0
                      ? "Free"
                      : formatMMK(order.deliveryFee)}
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-{formatMMK(order.discountAmount)}</span>
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
          {/* Admin Status Control */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Update Order Status</CardTitle>
              <CardDescription>
                Advance fulfillment stage or record a status note
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Order Status</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(v) => setSelectedStatus(v as OrderStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Note (optional)</Label>
                <Input
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g., Handed to Royal Express rider"
                />
              </div>
              <Button onClick={handleUpdateStatus} className="w-full">
                Save Status Update
              </Button>
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

          {/* Payment Information & Gateway Settlement (Section 5) */}
          <Card className="rounded-[32px] border-[#F0E1E6]">
            <CardHeader className="pb-3 border-b border-[#F0E1E6]/60">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-[#D96B91]" />
                Payment & Gateway Settlement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[#806B73]">Payment Provider / Method</span>
                <span className="font-semibold text-[#33272C] text-sm">
                  {order.paymentMethod}
                </span>
              </div>

              {/* Gateway Transaction Reference (Gap 7) */}
              <div className="rounded-2xl border border-[#F0E1E6] bg-[#FDF6F8] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#33272C] flex items-center gap-1.5">
                    <ReceiptText className="h-3.5 w-3.5 text-[#D96B91]" />
                    Gateway Transaction Reference
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
                      {order.transactionReference ? "Edit" : "+ Record Reference"}
                    </button>
                  )}
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

              <div className="space-y-1.5">
                <Label>Payment Status</Label>
                <Select
                  value={order.paymentStatus}
                  onValueChange={(v) => {
                    updatePaymentStatus(order.id, v as PaymentStatus);
                    toast.success(`Payment status set to ${v}`);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-[#F0E1E6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_PAYMENT_STATUSES.map((ps) => (
                      <SelectItem key={ps} value={ps}>
                        {ps}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
