import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

async function normalizeOrders() {
  console.log("Fetching all orders from Supabase...");
  const { data: orders, error } = await sb.from("orders").select("*");
  if (error) {
    console.error("Failed to fetch orders:", error);
    process.exit(1);
  }

  console.log(`Fetched ${orders.length} orders. Normalizing statuses...`);

  let updatedCount = 0;
  const now = Date.now();

  for (const o of orders) {
    let nextF = o.fulfillment_status;
    let nextP = o.payment_status;

    if (o.payment_status === "cancelled" || o.fulfillment_status === "cancelled") {
      nextF = "cancelled";
      nextP = "cancelled";
    } else if (o.payment_status === "expired" || o.fulfillment_status === "expired") {
      nextF = "expired";
      nextP = "expired";
    } else if (o.payment_status === "failed") {
      nextF = "pending_review";
      nextP = "failed";
    } else if (
      o.payment_status === "paid" ||
      o.fulfillment_status === "shipped" ||
      o.fulfillment_status === "delivered"
    ) {
      nextF = "shipped";
      nextP = "paid";
    } else if (
      o.payment_method === "Mobile Banking" &&
      o.payment_status === "pending" &&
      now - new Date(o.created_at).getTime() > 3600000
    ) {
      // Uncompleted Mobile Banking order where the 5-min timer expired
      nextF = "expired";
      nextP = "expired";
    } else {
      nextF = "pending_review";
      nextP = "pending";
    }

    if (nextF !== o.fulfillment_status || nextP !== o.payment_status) {
      const { error: updateErr } = await sb
        .from("orders")
        .update({
          fulfillment_status: nextF,
          payment_status: nextP,
          updated_at: new Date().toISOString(),
        })
        .eq("id", o.id);

      if (updateErr) {
        console.error(`Failed to update order ${o.id}:`, updateErr);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully normalized ${updatedCount} orders in Supabase.`);

  // Verify final distribution
  const { data: finalOrders } = await sb.from("orders").select("fulfillment_status, payment_status");
  const fCounts = {};
  const pCounts = {};
  for (const o of finalOrders) {
    fCounts[o.fulfillment_status] = (fCounts[o.fulfillment_status] || 0) + 1;
    pCounts[o.payment_status] = (pCounts[o.payment_status] || 0) + 1;
  }
  console.log("\n--- Final Supabase Orders Status ---");
  console.log("Total orders:", finalOrders.length);
  console.log("Fulfillment status counts:", fCounts);
  console.log("Payment status counts:", pCounts);
}

normalizeOrders().catch(console.error);
