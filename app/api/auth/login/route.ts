import {NextResponse} from 'next/server';
import {database} from '@/db/postgres';
import {attemptKey, cookieName, createSession, sessionAge, verifyPassword} from '@/lib/session';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get('origin') !== origin) return new Response('Invalid origin', {status: 403});
  const back = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, origin), 303);
  try {
    const raw = await request.text();
    if (raw.length > 2048) return back('password');
    const password = new URLSearchParams(raw).get('password') || '';
    if (!password || password.length > 256) return back('password');
    const key = attemptKey(request.headers.get('x-real-ip') || 'unknown');
    const sql = database();
    const now = Date.now();
    const rows = await sql`INSERT INTO auth_attempts (key,attempts,expires_at) VALUES (${key},1,${now + 900000})
      ON CONFLICT(key) DO UPDATE SET
      attempts = CASE WHEN auth_attempts.expires_at < ${now} THEN 1 ELSE auth_attempts.attempts + 1 END,
      expires_at = CASE WHEN auth_attempts.expires_at < ${now} THEN ${now + 900000} ELSE auth_attempts.expires_at END
      RETURNING attempts`;
    if (rows[0].attempts > 10) return back('limit');
    if (!await verifyPassword(password)) return back('password');
    const response = NextResponse.redirect(new URL('/', origin), 303);
    response.headers.set('Cache-Control', 'no-store');
    response.cookies.set(cookieName, await createSession(), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: sessionAge
    });
    await sql`DELETE FROM auth_attempts WHERE key=${key}`;
    return response;
  } catch { return back('unavailable'); }
}
