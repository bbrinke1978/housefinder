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
    <div className="relative flex min-h-screen bg-[#09090b]">
      {/* Left panel — gradient hero */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-zinc-950">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-zinc-950 to-zinc-900" />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-violet-500/25">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-wide text-white">
                HouseFinder
              </span>
            </div>
          </div>

          {/* Hero text */}
          <div className="max-w-lg animate-fade-in-up stagger-2">
            <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight text-white">
              Find Distressed
              <br />
              Properties
              <br />
              <span className="text-violet-400">Before Anyone</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-zinc-400 max-w-md">
              Real-time monitoring of pre-foreclosures, tax liens, and
              distressed signals across rural Utah counties.
            </p>
          </div>

          {/* Feature pills */}
          <div className="animate-fade-in stagger-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-zinc-300">
                <Shield className="h-4 w-4 text-violet-400" />
                <span>10 Counties</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-zinc-300">
                <Zap className="h-4 w-4 text-violet-400" />
                <span>Daily Updates</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-zinc-300">
                <BarChart3 className="h-4 w-4 text-violet-400" />
                <span>Distress Scoring</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-[#09090b] p-6 lg:p-12">
        <div className="w-full max-w-sm animate-fade-in-up stagger-1">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-violet-500/25">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-wide text-white">
                HouseFinder
              </span>
            </div>
          </div>

          {/* Login card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            {/* Violet accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-violet-600 to-violet-400" />

            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Welcome back
                </h2>
                <p className="mt-1.5 text-sm text-zinc-400">
                  Sign in to your lead dashboard
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="animate-fade-in rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="min-h-11 rounded-xl border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 transition-all duration-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="min-h-11 rounded-xl border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 transition-all duration-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 min-h-11 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.97] group"
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
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-600">
            Distressed property intelligence for Utah investors
          </p>
        </div>
      </div>
    </div>
  );
}
