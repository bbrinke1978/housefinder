import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";

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

        const authEmail = process.env.AUTH_EMAIL;
        const authPasswordHash = process.env.AUTH_PASSWORD_HASH;

        if (!authEmail || !authPasswordHash) {
          console.error("AUTH_EMAIL or AUTH_PASSWORD_HASH not configured");
          return null;
        }

        if (email !== authEmail) return null;

        const isValid = await bcryptjs.compare(password, authPasswordHash);
        if (!isValid) return null;

        return {
          id: "1",
          email: authEmail,
          name: "Investor",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
});
