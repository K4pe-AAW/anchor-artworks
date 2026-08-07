<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Anchor Art Works Admin — AGENTS.md

Anchor Art Worksが運営する複数サービス（PDC Cleaner等）を横断管理する、
運営者専用の社内管理システム。**一般公開はしない**。

このファイルはコーディングエージェント向けのプロジェクト文脈。作業前に必ず読むこと。
ユーザーとは日本語でやり取りする。UI文言・コミットメッセージ・ドキュメントは日本語。

---

## 重要な前提

- **PDC Cleaner本体（別リポジトリ）とは完全に独立したプロジェクト**。PDC Cleaner側のリポジトリへこの管理サイトのコードを追加しない。
- PDC Cleanerのユーザー・契約DBへ直接接続しない。連携は第3段階で署名付き内部APIを新設して行う（未実装）。
- 一般的なCRM・営業管理・案件管理・カレンダー・タスク管理は範囲外。運営に直接必要な機能のみ実装する。
- 実装は段階的（第1〜4段階）。詳細は `README.md` の「実装段階」を参照。現在は **第1段階** 完了時点。

## セットアップ & 実行

```bash
npm install
cp .env.example .env   # AUTH_SECRET / ADMIN_TOTP_ENCRYPTION_KEY は openssl rand -base64 32 で生成して設定
```

DBは本番ではDocker Compose（`compose.yaml`）のPostgresを使う。Dockerが無い環境でとりあえず
動かす場合は `npx prisma dev` でローカルPostgresを起動し、表示された接続文字列に
`&pgbouncer=true` を付けて `DATABASE_URL` に設定する（prepared statementの衝突を避けるため必須）。

```bash
npx prisma migrate dev   # 初回マイグレーション
DEV_SEED_ADMIN_PASSWORD="任意の開発用パスワード" npm run db:seed
npm run dev
```

シード実行時、コンソールに開発用ログイン情報（メール・パスワード・TOTPシークレット・otpauth URL）が
出力される。このシード内容は**開発専用のダミーデータ**であり、本番の個人情報を含まない。

### ローカル開発時の既知の注意点

- `npx prisma dev` は軽量な開発用Postgresプロキシで、同時接続数の上限が実質10前後しかない。
  `DATABASE_URL` の `connection_limit` は必ず5程度に抑えること（未指定だとPrisma Clientの
  デフォルトプールサイズがCPUコア数依存で10を超え、`Can't reach database server` が頻発する）。
  それでも `Can't reach database server` が出た場合は `./node_modules/.bin/prisma dev stop <name> && ./node_modules/.bin/prisma dev -d --name <name>` で
  再起動すれば復旧することが多い（`npx prisma` は別バージョンのインストール確認プロンプトで
  無言のまま固まることがあるため、`npx` ではなくローカルの実行ファイルを直接呼ぶこと）。
  本番はDocker Composeの実Postgresを使うため、この問題は発生しない。
- Next.js 16では `middleware.ts` が `proxy.ts` に名称変更されている。ファイル名・エクスポート名を
  `middleware` に戻さないこと（`proxy` という名前でエクスポートする）。

## ディレクトリ構成

```
aaw-admin/
├── prisma/
│   ├── schema.prisma      # 全テーブル定義（管理者・サービス・売上・お知らせ・監査ログ等）
│   └── seed.ts            # 開発用ダミーデータ投入（本番の個人情報は含まない）
├── src/
│   ├── app/
│   │   ├── login/                     # ログイン（メール+パスワード→TOTP の2段階）
│   │   ├── (dashboard)/               # 認証必須の管理画面（サイドバー・ヘッダー付き共通レイアウト）
│   │   │   ├── page.tsx               # 概要
│   │   │   ├── revenue/               # 売上
│   │   │   ├── services/              # サービス一覧・詳細
│   │   │   ├── users/                 # 利用者・契約 一覧・詳細
│   │   │   ├── announcements/         # お知らせ（作成・配信は第4段階で実装予定）
│   │   │   ├── deliveries/            # 配信履歴
│   │   │   ├── system/                # システム状態
│   │   │   └── settings/              # 設定（監査ログは独立メニューにせずここのタブに配置）
│   │   └── api/
│   │       ├── auth/[...nextauth]/    # Auth.js ハンドラ
│   │       ├── export/revenue/        # 売上CSV出力（要ログイン・監査ログ記録）
│   │       └── health/                # ヘルスチェック（Docker/Caddy用、認証不要）
│   ├── auth.ts                        # Auth.js本体（Credentials provider、Node依存）
│   ├── proxy.ts                       # ルート保護（Next.js 16のmiddleware後継）。/api配下は対象外
│   ├── lib/
│   │   ├── auth.config.ts             # Edge/Node共通のcallbacks（jwt/session/authorized）
│   │   ├── env.ts                     # 起動時の必須環境変数チェック（不足時はアプリを起動させない）
│   │   ├── totp.ts / password.ts      # MFA・パスワードのハッシュ/暗号化ヘルパー
│   │   ├── login-rate-limit.ts        # ログイン試行制限
│   │   ├── audit.ts                   # 監査ログ記録ヘルパー（追記専用）
│   │   └── db.ts                      # Prisma Clientシングルトン
│   └── server/                        # 画面ごとのデータ取得ロジック（Prisma問い合わせ）
├── compose.yaml / Dockerfile / Caddyfile
└── .env.example
```

## 認証・セキュリティ実装メモ

- **管理者テーブル（`administrators`）自体が許可リスト**。ここに存在し`isActive`かつMFA設定済みの
  アカウントのみログイン可能。MFA未設定のアカウントは`authorize()`内で拒否する（`src/auth.ts`）。
- TOTPシークレットは`ADMIN_TOTP_ENCRYPTION_KEY`でAES-256-GCM暗号化してDB保存。画面へ平文再表示しない。
- セッションはJWT戦略、Cookieは本番のみ`__Secure-`プレフィックス+Secure、常にhttpOnly+SameSite=strict。
- アイドルタイムアウトは`lib/auth.config.ts`のjwt callbackで判定（`ADMIN_IDLE_TIMEOUT_MINUTES`）。
- ログイン試行制限は`login_attempts`テーブルベース（`ADMIN_LOGIN_MAX_ATTEMPTS`/`ADMIN_LOGIN_LOCKOUT_MINUTES`）。
- **`/api/export/revenue`のような認証必須APIは、proxyのリダイレクトに頼らず、必ず自分自身で
  `await auth()`を呼び未認証なら401を返すこと**（`proxy.ts`のmatcherは`/api`配下を除外しているため、
  ページとAPIそれぞれで保護方式が異なる点に注意）。
- 監査ログ（`admin_audit_logs`）は追記専用。更新・削除用の関数は意図的に用意していない。
  本番DBでは`prisma/production-hardening.sql`を1回実行し、最小権限ロール`aaw_admin_app`を作成した上で
  UPDATE/DELETE権限を剥奪すること。実行後は本番の`DATABASE_URL`をこのロール経由の接続文字列に切り替える
  （マイグレーション自体は引き続き管理者権限で実行する）。

## データモデルの設計判断

- 決済の原本データ（`payment_transactions.raw_response`）と管理サイト用の共通正規化フィールドを分離。
  原本は無加工で保存し、改変しない。
- `revenue_snapshots`は`provider`がnullの行を「全決済会社合算」として扱う設計（第2段階の実データ同期でも
  この形を踏襲すること）。
- PDC Cleaner等の外部サービスのデータは`service_user_snapshots`/`subscription_snapshots`へ
  読み取り専用でミラーする想定（第3段階）。管理サイトから外部サービスのDBへ直接書き込む設計にしない。

## V1（第1段階）でやらないこと

- Stripe/PayPal実データ同期、PDC Cleanerとの内部API連携（第2・3段階）
- お知らせの作成・配信・予約・同意管理（第4段階）
- 一般的なCRM機能（案件・タスク・カレンダー・営業メモ）
- 管理者アカウントのUIからの追加・削除（現状はDB直接操作のみ）
