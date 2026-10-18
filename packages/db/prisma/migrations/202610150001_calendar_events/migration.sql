CREATE TABLE "calendar_events" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL,
  "event_type" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "start_date" text NOT NULL,
  "end_date" text NOT NULL,
  "start_time" text,
  "end_time" text,
  "all_day" integer DEFAULT 0 NOT NULL,
  "location" text,
  "meeting_url" text,
  "audience" text NOT NULL,
  "class_id" text,
  "created_by" text NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  CONSTRAINT "calendar_events_type_check" CHECK ("event_type" IN ('ACADEMIC','HOLIDAY','DEADLINE','APPOINTMENT')),
  CONSTRAINT "calendar_events_audience_check" CHECK ("audience" IN ('UNIVERSITY','CLASS')),
  CONSTRAINT "calendar_events_date_order" CHECK ("end_date">="start_date"),
  CONSTRAINT "calendar_events_time_pair" CHECK (("start_time" IS NULL AND "end_time" IS NULL) OR ("start_time" IS NOT NULL AND "end_time" IS NOT NULL)),
  CONSTRAINT "calendar_events_all_day" CHECK ("all_day" IN (0,1)),
  CONSTRAINT "calendar_events_status_check" CHECK ("status" IN ('ACTIVE','CANCELLED'))
);

CREATE INDEX "calendar_events_tenant_start" ON "calendar_events" ("tenant_id","start_date");
CREATE INDEX "calendar_events_class_start" ON "calendar_events" ("tenant_id","class_id","start_date");
