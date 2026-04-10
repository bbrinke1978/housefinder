"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ArrowLeft, CheckCircle } from "lucide-react";
import { resetPassword } from "@/lib/password-reset-actions";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("token", token);

    const result = await resetPassword(formData);

    if ("error" in result) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-display font-bold text-foreground mb-2">
          Invalid reset link
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          This password reset link is missing or invalid.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">
          Password updated
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your password has been reset. You can now sign in.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 min-h-11 px-6 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all duration-200"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-display font-bold tracking-tight text-foreground">
          Set new password
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            New password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="min-h-11 rounded-xl border-sand-300 bg-background text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <p className="text-sm text-muted-foreground">
            Minimum 8 characters, at least one uppercase letter and one number.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            placeholder="Enter password again"
            className="min-h-11 rounded-xl border-sand-300 bg-background text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 min-h-11 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.97]"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Updating...
            </span>
          ) : (
            "Update password"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfbf7] p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-display font-bold tracking-wide text-foreground">
            No BS Workbench
          </span>
        </div>

        <div className="rounded-2xl border border-sand-300 bg-white overflow-hidden shadow-warm">
          <div className="h-1 w-full bg-gradient-to-r from-[#c8a96e] to-[#e4c48a]" />
          <div className="p-8">
            <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
              <ResetForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
