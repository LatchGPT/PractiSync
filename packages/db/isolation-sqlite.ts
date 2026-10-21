import type { DatabaseSync } from 'node:sqlite';
import relations from './scoped-relations.json';

/** SQLite demo mirrors the PostgreSQL migration; PostgreSQL remains the release authority. */
export function installSqliteScopeGuards(sql:DatabaseSync){
 const has=(name:string)=>!!sql.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
 sql.exec('BEGIN');
 try{
  for(const [table,column,target] of relations){
   if(!has(table)||!has(target))continue;
   const columns=sql.prepare(`PRAGMA table_info(${table})`).all() as {name:string}[];
   if(!columns.some(c=>c.name===column))continue;
   for(const operation of ['INSERT','UPDATE'])sql.exec(`CREATE TRIGGER IF NOT EXISTS scope_${table}_${column}_${operation.toLowerCase()} BEFORE ${operation} ON ${table} WHEN NEW.${column} IS NOT NULL BEGIN SELECT RAISE(ABORT,'Invalid scoped relationship') WHERE NOT EXISTS(SELECT 1 FROM ${target} p WHERE p.id=NEW.${column} AND p.tenant_id=NEW.tenant_id); END;`);
   sql.exec(`CREATE TRIGGER IF NOT EXISTS scope_${target}_${table}_${column}_delete BEFORE DELETE ON ${target} BEGIN SELECT RAISE(ABORT,'Scoped records still reference this resource') WHERE EXISTS(SELECT 1 FROM ${table} c WHERE c.${column}=OLD.id AND c.tenant_id=OLD.tenant_id); END;`);
  }
  sql.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized ON users(lower(email));');
  if(has('hte_evaluation_responses')){
   const columns=sql.prepare("PRAGMA table_info('hte_evaluation_responses')").all() as {name:string}[];
   if(!columns.some(c=>c.name==='assignment_id'))sql.exec("ALTER TABLE hte_evaluation_responses ADD COLUMN assignment_id TEXT;ALTER TABLE hte_evaluation_responses ADD COLUMN authorship_method TEXT NOT NULL DEFAULT 'LEGACY';ALTER TABLE hte_evaluation_responses ADD COLUMN verification_state TEXT NOT NULL DEFAULT 'UNVERIFIED';ALTER TABLE hte_evaluation_responses ADD COLUMN verified_at TEXT;");
   if(!columns.some(c=>c.name==='entered_by'))sql.exec('ALTER TABLE hte_evaluation_responses ADD COLUMN entered_by TEXT;');
  }
  sql.exec('COMMIT');
 }catch(error){sql.exec('ROLLBACK');throw error;}
}
