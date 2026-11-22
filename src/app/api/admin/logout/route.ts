import { NextRequest } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import crypto from "node:crypto";

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (isSupabaseConfigured() && token) {
      const supabase = getSupabaseClient();
      await supabase.from("admin_sessions").delete().eq("token", token);

      await supabase.from("activity_logs").insert({
        id: crypto.randomUUID(),
        action: "Staff Logout",
        detail: `Staff session terminated${email ? ` for ${email}` : ""}`,
        actor: email || "Staff User",
        category: "settings",
        metadata: { tokenPrefix: token.slice(0, 8) },
        created_at: new Date().toISOString(),
      });
    }

    return jsonWithCors({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/logout error:", error);
    return jsonWithCors({ ok: true }); // Always allow client to logout cleanly
  }
}
