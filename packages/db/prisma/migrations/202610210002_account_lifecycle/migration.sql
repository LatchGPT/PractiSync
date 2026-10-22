BEGIN;
CREATE TABLE auth_identities (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 user_id TEXT NOT NULL, provider TEXT NOT NULL, issuer TEXT NOT NULL, subject TEXT NOT NULL,
 UNIQUE(provider,issuer,subject), UNIQUE(tenant_id,user_id,provider)
);
CREATE TABLE account_tokens (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 user_id TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, purpose TEXT NOT NULL,
 email TEXT NOT NULL, session_version INTEGER NOT NULL, expires_at TEXT NOT NULL,
 used_at TEXT, claimed_by TEXT
);
CREATE INDEX account_token_owner ON account_tokens(tenant_id,user_id,purpose);
CREATE TABLE email_outbox (
 id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT NOT NULL, created_at TEXT NOT NULL,
 encrypted_payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING',
 attempts INTEGER NOT NULL DEFAULT 0, available_at TEXT NOT NULL, locked_until TEXT,
 delivered_at TEXT, last_error TEXT
);
CREATE INDEX email_outbox_ready ON email_outbox(status,available_at);

COMMIT;
