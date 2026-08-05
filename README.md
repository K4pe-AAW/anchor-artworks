# Anchor Art Works Admin

Anchor Art Worksが運営する複数サービス（PDC Cleaner等）を一元管理する、
**運営者専用**の社内管理システムです。一般公開は行いません。

現在の実装段階: **第1段階**（プロジェクト雛形・認証・共通レイアウト・ダミーデータ画面・DBマイグレーション・監査ログ基盤）。
今後の段階（Stripe/PayPal実データ同期、PDC Cleanerとの内部API連携、お知らせ配信機能）は未実装です。
詳細な設計判断・実装メモは [`AGENTS.md`](./AGENTS.md) を参照してください。

## 技術構成

- Next.js 16（App Router）+ TypeScript + Tailwind CSS 4 + shadcn/ui（Base UI）
- PostgreSQL + Prisma ORM
- Auth.js（Credentials + TOTP多要素認証、許可リストは`administrators`テーブル）
- Docker Compose + Caddy（本番想定。`admin.anchor-japan.com`）

## セットアップ（ローカル開発）

```bash
npm install
cp .env.example .env
```

`.env` に以下を設定してください（`.env`はGit管理対象外）。

- `AUTH_SECRET` / `ADMIN_TOTP_ENCRYPTION_KEY`: それぞれ `openssl rand -base64 32` で生成
- `DATABASE_URL`: PostgreSQLの接続文字列

### DBの準備

**Dockerがある場合（推奨）:**

```bash
docker compose up -d db
npx prisma migrate deploy
```

**Dockerが無い環境で試す場合:**

```bash
npx prisma dev -d --name aaw-admin-dev   # ローカルPostgresを起動し接続文字列を表示
# 表示されたURLの末尾に &pgbouncer=true を付けて DATABASE_URL に設定する
npx prisma migrate dev
```

### ダミーデータ投入と起動

```bash
DEV_SEED_ADMIN_PASSWORD="任意の開発用パスワード" npm run db:seed
npm run dev
```

シード実行後、コンソールに開発用の管理者ログイン情報（メールアドレス・パスワード・TOTPシークレット・
otpauth URL）が表示されます。TOTPシークレットは認証アプリ（Google Authenticator等）に手動入力するか、
otpauth URLをQRコード化して読み込ませてください。**この情報は開発専用です。本番では使用しないでください。**

[http://localhost:3000](http://localhost:3000) を開いてログインします。

## 主要ディレクトリ

- `prisma/schema.prisma`: 管理者・サービス・売上・利用者・お知らせ・監査ログなど全テーブル定義
- `src/auth.ts` / `src/lib/auth.config.ts`: 認証（許可リスト＋TOTP MFA＋セッション管理）
- `src/proxy.ts`: ルート保護（Next.js 16の`middleware`後継。ページはログイン画面へリダイレクト、
  APIは各Route Handlerが自前で401を返す）
- `src/lib/audit.ts`: 監査ログ記録ヘルパー（追記専用）
- `src/server/*`: 画面ごとのデータ取得ロジック
- `src/app/(dashboard)/*`: 認証必須の管理画面本体

## ナビゲーション（MVP）

概要 / 売上 / サービス / 利用者・契約 / お知らせ / 配信履歴 / システム / 設定
（監査ログは独立メニューにせず、設定画面内のタブに配置しています）

## 本番デプロイ

```bash
cp .env.example .env   # 本番用の値を設定（AUTH_SECRET等は必ず新しい値を生成）
docker compose up -d
```

- `web`: Next.jsアプリ本体（`compose.yaml`内で自動的に`migrate`サービスの完了を待つ）
- `migrate`: 起動時に`prisma migrate deploy`を実行する一度きりのジョブ
- `db`: PostgreSQL（永続ボリューム）
- `proxy`: Caddy（HTTPS自動化、セキュリティヘッダー付与）

想定ドメイン: `admin.anchor-japan.com`。PDC Cleaner本体（`pdc.anchor-japan.com`）とは
別ホスティング・別DB・別リポジトリで運用します。

## テスト・動作確認（第1段階で確認済み）

- 未認証でのページアクセスはログイン画面へリダイレクトされる
- 未認証でのAPI（例: 売上CSV出力）は401を返す
- MFA未設定のアカウントはログインできない
- 監査ログにログイン・利用者詳細閲覧・CSV出力等が記録される
- デスクトップ／375px幅で表示崩れがない、モバイルはサイドバーがドロワー化する
