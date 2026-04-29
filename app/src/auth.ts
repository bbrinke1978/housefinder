import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        // Domain restriction — only @no-bshomes.com accounts may log in.
        // Returns null (same shape as "user not found") to avoid leaking whether the email exists.
        if (!email.toLowerCase().endsWith("@no-bshomes.com")) {
          return null;
        }

        // Dynamic imports to avoid bundling Node.js modules into Edge Runtime middleware
        const { db } = await import("@/db/client");
        const { users } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");
        const bcryptjs = (await import("bcryptjs")).default;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!user) return null;

        // Deactivated accounts cannot log in
        if (!user.isActive) return null;

        // Users with no roles cannot log in via Credentials
        if ((user.roles ?? []).length === 0) return null;

        const isValid = await bcryptjs.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,  // passed through to JWT callback
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      // Google provider: enforce @no-bshomes.com domain + auto-provision
      if (account?.provider === "google") {
        const email = (user.email ?? "").toLowerCase();
        if (!email.endsWith("@no-bshomes.com")) {
          return false; // reject — domain restriction (belt-and-suspenders alongside Internal audience)
        }

        // Dynamic imports to avoid bundling Node.js modules into Edge Runtime middleware
        const { db } = await import("@/db/client");
        const { users } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");

        const [existing] = await db
          .select({ id: users.id, isActive: users.isActive })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!existing) {
          // Auto-provision: insert new user with empty roles. Brian assigns
          // roles via /admin/users; until then, the user lands on /pending-approval.
          await db.insert(users).values({
            email,
            name: user.name ?? email.split("@")[0],
            passwordHash: "", // never used — Google login bypasses bcrypt
            roles: [],
            isActive: true,
          });
        } else if (!existing.isActive) {
          return false; // deactivated user — block re-entry via Google too
        }
      }
      // Credentials provider: always return true (authorize() already handles rejection)
      return true;
    },
    async jwt({ token, user, account }) {
      // On initial sign-in (any provider), load fresh user data from DB so
      // the JWT carries the latest roles + id even after auto-provisioning.
      if (user || account?.provider === "google") {
        const email = (token.email ?? (user as { email?: string } | undefined)?.email ?? "").toLowerCase();
        if (email) {
          const { db } = await import("@/db/client");
          const { users } = await import("@/db/schema");
          const { eq } = await import("drizzle-orm");
          const [row] = await db
            .select({ id: users.id, roles: users.roles })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          if (row) {
            token.userId = row.id;
            token.roles = row.roles ?? [];
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Existing logic — unchanged
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string;
        (session.user as { roles?: string[] }).roles = (token.roles as string[]) ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
