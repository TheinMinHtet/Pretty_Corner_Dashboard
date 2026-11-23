import { NextRequest } from "next/server";
import { AdminSession } from "@/types/admin";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const SESSION_COOKIE_NAME = "pc_admin_session";
export const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Server-side staff session validator.
 * Accepts session token from either:
 *  1. Header: Authorization: Bearer <token>
 *  2. Cookie: pc_admin_session=<token>
 *
 * Verifies existence and expiry against Supabase admin_sessions table,
 * or against local development session rules.
 */
export async function verifyStaffSession(
  req: NextRequest
): Promise<AdminSession["user"] | null> {
  let token: string | null = null;

  // 1. Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.slice(7).trim();
  }

  // 2. Check HttpOnly cookie
  if (!token) {
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim() ?? null;
  }

  if (!token) {
    return null;
  }

  // 3. Supabase verification if configured
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabaseClient();
      const { data: session, error } = await sb
        .from("admin_sessions")
        .select("user_id, expires_at, last_active_at, admin_users(id, name, email, role, is_active)")
        .eq("token", token)
        .maybeSingle();

      if (error || !session) {
        return null;
      }

      // Supabase join typing: admin_users can be object or array
      const rawUser = session.admin_users;
      const user = Array.isArray(rawUser) ? rawUser[0] : rawUser;
      if (!user || !user.is_active) {
        return null;
      }

      const now = Date.now();
      const expiresAt = new Date(session.expires_at).getTime();
      const lastActiveAt = new Date(session.last_active_at).getTime();

      // Check hard expiry
      if (now > expiresAt) {
        return null;
      }

      // Check rolling inactivity window (2 hours)
      if (now - lastActiveAt > INACTIVITY_TIMEOUT_MS) {
        return null;
      }

      // Asynchronously update last_active_at (fire & forget, don't block response)
      sb.from("admin_sessions")
        .update({ last_active_at: new Date(now).toISOString() })
        .eq("token", token)
        .then();

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    } catch (err) {
      console.error("verifyStaffSession Supabase check error:", err);
      return null;
    }
  }

  // 4. Local dev / mock fallback:
  // Only allow mock session fallback in non-production environments when Supabase is unconfigured
  if (process.env.NODE_ENV !== "production" && token && token.trim().length >= 8) {
    return {
      id: "mock-admin-id",
      name: "Administrator",
      email: "admin@prettycorner.com",
      role: "super_admin",
    };
  }

  return null;
}
