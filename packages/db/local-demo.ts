import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { DemoDatabase, PreparedStatement } from './demo';

type Values = (string | number | null)[];
type RowResult = Record<string, unknown>;

class LocalStatement implements PreparedStatement {
  private values: Values = [];

  constructor(private readonly sql: DatabaseSync, private readonly query: string) {}

  bind(...values: Values): PreparedStatement {
    this.values = values;
    return this;
  }

  async all<T extends RowResult = RowResult>(): Promise<{ results: T[] }> {
    return { results: this.sql.prepare(this.query).all(...this.values) as T[] };
  }

  async first<T extends RowResult = RowResult>(): Promise<T | null> {
    return (this.sql.prepare(this.query).get(...this.values) as T | undefined) ?? null;
  }

  async run(): Promise<unknown> {
    return { meta: this.sql.prepare(this.query).run(...this.values) };
  }
}

class LocalDemoDatabase implements DemoDatabase {
  constructor(private readonly sql: DatabaseSync) {}

  prepare(query: string): PreparedStatement {
    return new LocalStatement(this.sql, query);
  }

  async batch(statements: PreparedStatement[]): Promise<unknown[]> {
    this.sql.exec('BEGIN');
    try {
      const results: unknown[] = [];
      for (const statement of statements) results.push(await statement.run());
      this.sql.exec('COMMIT');
      return results;
    } catch (error) {
      this.sql.exec('ROLLBACK');
      throw error;
    }
  }
}

const sqliteGlobal = globalThis as typeof globalThis & {
  practiSyncLocalDemo?: { path: string; database: LocalDemoDatabase; schemaVersion?: number };
};

function migrate(sql: DatabaseSync) {
  const root = process.cwd();
  const read = (path: string) => readFileSync(join(root, path), 'utf8');

  sql.exec('BEGIN');
  try {
    const baseSchema = read('packages/db/prisma/migrations/202610110001_demo_runtime/migration.sql')
      .split('INSERT INTO "assessment_schedules"')[0];
    if (!baseSchema) throw new Error('The local demo schema migration is empty.');
    sql.exec(baseSchema);
    sql.exec(read('packages/db/prisma/migrations/202610110003_limited_hte_workflows/migration.sql'));
    sql.exec(read('drizzle/0007_outcome_evaluations.sql').replace(/--> statement-breakpoint/g, ''));
    sql.exec(read('drizzle/0008_industry_feedback.sql'));

    sql.exec(`
      ALTER TABLE completion_responses RENAME TO completion_responses_legacy;
      CREATE TABLE completion_responses (
        id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL, placement_id TEXT NOT NULL,
        form_type TEXT NOT NULL CHECK (form_type IN ('COE_PLACEMENT_DATA','COE_RECOMMENDATION','STUDENT_INFO_SHEET','TRAINING_AGREEMENT','PARENT_GUARDIAN_CONSENT','FINAL_SELF_ASSESSMENT','OJT_EXIT_SURVEY')),
        form_version INTEGER NOT NULL, response_json TEXT NOT NULL, submitted_at TEXT, updated_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REVISION_REQUESTED')),
        review_note TEXT, reviewer_id TEXT, reviewed_at TEXT, version INTEGER NOT NULL DEFAULT 1
      );
      INSERT INTO completion_responses (id,tenant_id,created_at,placement_id,form_type,form_version,response_json,submitted_at,updated_at,status,version)
        SELECT id,tenant_id,created_at,placement_id,form_type,form_version,response_json,submitted_at,
          COALESCE(submitted_at,'2026-10-14T00:00:00.000Z'),'SUBMITTED',version FROM completion_responses_legacy;
      DROP TABLE completion_responses_legacy;
      CREATE UNIQUE INDEX completion_response_once ON completion_responses (tenant_id,placement_id,form_type);
      CREATE INDEX completion_response_placement ON completion_responses (tenant_id,placement_id);
      CREATE INDEX completion_response_review_queue ON completion_responses (tenant_id,status,updated_at);

      CREATE TRIGGER local_scope_entry BEFORE INSERT ON entries
      BEGIN
        SELECT RAISE(ABORT, 'Invalid scoped relationship')
        WHERE NOT EXISTS (SELECT 1 FROM placements WHERE id=NEW.placement_id AND tenant_id=NEW.tenant_id);
      END;
      CREATE TRIGGER local_final_application BEFORE UPDATE OF status ON applications
      WHEN OLD.status IN ('ACCEPTED','REJECTED') AND NEW.status<>OLD.status
      BEGIN SELECT RAISE(ABORT, 'Application final decision is immutable'); END;
    `);
    sql.exec('PRAGMA user_version = 2');
    sql.exec('COMMIT');
  } catch (error) {
    sql.exec('ROLLBACK');
    throw error;
  }
}

function upgradeToFormTypesV2(sql: DatabaseSync) {
  sql.exec('BEGIN');
  try {
    sql.exec(`
      ALTER TABLE completion_responses RENAME TO completion_responses_v1;
      CREATE TABLE completion_responses (
        id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL, placement_id TEXT NOT NULL,
        form_type TEXT NOT NULL CHECK (form_type IN ('COE_PLACEMENT_DATA','COE_RECOMMENDATION','STUDENT_INFO_SHEET','TRAINING_AGREEMENT','PARENT_GUARDIAN_CONSENT','FINAL_SELF_ASSESSMENT','OJT_EXIT_SURVEY')),
        form_version INTEGER NOT NULL, response_json TEXT NOT NULL, submitted_at TEXT, updated_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REVISION_REQUESTED')),
        review_note TEXT, reviewer_id TEXT, reviewed_at TEXT, version INTEGER NOT NULL DEFAULT 1
      );
      INSERT INTO completion_responses (id,tenant_id,created_at,placement_id,form_type,form_version,response_json,submitted_at,updated_at,status,review_note,reviewer_id,reviewed_at,version)
        SELECT id,tenant_id,created_at,placement_id,form_type,form_version,response_json,submitted_at,updated_at,status,review_note,reviewer_id,reviewed_at,version FROM completion_responses_v1;
      DROP TABLE completion_responses_v1;
      CREATE UNIQUE INDEX completion_response_once ON completion_responses (tenant_id,placement_id,form_type);
      CREATE INDEX completion_response_placement ON completion_responses (tenant_id,placement_id);
      CREATE INDEX completion_response_review_queue ON completion_responses (tenant_id,status,updated_at);
      PRAGMA user_version = 2;
    `);
    sql.exec('COMMIT');
  } catch (error) {
    sql.exec('ROLLBACK');
    throw error;
  }
}

function upgradeToFormTypesV3(sql: DatabaseSync) {
  sql.exec('BEGIN');
  try {
    sql.exec(`
      CREATE TABLE custom_document_templates (
        id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL,
        title TEXT NOT NULL, instructions TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('CLEARANCE','OJT')),
        fields_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK(status IN ('PUBLISHED','ARCHIVED')), version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX custom_document_templates_tenant_status ON custom_document_templates (tenant_id,status,created_at);
      CREATE TABLE custom_document_responses (
        id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL, placement_id TEXT NOT NULL,
        template_id TEXT NOT NULL, template_version INTEGER NOT NULL, response_json TEXT NOT NULL, submitted_at TEXT,
        updated_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REVISION_REQUESTED')),
        review_note TEXT, reviewer_id TEXT, reviewed_at TEXT, version INTEGER NOT NULL DEFAULT 1,
        UNIQUE (tenant_id,placement_id,template_id)
      );
      CREATE INDEX custom_document_responses_placement ON custom_document_responses (tenant_id,placement_id);
      CREATE INDEX custom_document_responses_review_queue ON custom_document_responses (tenant_id,status,updated_at);
      PRAGMA user_version = 3;
    `);
    sql.exec('COMMIT');
  } catch (error) {
    sql.exec('ROLLBACK');
    throw error;
  }
}

function upgradeToFormTypesV4(sql: DatabaseSync) {
  sql.exec('BEGIN');
  try {
    sql.exec(`
      ALTER TABLE custom_document_templates ADD COLUMN original_filename TEXT NOT NULL DEFAULT '';
      ALTER TABLE custom_document_templates ADD COLUMN pdf_base64 TEXT NOT NULL DEFAULT '';
      ALTER TABLE custom_document_responses ADD COLUMN template_json TEXT NOT NULL DEFAULT '{}';
      PRAGMA user_version = 4;
    `);
    sql.exec('COMMIT');
  } catch (error) {
    sql.exec('ROLLBACK');
    throw error;
  }
}

export function openLocalDemoDatabase(): DemoDatabase {
  const path = resolve(process.env.PRACTISYNC_LOCAL_DEMO_PATH || join(process.cwd(), '.local', 'practisync-demo.sqlite'));
  if (sqliteGlobal.practiSyncLocalDemo?.path === path && sqliteGlobal.practiSyncLocalDemo.schemaVersion === 6) return sqliteGlobal.practiSyncLocalDemo.database;

  mkdirSync(dirname(path), { recursive: true });
  const sql = new DatabaseSync(path);
  sql.exec('PRAGMA busy_timeout = 5000');
  const version = Number(sql.prepare('PRAGMA user_version').get()?.user_version ?? 0);
  if (version === 0) migrate(sql);
  else if (version < 2) upgradeToFormTypesV2(sql);
  if (version < 3) upgradeToFormTypesV3(sql);
  if (version < 4) upgradeToFormTypesV4(sql);
  if (version < 5) {
    sql.exec('BEGIN');
    try {
      sql.exec(readFileSync(join(process.cwd(), 'packages/db/prisma/migrations/202610150001_reflowable_document_templates/migration.sql'), 'utf8'));
      sql.exec('PRAGMA user_version = 5');
      sql.exec('COMMIT');
    } catch (error) { sql.exec('ROLLBACK'); throw error; }
  }

  if (version < 6) {
    sql.exec('BEGIN');
    try {
      sql.exec(readFileSync(join(process.cwd(), 'packages/db/prisma/migrations/202610150002_native_document_generator/migration.sql'), 'utf8'));
      sql.exec('PRAGMA user_version = 6'); sql.exec('COMMIT');
    } catch (error) { sql.exec('ROLLBACK'); throw error; }
  }
  const database = new LocalDemoDatabase(sql);
  sqliteGlobal.practiSyncLocalDemo = { path, database, schemaVersion: 6 };
  return database;
}
