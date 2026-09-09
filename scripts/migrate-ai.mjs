import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required');
const sql=neon(process.env.DATABASE_URL);
await sql`CREATE TABLE IF NOT EXISTS ai_usage(owner text PRIMARY KEY, day text NOT NULL, count integer NOT NULL DEFAULT 0 CHECK(count>=0), busy_until bigint NOT NULL DEFAULT 0)`;
console.log('AI usage limits ready; existing records unchanged.');
