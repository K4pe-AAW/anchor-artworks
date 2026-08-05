-- 本番環境専用: 最小権限のアプリケーション用DBロールを作成し、
-- admin_audit_logs への UPDATE / DELETE をアプリから物理的に不可能にする。
--
-- 実行方法:
--   1. パスワードを実際の値に置き換える
--   2. 本番DBの管理者権限（Postgresスーパーユーザー等）で1回だけ実行する
--      psql "$ADMIN_DATABASE_URL" -f prisma/production-hardening.sql
--   3. 本番の DATABASE_URL を、このロールを使う接続文字列に切り替える
--      （マイグレーション自体は引き続き管理者権限で実行し、アプリ実行時のみこのロールを使うこと）
--
-- ローカル開発（prisma dev / Docker）では実行不要。

CREATE ROLE aaw_admin_app WITH LOGIN PASSWORD 'CHANGE_ME_BEFORE_RUNNING';

GRANT USAGE ON SCHEMA public TO aaw_admin_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aaw_admin_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO aaw_admin_app;

-- 通常テーブルはPrisma Client経由のCRUDに必要な権限を一通り許可する。
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aaw_admin_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aaw_admin_app;

-- 監査ログだけは追記専用にする。UPDATE/DELETEを剥奪することで、
-- アプリのバグや侵害があっても記録の改ざん・削除自体ができない構造にする。
REVOKE UPDATE, DELETE ON admin_audit_logs FROM aaw_admin_app;
GRANT SELECT, INSERT ON admin_audit_logs TO aaw_admin_app;
