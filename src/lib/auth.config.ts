import type { NextAuthConfig } from "next-auth";

const SESSION_MAX_AGE_HOURS = Number(process.env.ADMIN_SESSION_MAX_AGE_HOURS ?? 4);
const IDLE_TIMEOUT_MINUTES = Number(process.env.ADMIN_IDLE_TIMEOUT_MINUTES ?? 20);

/**
 * Edge Runtime（middleware）でも読み込める設定。
 * Credentials provider（bcrypt/Prisma等Node依存）だけは src/auth.ts 側で追加する。
 * jwt/session callbackはNode APIに依存しないため、ここに置いてmiddlewareでも
 * 同じアイドルタイムアウト判定が効くようにする。
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_HOURS * 60 * 60,
  },
  // 本番（HTTPS）では __Secure- プレフィックス + Secure属性を付与。
  // ローカルHTTP開発では Secure を外さないとブラウザがCookieを保存できないため、
  // NODE_ENV=production の時だけ強制する。
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-aaw-admin-session"
          : "aaw-admin-session",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user) && !auth?.expired;
      const isOnLogin = request.nextUrl.pathname.startsWith("/login");
      if (isOnLogin) {
        return true;
      }
      return isLoggedIn;
    },
    async jwt({ token, user }) {
      const idleTimeoutMs = IDLE_TIMEOUT_MINUTES * 60 * 1000;
      const now = Date.now();

      if (user) {
        token.administratorId = user.id;
        token.role = (user as { role?: string }).role;
        token.lastActivity = now;
        token.expired = false;
        return token;
      }

      const lastActivity = typeof token.lastActivity === "number" ? token.lastActivity : now;
      if (now - lastActivity > idleTimeoutMs) {
        // アイドルタイムアウト: 再認証が必要な状態としてフラグを立てる。
        return { ...token, expired: true };
      }
      token.lastActivity = now;
      token.expired = false;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.administratorId as string) ?? "";
        (session.user as { role?: string }).role = token.role as string | undefined;
      }
      session.expired = token.expired as boolean | undefined;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
