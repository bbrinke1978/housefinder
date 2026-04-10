export { auth as middleware } from "@/auth";

export const config = {
  // Exclude: api/auth (NextAuth), login page, password reset pages, /sign/* (public signing links),
  // /floor-plans/* (public contractor share links), Next.js internals, and static files.
  matcher: ["/((?!api/auth|login|forgot-password|reset-password|sign|floor-plans|_next/static|_next/image|favicon.ico).*)"],
};
