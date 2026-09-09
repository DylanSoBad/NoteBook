import {NextResponse} from 'next/server';
import {cookieName} from '@/lib/session';
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get('origin') !== origin) return new Response('Invalid origin', {status:403});
  const response = NextResponse.redirect(new URL('/login', origin), 303);
  response.cookies.set(cookieName, '', {httpOnly:true, secure:process.env.NODE_ENV === 'production', sameSite:'strict', path:'/', maxAge:0});
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
