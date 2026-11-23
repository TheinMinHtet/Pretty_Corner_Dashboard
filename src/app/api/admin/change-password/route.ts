import { NextRequest } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { corsPreflightResponse, jsonWithCors } from "@/lib/dev-store/http";
import { verifyStaffSession } from "@/lib/security/auth-guard";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";
import { z } from "zod";
import crypto from "node:crypto";

export async function OPTIONS(req: NextRequest) {
  return corsPreflightResponse(req);
}

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /[0-9!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\/]/,
        "Password must contain at least one number or symbol"
      ),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify staff session
    const staff = await verifyStaffSession(req);
    if (!staff) {
      return jsonWithCors(
        { ok: false, error: "Unauthorized: Active staff session required" },
        { status: 401 },
        undefined,
        req
      );
    }

    // 2. Rate limit (max 5 attempts per 10 minutes per IP)
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`change-pass:${clientIp}`, {
      windowMs: 10 * 60 * 1000,
      maxRequests: 5,
    });

    if (!rateCheck.success) {
      return jsonWithCors(
        {
          ok: false,
          error: "Too many password change attempts. Please wait 10 minutes.",
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

    // 3. Validate request payload
    const body = await req.json().catch(() => ({}));
    const parseResult = ChangePasswordSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Validation failed";
      return jsonWithCors(
        { ok: false, error: firstError },
        { status: 400 },
        undefined,
        req
      );
    }

    const { currentPassword, newPassword } = parseResult.data;
    const isDev = process.env.NODE_ENV !== "production";
    const devPassword = process.env.ADMIN_DEV_PASSWORD || "admin123";

    // 4. Update in Supabase if configured
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();

      // Robust account lookup: match by UUID if valid, or fall back to email
      const isUuid =
        typeof staff.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          staff.id
        );

      let query = supabase
        .from("admin_users")
        .select("id, email, password_hash");

      if (isUuid) {
        query = query.eq("id", staff.id);
      } else if (staff.email) {
        query = query.eq("email", staff.email.toLowerCase());
      } else {
        query = query.eq("id", staff.id);
      }

      const { data: user, error: fetchError } = await query.maybeSingle();

      if (fetchError || !user) {
        console.error("Staff account lookup failed:", fetchError);
        return jsonWithCors(
          { ok: false, error: "Administrator account not found" },
          { status: 404 },
          undefined,
          req
        );
      }

      // Verify current password strictly against stored password in database
      let matches = safeCompare(user.password_hash || "", currentPassword);
      if (!matches && !user.password_hash && isDev) {
        matches = safeCompare(currentPassword, devPassword);
      }

      if (!matches) {
        return jsonWithCors(
          { ok: false, error: "Current password is incorrect" },
          { status: 400 },
          undefined,
          req
        );
      }

      // Update password in database
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("admin_users")
        .update({
          password_hash: newPassword,
          updated_at: now,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to update admin password in Supabase:", updateError);
        return jsonWithCors(
          {
            ok: false,
            error: updateError.message || "Failed to update password in database",
          },
          { status: 500 },
          undefined,
          req
        );
      }

      // Log audit trail (isolated error boundary so audit failure never fails the password change)
      try {
        await supabase.from("activity_logs").insert({
          id: crypto.randomUUID(),
          action: "Password Changed",
          detail: `Administrator credentials successfully updated for ${user.email}`,
          actor: staff.name || user.email,
          category: "settings",
          metadata: { email: user.email },
          created_at: now,
        });
      } catch (logErr) {
        console.warn("Failed to write password change to activity_logs:", logErr);
      }

      return jsonWithCors(
        { ok: true, message: "Password updated successfully" },
        undefined,
        undefined,
        req
      );
    }

    // 5. Fallback mode (local mock dev)
    const matchesDev = safeCompare(currentPassword, devPassword);
    if (!matchesDev) {
      return jsonWithCors(
        { ok: false, error: "Current password is incorrect" },
        { status: 400 },
        undefined,
        req
      );
    }

    return jsonWithCors(
      { ok: true, message: "Password updated successfully" },
      undefined,
      undefined,
      req
    );
  } catch (error) {
    console.error("POST /api/admin/change-password error:", error);
    return jsonWithCors(
      { ok: false, error: "Internal server error occurred while updating password" },
      { status: 500 },
      undefined,
      req
    );
  }
}
