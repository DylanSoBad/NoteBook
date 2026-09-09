'use client';
import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, ArrowUpRight } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableCell,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { type Entry, profitCategories } from '@/lib/model';
import {
  type Period,
  periods,
  money,
  net,
  inPeriod,
  profitTotals,
  parseUsd,
} from '@/lib/profit';

export function MoneyField({
  label,
  cents,
  onChange,
}: {
  label: string;
  cents: number;
  onChange: (n: number) => void;
}) {
  const [value, setValue] = useState((cents / 100).toFixed(2));
  const lastInput = useRef(cents);
  useEffect(() => {
    if (!Object.is(cents, lastInput.current)) {
      lastInput.current = cents;
      setValue(Number.isFinite(cents) ? (cents / 100).toFixed(2) : '');
    }
  }, [cents]);
  return (
    <label>
      {label}
      <input
        type="text"
        inputMode="decimal"
        required
        pattern="[0-9]+([.][0-9]{1,2})?"
        title="Nhập USD với tối đa 2 số thập phân, ví dụ 12.50"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          lastInput.current = parseUsd(e.target.value);
          onChange(lastInput.current);
        }}
      />
    </label>
  );
}
export default function ProfitPanel({
  records,
  date,
  create,
  edit,
  loading,
}: {
  records: Entry[];
  date: string;
  create: () => void;
  edit: (e: Entry) => void;
  loading: boolean;
}) {
  const [period, setPeriod] = useState<Period>('Tháng');
  const [category, setCategory] = useState('Tất cả');
  const all = records.filter((r) => r.kind === 'profit');
  const selected = all.filter(
    (r) =>
      inPeriod(r.date, date, period) &&
      (category === 'Tất cả' || r.category === category),
  );
  const totals = profitTotals(selected);
  const open = all.filter(
    (r) =>
      r.status === 'Chưa chốt' &&
      (category === 'Tất cả' || r.category === category),
  );
  const list = [...selected].sort((a, b) => b.date.localeCompare(a.date));
  const realized = all
    .filter((r) => r.status === 'Đã chốt')
    .sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  const trend = realized.reduce<
    { date: string; profit: number; total: number }[]
  >((items, r) => {
    running += net(r);
    const last = items.at(-1);
    if (last && last.date === r.date) {
      last.profit += net(r);
      last.total = running;
    } else items.push({ date: r.date, profit: net(r), total: running });
    return items;
  }, []);
  const sourceData = profitCategories
    .map((name, index) => ({
      name,
      value: profitTotals(realized.filter((r) => r.category === name)).profit,
      color: ['#ceef76', '#60a5fa', '#a78bfa', '#fb923c'][index],
    }))
    .filter((x) => x.value !== 0);
  const goal = 500000;
  const best = Math.max(0, ...trend.map((x) => x.profit));
  const days = Math.max(1, new Set(realized.map((r) => r.date)).size);
  const todayTotal = profitTotals(
    all.filter((r) => r.date === date && r.status === 'Đã chốt'),
  ).profit;
  return (
    <>
      <div className="viewheading">
        <div>
          <h2>Profit Tracker</h2>
          <p className="subtle">NFT · Airdrop · Trade · Công việc Web3</p>
        </div>
        <button className="action primary" onClick={create}>
          <Plus size={17} /> Thêm khoản profit
        </button>
      </div>
      <div className="profitfilters">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            {periods.map((p) => (
              <TabsTrigger key={p} value={p}>
                {p}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <span className="subtle">
          {period === 'Tất cả'
            ? 'Toàn bộ lịch sử'
            : 'Theo ngày đang chọn: ' + date}
        </span>
        <Select
          value={category}
          onValueChange={(v) => {
            if (v) setCategory(v);
          }}
        >
          <SelectTrigger aria-label="Nguồn profit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['Tất cả', ...profitCategories].map((c) => (
              <SelectItem value={c} key={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="profitstats">
        <article className="profitmain">
          <span>PROFIT ĐÃ CHỐT · USD</span>
          <strong className={totals.profit < 0 ? 'negative' : 'positive'}>
            {loading ? '…' : money(totals.profit)}
          </strong>
          <p>
            {totals.count} khoản đã chốt ·{' '}
            {totals.roi === null
              ? 'ROI — (chưa có vốn / phí)'
              : `ROI ${totals.roi.toFixed(2)}%`}
          </p>
        </article>
        <article>
          <span>Tiền thu</span>
          <strong>{money(totals.income)}</strong>
          <small>Các khoản đã chốt trong kỳ</small>
        </article>
        <article>
          <span>Vốn + chi phí</span>
          <strong>{money(totals.cost)}</strong>
          <small>Giá vốn tương ứng khoản đã chốt</small>
        </article>
        <article>
          <span>Phí</span>
          <strong>{money(totals.fees)}</strong>
          <small>Gas, giao dịch, nền tảng…</small>
        </article>
      </div>
      <section className="profitinsights">
        <div className="goalprogress">
          <div>
            <span>Mục tiêu profit</span>
            <strong>{money(profitTotals(realized).profit)} / $5,000</strong>
          </div>
          <div className="goalrail">
            <i
              style={{
                width: `${Math.min(100, Math.max(0, (profitTotals(realized).profit / goal) * 100))}%`,
              }}
            />
          </div>
          <small>
            Hôm nay:{' '}
            <b className={todayTotal < 0 ? 'negative' : 'positive'}>
              {money(todayTotal)}
            </b>{' '}
            · Còn {money(Math.max(0, goal - profitTotals(realized).profit))}
          </small>
        </div>
        <div className="chartgrid">
          <article>
            <h3>Profit cộng dồn</h3>
            {trend.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={trend}>
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#ceef76"
                    fill="#ceef7622"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#ceef76"
                    strokeWidth={2}
                  />
                  <ReferenceLine
                    y={goal}
                    stroke="#60a5fa"
                    strokeDasharray="4 4"
                  />
                  <Tooltip formatter={(v) => money(Number(v))} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="subtle">
                Ghi khoản profit đã chốt để xem xu hướng.
              </p>
            )}
          </article>
          <article>
            <h3>Phân bổ nguồn</h3>
            {sourceData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={76}
                  >
                    {sourceData.map((x) => (
                      <Cell key={x.name} fill={x.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => money(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="subtle">Chưa có profit đã chốt.</p>
            )}
            <div className="chartlegend">
              {sourceData.map((x) => (
                <span key={x.name}>
                  <i style={{ background: x.color }} />
                  {x.name}
                </span>
              ))}
            </div>
          </article>
          <article className="quickstats">
            <h3>Thống kê nhanh</h3>
            <p>
              <span>Ngày tốt nhất</span>
              <b>{money(best)}</b>
            </p>
            <p>
              <span>Trung bình/ngày</span>
              <b>{money(Math.round(profitTotals(realized).profit / days))}</b>
            </p>
            <p>
              <span>ROI tổng</span>
              <b>
                {profitTotals(realized).roi?.toFixed(1) + '%' || '—'}
              </b>
            </p>
          </article>
        </div>
      </section>
      <p className="profitexplain">
        Profit = tiền thu − vốn − phí. Nhập USD hoặc quy đổi từ coin trong từng
        khoản profit. Tỷ giá được giữ nguyên sau khi lưu. Khoản chưa chốt không
        được cộng vào profit.
      </p>
      <div className="profitbreakdown">
        {profitCategories
          .filter((c) => category === 'Tất cả' || c === category)
          .map((c) => {
            const t = profitTotals(selected.filter((r) => r.category === c));
            return (
              <article key={c}>
                <span>{c}</span>
                <strong className={t.profit < 0 ? 'negative' : 'positive'}>
                  {money(t.profit)}
                </strong>
                <small>{t.count} khoản đã chốt</small>
              </article>
            );
          })}
      </div>
      <section className="panel">
        <div className="panelheading">
          <h2>
            Sổ profit{' '}
            <span className="subtle">· {list.length} khoản trong kỳ</span>
          </h2>
        </div>
        {list.length ? (
          <Table className="profittable">
            <TableCaption>
              Ngày là ngày chốt; với khoản chưa chốt, đây là ngày bắt đầu theo
              dõi.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày / dự án</TableHead>
                <TableHead>Nguồn</TableHead>
                <TableHead>Tiền thu</TableHead>
                <TableHead>Vốn + phí</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>
                  <span className="sr-only">Chỉnh sửa</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <button
                      onClick={() => edit({ ...r })}
                      className="profitproject"
                    >
                      <strong>{r.title}</strong>
                      <span>
                        {r.date}
                        {r.chain ? ' · ' + r.chain : ''}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>
                    {money(r.incomeCents ?? 0)}
                    {r.conversions?.incomeCents && (
                      <small className="ledgercoin">
                        {r.conversions.incomeCents.amount}{' '}
                        {r.conversions.incomeCents.symbol.toUpperCase()}
                      </small>
                    )}
                  </TableCell>
                  <TableCell>
                    {money((r.costCents ?? 0) + (r.feeCents ?? 0))}
                  </TableCell>
                  <TableCell
                    className={
                      r.status === 'Đã chốt'
                        ? net(r) < 0
                          ? 'negative'
                          : 'positive'
                        : ''
                    }
                  >
                    {r.status === 'Đã chốt' ? money(net(r)) : '—'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        'pill ' + (r.status === 'Đã chốt' ? 'green' : '')
                      }
                    >
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      className="iconbutton"
                      onClick={() => edit({ ...r })}
                      aria-label={'Sửa profit ' + r.title}
                    >
                      <Pencil size={16} />
                    </button>
                    {r.url && (
                      <a
                        className="iconbutton"
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={'Mở giao dịch ' + r.title}
                      >
                        <ArrowUpRight size={16} />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="empty">
            Chưa có khoản profit trong kỳ này.
            <br />
            Thêm giao dịch hoặc thu nhập đầu tiên để bắt đầu.
          </div>
        )}
      </section>
      <section className="panel openprofit">
        <div>
          <h2>Đang theo dõi · {open.length} khoản chưa chốt</h2>
          <p className="subtle">
            Toàn bộ thời gian{category !== 'Tất cả' ? ' · ' + category : ''}.
            Cập nhật ngày chốt, tiền thu và vốn tương ứng khi hoàn tất.
          </p>
        </div>
        <strong>
          {money(
            open.reduce(
              (s, r) => s + (r.costCents ?? 0) + (r.feeCents ?? 0),
              0,
            ),
          )}
          <small>Vốn + phí đã nhập</small>
        </strong>
        {open.length > 0 && (
          <div className="openprofitlist">
            {open.map((r) => (
              <button
                key={r.id}
                className="textbutton"
                onClick={() => edit({ ...r })}
              >
                {r.title} <Pencil size={14} />
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
