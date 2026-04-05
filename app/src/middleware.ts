export { auth as middleware } from "@/auth";

export const config = {
  // Exclude: api/auth (NextAuth), login page, /sign/* (public signing links),
  // Next.js internals, and static files.
  matcher: ["/((?!api/auth|login|sign|_next/static|_next/image|favicon.ico).*)"],
};
