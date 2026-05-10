import { eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { verifyPassword } from "./password";
import { parseEmail } from "./email";
import { limitAuthAttempt } from "../rate-limit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = parseEmail(credentials?.email);
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password || password.length > 1024) return null;
        limitAuthAttempt("login", email);

        const db = getDb();
        const [row] = await db
          .select({
            id: users.id,
            email: users.email,
            emailVerified: users.emailVerified,
            passwordHash: users.passwordHash,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!row || !(await verifyPassword(password, row.passwordHash))) return null;
        if (!row.emailVerified) throw new Error("Verify your email before signing in.");

        return {
          id: row.id,
          email: row.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        return token;
      }
      // A signed JWT outlives a deleted or wiped account. Without this check the
      // client still reports "authenticated", so /login and /register bounce to
      // /account, which the server treats as signed out and sends back to
      // /login. Throwing makes NextAuth clear the cookie and report no session.
      if (token.sub) {
        const [row] = await getDb().select({ id: users.id }).from(users).where(eq(users.id, token.sub)).limit(1);
        if (!row) throw new Error("Session user no longer exists.");
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
