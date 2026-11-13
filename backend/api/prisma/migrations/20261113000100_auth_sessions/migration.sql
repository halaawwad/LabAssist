BEGIN;
SET search_path=labassist_student,public;
CREATE TABLE auth_sessions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL REFERENCES accounts(id),
 access_hash char(64) NOT NULL UNIQUE,refresh_hash char(64) NOT NULL UNIQUE,
 access_expires_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,
 revoked_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_session_account ON auth_sessions(account_id);
CREATE TABLE password_reset_tokens(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL REFERENCES accounts(id),
 token_hash char(64) NOT NULL UNIQUE,expires_at timestamptz NOT NULL,used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_mail_outbox(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL REFERENCES accounts(id),
 payload text NOT NULL,attempts int NOT NULL DEFAULT 0,sent_at timestamptz,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_pending_mail ON auth_mail_outbox(next_attempt_at) WHERE sent_at IS NULL;
COMMIT;
