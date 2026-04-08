-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_link_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "stripeProductId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "interval" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notes" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "streamType" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'app',
    "actorId" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_checkpoints" (
    "id" TEXT NOT NULL,
    "streamType" TEXT NOT NULL,
    "eventSeqHigh" INTEGER NOT NULL,
    "state" JSONB NOT NULL,

    CONSTRAINT "stream_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "operatingHoursStart" TEXT NOT NULL DEFAULT '07:00',
    "operatingHoursEnd" TEXT NOT NULL DEFAULT '22:00',
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 7,
    "maxBookingsPerMemberPerDay" INTEGER NOT NULL DEFAULT 2,
    "cancellationDeadlineMinutes" INTEGER NOT NULL DEFAULT 60,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "operatingHoursStart" TEXT NOT NULL DEFAULT '07:00',
    "operatingHoursEnd" TEXT NOT NULL DEFAULT '22:00',
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 3,
    "maxBookingsPerMemberPerDay" INTEGER NOT NULL DEFAULT 1,
    "cancellationDeadlineMinutes" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "showers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "facilityType" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "details" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "club_event_courts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_event_courts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "magic_link_tokens_tokenHash_key" ON "magic_link_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "magic_link_tokens_email_idx" ON "magic_link_tokens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_userId_key" ON "members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_stripeCustomerId_key" ON "members"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_stripePriceId_key" ON "membership_plans"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_memberId_key" ON "memberships"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_stripeSubscriptionId_key" ON "memberships"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "admin_notes_memberId_idx" ON "admin_notes"("memberId");

-- CreateIndex
CREATE INDEX "events_streamType_streamId_seq_idx" ON "events"("streamType", "streamId", "seq");

-- CreateIndex
CREATE INDEX "events_streamType_seq_idx" ON "events"("streamType", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "events_seq_key" ON "events"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "stream_checkpoints_streamType_key" ON "stream_checkpoints"("streamType");

-- CreateIndex
CREATE INDEX "bookings_facilityType_facilityId_date_status_idx" ON "bookings"("facilityType", "facilityId", "date", "status");

-- CreateIndex
CREATE INDEX "bookings_memberId_date_idx" ON "bookings"("memberId", "date");

-- CreateIndex
CREATE INDEX "club_events_active_startsAt_idx" ON "club_events"("active", "startsAt");

-- CreateIndex
CREATE INDEX "club_events_startsAt_idx" ON "club_events"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "managed_media_assets_publicPath_key" ON "managed_media_assets"("publicPath");

-- CreateIndex
CREATE INDEX "managed_media_assets_usage_status_createdAt_idx" ON "managed_media_assets"("usage", "status", "createdAt");

-- CreateIndex
CREATE INDEX "managed_media_assets_ownerType_ownerId_idx" ON "managed_media_assets"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "club_event_courts_courtId_idx" ON "club_event_courts"("courtId");

-- CreateIndex
CREATE UNIQUE INDEX "club_event_courts_eventId_courtId_key" ON "club_event_courts"("eventId", "courtId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_event_courts" ADD CONSTRAINT "club_event_courts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "club_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_event_courts" ADD CONSTRAINT "club_event_courts_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Seed initial admin
INSERT INTO "users" ("id", "email", "name", "role", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'johnny@seventyhospitality.com', 'Johnny', 'admin', NOW(), NOW());
