CREATE TABLE "student_profiles" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "student_number" TEXT NOT NULL,
  "year_level" INTEGER NOT NULL CHECK (year_level BETWEEN 1 AND 6),
  UNIQUE (tenant_id,user_id),
  UNIQUE (tenant_id,student_number)
);

CREATE TABLE "student_verifications" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "requester_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING','CORRECTION_REQUIRED','APPROVED','REJECTED')),
  "legal_name" TEXT NOT NULL DEFAULT '',
  "student_number" TEXT NOT NULL DEFAULT '',
  "course_id" TEXT,
  "year_level" INTEGER,
  "class_id" TEXT,
  "approved_student_id" TEXT,
  "review_note" TEXT,
  "reviewer_id" TEXT,
  "submitted_at" TEXT,
  "reviewed_at" TEXT,
  "updated_at" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  UNIQUE (tenant_id,requester_id),
  UNIQUE (tenant_id,approved_student_id)
);
CREATE INDEX student_verification_queue ON student_verifications (tenant_id,class_id,status,submitted_at);
