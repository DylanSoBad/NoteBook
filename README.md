# Dylan HQ — Vercel edition

The original Sites version is preserved in `../web3-hq`. This version uses Next.js and a dedicated Neon PostgreSQL database. All task, mint, target, notes, X, airdrop, profit and coin-calculator features are retained.

## Deploy

1. `npm ci`
2. Link a new Vercel project with `vercel link`.
3. Connect a dedicated Neon Free database in Singapore. The owner must personally accept any Marketplace terms. No existing unrelated databases should be reused.
4. Pull its database variables to the gitignored `.env.local` and run `npm run db:migrate`. Migration creates missing tables and preserves existing data.
5. Run `node scripts/prepare-access.mjs` once. Keep `.vercel/LOGIN.txt` private and save the password in a password manager.
6. `node scripts/configure-auth.mjs` adds production-only password hash and session secret through stdin. Never commit `.vercel` or `.env` files.
7. `npm run build`, then `vercel deploy --prod`.

## Security and data

- The app verifies a signed, expiring, HttpOnly, Secure, SameSite cookie. Client-supplied OpenAI/Sites identity headers are never accepted.
- Passwords are random, salted and hashed with scrypt. Login attempts are limited in PostgreSQL (10 attempts per IP per 15 minutes).
- Records and price endpoints require owner authentication. Mutations require a matching Origin; stale revisions return 409 instead of overwriting newer work.
- Changing `SESSION_SECRET` invalidates every existing session. Rotate it when changing the password or if a session might have leaked.
- Database access uses parameterized SQL and is server-only. The app fails closed when secrets or database configuration are missing.
- The original live Sites database was inspected during migration preparation and contained no records. No user records were deleted or rewritten.
- X actions are drafts, manual metrics, copy and opening X compose — not automatic posting.
- Coin prices are on-demand CoinGecko quotes, not guaranteed real-time. Missing/stale quotes cannot silently replace manual values. Profit conversion snapshots remain unchanged after price refreshes.

## AI X Writer

- Uses your own server-side `OPENAI_API_KEY` (GPT-5 mini). Optional `GEMINI_API_KEY` (Gemini 2.5 Flash) is used only when no OpenAI key is configured. No Vercel AI Gateway, model switching on errors, or automatic credit purchase.
- Add keys as Sensitive environment variables for Production in the Vercel project dashboard, then redeploy. Never paste keys into X writing inputs or commit them to source.
- Run `node --env-file=.env.production.local scripts/migrate-ai.mjs` once for the atomic daily usage counter. Existing records are unchanged.
- The owner can request three short English alternatives from a Vietnamese or English brief, pick degen/builder tone and provide source excerpts. AI never fetches supplied URLs or accesses other records.
- Input is limited to 3,000 + 6,000 characters; output to 1,600 tokens; requests to 20/day in Vietnam time with a single in-flight lease. Failed provider requests also count. This is not a currency spend limit: configure billing limits with your API provider too.
- Results are editable and transient until explicitly opened in the draft editor and saved. No automatic X posting. Factual accuracy and X's actual weighted character limits still require user review.
- OpenAI requests use `store:false`. Provider-side retention/billing policies still apply; this is not a zero-retention guarantee.

## Local environment

Provide `DATABASE_URL`, `SESSION_SECRET` and `OWNER_PASSWORD_HASH` in `.env.local`; then run `npm run dev`. Do not connect automated tests to a database containing user data unless the tests use isolated IDs and clean up only their own records.
