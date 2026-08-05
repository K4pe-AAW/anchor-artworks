import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next.js 16: middleware.ts は非推奨となり proxy.ts に名称変更された。
// Next.jsのビルド時静的解析は単純な識別子のexportしか認識しないため、
// `export const { auth: proxy } = ...` のような分割代入exportにはしないこと。
const nextAuth = NextAuth(authConfig);
export const proxy = nextAuth.auth;

export const config = {
  // ページはログイン画面へリダイレクトして保護する。
  // /api 配下は各Route Handlerが自前でセッション確認し401 JSONを返すため対象外とする
  // （未認証のAPI呼び出しをHTMLログイン画面へリダイレクトしてしまうのを避けるため）。
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
