CREATE TABLE "managed_media_assets" (
    "id" TEXT NOT NULL,
    "publicPath" TEXT NOT NULL,
    "usage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "ownerType" TEXT,
    "ownerId" TEXT,
    "attachedAt" TIMESTAMP(3),
    "discardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "managed_media_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "managed_media_assets_publicPath_key" ON "managed_media_assets"("publicPath");
CREATE INDEX "managed_media_assets_usage_status_createdAt_idx" ON "managed_media_assets"("usage", "status", "createdAt");
CREATE INDEX "managed_media_assets_ownerType_ownerId_idx" ON "managed_media_assets"("ownerType", "ownerId");
