CREATE UNIQUE INDEX IF NOT EXISTS scope_courses_identity ON courses(id,tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS scope_placements_identity ON placements(id,tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS scope_users_identity ON users(id,tenant_id);

CREATE TABLE weekly_question_grants (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 course_id TEXT NOT NULL, coordinator_id TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
 UNIQUE(tenant_id,course_id,coordinator_id),
 FOREIGN KEY(course_id,tenant_id) REFERENCES courses(id,tenant_id),
 FOREIGN KEY(coordinator_id,tenant_id) REFERENCES users(id,tenant_id)
);
CREATE TABLE weekly_question_sets (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 course_id TEXT NOT NULL, effective_week TEXT NOT NULL, questions_json TEXT NOT NULL, author_id TEXT NOT NULL,
 FOREIGN KEY(author_id,tenant_id) REFERENCES users(id,tenant_id)
);
CREATE INDEX weekly_question_set_lookup ON weekly_question_sets(tenant_id,course_id,effective_week,created_at);
CREATE TABLE weekly_course_periods (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 course_id TEXT NOT NULL, week TEXT NOT NULL, questions_json TEXT NOT NULL,
 general_set_id TEXT NOT NULL REFERENCES weekly_question_sets(id), course_set_id TEXT NOT NULL REFERENCES weekly_question_sets(id),
 UNIQUE(tenant_id,course_id,week), FOREIGN KEY(course_id,tenant_id) REFERENCES courses(id,tenant_id)
);
CREATE TABLE weekly_reports (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 placement_id TEXT NOT NULL, week TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('DRAFT','SUBMITTED','EXCUSED')),
 content_json TEXT NOT NULL, answers_json TEXT NOT NULL, period_id TEXT REFERENCES weekly_course_periods(id),
 updated_at TEXT NOT NULL, submitted_at TEXT, version INTEGER NOT NULL DEFAULT 1,
 excuse_reason TEXT, UNIQUE(tenant_id,placement_id,week), UNIQUE(id,tenant_id),
 FOREIGN KEY(placement_id,tenant_id) REFERENCES placements(id,tenant_id)
);
CREATE INDEX weekly_report_period ON weekly_reports(tenant_id,week,status);
CREATE TABLE weekly_report_images (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 report_id TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL,
 FOREIGN KEY(report_id,tenant_id) REFERENCES weekly_reports(id,tenant_id)
);
CREATE INDEX weekly_images_report ON weekly_report_images(tenant_id,report_id);
