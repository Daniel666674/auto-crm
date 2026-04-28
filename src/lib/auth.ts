import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { upsertGoogleUser } from "@/db/users";

const ALLOWED_DOMAIN = "blackscale.consulting";

// Role assignments — DB value takes priority; this is the fallback for first login
const DEFAULT_ROLES: Record<string, string> = {
  "daniel.acosta@blackscale.consulting": "superadmin",
  "julian.vallejo@blackscale.consulting": "marketing",
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Force account picker so switching accounts is easy
          prompt: "select_account",
          hd: ALLOWED_DOMAIN, // Google's hosted domain hint (pre-filters the UI)
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,  // 8 hours
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return false;
      const email = user.email?.toLowerCase() ?? "";
      // Hard block — only @blackscale.consulting accounts
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) return "/login?error=domain";
      return true;
    },

    async jwt({ token, user, account }) {
      // Only runs on first sign-in (account is present)
      if (account?.provider === "google" && user?.email) {
        const email = user.email.toLowerCase();
        const defaultRole = DEFAULT_ROLES[email] ?? "sales";
        const dbUser = upsertGoogleUser(email, user.name ?? email.split("@")[0], defaultRole);
        token.id = dbUser.id;
        token.role = dbUser.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};
