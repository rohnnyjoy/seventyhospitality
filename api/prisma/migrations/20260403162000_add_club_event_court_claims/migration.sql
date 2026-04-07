-- CreateTable
CREATE TABLE "club_event_courts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_event_courts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "club_event_courts_eventId_courtId_key" ON "club_event_courts"("eventId", "courtId");

-- CreateIndex
CREATE INDEX "club_event_courts_courtId_idx" ON "club_event_courts"("courtId");

-- AddForeignKey
ALTER TABLE "club_event_courts" ADD CONSTRAINT "club_event_courts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "club_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_event_courts" ADD CONSTRAINT "club_event_courts_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
