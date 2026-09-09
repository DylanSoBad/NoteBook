import {getOwner} from '@/lib/auth';
import {database} from '@/db/postgres';
import {validateEntry} from '@/lib/model';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {'Cache-Control': 'no-store'}});
}
function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export async function GET() {
  const user = await getOwner();
  if (!user) return json({error: 'Đăng nhập để mở dữ liệu của bạn.'}, 401);
  try {
    const sql = database();
    const rows = await sql`SELECT data, revision FROM records WHERE owner = ${user.userId} ORDER BY date DESC, id`;
    return json({records: rows.map(r => ({...r.data, revision: r.revision}))});
  } catch { return json({error: 'Chưa tải được dữ liệu. Vui lòng thử lại.'}, 503); }
}
export async function POST(request: Request) {
  const user = await getOwner();
  if (!user) return json({error: 'Vui lòng đăng nhập lại.'}, 401);
  if (!sameOrigin(request)) return json({error: 'Invalid origin'}, 403);
  let entry;
  try {
    const raw = await request.text();
    if (raw.length > 22000) throw Error('Nội dung quá dài.');
    entry = validateEntry(JSON.parse(raw));
  } catch(e) { return json({error: e instanceof Error ? e.message : 'Dữ liệu không hợp lệ.'}, 400); }
  try {
    const next = {...entry, revision: entry.revision + 1};
    const sql = database();
    const rows = entry.revision === 0
      ? await sql`INSERT INTO records (id,owner,kind,date,data,revision) VALUES (${entry.id},${user.userId},${entry.kind},${entry.date},${JSON.stringify(next)}::jsonb,1) ON CONFLICT(id) DO NOTHING RETURNING id`
      : await sql`UPDATE records SET kind=${entry.kind},date=${entry.date},data=${JSON.stringify(next)}::jsonb,revision=revision+1 WHERE id=${entry.id} AND owner=${user.userId} AND revision=${entry.revision} RETURNING id`;
    if (!rows.length) return json({error: 'Mục này đã thay đổi ở nơi khác. Tải lại dữ liệu trước khi lưu tiếp.'}, 409);
    return json({record: next});
  } catch { return json({error: 'Lưu chưa thành công. Nội dung vẫn ở đây để bạn thử lại.'}, 503); }
}
export async function DELETE(request: Request) {
  const user = await getOwner();
  if (!user) return json({error: 'Vui lòng đăng nhập lại.'}, 401);
  if (!sameOrigin(request)) return json({error: 'Invalid origin'}, 403);
  try {
    const {id,revision} = await request.json();
    if (typeof id !== 'string' || id.length > 100 || !Number.isSafeInteger(revision) || revision < 1) return json({error:'Dữ liệu không hợp lệ.'},400);
    const sql = database();
    const rows = await sql`DELETE FROM records WHERE id=${id} AND owner=${user.userId} AND revision=${revision} RETURNING id`;
    if (!rows.length) return json({error:'Mục đã thay đổi. Vui lòng tải lại.'},409);
    return json({ok:true});
  } catch { return json({error:'Chưa xóa được. Vui lòng thử lại.'},503); }
}
