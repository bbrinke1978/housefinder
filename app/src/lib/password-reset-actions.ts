"use server";

import { db } from "@/db/client";
import { users, passwordResetTokens } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcryptjs from "bcryptjs";
import { Resend } from "resend";

export async function requestPasswordReset(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email) return { error: "Email is required" };

  // Always return success to prevent email enumeration
  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) return { success: true };

  // Generate token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  // Send email
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    try {
      await resend.emails.send({
        from: "No BS Workbench <onboarding@resend.dev>",
        to: email,
        subject: "Reset your password",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1e4d8c;">Password Reset</h2>
            <p>Hi ${user.name},</p>
            <p>Click the link below to reset your password. This link expires in 1 hour.</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}" style="background: #1e4d8c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Reset Password
              </a>
            </p>
            <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Failed to send reset email:", err);
    }
  }

  return { success: true };
}

export async function resetPassword(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) return { error: "Invalid reset link" };
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters" };
  if (password !== confirmPassword) return { error: "Passwords do not match" };

  // Find valid token
  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!resetToken) return { error: "This reset link has expired or is invalid" };

  // Hash new password and update user
  const passwordHash = await bcryptjs.hash(password, 10);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, resetToken.userId));

  // Mark token as used
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetToken.id));

  return { success: true };
}
