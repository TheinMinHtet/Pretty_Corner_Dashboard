import { NextRequest } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { AdminSession } from "@/types/admin";
import crypto from "node:crypto";

export async function OPTIONS() {
  return corsPreflightResponse();
}

const SESSION_STANDARD_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_REMEMBER_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password.trim() : "";
    const rememberMe = Boolean(body.rememberMe);

    if (!email || !password) {
      return jsonWithCors(
        { ok: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const ttl = rememberMe ? SESSION_REMEMBER_TTL_MS : SESSION_STANDARD_TTL_MS;
    const now = Date.now();
    const expiresAt = now + ttl;
    const token = crypto.randomUUID();

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();

      // Query admin user by email
      const { data: user, error } = await supabase
        .from("admin_users")
        .select("id, name, email, role, password_hash, is_active")
        .eq("email", email)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Supabase admin_users query error:", error);
      }

      // Check password matching (supports plain string / demo match)
      const valid =
        user &&
        (user.password_hash === password ||
          ((password === "admin123" || password === "pretty2026") &&
            email === "admin@prettycorner.com"));

      if (!valid || !user) {
        return jsonWithCors(
          { ok: false, error: "Invalid email or password" },
          { status: 401 }
        );
      }

      // 1. Update last_login_at
      await supabase
        .from("admin_users")
        .update({ last_login_at: new Date(now).toISOString() })
        .eq("id", user.id);

      // 2. Insert into admin_sessions
      const { error: sessionError } = await supabase.from("admin_sessions").insert({
        user_id: user.id,
        token,
        remember_me: rememberMe,
        expires_at: new Date(expiresAt).toISOString(),
        last_active_at: new Date(now).toISOString(),
      });

      if (sessionError) {
        console.warn("Failed to insert admin_sessions record:", sessionError.message);
      }

      // 3. Log audit event
      await supabase.from("activity_logs").insert({
        id: crypto.randomUUID(),
        action: "Staff Login",
        detail: `Authenticated staff session for ${user.email} (${rememberMe ? "7-day" : "8-hour"})`,
        actor: user.name || "Administrator",
        category: "settings",
        metadata: { email: user.email, rememberMe },
        created_at: new Date(now).toISOString(),
      });

      const session: AdminSession = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
        expiresAt,
        lastActiveAt: now,
        rememberMe,
      };

      return jsonWithCors({ ok: true, session });
    }

    // Fallback mode (mock / local dev without Supabase credentials)
    const isMockValid =
      email === "admin@prettycorner.com" &&
      (password === "admin123" || password === "pretty2026");

    if (!isMockValid) {
      return jsonWithCors(
        { ok: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const session: AdminSession = {
      user: {
        id: "mock-admin-id",
        name: "Administrator",
        email: "admin@prettycorner.com",
        role: "super_admin",
      },
      token,
      expiresAt,
      lastActiveAt: now,
      rememberMe,
    };

    return jsonWithCors({ ok: true, session });
  } catch (error) {
    console.error("POST /api/admin/login error:", error);
    return jsonWithCors({ ok: false, error: "Authentication failed" }, { status: 500 });
  }
}
