import { NextRequest } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { AdminSession } from "@/types/admin";
import { SESSION_COOKIE_NAME } from "@/lib/security/auth-guard";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";
import crypto from "node:crypto";

export async function OPTIONS(req: NextRequest) {
  return corsPreflightResponse(req);
}

const SESSION_STANDARD_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_REMEMBER_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Perform dummy comparison to keep constant timing
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Sliding window rate limiting (10 attempts per minute per IP)
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`login:${clientIp}`, {
      windowMs: 60 * 1000,
      maxRequests: 10,
    });

    if (!rateCheck.success) {
      return jsonWithCors(
        {
          ok: false,
          error: "Too many login attempts. Please wait 1 minute before trying again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateCheck.resetMs / 1000)),
          },
        },
        undefined,
        req
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password.trim() : "";
    const rememberMe = Boolean(body.rememberMe);

    if (!email || !password) {
      return jsonWithCors(
        { ok: false, error: "Email and password are required" },
        { status: 400 },
        undefined,
        req
      );
    }

    const ttl = rememberMe ? SESSION_REMEMBER_TTL_MS : SESSION_STANDARD_TTL_MS;
    const now = Date.now();
    const expiresAt = now + ttl;
    const token = crypto.randomUUID();

    const isDev = process.env.NODE_ENV !== "production";
    const devPassword = process.env.ADMIN_DEV_PASSWORD || "admin123";

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

      // Safe password comparison: strictly compare against the stored password in database
      let valid = false;
      if (user && user.password_hash) {
        // Only accept the exact stored password in database
        valid = safeCompare(user.password_hash, password);
      } else if (isDev && email === "admin@prettycorner.com" && (!user || !user.password_hash)) {
        // Fallback only if no user or password hash exists yet in local development
        valid = safeCompare(password, devPassword);
      }

      if (!valid || !user) {
        return jsonWithCors(
          { ok: false, error: "Invalid email or password" },
          { status: 401 },
          undefined,
          req
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

      const response = jsonWithCors({ ok: true, session }, undefined, undefined, req);
      // Set HttpOnly cookie for server/SSR protection
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: Math.floor(ttl / 1000),
      });

      return response;
    }

    // Fallback mode (mock / local dev without Supabase credentials)
    const isMockValid =
      email === "admin@prettycorner.com" &&
      safeCompare(password, devPassword);

    if (!isMockValid) {
      return jsonWithCors(
        { ok: false, error: "Invalid email or password" },
        { status: 401 },
        undefined,
        req
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

    const response = jsonWithCors({ ok: true, session }, undefined, undefined, req);
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(ttl / 1000),
    });

    return response;
  } catch (error) {
    console.error("POST /api/admin/login error:", error);
    return jsonWithCors({ ok: false, error: "Authentication failed" }, { status: 500 }, undefined, req);
  }
}
