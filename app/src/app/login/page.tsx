"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ArrowRight, Shield, Zap, BarChart3 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="relative flex min-h-screen">
      {/* Left panel — hero with photo background */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80')`,
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-dark-950/70 via-dark-950/40 to-dark-950/80" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 shadow-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span style={{ fontFamily: "var(--font-display)" }} className="text-3xl tracking-wide">
                HOUSEFINDER
              </span>
            </div>
          </div>

          {/* Hero text */}
          <div className="max-w-lg animate-fade-in-up stagger-2">
            <h1
              style={{ fontFamily: "var(--font-display)" }}
              className="text-6xl md:text-7xl leading-[0.95] tracking-wide"
            >
              FIND DISTRESSED
              <br />
              PROPERTIES
              <br />
              <span className="text-brand-400">BEFORE ANYONE</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/70 max-w-md">
              Real-time monitoring of pre-foreclosures, tax liens, and
              distressed signals across rural Utah counties.
            </p>
          </div>

          {/* Feature pills */}
          <div className="animate-fade-in stagger-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-white/80">
                <Shield className="h-4 w-4 text-brand-400" />
                <span>10 Counties</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-white/80">
                <Zap className="h-4 w-4 text-brand-400" />
                <span>Daily Updates</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-white/80">
                <BarChart3 className="h-4 w-4 text-brand-400" />
                <span>Distress Scoring</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-warm-50 dark:bg-dark-950 p-6 lg:p-12">
        <div className="w-full max-w-sm animate-fade-in-up stagger-1">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 shadow-md">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span style={{ fontFamily: "var(--font-display)" }} className="text-3xl tracking-wide">
                HOUSEFINDER
              </span>
            </div>
          </div>

          <div className="mb-8">
            <h2
              style={{ fontFamily: "var(--font-heading)" }}
              className="text-3xl font-semibold tracking-tight text-dark-950 dark:text-dark-100"
            >
              Welcome back
            </h2>
            <p className="mt-2 text-dark-500 dark:text-dark-400">
              Sign in to your lead dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-dark-700 dark:text-dark-300">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="min-h-12 rounded-xl border-warm-300 dark:border-dark-600 bg-white dark:bg-dark-800 transition-all duration-200 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-dark-700 dark:text-dark-300">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="min-h-12 rounded-xl border-warm-300 dark:border-dark-600 bg-white dark:bg-dark-800 transition-all duration-200 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              />
            </div>
            <button
              type="submit"
              className="btn-brand group w-full flex items-center justify-center gap-2 min-h-12"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-dark-400">
            Distressed property intelligence for Utah investors
          </p>
        </div>
      </div>
    </div>
  );
}
