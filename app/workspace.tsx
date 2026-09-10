'use client';
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ArrowUpRight,
  CheckCheck,
  Target,
  NotebookPen,
  Clock,
  Copy,
  Pencil,
  Trash2,
  RefreshCw,
  Flame,
  Check,
  ExternalLink,
} from 'lucide-react';
import ProfitPanel, { MoneyField } from './profit-panel';
import AIWriter from './ai-writer';
import CoinCalculator, {
  ProfitConversion,
  ConversionDetails,
  conversionLabels,
} from './coin-calculator';
import WLPanel from './wl-panel';
import './upgrade.css';
import { type Conversion, type MoneyKey, moneyKeys } from '@/lib/coins';
import { money, net, profitTotals } from '@/lib/profit';
import {
  type Entry,
  type Kind,
  names,
  states,
  blank,
  today,
  shift,
  validDate,
  validateEntry,
  profitCategories,
} from '@/lib/model';

const categories = ['Web3', 'Airdrop', 'NFT', 'IRL', 'X', 'Builder'];
const postCategories = [
  'Web3 take',
  'Airdrop research',
  'NFT & culture',
  'IRL / community',
  'Build in public',
  'Thread',
];
const templates = [
  {
    title: 'Builder take',
    body: 'Spent [time] testing [product].\n\nThe part everyone talks about: [hype].\nThe part that actually matters: [observation].\n\nStill early. Back to building.',
    category: 'Build in public',
  },
  {
    title: 'Airdrop research',
    body: 'Farming [project]? Here’s what I’m tracking:\n\n• Confirmed: [official information]\n• Cost / time: [estimate]\n• Still unknown: [uncertainty]\n\nMy play: [personal approach].\nSource: [official link]',
    category: 'Airdrop research',
  },
  {
    title: 'IRL recap',
    body: 'Logged off. Met the people actually shipping.\n\n3 things from [event]:\n1. [observation]\n2. [lesson]\n3. [idea worth building]\n\nWho else was there?',
    category: 'IRL / community',
  },
];
function Choice({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
    >
      <SelectTrigger aria-label={label} className="picker">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((v) => (
          <SelectItem key={v} value={v}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
function Section({
  title,
  kind,
  create,
  children,
  extra,
}: {
  title: string;
  kind?: Kind;
  create: (k: Kind) => void;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <section className={'panel ' + (kind === 'mint' ? 'mintpanel' : '')}>
      <div className="panelheading">
        <h2>{title}</h2>
        {kind ? (
          <button className="action" onClick={() => create(kind)}>
            <Plus size={16} /> Thêm
          </button>
        ) : (
          extra
        )}
      </div>
      {children}
    </section>
  );
}

export default function Workspace() {
  const [date, setDate] = useState(today);
  const [records, setRecords] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [filter, setFilter] = useState('Tất cả');
  const [tab, setTab] = useState('daily');
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/records', { cache: 'no-store' });
      const j = (await r.json()) as {
        error: string;
        records: Entry[];
        record: Entry;
      };
      if (r.status === 401) {
        setAuth(true);
        throw Error(j.error);
      }
      if (!r.ok) throw Error(j.error);
      setRecords(j.records);
      setAuth(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  const save = useCallback(async (entry: Entry) => {
    setBusy(true);
    setError('');
    try {
      validateEntry(entry);
      const r = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      const j = (await r.json()) as {
        error: string;
        records: Entry[];
        record: Entry;
      };
      if (!r.ok) throw Error(j.error);
      setRecords((prev) => [
        ...prev.filter((x) => x.id !== j.record.id),
        j.record,
      ]);
      setNotice('Đã lưu');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  function create(kind: Kind) {
    setEditing(blank(kind, date));
  }
  function patch(field: keyof Entry, value: string | number) {
    setEditing((e) => {
      if (!e) return e;
      const next = { ...e, [field]: value };
      if (moneyKeys.includes(field as MoneyKey) && e.conversions) {
        next.conversions = { ...e.conversions };
        delete next.conversions[field as MoneyKey];
      }
      return next;
    });
  }
  function applyConversion(key: MoneyKey, c: Conversion) {
    setEditing((e) =>
      e
        ? {
            ...e,
            [key]: c.usdCents,
            conversions: { ...e.conversions, [key]: c },
          }
        : e,
    );
  }
  function profitFromCoin(c: Conversion) {
    setEditing({
      ...blank('profit', date),
      title: 'Nhận ' + c.amount + ' ' + c.symbol.toUpperCase(),
      incomeCents: c.usdCents,
      conversions: { incomeCents: c },
    });
  }
  const daily = records.filter((r) => r.date === date);
  const tasks = daily.filter((r) => r.kind === 'task');
  const mints = daily
    .filter((r) => r.kind === 'mint')
    .sort((a, b) => a.time.localeCompare(b.time));
  const targets = daily.filter((r) => r.kind === 'target');
  const posts = daily.filter((r) => r.kind === 'post');
  const notes = daily.filter((r) => r.kind === 'note');
  const done = tasks.filter((r) => r.status === 'Hoàn thành').length;
  const targetDone = targets.filter((r) => r.progress >= r.target).length;
  const actionDates = new Set(
    records
      .filter((r) =>
        ['task', 'mint', 'post', 'profit', 'airdrop', 'wl'].includes(r.kind),
      )
      .map((r) => r.date),
  );
  let streak = 0;
  for (
    let cursor = today();
    actionDates.has(cursor);
    cursor = shift(cursor, -1)
  )
    streak++;
  const selectedYear = Number(date.slice(0, 4));
  const selectedMonth = Number(date.slice(5, 7));
  const monthStart = `${date.slice(0, 7)}-01`;
  const monthOffset = new Date(monthStart + 'T12:00:00Z').getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(selectedYear, selectedMonth, 0),
  ).getUTCDate();
  const monthDays = Array.from({ length: monthOffset + daysInMonth }, (_, i) =>
    i < monthOffset
      ? null
      : `${date.slice(0, 7)}-${String(i - monthOffset + 1).padStart(2, '0')}`,
  );
  const monthLabel = new Date(monthStart + 'T12:00:00Z').toLocaleDateString(
    'vi-VN',
    { month: 'long', year: 'numeric', timeZone: 'UTC' },
  );
  function moveMonth(amount: number) {
    const next = new Date(
      Date.UTC(selectedYear, selectedMonth - 1 + amount, 1),
    );
    setDate(
      `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`,
    );
  }
  const selectedPosts = records
    .filter(
      (r) => r.kind === 'post' && (filter === 'Tất cả' || r.status === filter),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const r = await fetch('/api/records', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleting.id, revision: deleting.revision }),
      });
      const j = (await r.json()) as {
        error: string;
        records: Entry[];
        record: Entry;
      };
      if (!r.ok) throw Error(j.error);
      setRecords((prev) => prev.filter((x) => x.id !== deleting.id));
      setDeleting(null);
      setEditing(null);
      setNotice('Đã xóa');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không xóa được.');
    } finally {
      setBusy(false);
    }
  }
  async function copy(body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setNotice('Đã sao chép nội dung');
    } catch {
      setNotice(
        'Chưa sao chép được. Mở bản nháp để chọn và sao chép nội dung.',
      );
    }
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'read_web3_day',
            description:
              'Read saved tasks, mint events, goals, notes and X posts for a date. Does not modify data.',
            inputSchema: {
              type: 'object',
              properties: {
                date: {
                  type: 'string',
                  description: 'YYYY-MM-DD in Vietnam time',
                },
              },
              required: ['date'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: async (input: { date: string }) => {
              if (!validDate(input.date)) throw Error('Invalid date');
              const r = await fetch('/api/records', { cache: 'no-store' });
              const data = (await r.json()) as {
                error: string;
                records: Entry[];
              };
              if (!r.ok) throw Error(data.error);
              return {
                date: input.date,
                records: data.records.filter(
                  (e: Entry) => e.date === input.date,
                ),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  function row(r: Entry) {
    return (
      <div
        className={
          'recordrow ' + (r.status === 'Hoàn thành' ? 'completed' : '')
        }
        key={r.id}
      >
        {r.kind === 'task' ? (
          <Checkbox
            aria-label={'Hoàn thành: ' + r.title}
            checked={r.status === 'Hoàn thành'}
            disabled={busy}
            onCheckedChange={(v) =>
              void save({ ...r, status: v ? 'Hoàn thành' : 'Cần làm' })
            }
          />
        ) : (
          <span className="time">{r.time || '—'}</span>
        )}
        <button className="rowmain" onClick={() => setEditing({ ...r })}>
          <strong>{r.title}</strong>
          <span>
            {r.kind === 'mint'
              ? [r.chain, r.price].filter(Boolean).join(' · ') ||
                'Chưa thêm chain / giá'
              : r.category}
            {r.time && r.kind === 'task' ? ' · ' + r.time : ''}
          </span>
        </button>
        <span
          className={
            'pill ' +
            (r.status === 'Đã mint' || r.status === 'Hoàn thành' ? 'green' : '')
          }
        >
          {r.status}
        </span>
        {r.url && (
          <a
            className="iconbutton"
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={'Mở ' + r.title}
          >
            <ArrowUpRight size={18} />
          </a>
        )}
      </div>
    );
  }
  function postCard(r: Entry) {
    return (
      <article className="postcard" key={r.id}>
        <div className="postmeta">
          <span>{r.category}</span>
          <span className="pill">{r.status}</span>
        </div>
        <button className="postopen" onClick={() => setEditing({ ...r })}>
          <h3>{r.title}</h3>
          <p>{r.body || 'Chưa có nội dung. Mở để viết nháp.'}</p>
        </button>
        <div className="postfoot">
          <span>
            {r.date} {r.time}
          </span>
          <div>
            <button
              className="iconbutton"
              onClick={() => void copy(r.body)}
              aria-label="Sao chép nội dung"
            >
              <Copy size={16} />
            </button>
            <button
              className="iconbutton"
              onClick={() => setEditing({ ...r })}
              aria-label="Sửa bài X"
            >
              <Pencil size={16} />
            </button>
          </div>
        </div>
        {r.status === 'Đã đăng' && (
          <p className="poststats">
            {r.impressions.toLocaleString()} views · {r.likes} likes · +
            {r.followers} follows
          </p>
        )}
      </article>
    );
  }
  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="/">
          d<span>✳</span>
          <b>DYLAN / HQ</b>
        </a>
        <span className="identity">
          @only__dylan <i /> DEGEN × BUILDER
        </span>
        <button
          className="iconbutton"
          onClick={() => void refresh()}
          disabled={loading || busy}
          aria-label="Tải lại dữ liệu"
        >
          <RefreshCw size={17} />
        </button>
        <form className="logoutform" action="/api/auth/logout" method="post">
          <button className="textbutton" type="submit">
            Đăng xuất
          </button>
        </form>
      </header>
      <div className="pagehead">
        <div>
          <p className="eyebrow">YOUR DAILY WEB3 WORKSPACE</p>
          <h1>Một ngày. Mọi thứ.</h1>
          <p className="subtle">Mint, build, connect. Theo cách của bạn.</p>
        </div>
        <div className="dates">
          <div className="datecontrol">
            <button
              className="iconbutton"
              onClick={() => setDate(shift(date, -1))}
              aria-label="Ngày trước"
            >
              <ChevronLeft size={18} />
            </button>
            <CalendarDays size={17} />
            <input
              aria-label="Ngày làm việc"
              type="date"
              value={date}
              onChange={(e) => {
                if (validDate(e.target.value)) setDate(e.target.value);
              }}
            />
            <button
              className="iconbutton"
              onClick={() => setDate(shift(date, 1))}
              aria-label="Ngày sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button className="textbutton" onClick={() => setDate(today())}>
            Về hôm nay
          </button>
        </div>
      </div>
      <div className="streakbar">
        <Flame size={21} />
        <strong>{streak} ngày liên tiếp</strong>
        <span>
          {daily.length} actions hôm nay · giữ nhịp mint, build và ship.
        </span>
      </div>
      {error && (
        <div role="alert" className="errorbox">
          {error}{' '}
          {auth ? (
            <a href="/login">Đăng nhập</a>
          ) : (
            <button onClick={() => void refresh()}>Tải lại dữ liệu</button>
          )}
        </div>
      )}
      {notice && (
        <div role="status" className="toast">
          <Check size={16} />
          {notice}
        </div>
      )}
      {loading && (
        <p role="status" className="subtle">
          Đang tải dữ liệu của bạn…
        </p>
      )}
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList className="main-tabs">
          <TabsTrigger value="daily">Ngày của tôi</TabsTrigger>
          <TabsTrigger value="wl">WL Tracker</TabsTrigger>
          <TabsTrigger value="mint">Lịch mint</TabsTrigger>
          <TabsTrigger value="x">X Studio</TabsTrigger>
          <TabsTrigger value="airdrop">Airdrop</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
          <TabsTrigger value="coins">Coin Calculator</TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
          <div className="stats">
            {[
              {
                label: 'Công việc hoàn thành',
                value: done + '/' + tasks.length,
                icon: CheckCheck,
                detail: 'Một bước nhỏ, mỗi ngày',
              },
              {
                label: 'Target đã đạt',
                value: targetDone + '/' + targets.length,
                icon: Target,
                detail: 'Tiến độ theo mục tiêu của bạn',
              },
              {
                label: 'Mint trong ngày',
                value: String(mints.length),
                icon: CalendarDays,
                detail:
                  mints.find(
                    (r) => r.status !== 'Đã mint' && r.status !== 'Bỏ qua',
                  )?.time || 'Lên lịch cơ hội tiếp theo',
              },
              {
                label: 'Bài X đã đăng',
                value: String(
                  posts.filter((r) => r.status === 'Đã đăng').length,
                ),
                icon: NotebookPen,
                detail: posts.length + ' ý tưởng & bài cho ngày này',
              },
            ].map(({ label, value, icon: Icon, detail }) => (
              <article className="stat" key={label}>
                <span>{label}</span>
                <Icon size={19} />
                <strong>{value}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </div>
          <div className="dailygrid">
            <div>
              <Section title="Việc cần làm" kind="task" create={create}>
                {tasks.length ? (
                  <>
                    <Progress
                      aria-label="Tiến độ công việc"
                      value={(done / tasks.length) * 100}
                      className="taskprogress"
                    />
                    {tasks.map(row)}
                  </>
                ) : (
                  <Empty>
                    Ngày mới, kế hoạch mới.
                    <br />
                    Thêm việc research, build, farm hoặc IRL.
                  </Empty>
                )}
              </Section>
              <Section title="Target trong ngày" kind="target" create={create}>
                {targets.length ? (
                  targets.map((r) => (
                    <div className="goal" key={r.id}>
                      <div>
                        <button
                          className="rowmain"
                          onClick={() => setEditing({ ...r })}
                        >
                          <strong>{r.title}</strong>
                        </button>
                        <span>
                          {r.progress} / {r.target}
                        </span>
                      </div>
                      <Progress
                        aria-label={r.title}
                        value={Math.min(100, (r.progress / r.target) * 100)}
                      />
                      <div className="goalbottom">
                        <span>
                          {r.progress >= r.target
                            ? '✓ Đã đạt mục tiêu'
                            : Math.round((r.progress / r.target) * 100) +
                              '% hoàn thành'}
                        </span>
                        <button
                          className="textbutton"
                          disabled={busy || r.progress === 0}
                          onClick={() =>
                            void save({
                              ...r,
                              progress: Math.max(0, r.progress - 1),
                            })
                          }
                        >
                          −1
                        </button>
                        <button
                          className="action"
                          disabled={busy}
                          onClick={() =>
                            void save({ ...r, progress: r.progress + 1 })
                          }
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty>
                    Đặt target cụ thể: 2 posts, 10 replies,
                    <br />1 giờ build hoặc 3 dự án research.
                  </Empty>
                )}
              </Section>
              <Section title="Note của ngày" kind="note" create={create}>
                {notes.length ? (
                  notes.map((r) => (
                    <button
                      key={r.id}
                      className="notecard"
                      onClick={() => setEditing({ ...r })}
                    >
                      <h3>
                        {r.title}
                        <Pencil size={14} />
                      </h3>
                      <p>{r.body || 'Bấm để thêm ghi chú…'}</p>
                    </button>
                  ))
                ) : (
                  <Empty>
                    Ý tưởng bất chợt, bài học, người gặp ở IRL.
                    <br />
                    Lưu lại để tối nhìn lại ngày của mình.
                  </Empty>
                )}
              </Section>
            </div>
            <div>
              <Section title="Mint trong ngày" kind="mint" create={create}>
                {mints.length ? (
                  mints.map(row)
                ) : (
                  <Empty>
                    <CalendarDays size={24} className="emptyicon" />
                    Chưa có lịch mint cho ngày này.
                  </Empty>
                )}
                <button className="sectionlink" onClick={() => setTab('mint')}>
                  Xem lịch cả tuần <ArrowUpRight size={16} />
                </button>
              </Section>
              <Section title="X · Kế hoạch hôm nay" kind="post" create={create}>
                {posts.length ? (
                  posts.map(postCard)
                ) : (
                  <Empty>
                    Viết một điều đáng chia sẻ hôm nay.
                    <br />
                    Giọng của bạn: degen × builder.
                  </Empty>
                )}
                <button className="sectionlink" onClick={() => setTab('x')}>
                  Mở X Studio <ArrowUpRight size={16} />
                </button>
              </Section>
              <section className="panel">
                <div className="panelheading">
                  <h2>Profit trong ngày</h2>
                  <button className="action" onClick={() => create('profit')}>
                    <Plus size={16} /> Thêm
                  </button>
                </div>
                <strong
                  className={
                    'dailyprofit ' +
                    (profitTotals(daily).profit < 0 ? 'negative' : 'positive')
                  }
                >
                  {money(profitTotals(daily).profit)}
                </strong>
                <p className="subtle">
                  {profitTotals(daily).count} khoản đã chốt · USD
                </p>
                <button
                  className="sectionlink"
                  onClick={() => setTab('profit')}
                >
                  Xem Profit Tracker <ArrowUpRight size={16} />
                </button>
              </section>
              <div className="focusnote">
                <Flame size={19} />
                <div>
                  <strong>Show the work.</strong>
                  <p>Build something. Learn something. Share the receipts.</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="wl">
          <WLPanel
            records={records}
            create={() => create('wl')}
            edit={setEditing}
          />
        </TabsContent>
        <TabsContent value="mint">
          <div className="viewheading">
            <div>
              <h2>Mint Track</h2>
              <p className="subtle">
                Lịch tháng các mint sắp tới. Giờ và ngày theo giờ Việt Nam.
              </p>
            </div>
            <button className="action primary" onClick={() => create('mint')}>
              <Plus size={17} /> Thêm lịch mint
            </button>
          </div>
          <div className="mintmonthnav">
            <button className="textbutton" onClick={() => moveMonth(-1)}>
              ← Tháng trước
            </button>
            <strong>{monthLabel}</strong>
            <button className="textbutton" onClick={() => moveMonth(1)}>
              Tháng sau →
            </button>
          </div>
          <div
            className="mintcalendar"
            role="grid"
            aria-label={'Lịch mint ' + monthLabel}
          >
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
              <span className="mintweekday" role="columnheader" key={day}>
                {day}
              </span>
            ))}
            {monthDays.map((d, index) => {
              if (!d)
                return (
                  <div
                    className="mintday emptyday"
                    role="gridcell"
                    key={'blank-' + index}
                  />
                );
              const dayMints = records
                .filter((r) => r.kind === 'mint' && r.date === d)
                .sort((a, b) => a.time.localeCompare(b.time));
              return (
                <div
                  className={'mintday ' + (d === date ? 'selected' : '')}
                  role="gridcell"
                  key={d}
                >
                  <button
                    className="mintdate"
                    onClick={() => setDate(d)}
                    aria-label={'Chọn ngày ' + d}
                  >
                    {Number(d.slice(8))}
                    {dayMints.length > 0 && <i />}
                  </button>
                  {dayMints.slice(0, 3).map((mint) => (
                    <button
                      className="mintchip"
                      onClick={() => setEditing({ ...mint })}
                      key={mint.id}
                      title={[mint.chain, mint.time, mint.price]
                        .filter(Boolean)
                        .join(' · ')}
                    >
                      {mint.title}
                    </button>
                  ))}
                  {dayMints.length > 3 && (
                    <button className="mintmore" onClick={() => setDate(d)}>
                      +{dayMints.length - 3} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <Section title={'Mint · ' + date} kind="mint" create={create}>
            {mints.length ? (
              mints.map(row)
            ) : (
              <Empty>
                Không có mint hôm nay.
                <br />
                Dùng thời gian này để research project mới hoặc grind Discord.
              </Empty>
            )}
          </Section>
        </TabsContent>
        <TabsContent value="x" keepMounted>
          <div className="viewheading">
            <div>
              <h2>
                X Studio <span className="handle">@only__dylan</span>
              </h2>
              <p className="subtle">
                English content · Degen × builder · Lịch đăng & số liệu nhập tay
              </p>
            </div>
            <button className="action primary" onClick={() => create('post')}>
              <Plus size={17} /> Viết bài X
            </button>
          </div>
          <AIWriter
            onPick={(draft, topic) =>
              setEditing({
                ...blank('post', date),
                title: draft.title,
                body: draft.body,
                category: topic,
                status: 'Bản nháp',
              })
            }
          />
          <div className="templatebar">
            <span>BẮT ĐẦU TỪ MẪU</span>
            {templates.map((t) => (
              <button
                key={t.title}
                onClick={() =>
                  setEditing({
                    ...blank('post', date),
                    title: t.title,
                    body: t.body,
                    category: t.category,
                    status: 'Bản nháp',
                  })
                }
              >
                {t.title}
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
          <div className="xsummary">
            {['impressions', 'likes', 'replies', 'reposts', 'followers'].map(
              (key, i) => (
                <div key={key}>
                  <strong>
                    {records
                      .filter(
                        (r) => r.kind === 'post' && r.status === 'Đã đăng',
                      )
                      .reduce((s, r) => s + Number(r[key as keyof Entry]), 0)
                      .toLocaleString()}
                  </strong>
                  <span>
                    {
                      [
                        'Impressions',
                        'Likes',
                        'Replies',
                        'Reposts',
                        'Follows từ bài',
                      ][i]
                    }
                  </span>
                </div>
              ),
            )}
          </div>
          <div className="filterrow">
            <h3>
              Kho nội dung{' '}
              <span className="subtle">· {selectedPosts.length} bài</span>
            </h3>
            <Choice
              label="Lọc trạng thái bài X"
              value={filter}
              options={['Tất cả', ...states.post]}
              onChange={setFilter}
            />
          </div>
          <div className="postgrid">{selectedPosts.map(postCard)}</div>
          {!selectedPosts.length && (
            <Empty>
              Chưa có bài trong nhóm này. Tạo nháp mới hoặc chọn một mẫu phía
              trên.
            </Empty>
          )}
          <p className="subtle">
            “Đã lên lịch” là kế hoạch trong HQ. Mở bản nháp để sao chép hoặc
            chuyển sang X đăng bài.
          </p>
        </TabsContent>
        <TabsContent value="airdrop">
          <div className="viewheading">
            <div>
              <h2>Airdrop tracker</h2>
              <p className="subtle">
                Pipeline research → farming → snapshot → claim.
              </p>
            </div>
            <button
              className="action primary"
              onClick={() => create('airdrop')}
            >
              <Plus size={17} /> Thêm dự án
            </button>
          </div>
          <div className="filterchips">
            {['Tất cả', 'Nghiên cứu', 'Đang farm', 'Snapshot', 'Đã claim'].map(
              (status) => (
                <button
                  key={status}
                  className={filter === status ? 'active' : ''}
                  onClick={() => setFilter(status)}
                >
                  {status} (
                  {status === 'Tất cả'
                    ? records.filter((r) => r.kind === 'airdrop').length
                    : records.filter(
                        (r) => r.kind === 'airdrop' && r.status === status,
                      ).length}
                  )
                </button>
              ),
            )}
          </div>
          <div className="postgrid">
            {records
              .filter(
                (r) =>
                  r.kind === 'airdrop' &&
                  (filter === 'Tất cả' || r.status === filter),
              )
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((r) => {
                const total = r.airdropTasks?.length ?? 0,
                  complete = r.airdropTasks?.filter((t) => t.done).length ?? 0;
                return (
                  <article className="postcard airdropcard" key={r.id}>
                    <div className="postmeta">
                      <span>
                        {r.chain || 'Chain chưa rõ'} ·{' '}
                        {r.fundingInfo || 'Research'}
                      </span>
                      <span className="pill">
                        {r.category} · {r.status}
                      </span>
                    </div>
                    <button
                      className="postopen"
                      onClick={() => setEditing({ ...r })}
                    >
                      <h3>{r.title}</h3>
                      <p>{r.body || 'Thêm thesis, nguồn và kế hoạch farm.'}</p>
                    </button>
                    {total > 0 && (
                      <>
                        <Progress value={(complete / total) * 100} />
                        <small>
                          {complete}/{total} tasks
                        </small>
                      </>
                    )}
                    {r.snapshotDate && (
                      <p className="subtle">
                        Snapshot / deadline: {r.snapshotDate}
                      </p>
                    )}
                    <div className="postfoot">
                      <span>
                        {r.estimatedValue || r.price || 'Chưa estimate'}
                      </span>
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Mở nguồn ↗
                        </a>
                      )}
                    </div>
                    <button
                      className="sectionlink"
                      onClick={() =>
                        setEditing({
                          ...blank('task', date),
                          title: 'Airdrop · ' + r.title,
                          body: r.body,
                          url: r.url,
                          category: 'Airdrop',
                        })
                      }
                    >
                      Tạo việc cho ngày đang chọn <Plus size={15} />
                    </button>
                  </article>
                );
              })}
          </div>
          {!records.some((r) => r.kind === 'airdrop') && (
            <Empty>
              Thêm dự án đang research hoặc farming.
              <br />
              Mỗi dự án có checklist và có thể chuyển thành việc trong ngày.
            </Empty>
          )}
        </TabsContent>
        <TabsContent value="profit">
          <ProfitPanel
            records={records}
            date={date}
            create={() => create('profit')}
            edit={setEditing}
            loading={loading}
          />
        </TabsContent>
        <TabsContent value="coins">
          <div id="coin-calculator-top">
            <CoinCalculator onCreateProfit={profitFromCoin} />
          </div>
        </TabsContent>
      </Tabs>
      <footer>
        <span>DYLAN HQ · PERSONAL WORKSPACE</span>
        <span>Giờ Việt Nam · UTC+7</span>
      </footer>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && !busy) setEditing(null);
        }}
      >
        <DialogContent className="editor">
          <DialogTitle>
            {editing
              ? (editing.revision ? 'Chỉnh sửa ' : 'Thêm ') +
                names[editing.kind]
              : ''}
          </DialogTitle>
          <DialogDescription>
            {editing?.kind === 'post'
              ? 'English · degen × builder. Nội dung lưu trong kho của bạn.'
              : 'Lưu vào ngày đã chọn để dễ theo dõi và xem lại.'}
          </DialogDescription>
          {editing && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (await save(editing)) setEditing(null);
              }}
            >
              <label>
                {editing.kind === 'profit' ? 'Dự án / giao dịch' : 'Tiêu đề'}
                <input
                  required
                  maxLength={250}
                  value={editing.title}
                  onChange={(e) => patch('title', e.target.value)}
                  placeholder={
                    editing.kind === 'target'
                      ? 'Ví dụ: Replies có chất lượng'
                      : 'Nhập tiêu đề…'
                  }
                />
              </label>
              <div className="formgrid">
                <label>
                  {editing.kind === 'airdrop'
                    ? 'Deadline'
                    : editing.kind === 'profit'
                      ? editing.status === 'Đã chốt'
                        ? 'Ngày chốt'
                        : 'Ngày bắt đầu'
                      : 'Ngày'}
                  <input
                    required
                    type="date"
                    value={editing.date}
                    onChange={(e) => patch('date', e.target.value)}
                  />
                </label>
                {editing.kind !== 'note' && (
                  <label>
                    Giờ (UTC+7)
                    <input
                      type="time"
                      value={editing.time}
                      onChange={(e) => patch('time', e.target.value)}
                    />
                  </label>
                )}
              </div>
              {editing.kind !== 'note' && (
                <div className="formgrid">
                  <label>
                    Trạng thái
                    <Choice
                      label="Trạng thái"
                      value={editing.status}
                      options={states[editing.kind]}
                      onChange={(v) => patch('status', v)}
                    />
                  </label>
                  {['task', 'post', 'target', 'profit'].includes(
                    editing.kind,
                  ) && (
                    <label>
                      Chủ đề
                      <Choice
                        label="Chủ đề"
                        value={editing.category}
                        options={
                          editing.kind === 'post'
                            ? postCategories
                            : editing.kind === 'profit'
                              ? profitCategories
                              : categories
                        }
                        onChange={(v) => patch('category', v)}
                      />
                    </label>
                  )}
                </div>
              )}
              {['mint', 'airdrop', 'wl'].includes(editing.kind) && (
                <div className="formgrid">
                  <label>
                    Chain
                    <input
                      maxLength={250}
                      value={editing.chain}
                      onChange={(e) => patch('chain', e.target.value)}
                      placeholder="Ethereum, Solana, Base…"
                    />
                  </label>
                  <label>
                    {editing.kind === 'wl'
                      ? 'Mint price / giá spot'
                      : 'Giá / chi phí'}
                    <input
                      maxLength={250}
                      value={editing.price}
                      onChange={(e) => patch('price', e.target.value)}
                      placeholder="Free, 0.02 ETH…"
                    />
                  </label>
                </div>
              )}
              {editing.kind === 'wl' && (
                <div className="formgrid">
                  <label>
                    Nguồn WL
                    <input
                      maxLength={250}
                      value={editing.wlSource || ''}
                      onChange={(e) =>
                        setEditing((v) =>
                          v ? { ...v, wlSource: e.target.value } : v,
                        )
                      }
                      placeholder="Discord, giveaway, OG…"
                    />
                  </label>
                  <label>
                    Ngày mint dự kiến
                    <input
                      type="date"
                      value={editing.mintDate || ''}
                      onChange={(e) =>
                        setEditing((v) =>
                          v ? { ...v, mintDate: e.target.value } : v,
                        )
                      }
                    />
                  </label>
                  <label>
                    Estimated value
                    <input
                      maxLength={250}
                      value={editing.estimatedValue || ''}
                      onChange={(e) =>
                        setEditing((v) =>
                          v ? { ...v, estimatedValue: e.target.value } : v,
                        )
                      }
                      placeholder="$80"
                    />
                  </label>
                  <MoneyField
                    label="Giá bán (USD)"
                    cents={editing.soldPriceCents ?? 0}
                    onChange={(n) =>
                      setEditing((v) => (v ? { ...v, soldPriceCents: n } : v))
                    }
                  />
                </div>
              )}
              {editing.kind === 'target' && (
                <div className="formgrid">
                  <label>
                    Target cần đạt
                    <input
                      type="number"
                      min={1}
                      max={1000000000}
                      required
                      value={editing.target}
                      onChange={(e) => patch('target', Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Đã đạt
                    <input
                      type="number"
                      min={0}
                      max={1000000000}
                      required
                      value={editing.progress}
                      onChange={(e) =>
                        patch('progress', Number(e.target.value))
                      }
                    />
                  </label>
                </div>
              )}
              {editing.kind === 'profit' && (
                <>
                  <details className="coinconversiontools">
                    <summary>Quy đổi ETH, SOL hoặc coin khác → USD</summary>
                    <ProfitConversion onApply={applyConversion} />
                  </details>
                  {editing.conversions && (
                    <div className="savedsnapshots">
                      {moneyKeys.map((key) =>
                        editing.conversions?.[key] ? (
                          <section key={key}>
                            <h3>
                              {conversionLabels[key]} · Quy đổi đã áp dụng
                            </h3>
                            <ConversionDetails
                              value={editing.conversions[key]!}
                            />
                          </section>
                        ) : null,
                      )}
                    </div>
                  )}
                  <p className="subtle">
                    Mỗi mục là một giao dịch hoặc khoản thu. Nếu bán một phần,
                    chỉ nhập vốn tương ứng phần đã bán. Đánh dấu “Đã chốt” khi
                    khoản này hoàn tất; phí nhập riêng, chưa trừ vào tiền thu.
                  </p>
                  <div className="formgrid">
                    <MoneyField
                      key={editing.id + 'income'}
                      label="Tiền thu trước phí (USD)"
                      cents={editing.incomeCents ?? 0}
                      onChange={(n) => patch('incomeCents', n)}
                    />
                    <MoneyField
                      key={editing.id + 'cost'}
                      label="Vốn / chi phí chưa gồm phí (USD)"
                      cents={editing.costCents ?? 0}
                      onChange={(n) => patch('costCents', n)}
                    />
                    <MoneyField
                      key={editing.id + 'fee'}
                      label="Phí: gas, giao dịch… (USD)"
                      cents={editing.feeCents ?? 0}
                      onChange={(n) => patch('feeCents', n)}
                    />
                    <label>
                      Chain (nếu có)
                      <input
                        maxLength={250}
                        value={editing.chain}
                        onChange={(e) => patch('chain', e.target.value)}
                        placeholder="Ethereum, Solana…"
                      />
                    </label>
                  </div>
                  <div className="profitpreview">
                    {editing.status === 'Đã chốt'
                      ? 'Profit đã chốt'
                      : 'Chênh lệch tạm tính · chưa cộng vào profit'}
                    <strong
                      className={net(editing) < 0 ? 'negative' : 'positive'}
                    >
                      {Number.isFinite(net(editing))
                        ? money(net(editing))
                        : 'Nhập số tiền hợp lệ'}
                    </strong>
                  </div>
                </>
              )}
              <label>
                {editing.kind === 'post'
                  ? 'Nội dung tiếng Anh'
                  : 'Ghi chú / nội dung'}
                <textarea
                  rows={editing.kind === 'post' ? 7 : 4}
                  maxLength={16000}
                  value={editing.body}
                  onChange={(e) => patch('body', e.target.value)}
                  placeholder={
                    editing.kind === 'post'
                      ? 'What did you learn, build, or notice today?'
                      : 'Chi tiết, checklist, ý tưởng…'
                  }
                />
              </label>
              {editing.kind === 'post' && (
                <div
                  className={
                    'charcount ' +
                    (Array.from(editing.body).length > 275
                      ? 'danger'
                      : Array.from(editing.body).length > 250
                        ? 'warning'
                        : '')
                  }
                >
                  {Array.from(editing.body).length}/280 ký tự · đếm tham khảo; X
                  tính link và emoji theo quy tắc riêng.
                </div>
              )}
              {editing.kind !== 'note' && (
                <label>
                  {editing.kind === 'post'
                    ? 'Link bài đã đăng / nguồn'
                    : 'Đường dẫn'}
                  <input
                    type="url"
                    maxLength={2000}
                    value={editing.url}
                    onChange={(e) => patch('url', e.target.value)}
                    placeholder="https://…"
                  />
                </label>
              )}
              {editing.kind === 'post' && editing.status === 'Đã đăng' && (
                <fieldset className="metricsform">
                  <legend>Số liệu bài đăng · nhập tay</legend>
                  {(
                    [
                      'impressions',
                      'likes',
                      'replies',
                      'reposts',
                      'followers',
                    ] as const
                  ).map((k) => (
                    <label key={k}>
                      {k}
                      <input
                        type="number"
                        min={0}
                        max={1000000000}
                        value={editing[k]}
                        onChange={(e) => patch(k, Number(e.target.value))}
                      />
                    </label>
                  ))}
                </fieldset>
              )}
              {error && (
                <p className="formerror" role="alert">
                  {error}
                </p>
              )}
              <div className="editoractions">
                {['mint', 'airdrop'].includes(editing.kind) && (
                  <button
                    type="button"
                    className="textbutton"
                    onClick={() =>
                      setEditing({
                        ...blank('profit', date),
                        title: editing.title,
                        category: editing.kind === 'mint' ? 'NFT' : 'Airdrop',
                        chain: editing.chain,
                        url: editing.url,
                        body:
                          'Theo dõi từ ' +
                          names[editing.kind] +
                          ': ' +
                          editing.title +
                          '\\n' +
                          editing.body,
                      })
                    }
                  >
                    Theo dõi profit
                  </button>
                )}
                {editing.revision > 0 && (
                  <button
                    type="button"
                    className="iconbutton danger"
                    aria-label="Xóa mục"
                    onClick={() => setDeleting(editing)}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                {editing.kind === 'post' && (
                  <>
                    <button
                      type="button"
                      className="textbutton"
                      onClick={() => void copy(editing.body)}
                    >
                      Sao chép
                    </button>
                    <a
                      className="textbutton"
                      href={
                        'https://x.com/intent/post?text=' +
                        encodeURIComponent(editing.body)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Mở trên X ↗
                    </a>
                  </>
                )}
                <button
                  className="action primary"
                  disabled={busy || loading || auth}
                  type="submit"
                >
                  {busy
                    ? 'Đang lưu…'
                    : 'Lưu ' + names[editing.kind].toLowerCase()}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Xóa mục này?</AlertDialogTitle>
          <AlertDialogDescription>
            “{deleting?.title}” sẽ bị xóa khỏi dữ liệu đã lưu.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Giữ lại</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
