import {neon} from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = neon(process.env.DATABASE_URL);
await sql.transaction([
  sql`CREATE TABLE IF NOT EXISTS records (
    id text PRIMARY KEY,
    owner text NOT NULL,
    kind text NOT NULL,
    date text NOT NULL,
    data jsonb NOT NULL,
    revision integer NOT NULL DEFAULT 1 CHECK (revision > 0)
  )`,
  sql`CREATE INDEX IF NOT EXISTS idx_records_owner_date ON records(owner, date)`,
  sql`CREATE TABLE IF NOT EXISTS auth_attempts (
    key text PRIMARY KEY,
    attempts integer NOT NULL,
    expires_at bigint NOT NULL
  )`
]);
console.log('Database schema ready. Existing records preserved.');
