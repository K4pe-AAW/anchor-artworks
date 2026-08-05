-- CreateTable
CREATE TABLE "issue_notifications" (
    "id" TEXT NOT NULL,
    "issues_hash" TEXT NOT NULL,
    "issues_summary" TEXT NOT NULL,
    "channels_sent" TEXT[],
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issue_notifications_issues_hash_sent_at_idx" ON "issue_notifications"("issues_hash", "sent_at");
