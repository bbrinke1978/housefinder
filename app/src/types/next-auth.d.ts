// NextAuth module augmentation for the v1.4 RBAC fields.
//
// Extends the default Session.user and JWT types so server actions can
// reference `session.user.roles` and `session.user.id` without `as any`
// casts. Phase 29 wired the data through the auth callbacks; this file
// teaches TypeScript about the shape.
//
// File loaded automatically because tsconfig.json includes "src/**/*.ts"
// and the file ends in .d.ts. No imports needed at the call site.

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    roles?: string[];
  }
}
