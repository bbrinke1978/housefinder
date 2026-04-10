"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ArrowLeft, Mail } from "lucide-react";
import { requestPasswordReset } from "@/lib/password-reset-actions";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await requestPasswordReset(formData);
    setSubmitted(true);
    setLoading(false);
  }

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
            {submitted ? (
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-xl font-display font-bold text-foreground mb-2">
                  Check your email
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  If an account exists with that email, we sent a password reset link. It expires in 1 hour.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-display font-bold tracking-tight text-foreground">
                    Reset password
                  </h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Enter your email and we&apos;ll send you a reset link
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@no-bshomes.com"
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
                        Sending...
                      </span>
                    ) : (
                      "Send reset link"
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
