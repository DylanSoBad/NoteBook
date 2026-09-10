export type Kind =
  | 'task'
  | 'mint'
  | 'target'
  | 'note'
  | 'post'
  | 'airdrop'
  | 'profit'
  | 'wl';
export type AirdropTask = { id: string; title: string; done: boolean };
export type Entry = {
  id: string;
  kind: Kind;
  date: string;
  title: string;
  body: string;
  status: string;
  time: string;
  category: string;
  chain: string;
  price: string;
  url: string;
  xUrl?: string;
  target: number;
  progress: number;
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  followers: number;
  revision: number;
  costCents?: number;
  incomeCents?: number;
  feeCents?: number;
  conversions?: Partial<
    Record<'costCents' | 'incomeCents' | 'feeCents', Conversion>
  >;
  airdropTasks?: AirdropTask[];
  fundingInfo?: string;
  estimatedValue?: string;
  snapshotDate?: string;
  wallets?: string;
  wlSource?: string;
  mintDate?: string;
  soldDate?: string;
  soldPriceCents?: number;
};
export const kinds: Kind[] = [
  'task',
  'mint',
  'target',
  'note',
  'post',
  'airdrop',
  'profit',
  'wl',
];
export const names: Record<Kind, string> = {
  task: 'Công việc',
  mint: 'Lịch mint',
  target: 'Mục tiêu',
  note: 'Ghi chú',
  post: 'Bài X',
  airdrop: 'Airdrop',
  profit: 'Khoản profit',
  wl: 'WL spot',
};
export const states: Record<Kind, string[]> = {
  task: ['Cần làm', 'Đang làm', 'Hoàn thành'],
  mint: ['Theo dõi', 'Có whitelist', 'Đã mint', 'Bỏ qua'],
  target: ['Đang thực hiện', 'Hoàn thành'],
  note: ['Ghi chú'],
  post: ['Ý tưởng', 'Bản nháp', 'Đã lên lịch', 'Đã đăng'],
  airdrop: ['Nghiên cứu', 'Đang farm', 'Snapshot', 'Đã claim', 'Bỏ qua'],
  profit: ['Chưa chốt', 'Đã chốt'],
  wl: ['Đang grind', 'Đã nhận', 'Sắp mint', 'Đã list', 'Đã bán', 'Hết hạn'],
};
export const profitCategories = ['NFT', 'Airdrop', 'Trade', 'Công việc Web3'];
export function today() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}
export function shift(date: string, days: number) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function blank(kind: Kind, date: string): Entry {
  return {
    id: crypto.randomUUID(),
    kind,
    date,
    title: '',
    body: '',
    status: states[kind][0],
    time: '',
    category:
      kind === 'post'
        ? 'Web3 take'
        : kind === 'profit'
          ? 'NFT'
          : kind === 'airdrop'
            ? 'Medium'
            : 'Web3',
    chain: '',
    price: '',
    url: '',
    target: 1,
    progress: 0,
    impressions: 0,
    likes: 0,
    replies: 0,
    reposts: 0,
    followers: 0,
    revision: 0,
    ...(kind === 'profit' ? { costCents: 0, incomeCents: 0, feeCents: 0 } : {}),
    ...(kind === 'airdrop' ? { airdropTasks: [] } : {}),
    ...(kind === 'wl' ? { soldPriceCents: 0 } : {}),
  };
}
export function validDate(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v + 'T00:00:00Z')) &&
    new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v
  );
}
export function validateEntry(value: unknown): Entry {
  if (!value || typeof value !== 'object') throw Error('Dữ liệu không hợp lệ.');
  const e = value as Entry;
  if (
    !kinds.includes(e.kind) ||
    !validDate(e.date) ||
    typeof e.id !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(e.id)
  )
    throw Error('Ngày hoặc loại mục không hợp lệ.');
  for (const field of [
    'title',
    'body',
    'status',
    'time',
    'category',
    'chain',
    'price',
    'url',
  ] as const) {
    if (
      typeof e[field] !== 'string' ||
      e[field].length >
        (field === 'body' ? 16000 : field === 'url' ? 2000 : 250)
    )
      throw Error('Nội dung quá dài hoặc không hợp lệ.');
  }
  if (!e.title.trim() || !states[e.kind].includes(e.status))
    throw Error('Hãy nhập tiêu đề và trạng thái hợp lệ.');
  if (e.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time))
    throw Error('Giờ không hợp lệ.');
  if (e.url) {
    let u: URL;
    try {
      u = new URL(e.url);
    } catch {
      throw Error('Đường dẫn không hợp lệ.');
    }
    if (!['https:', 'http:'].includes(u.protocol))
      throw Error('Chỉ hỗ trợ đường dẫn HTTP hoặc HTTPS.');
  }
  if (e.xUrl !== undefined) {
    if (typeof e.xUrl !== 'string' || e.xUrl.length > 2000)
      throw Error('Link X không hợp lệ.');
    if (e.xUrl) {
      let u: URL;
      try {
        u = new URL(e.xUrl);
      } catch {
        throw Error('Link X không hợp lệ.');
      }
      if (!['https:', 'http:'].includes(u.protocol))
        throw Error('Chỉ hỗ trợ đường dẫn HTTP hoặc HTTPS.');
    }
  }
  for (const f of [
    'target',
    'progress',
    'impressions',
    'likes',
    'replies',
    'reposts',
    'followers',
    'revision',
  ] as const) {
    if (!Number.isSafeInteger(e[f]) || e[f] < 0 || e[f] > 1000000000)
      throw Error('Số liệu phải là số nguyên không âm.');
  }
  if (e.kind === 'target' && e.target < 1)
    throw Error('Mục tiêu phải lớn hơn 0.');
  if (e.kind === 'profit') {
    if (!profitCategories.includes(e.category))
      throw Error('Chọn nguồn profit hợp lệ.');
    for (const f of moneyKeys) {
      const amount = e[f];
      if (
        typeof amount !== 'number' ||
        !Number.isSafeInteger(amount) ||
        amount < 0 ||
        amount > 100000000000
      )
        throw Error(
          'Số tiền phải không âm, tối đa 1 tỷ USD và có tối đa 2 số thập phân.',
        );
    }
    if (e.conversions !== undefined) {
      if (
        !e.conversions ||
        typeof e.conversions !== 'object' ||
        Array.isArray(e.conversions) ||
        Object.keys(e.conversions).some(
          (k) => !moneyKeys.includes(k as (typeof moneyKeys)[number]),
        )
      )
        throw Error('Thông tin quy đổi không hợp lệ.');
      for (const key of moneyKeys) {
        if (
          e.conversions[key] !== undefined &&
          validateConversion(e.conversions[key]).usdCents !== e[key]
        )
          throw Error('Số tiền không khớp tỷ giá đã lưu.');
      }
    }
  }
  if (e.kind === 'airdrop') {
    if (!['Hot', 'Medium', 'Low'].includes(e.category))
      throw Error('Chọn mức ưu tiên hợp lệ.');
    if (e.airdropTasks !== undefined) {
      if (
        !Array.isArray(e.airdropTasks) ||
        e.airdropTasks.length > 40 ||
        e.airdropTasks.some(
          (t) =>
            !t ||
            typeof t !== 'object' ||
            typeof t.id !== 'string' ||
            !/^[a-zA-Z0-9_-]{1,100}$/.test(t.id) ||
            typeof t.title !== 'string' ||
            !t.title.trim() ||
            t.title.length > 250 ||
            typeof t.done !== 'boolean',
        )
      )
        throw Error('Checklist airdrop không hợp lệ.');
    }
  }
  for (const f of [
    'fundingInfo',
    'estimatedValue',
    'snapshotDate',
    'wallets',
    'wlSource',
    'mintDate',
    'soldDate',
  ] as const) {
    if (e[f] !== undefined && (typeof e[f] !== 'string' || e[f].length > 250))
      throw Error('Thông tin bổ sung không hợp lệ.');
  }
  for (const f of ['snapshotDate', 'mintDate', 'soldDate'] as const) {
    if (e[f] !== undefined && e[f] !== '' && !validDate(e[f]))
      throw Error('Ngày bổ sung không hợp lệ.');
  }
  if (
    e.soldPriceCents !== undefined &&
    (!Number.isSafeInteger(e.soldPriceCents) ||
      e.soldPriceCents < 0 ||
      e.soldPriceCents > 100000000000)
  )
    throw Error('Giá bán WL không hợp lệ.');
  return e;
}
import { type Conversion, moneyKeys, validateConversion } from './coins';
