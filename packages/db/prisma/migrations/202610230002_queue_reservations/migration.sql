ALTER TABLE "queue_entries" ADD COLUMN "closure_reason" TEXT;

DROP INDEX IF EXISTS "queue_entries_slot_unique";
DROP INDEX IF EXISTS "queue_entries_student_active_unique";
DROP INDEX IF EXISTS "queue_entries_coordinator_day";
DROP INDEX IF EXISTS "queue_entries_student_day";

UPDATE "queue_entries" AS older
SET "status"='CANCELLED',"closure_reason"='MIGRATION_CONFLICT',"completed_at"=COALESCE("completed_at",CURRENT_TIMESTAMP),"updated_at"=CURRENT_TIMESTAMP
WHERE "status" IN ('WAITING','SERVING') AND EXISTS (
  SELECT 1 FROM "queue_entries" AS newer
  WHERE newer."tenant_id"=older."tenant_id" AND newer."student_id"=older."student_id"
    AND newer."status" IN ('WAITING','SERVING')
    AND (newer."service_date">older."service_date" OR (newer."service_date"=older."service_date" AND (newer."joined_at">older."joined_at" OR (newer."joined_at"=older."joined_at" AND newer."id">older."id"))))
);

UPDATE "queue_entries" AS duplicate
SET "status"='CANCELLED',"closure_reason"='MIGRATION_CONFLICT',"completed_at"=COALESCE("completed_at",CURRENT_TIMESTAMP),"updated_at"=CURRENT_TIMESTAMP
WHERE duplicate."status"='SERVING' AND EXISTS (
  SELECT 1 FROM "queue_entries" AS active
  WHERE active."tenant_id"=duplicate."tenant_id" AND active."status"='SERVING'
    AND (active."started_at"<duplicate."started_at" OR (active."started_at"=duplicate."started_at" AND active."id"<duplicate."id"))
);

UPDATE "queue_entries" AS duplicate
SET "status"='CANCELLED',"closure_reason"='MIGRATION_CONFLICT',"completed_at"=COALESCE("completed_at",CURRENT_TIMESTAMP),"updated_at"=CURRENT_TIMESTAMP
WHERE duplicate."status" IN ('WAITING','SERVING') AND EXISTS (
  SELECT 1 FROM "queue_entries" AS active
  WHERE active."tenant_id"=duplicate."tenant_id" AND active."service_date"=duplicate."service_date" AND active."scheduled_start"=duplicate."scheduled_start"
    AND active."status" IN ('WAITING','SERVING') AND (active."joined_at"<duplicate."joined_at" OR (active."joined_at"=duplicate."joined_at" AND active."id"<duplicate."id"))
);

CREATE INDEX "queue_entries_office_day" ON "queue_entries" ("tenant_id","service_date","status","scheduled_start");
CREATE INDEX "queue_entries_student_active" ON "queue_entries" ("tenant_id","student_id","status");
CREATE UNIQUE INDEX "queue_entries_slot_unique" ON "queue_entries" ("tenant_id","service_date","scheduled_start") WHERE "status" IN ('WAITING','SERVING');
CREATE UNIQUE INDEX "queue_entries_student_active_unique" ON "queue_entries" ("tenant_id","student_id") WHERE "status" IN ('WAITING','SERVING');
CREATE UNIQUE INDEX "queue_entries_single_serving_unique" ON "queue_entries" ("tenant_id") WHERE "status"='SERVING';

CREATE TABLE "queue_public_holidays" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "holiday_year" INTEGER NOT NULL,
  "holiday_date" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "country_code" TEXT NOT NULL,
  "synced_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "queue_public_holidays_unique" ON "queue_public_holidays" ("tenant_id","holiday_year","holiday_date","name");
CREATE INDEX "queue_public_holidays_date" ON "queue_public_holidays" ("tenant_id","holiday_date");

CREATE TABLE "queue_holiday_sync" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "holiday_year" INTEGER NOT NULL,
  "last_attempt_at" TIMESTAMP(3) NOT NULL,
  "last_synced_at" TIMESTAMP(3),
  "last_error" TEXT
);
CREATE UNIQUE INDEX "queue_holiday_sync_tenant_year_key" ON "queue_holiday_sync" ("tenant_id","holiday_year");
