-- CreateTable
CREATE TABLE "profile_read_log" (
    "id" UUID NOT NULL,
    "viewer_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_read_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_read_log_target_user_id_viewed_at_idx" ON "profile_read_log"("target_user_id", "viewed_at" DESC);

-- CreateIndex
CREATE INDEX "profile_read_log_viewer_id_viewed_at_idx" ON "profile_read_log"("viewer_id", "viewed_at" DESC);

-- CreateIndex
CREATE INDEX "profile_read_log_action_viewed_at_idx" ON "profile_read_log"("action", "viewed_at" DESC);
