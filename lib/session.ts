import {SignJWT, jwtVerify} from 'jose';
import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';

export const ownerId = 'dylan-owner';
export const sessionAge = 60 * 60 * 24 * 30;
export const cookieName = process.env.NODE_ENV === 'production' ? '__Host-dylan-hq' : 'dylan-hq';
export const xOAuthCookieName = process.env.NODE_ENV === 'production' ? '__Host-dylan-x-oauth' : 'dylan-x-oauth';
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 43) throw new Error('Authentication not configured');
  return new TextEncoder().encode(value);
}
export async function createSession() {
  return new SignJWT({scope: 'owner'})
    .setProtectedHeader({alg: 'HS256'})
    .setSubject(ownerId).setIssuer('dylan-web3-hq').setAudience('dylan-workspace')
    .setIssuedAt().setExpirationTime(`${sessionAge}s`).sign(secret());
}
export async function verifySession(token: string): Promise<boolean> {
  try {
    const {payload} = await jwtVerify(token, secret(), {
      algorithms: ['HS256'], issuer: 'dylan-web3-hq', audience: 'dylan-workspace'
    });
    return payload.sub === ownerId && payload.scope === 'owner';
  } catch { return false; }
}
function base64Url(bytes: Buffer) {
  return bytes.toString('base64url');
}
export function configuredXClient() {
  const id = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!id || !clientSecret) throw new Error('X sign-in is not configured');
  return {id, clientSecret};
}
export async function createXOAuthState() {
  const state = base64Url(randomBytes(32));
  const verifier = base64Url(randomBytes(48));
  const cookie = await new SignJWT({state, verifier})
    .setProtectedHeader({alg: 'HS256'})
    .setIssuer('dylan-web3-hq').setAudience('x-oauth-flow')
    .setIssuedAt().setExpirationTime('10m').sign(secret());
  return {state, verifier, cookie};
}
export function xCodeChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}
export async function verifyXOAuthState(cookie: string, state: string) {
  try {
    const {payload} = await jwtVerify(cookie, secret(), {
      algorithms: ['HS256'], issuer: 'dylan-web3-hq', audience: 'x-oauth-flow'
    });
    if (typeof payload.state !== 'string' || typeof payload.verifier !== 'string') return null;
    const expected = Buffer.from(payload.state);
    const actual = Buffer.from(state);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    return {verifier: payload.verifier};
  } catch { return null; }
}
