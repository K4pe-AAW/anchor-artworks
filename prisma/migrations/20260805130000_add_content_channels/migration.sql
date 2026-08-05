-- CreateEnum
CREATE TYPE "ContentPlatform" AS ENUM ('PODCAST_SPOTIFY', 'YOUTUBE', 'INSTAGRAM', 'TIKTOK');

-- CreateTable
CREATE TABLE "content_channels" (
    "id" TEXT NOT NULL,
    "platform" "ContentPlatform" NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "public_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_channel_snapshots" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followers" INTEGER,
    "period_views" INTEGER,
    "period_likes" INTEGER,
    "note" TEXT,
    "recorded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_channel_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_channels_platform_handle_key" ON "content_channels"("platform", "handle");

-- CreateIndex
CREATE INDEX "content_channel_snapshots_channel_id_captured_at_idx" ON "content_channel_snapshots"("channel_id", "captured_at");

-- AddForeignKey
ALTER TABLE "content_channel_snapshots" ADD CONSTRAINT "content_channel_snapshots_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "content_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_channel_snapshots" ADD CONSTRAINT "content_channel_snapshots_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "administrators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
