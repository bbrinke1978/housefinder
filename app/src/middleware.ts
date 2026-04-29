import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    // Not authenticated — let the existing public-route logic handle it
    // (NextAuth will redirect unauthenticated requests to /login per `pages.signIn`)
    return NextResponse.next();
  }

  const roles = ((session.user as { roles?: string[] }).roles) ?? [];
  const path = req.nextUrl.pathname;

  // Allow the pending-approval page itself, auth callbacks, /login, password reset pages,
  // and static assets for empty-role users so they never get redirect-looped.
  const allowedPathsForEmptyRoles = [
    "/pending-approval",
    "/login",
    "/api",
    "/forgot-password",
    "/reset-password",
    "/sign",
    "/floor-plans",
  ];
  const isAllowed =
    allowedPathsForEmptyRoles.some((p) => path === p || path.startsWith(p + "/")) ||
    path.startsWith("/_next");

  if (roles.length === 0 && !isAllowed) {
    return NextResponse.redirect(new URL("/pending-approval", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Exclude: api/auth (NextAuth), login page, password reset pages, /sign/* (public signing links),
  // /floor-plans/* (public contractor share links), Next.js internals, and static files.
  matcher: ["/((?!api/auth|login|forgot-password|reset-password|sign|floor-plans|_next/static|_next/image|favicon.ico).*)"],
};
