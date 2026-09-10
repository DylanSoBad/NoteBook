import { getOwner } from '@/lib/auth';
import { chatWithT3, T3ChatError, validateChatMessages } from '@/lib/t3-chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });

export async function POST(request: Request) {
  if (!(await getOwner()))
    return json({ error: 'Đăng nhập để trò chuyện với T3.' }, 401);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Invalid origin' }, 403);

  try {
    const raw = await request.text();
    if (raw.length > 100000)
      throw new T3ChatError('Cuộc chat quá dài. Hãy tạo chat mới.', 400);
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const apiKey =
      typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';
    if (apiKey.length < 20 || apiKey.length > 512)
      throw new T3ChatError('Hãy thêm API key T3 hợp lệ.', 400);
    const messages = validateChatMessages(payload.messages);
    const message = await chatWithT3(messages, apiKey);
    return json({ message, model: 'Claude Sonnet 4.6 via XPiKi' });
  } catch (error) {
    return json(
      {
        error:
          error instanceof T3ChatError
            ? error.message
            : 'Nội dung chat không hợp lệ.',
        code: error instanceof T3ChatError ? error.code : 'invalid_request',
      },
      error instanceof T3ChatError ? error.status : 400,
    );
  }
}
