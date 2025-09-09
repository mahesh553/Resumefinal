import { UserRole } from "@/types";
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch(
            `${process.env.BACKEND_URL || "http://localhost:3002"}/api/auth/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            }
          );

          if (!response.ok) {
            return null;
          }

          const data = await response.json();

          if (data.user && data.accessToken) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: `${data.user.firstName} ${data.user.lastName}`,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              role: data.user.role,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            };
          }

          return null;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
    // Only add OAuth providers if credentials are available
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 4 * 60 * 60, // Update session every 4 hours instead of constantly
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          accessTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        };
      }

      // Return previous token if the access token has not expired yet
      // Add 5 minute buffer to prevent edge cases
      if (Date.now() < (token.accessTokenExpires as number) - 5 * 60 * 1000) {
        return token;
      }

      // Access token has expired, try to update it
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      // If there's a token error, redirect to login by throwing an error
      if (token.error === "RefreshAccessTokenError") {
        console.log("Session cleared due to refresh token error");
        // Instead of returning null, we'll let the client handle the redirect
        session.error = "RefreshAccessTokenError";
        return session;
      }

      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as UserRole;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.accessToken = token.accessToken as string;
        // Only include error if it's not the refresh error (which should clear session)
        if (token.error && token.error !== "RefreshAccessTokenError") {
          session.error = token.error as string;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
};

async function refreshAccessToken(token: any) {
  try {
    // Add timeout and better error handling for refresh requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(
      `${process.env.BACKEND_URL || "http://localhost:3002"}/api/auth/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: token.refreshToken,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const refreshedTokens = await response.json();

    if (!response.ok) {
      // Only throw on actual auth errors, not network issues
      if (response.status === 401 || response.status === 403) {
        throw refreshedTokens;
      }
      // For network errors, return the existing token to prevent logout
      console.warn(
        "Token refresh failed due to network issue, keeping existing token"
      );
      return token;
    }

    return {
      ...token,
      accessToken: refreshedTokens.accessToken,
      accessTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      refreshToken: refreshedTokens.refreshToken ?? token.refreshToken,
      error: undefined, // Clear any previous errors
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);

    // For network timeouts or connection issues, keep the existing token
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.message?.includes("fetch"))
    ) {
      console.warn(
        "Network error during token refresh, keeping existing session"
      );
      return token;
    }

    // Only clear session for actual authentication errors
    return {
      ...token,
      error: "RefreshAccessTokenError",
      accessToken: undefined, // Clear invalid token
      refreshToken: undefined, // Clear invalid refresh token
    };
  }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
