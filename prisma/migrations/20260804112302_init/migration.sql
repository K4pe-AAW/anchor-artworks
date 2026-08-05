-- CreateEnum
CREATE TYPE "AdministratorRole" AS ENUM ('OWNER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('OPERATIONAL', 'DEGRADED', 'DOWN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "IntegrationKind" AS ENUM ('STRIPE', 'PAYPAL', 'SMTP', 'INTERNAL_API');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('OK', 'WARNING', 'ERROR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL');

-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('CRITICAL', 'MARKETING');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELED', 'FAILED');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "JobRunStatus" AS ENUM ('SUCCESS', 'FAILURE', 'RUNNING');

-- CreateTable
CREATE TABLE "administrators" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "totp_secret_encrypted" TEXT,
    "mfa_enabled_at" TIMESTAMP(3),
    "role" "AdministratorRole" NOT NULL DEFAULT 'OPERATOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "administrators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "administrator_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "succeeded" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" TEXT,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "administrator_id" TEXT,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "last_synced_at" TIMESTAMP(3),
    "last_sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_integrations" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "kind" "IntegrationKind" NOT NULL,
    "is_configured" BOOLEAN NOT NULL DEFAULT false,
    "masked_value_hint" TEXT,
    "last_checked_at" TIMESTAMP(3),
    "last_status" "IntegrationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_user_snapshots" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "external_user_id" TEXT NOT NULL,
    "email_masked" TEXT NOT NULL,
    "current_plan" TEXT NOT NULL,
    "contract_status" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3),
    "last_active_at" TIMESTAMP(3),
    "current_month_usage" DOUBLE PRECISION,
    "payment_provider" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_user_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_snapshots" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "service_user_snapshot_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payment_provider" TEXT NOT NULL,
    "current_period_end" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "external_payment_id" TEXT NOT NULL,
    "email_masked" TEXT NOT NULL,
    "plan" TEXT,
    "gross_amount" INTEGER NOT NULL,
    "fee_amount" INTEGER NOT NULL DEFAULT 0,
    "refund_amount" INTEGER NOT NULL DEFAULT 0,
    "net_amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "raw_response" JSONB NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_snapshots" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "provider" "PaymentProvider",
    "gross_revenue" INTEGER NOT NULL,
    "fee_total" INTEGER NOT NULL,
    "refund_total" INTEGER NOT NULL,
    "net_revenue" INTEGER NOT NULL,
    "mrr" INTEGER,
    "new_contracts" INTEGER NOT NULL DEFAULT 0,
    "canceled_contracts" INTEGER NOT NULL DEFAULT 0,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_error" TEXT,

    CONSTRAINT "revenue_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "duplicated_from_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_audiences" (
    "id" TEXT NOT NULL,
    "announcement_id" TEXT NOT NULL,
    "service_id" TEXT,
    "plan_filter" TEXT,
    "status_filter" TEXT,
    "registered_since" TIMESTAMP(3),
    "registered_until" TIMESTAMP(3),
    "target_all_users" BOOLEAN NOT NULL DEFAULT false,
    "individual_external_user_ids" JSONB,

    CONSTRAINT "announcement_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_consents" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "external_user_id" TEXT NOT NULL,
    "email_masked" TEXT NOT NULL,
    "consented" BOOLEAN NOT NULL,
    "consented_at" TIMESTAMP(3),
    "consent_source" TEXT,
    "unsubscribed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "announcement_id" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "target_count" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "failure_summary" TEXT,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "last_received_at" TIMESTAMP(3),
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "last_failure_at" TIMESTAMP(3),
    "last_failure_reason" TEXT,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "status" "JobRunStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "detail" TEXT,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "administrator_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "detail" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "administrators_email_key" ON "administrators"("email");

-- CreateIndex
CREATE INDEX "admin_sessions_administrator_id_revoked_at_idx" ON "admin_sessions"("administrator_id", "revoked_at");

-- CreateIndex
CREATE INDEX "login_attempts_email_attempted_at_idx" ON "login_attempts"("email", "attempted_at");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "service_integrations_service_id_kind_key" ON "service_integrations"("service_id", "kind");

-- CreateIndex
CREATE INDEX "service_user_snapshots_service_id_contract_status_idx" ON "service_user_snapshots"("service_id", "contract_status");

-- CreateIndex
CREATE UNIQUE INDEX "service_user_snapshots_service_id_external_user_id_key" ON "service_user_snapshots"("service_id", "external_user_id");

-- CreateIndex
CREATE INDEX "subscription_snapshots_service_id_status_idx" ON "subscription_snapshots"("service_id", "status");

-- CreateIndex
CREATE INDEX "payment_transactions_service_id_occurred_at_idx" ON "payment_transactions"("service_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_external_payment_id_key" ON "payment_transactions"("provider", "external_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_snapshots_service_id_period_key_provider_key" ON "revenue_snapshots"("service_id", "period_key", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "notification_consents_service_id_external_user_id_key" ON "notification_consents"("service_id", "external_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_service_id_provider_key" ON "webhook_events"("service_id", "provider");

-- CreateIndex
CREATE INDEX "job_runs_service_id_job_name_started_at_idx" ON "job_runs"("service_id", "job_name", "started_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_administrator_id_created_at_idx" ON "admin_audit_logs"("administrator_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_target_type_target_id_idx" ON "admin_audit_logs"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_administrator_id_fkey" FOREIGN KEY ("administrator_id") REFERENCES "administrators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_administrator_id_fkey" FOREIGN KEY ("administrator_id") REFERENCES "administrators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_integrations" ADD CONSTRAINT "service_integrations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_user_snapshots" ADD CONSTRAINT "service_user_snapshots_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_snapshots" ADD CONSTRAINT "subscription_snapshots_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_snapshots" ADD CONSTRAINT "subscription_snapshots_service_user_snapshot_id_fkey" FOREIGN KEY ("service_user_snapshot_id") REFERENCES "service_user_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_snapshots" ADD CONSTRAINT "revenue_snapshots_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "administrators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_audiences" ADD CONSTRAINT "announcement_audiences_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_audiences" ADD CONSTRAINT "announcement_audiences_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_consents" ADD CONSTRAINT "notification_consents_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_administrator_id_fkey" FOREIGN KEY ("administrator_id") REFERENCES "administrators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
