import { NextRequest } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { SESSION_COOKIE_NAME } from "@/lib/security/auth-guard";
import crypto from "node:crypto";

export async function OPTIONS(req: NextRequest) {
  return corsPreflightResponse(req);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      token = req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim() ?? "";
    }
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

    const response = jsonWithCors({ ok: true }, undefined, undefined, req);
    // Expire cookie immediately
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("POST /api/admin/logout error:", error);
    const response = jsonWithCors({ ok: true }, undefined, undefined, req);
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  }
}
