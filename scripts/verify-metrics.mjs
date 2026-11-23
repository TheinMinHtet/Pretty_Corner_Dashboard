import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sb = createClient(supabaseUrl, supabaseKey);

function mapPaymentStatusFromSb(status) {
  switch (status?.toLowerCase()) {
    case "paid": return "Paid";
    case "failed": return "Failed";
    case "expired": return "Expired";
    case "refunded":
    case "cancelled": return "Cancelled";
    default: return "Pending";
  }
}
function mapOrderStatusFromSb(status) {
  switch (status?.toLowerCase()) {
    case "confirmed": return "Confirmed";
    case "processing": return "Processing";
    case "shipped":
    case "delivered": return "Shipped";
    case "expired": return "Expired";
    case "cancelled": return "Cancelled";
    default: return "Pending";
  }
}
function resolveUnifiedOrderStatus(orderStatus, paymentStatus) {
  if (orderStatus === "Cancelled" || paymentStatus === "Cancelled") return "cancelled";
  if (orderStatus === "Expired" || paymentStatus === "Expired") return "expired";
  if (paymentStatus === "Failed") return "failed";
  if (paymentStatus === "Paid" || orderStatus === "Shipped") return "paid";
  return "pending";
}

async function run() {
  const { data } = await sb.from("orders").select("*");
  let pending = 0, paid = 0, expired = 0, failed = 0, cancelled = 0;
  for (const o of data) {
    const os = mapOrderStatusFromSb(o.fulfillment_status);
    const ps = mapPaymentStatusFromSb(o.payment_status);
    const u = resolveUnifiedOrderStatus(os, ps);
    if (u === "paid") paid++;
    else if (u === "pending") pending++;
    else if (u === "expired") expired++;
    else if (u === "failed") failed++;
    else if (u === "cancelled") cancelled++;
  }
  const total = data.length;
  console.log("=== VERIFIED METRICS ===");
  console.log(`Total Orders: ${total}`);
  console.log(`Paid: ${paid} (${Math.round(paid/total*100)}%)`);
  console.log(`Pending: ${pending} (${Math.round(pending/total*100)}%)`);
  console.log(`Expired: ${expired} (${Math.round(expired/total*100)}%)`);
  console.log(`Cancelled: ${cancelled} (${Math.round(cancelled/total*100)}%)`);
  console.log(`Failed: ${failed} (${Math.round(failed/total*100)}%)`);
}
run().catch(console.error);
