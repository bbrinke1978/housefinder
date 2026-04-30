"use server";

/**
 * admin-actions.ts — Owner-only server actions for user management.
 *
 * Every action verifies user.manage permission before proceeding.
 * Every action is audit-logged.
 */

import { db } from "@/db/client";
import { users, passwordResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcryptjs from "bcryptjs";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { userCan } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { logAudit } from "@/lib/audit-log";
import { Resend } from "resend";

// ---- Permission guard ----

async function requireUserManage() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const roles = (session.user.roles ?? []) as Role[];
  if (!userCan(roles, "user.manage")) throw new Error("Forbidden: insufficient role");
  return { session, roles, actorUserId: session.user.id as string | null };
}

// ---- createUser ----

export async function createUser(formData: FormData): Promise<{ success: boolean; error?: string; resetUrl?: string }> {
  const { actorUserId } = await requireUserManage();

  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const name = String(formData.get("name") ?? "").trim();
  const rolesRaw = formData.getAll("roles") as string[];

  // Validate domain — must end @no-bshomes.com
  if (!email.endsWith("@no-bshomes.com")) {
    return { success: false, error: "Email must end with @no-bshomes.com" };
  }
  if (!name) {
    return { success: false, error: "Name is required" };
  }

  // Check for existing user
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return { success: false, error: "A user with that email already exists" };
  }

  // Generate temporary random password (bcrypt-hashed)
  const tempPassword = randomBytes(16).toString("hex");
  const passwordHash = await bcryptjs.hash(tempPassword, 12);

  const [inserted] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
      roles: rolesRaw.filter(Boolean),
      isActive: true,
    })
    .returning({ id: users.id });

  // Immediately generate a password-reset token so the new user sets their own password
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days for new users

  await db.insert(passwordResetTokens).values({
    userId: inserted.id,
    token,
    expiresAt,
  });

  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  // Send welcome + password-reset email if RESEND_API_KEY is set; otherwise return URL for manual sharing
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: "No BS Workbench <onboarding@resend.dev>",
        to: email,
        subject: "Welcome to No BS Workbench — set your password",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1e4d8c;">Welcome, ${name}!</h2>
            <p>Your account has been created on No BS Workbench. Click the link below to set your password and log in.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#1e4d8c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
              Set Your Password
            </a>
            <p style="color:#888;font-size:12px;">This link expires in 7 days.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[admin-actions] Failed to send welcome email:", err);
      // Non-fatal — return resetUrl for manual sharing
    }
  } else {
    console.warn("[admin-actions] RESEND_API_KEY not set — welcome email not sent for new user", email);
    console.info("[admin-actions] Reset URL:", resetUrl);
  }

  await logAudit({
    actorUserId,
    action: "user.created",
    entityType: "user",
    entityId: inserted.id,
    newValue: { email, name, roles: rolesRaw },
  });

  revalidatePath("/admin/users");
  return { success: true, resetUrl: resendApiKey ? undefined : resetUrl };
}

// ---- updateUserRoles ----

export async function updateUserRoles(
  userId: string,
  roles: string[]
): Promise<{ success: boolean; error?: string }> {
  const { actorUserId } = await requireUserManage();

  const [target] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) return { success: false, error: "User not found" };

  await db
    .update(users)
    .set({ roles: roles.filter(Boolean) })
    .where(eq(users.id, userId));

  await logAudit({
    actorUserId,
    action: "user.roles_updated",
    entityType: "user",
    entityId: userId,
    newValue: { roles },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// ---- setUserActive ----

export async function setUserActive(
  userId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const { actorUserId } = await requireUserManage();

  const [target] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) return { success: false, error: "User not found" };

  await db
    .update(users)
    .set({ isActive })
    .where(eq(users.id, userId));

  await logAudit({
    actorUserId,
    action: isActive ? "user.activated" : "user.deactivated",
    entityType: "user",
    entityId: userId,
    newValue: { isActive },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// ---- triggerUserPasswordReset ----

/**
 * Admin-triggered password reset for an existing user.
 * Generates a reset token and sends a Resend email (or returns URL if RESEND not configured).
 */
export async function triggerUserPasswordReset(
  userId: string
): Promise<{ success: boolean; error?: string; resetUrl?: string }> {
  const { actorUserId } = await requireUserManage();

  const [target] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) return { success: false, error: "User not found" };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  });

  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: "No BS Workbench <onboarding@resend.dev>",
        to: target.email,
        subject: "Your password reset link",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1e4d8c;">Password Reset</h2>
            <p>Hi ${target.name},</p>
            <p>An admin requested a password reset for your No BS Workbench account. Click below to set a new password.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#1e4d8c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
              Reset Password
            </a>
            <p style="color:#888;font-size:12px;">This link expires in 1 hour.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[admin-actions] Failed to send password reset email:", err);
    }
  } else {
    console.warn("[admin-actions] RESEND_API_KEY not set — password reset URL for", target.email, ":", resetUrl);
  }

  await logAudit({
    actorUserId,
    action: "user.password_reset_triggered",
    entityType: "user",
    entityId: userId,
    newValue: { triggeredBy: "admin" },
  });

  return { success: true, resetUrl: resendApiKey ? undefined : resetUrl };
}
