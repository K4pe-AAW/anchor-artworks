-- CreateTable
CREATE TABLE "ai_insights" (
    "id" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "prompt_context" JSONB NOT NULL,
    "generated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_insights_period_key_created_at_idx" ON "ai_insights"("period_key", "created_at");

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "administrators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
