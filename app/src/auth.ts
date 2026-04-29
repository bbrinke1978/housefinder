import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
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

        // Users with no roles cannot log in
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
    async jwt({ token, user }) {
      if (user) {
        token.roles = (user as any).roles ?? [];
        token.userId = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).roles = token.roles ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
