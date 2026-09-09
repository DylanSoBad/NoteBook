import {SignJWT, jwtVerify} from 'jose';
import {scrypt as scryptCallback, timingSafeEqual, createHmac} from 'node:crypto';
import {promisify} from 'node:util';

const scrypt = promisify(scryptCallback);
export const ownerId = 'dylan-owner';
export const sessionAge = 60 * 60 * 24 * 30;
export const cookieName = process.env.NODE_ENV === 'production' ? '__Host-dylan-hq' : 'dylan-hq';
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
export async function verifyPassword(password: string) {
  const [salt, hex] = (process.env.OWNER_PASSWORD_HASH || '').split(':');
  if (!/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(hex || '')) {
    throw new Error('Authentication not configured');
  }
  const actual = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hex, 'hex'));
}
export function attemptKey(ip: string) {
  return createHmac('sha256', secret()).update(ip).digest('hex');
}
