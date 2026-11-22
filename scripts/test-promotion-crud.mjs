import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const testCode = `TEST_${Date.now()}`;
  console.log(`[TEST] 1. Creating promotion via API (POST /api/promotions) with code: ${testCode}...`);

  const createRes = await fetch(`${BASE_URL}/api/promotions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Automated Test Promo",
      subtitle: "Created by diagnostic test loop",
      code: testCode,
      discountPercentage: 20,
      startDate: "2026-11-21",
      endDate: "2026-12-31",
      active: true,
      bannerColor: "#FCEEF2",
      bannerImage: "/assets/hero-banner.jpg",
      featuredProductIds: [],
    }),
  });

  if (!createRes.ok) {
    const txt = await createRes.text();
    throw new Error(`API create failed with status ${createRes.status}: ${txt}`);
  }

  const createdData = await createRes.json();
  const createdPromo = createdData.promotion;
  console.log(`[TEST] API returned created promotion id: ${createdPromo.id}`);

  // Query Supabase directly
  console.log(`[TEST] 2. Querying Supabase 'promotions' table for code: ${testCode}...`);
  const { data: sbRows, error: sbError } = await supabase
    .from("promotions")
    .select("*")
    .eq("code", testCode);

  if (sbError) {
    throw new Error(`Supabase query error: ${sbError.message}`);
  }

  if (!sbRows || sbRows.length === 0) {
    console.error(`\n❌ [RED REPRODUCED]: Promotion '${testCode}' was NOT stored in Supabase 'promotions' table!`);
    console.error(`   Found 0 rows in Supabase matching code '${testCode}'.`);
    process.exit(1);
  }

  const sbRow = sbRows[0];
  console.log(`[TEST] Found promotion in Supabase: id=${sbRow.id}, discount_percentage=${sbRow.discount_percentage}`);

  // 3. Test UPDATE (PATCH /api/promotions/[id])
  console.log(`[TEST] 3. Updating promotion via API (PATCH /api/promotions/${createdPromo.id})...`);
  const patchRes = await fetch(`${BASE_URL}/api/promotions/${createdPromo.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      discountPercentage: 35,
      subtitle: "Updated via automated test",
    }),
  });

  if (!patchRes.ok) {
    throw new Error(`API patch failed: ${await patchRes.text()}`);
  }

  // Verify Supabase was updated
  const { data: updatedRows } = await supabase
    .from("promotions")
    .select("*")
    .eq("id", sbRow.id);

  if (!updatedRows || updatedRows[0]?.discount_percentage !== 35) {
    console.error(`\n❌ [RED REPRODUCED]: Supabase 'promotions' table discount_percentage was not updated to 35! Value is: ${updatedRows?.[0]?.discount_percentage}`);
    process.exit(1);
  }
  console.log(`[TEST] Supabase row successfully updated: discount_percentage=35`);

  // 4. Test READ (GET /api/promotions)
  console.log(`[TEST] 4. Verifying promotion listed via GET /api/promotions...`);
  const getRes = await fetch(`${BASE_URL}/api/promotions`);
  const listData = await getRes.json();
  const foundInList = listData.promotions?.find((p) => p.code === testCode);
  if (!foundInList) {
    console.error(`\n❌ [RED REPRODUCED]: Promotion '${testCode}' missing from GET /api/promotions!`);
    process.exit(1);
  }
  console.log(`[TEST] Promotion found in GET /api/promotions response.`);

  // 5. Test DELETE (DELETE /api/promotions/[id])
  console.log(`[TEST] 5. Deleting promotion via API (DELETE /api/promotions/${createdPromo.id})...`);
  const delRes = await fetch(`${BASE_URL}/api/promotions/${createdPromo.id}`, {
    method: "DELETE",
  });
  if (!delRes.ok) {
    throw new Error(`API delete failed: ${await delRes.text()}`);
  }

  // Verify deletion from Supabase
  const { data: deletedRows } = await supabase
    .from("promotions")
    .select("*")
    .eq("id", sbRow.id);

  if (deletedRows && deletedRows.length > 0) {
    console.error(`\n❌ [RED REPRODUCED]: Promotion '${testCode}' still exists in Supabase after DELETE!`);
    process.exit(1);
  }
  console.log(`[TEST] Confirmed deleted from Supabase 'promotions' table.`);

  console.log(`\n✅ [GREEN]: Complete Supabase Promotion CRUD verified successfully!`);
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
