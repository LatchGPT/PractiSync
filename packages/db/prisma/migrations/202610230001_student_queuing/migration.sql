-- Additive Student Queue feature. Existing tables and data are unchanged.
CREATE TABLE "queue_entries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "student_id" TEXT NOT NULL,
  "coordinator_id" TEXT NOT NULL,
  "service_date" TEXT NOT NULL,
  "session" TEXT NOT NULL,
  "queue_number" INTEGER NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduled_start" TEXT NOT NULL,
  "scheduled_end" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'WAITING',
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "queue_entries_student_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "queue_entries_coordinator_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "queue_entries_session_check" CHECK ("session" IN ('MORNING','AFTERNOON')),
  CONSTRAINT "queue_entries_status_check" CHECK ("status" IN ('WAITING','SERVING','SERVED','ABSENT','CANCELLED')),
  CONSTRAINT "queue_entries_time_check" CHECK ("scheduled_end" > "scheduled_start"),
  CONSTRAINT "queue_entries_number_check" CHECK ("queue_number" > 0)
);
CREATE UNIQUE INDEX "queue_entries_tenant_id_id_key" ON "queue_entries" ("tenant_id","id");
CREATE INDEX "queue_entries_coordinator_day" ON "queue_entries" ("tenant_id","coordinator_id","service_date","session","status","scheduled_start");
CREATE INDEX "queue_entries_student_day" ON "queue_entries" ("tenant_id","student_id","service_date","status");
CREATE UNIQUE INDEX "queue_entries_slot_unique" ON "queue_entries" ("tenant_id","coordinator_id","service_date","scheduled_start") WHERE "status" NOT IN ('CANCELLED','ABSENT');
CREATE UNIQUE INDEX "queue_entries_student_active_unique" ON "queue_entries" ("tenant_id","student_id","service_date") WHERE "status" IN ('WAITING','SERVING');
