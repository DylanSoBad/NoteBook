import { getOwner } from '@/lib/auth';
import { database } from '@/db/postgres';
import {
  generateDrafts,
  validateWriterInput,
  WriterError,
} from '@/lib/ai-writer';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const DAILY_LIMIT = 20;
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
function configuration() {
  const provider = process.env.OPENAI_API_KEY ? 'openai' : 'gemini';
  const token =
    provider === 'openai'
      ? process.env.OPENAI_API_KEY
      : process.env.GEMINI_API_KEY;
  return {
    provider,
    token,
    model: provider === 'openai' ? 'GPT-5 mini' : 'Gemini 2.5 Flash',
  } as const;
}
export async function GET() {
  if (!(await getOwner())) return json({ error: 'Vui lòng đăng nhập.' }, 401);
  const { provider, token, model } = configuration();
  return json({
    configured: !!token,
    provider: token ? provider : null,
    model: token ? model : null,
    dailyLimit: DAILY_LIMIT,
  });
}
export async function POST(request: Request) {
  const user = await getOwner();
  if (!user) return json({ error: 'Đăng nhập để dùng AI viết bài.' }, 401);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Invalid origin' }, 403);
  let input;
  let suppliedKey = '';
  let suppliedProvider: 'openai' | 'gemini' = 'openai';
  try {
    const raw = await request.text();
    if (raw.length > 15000) throw new WriterError('Nội dung gửi quá dài.', 400);
    const payload = JSON.parse(raw) as Record<string, unknown>;
    input = validateWriterInput(payload);
    if (payload.apiKey !== undefined && typeof payload.apiKey !== 'string')
      throw new WriterError('API key không hợp lệ.', 400);
    suppliedKey =
      typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';
    if (suppliedKey && (suppliedKey.length < 20 || suppliedKey.length > 512))
      throw new WriterError('API key không hợp lệ.', 400);
    if (
      payload.provider !== undefined &&
      !['openai', 'gemini'].includes(String(payload.provider))
    )
      throw new WriterError('Nhà cung cấp AI không hợp lệ.', 400);
    suppliedProvider = payload.provider === 'gemini' ? 'gemini' : 'openai';
  } catch (e) {
    return json(
      {
        error: e instanceof WriterError ? e.message : 'Nội dung không hợp lệ.',
      },
      400,
    );
  }
  const configured = configuration();
  const token = suppliedKey || configured.token;
  const provider = suppliedKey ? suppliedProvider : configured.provider;
  const model = provider === 'openai' ? 'GPT-5 mini' : 'Gemini 2.5 Flash';
  if (!token)
    return json(
      {
        error:
          'Dán API key riêng trong X Studio hoặc thêm key vào cấu hình Vercel Production.',
        code: 'activation_required',
      },
      503,
    );
  let sql;
  try {
    sql = database();
  } catch {
    return json({ error: 'Chưa kết nối được dữ liệu giới hạn AI.' }, 503);
  }
  const day = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  let reserved = false;
  try {
    const now = Date.now();
    // Atomic daily cap plus lease: parallel requests cannot overrun quota or double-generate.
    const rows =
      await sql`INSERT INTO ai_usage(owner,day,count,busy_until) VALUES(${user.userId},${day},1,${now + 70000})
      ON CONFLICT(owner) DO UPDATE SET day=EXCLUDED.day,
      count=CASE WHEN ai_usage.day<>EXCLUDED.day THEN 1 ELSE ai_usage.count+1 END,
      busy_until=EXCLUDED.busy_until
      WHERE ai_usage.busy_until<${now} AND (ai_usage.day<>EXCLUDED.day OR ai_usage.count<${DAILY_LIMIT}) RETURNING count`;
    if (!rows.length)
      return json(
        {
          error:
            'AI đang viết một yêu cầu khác, hoặc bạn đã dùng hết 20 lượt hôm nay. Vui lòng đợi hoặc quay lại ngày mai.',
          code: 'app_limit',
        },
        429,
      );
    reserved = true;
    const drafts = await generateDrafts(input, { token, provider });
    return json({
      drafts,
      remaining: DAILY_LIMIT - Number(rows[0].count),
      model,
    });
  } catch (e) {
    return json(
      {
        error:
          e instanceof WriterError
            ? e.message
            : 'Chưa kết nối được hệ thống AI. Vui lòng thử lại.',
        code: e instanceof WriterError ? e.code : 'unavailable',
      },
      e instanceof WriterError ? e.status : 503,
    );
  } finally {
    if (reserved) {
      try {
        await sql`UPDATE ai_usage SET busy_until=0 WHERE owner=${user.userId} AND day=${day}`;
      } catch {
        /* The lease expires without intervention. */
      }
    }
  }
}
