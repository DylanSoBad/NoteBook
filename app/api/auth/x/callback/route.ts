import {NextResponse} from 'next/server';
import {configuredXClient, cookieName, createSession, sessionAge, verifyXOAuthState, xOAuthCookieName} from '@/lib/session';
import {cookies} from 'next/headers';

export const runtime = 'nodejs';

function back(origin: string, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, origin), 303);
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const stored = (await cookies()).get(xOAuthCookieName)?.value;
  const clearFlow = (response: NextResponse) => {
    response.cookies.set(xOAuthCookieName, '', {httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0});
    response.headers.set('Cache-Control', 'no-store');
    return response;
  };
  if (!code || !state || !stored) return clearFlow(back(origin, 'invalid'));
  const flow = await verifyXOAuthState(stored, state);
  if (!flow) return clearFlow(back(origin, 'invalid'));
  try {
    const client = configuredXClient();
    const redirectUri = `${origin}/api/auth/x/callback`;
    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${client.id}:${client.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({code, grant_type: 'authorization_code', redirect_uri: redirectUri, code_verifier: flow.verifier}),
      cache: 'no-store'
    });
    if (!tokenResponse.ok) return clearFlow(back(origin, 'invalid'));
    const token = await tokenResponse.json() as {access_token?: unknown};
    if (typeof token.access_token !== 'string' || token.access_token.length > 4096) return clearFlow(back(origin, 'invalid'));
    const userResponse = await fetch('https://api.x.com/2/users/me', {
      headers: {Authorization: `Bearer ${token.access_token}`}, cache: 'no-store'
    });
    if (!userResponse.ok) return clearFlow(back(origin, 'invalid'));
    const user = await userResponse.json() as {data?: {id?: unknown; username?: unknown}};
    const username = typeof user.data?.username === 'string' ? user.data.username.toLowerCase() : '';
    const id = typeof user.data?.id === 'string' ? user.data.id : '';
    const expectedId = process.env.X_OWNER_ID;
    if (username !== 'only__dylan' || (expectedId && id !== expectedId)) return clearFlow(back(origin, 'forbidden'));
    const response = NextResponse.redirect(new URL('/', origin), 303);
    response.cookies.set(cookieName, await createSession(), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: sessionAge
    });
    return clearFlow(response);
  } catch {
    return clearFlow(back(origin, 'unavailable'));
  }
}
