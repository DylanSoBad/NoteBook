import {cookies} from 'next/headers';
import {cookieName, verifySession, ownerId} from './session';

export async function getOwner() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !await verifySession(token)) return null;
  return {userId: ownerId, displayName: 'Dylan', email: '', fullName: 'Dylan'};
}
