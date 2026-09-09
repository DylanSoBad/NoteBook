import {NextResponse} from 'next/server';
import {configuredXClient, createXOAuthState, xCodeChallenge, xOAuthCookieName} from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  try {
    const client = configuredXClient();
    const flow = await createXOAuthState();
    const redirectUri = `${origin}/api/auth/x/callback`;
    const authorize = new URL('https://x.com/i/oauth2/authorize');
    authorize.searchParams.set('response_type', 'code');
    authorize.searchParams.set('client_id', client.id);
    authorize.searchParams.set('redirect_uri', redirectUri);
    authorize.searchParams.set('scope', 'users.read');
    authorize.searchParams.set('state', flow.state);
    authorize.searchParams.set('code_challenge', xCodeChallenge(flow.verifier));
    authorize.searchParams.set('code_challenge_method', 'S256');
    const response = NextResponse.redirect(authorize, 302);
    response.headers.set('Cache-Control', 'no-store');
    response.cookies.set(xOAuthCookieName, flow.cookie, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL('/login?error=unavailable', origin), 303);
  }
}
