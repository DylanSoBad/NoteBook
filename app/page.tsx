import Workspace from './workspace';
import {getOwner} from '@/lib/auth';
import {redirect} from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Home() { if (!await getOwner()) redirect('/login'); return <Workspace />; }
