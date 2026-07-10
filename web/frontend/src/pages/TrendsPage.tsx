import { useEffect, useMemo, useState } from "react";
import type { Theme } from "../hooks/useTheme";
import type { WidgetStatus } from "../data/types";
import { ThemeToggle } from "../components/ThemeToggle";
import { TrendChart } from "../components/TrendChart";
import { CoocNetwork } from "../components/CoocNetwork";
import { Sparkline } from "../components/Sparkline";
import { Widget } from "../components/Widget";
import { IconGap, IconSparkle, IconTrend } from "../components/icons";
import { formatCompact, formatInt, formatPercent } from "../lib/format";
import { analyticsApi } from "../lib/api";
import {
  COOC_EDGES,
  COOC_NODES,
  TREND_TOPICS,
  computeGrowth,
  slicePoints,
  type CoocEdge,
  type CoocNode,
  type Granularity,
  type GrowthRow,
  type TrendRange,
} from "../data/trendsSample";
import type { TrendPoint, TrendSeries } from "../data/types";

const RANGES: { id: TrendRange; label: string }[] = [
  { id: "12m", label: "12 tháng" },
  { id: "24m", label: "24 tháng" },
  { id: "5y", label: "5 năm" },
];

const GRANS: { id: Granularity; label: string }[] = [
  { id: "year", label: "Năm" },
  { id: "quarter", label: "Quý" },
];

type Demo = "auto" | "loading" | "empty" | "error";

const STATUS_LABEL: Record<GrowthRow["status"], string> = {
  emerging: "Nổi lên",
  stable: "Ổn định",
  declining: "Suy giảm",
};

interface Props {
  theme: Theme;
  toggle: () => void;
}

export function TrendsPage({ theme, toggle }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(TREND_TOPICS.map((t) => t.key)),
  );
  const [range, setRange] = useState<TrendRange>("5y");
  const [gran, setGran] = useState<Granularity>("year");
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState<Demo>("auto");
  const [remotePoints, setRemotePoints] = useState<TrendPoint[] | null>(null);
  const [remoteGrowth, setRemoteGrowth] = useState<GrowthRow[] | null>(null);
  const [remoteNetwork, setRemoteNetwork] = useState<{ nodes: CoocNode[]; edges: CoocEdge[] } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      analyticsApi.trends(range, gran),
      analyticsApi.growth(range, gran),
      analyticsApi.cooccurrence(),
    ])
      .then(([points, growth, network]) => {
        if (!alive) return;
        setRemotePoints(points);
        setRemoteGrowth(growth);
        setRemoteNetwork(network);
      })
      .catch(() => {
        if (!alive) return;
        setRemotePoints(null);
        setRemoteGrowth(null);
        setRemoteNetwork(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [range, gran]);

  const points = useMemo(() => remotePoints ?? slicePoints(range, gran), [range, gran, remotePoints]);
  const topics = useMemo<TrendSeries[]>(() => {
    const series = remotePoints?.length ? analyticsApi.seriesFromPoints(remotePoints) : TREND_TOPICS;
    return series.length ? series : TREND_TOPICS;
  }, [remotePoints]);

  useEffect(() => {
    setSelected(new Set(topics.map((topic) => topic.key)));
  }, [topics]);

  const activeSeries = useMemo(
    () => topics.filter((t) => selected.has(t.key)),
    [selected, topics],
  );
  const growth = useMemo(
    () => (remoteGrowth ?? computeGrowth(points)).filter((g) => selected.has(g.key)),
    [remoteGrowth, points, selected],
  );

  const totalPublications = useMemo(() => {
    let sum = 0;
    for (const p of points) for (const t of activeSeries) sum += Number(p[t.key]);
    return sum;
  }, [points, activeSeries]);

  const avgGrowth = growth.length
    ? growth.reduce((a, g) => a + g.cagr, 0) / growth.length
    : 0;

  const baseStatus: WidgetStatus =
    demo === "error"
      ? "error"
      : demo === "empty"
        ? "empty"
        : demo === "loading" || loading
          ? "loading"
          : selected.size === 0
            ? "empty"
            : "ready";

  const toggleTopic = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const allOn = selected.size === topics.length;

  return (
    <main className="main trends">
      <header className="topbar">
        <div className="topbar__lead">
          <h1>Phân tích xu hướng</h1>
          <p className="topbar__sub">
            So sánh diễn biến công bố, tốc độ tăng trưởng và mối liên hệ giữa các chủ đề nghiên cứu
          </p>
        </div>
        <div className="topbar__controls">
          <div className="seg" role="group" aria-label="Khoảng thời gian">
            {RANGES.map((r) => (
              <button
                key={r.id}
                className={`seg__btn ${range === r.id ? "is-active" : ""}`}
                aria-pressed={range === r.id}
                onClick={() => setRange(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Độ chi tiết">
            {GRANS.map((g) => (
              <button
                key={g.id}
                className={`seg__btn ${gran === g.id ? "is-active" : ""}`}
                aria-pressed={gran === g.id}
                onClick={() => setGran(g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      {/* topic selector */}
      <div className="topicbar">
        <div className="topicbar__chips" role="group" aria-label="Chọn chủ đề phân tích">
          {topics.map((t) => {
            const on = selected.has(t.key);
            return (
              <button
                key={t.key}
                className={`topicchip ${on ? "is-on" : ""}`}
                aria-pressed={on}
                onClick={() => toggleTopic(t.key)}
                style={on ? ({ "--chip": `var(${t.token})` } as React.CSSProperties) : undefined}
              >
                <span className="topicchip__dot" style={{ background: `var(${t.token})` }} />
                {t.label}
              </button>
            );
          })}
        </div>
        <button
          className="topicbar__all"
          onClick={() =>
            setSelected(allOn ? new Set() : new Set(topics.map((t) => t.key)))
          }
        >
          {allOn ? "Bỏ chọn tất cả" : "Chọn tất cả"}
        </button>
      </div>

      {/* selection summary */}
      <div className="trendsum">
        <SumStat label="Chủ đề" value={formatInt(selected.size)} unit={`/ ${topics.length}`} />
        <SumStat label="Tổng công bố (khoảng đang xem)" value={formatCompact(totalPublications)} />
        <SumStat
          label="Tăng trưởng TB (CAGR)"
          value={formatPercent(Math.round(avgGrowth * 100))}
          tone={avgGrowth > 0 ? "up" : avgGrowth < 0 ? "down" : "flat"}
        />
      </div>

      <div className="trends-grid">
        <Widget
          className="tw-compare"
          title="So sánh xu hướng theo thời gian"
          subtitle={`Số công bố / ${gran === "year" ? "năm" : "quý"} theo chủ đề`}
          icon={<IconTrend />}
          status={baseStatus}
          onRetry={() => setDemo("auto")}
          emptyMessage="Chọn ít nhất một chủ đề để xem biểu đồ so sánh"
          skeleton={<div className="skel skel--chart" />}
        >
          <TrendChart data={points} series={activeSeries} themeKey={`${theme}-${gran}`} hideLegend />
        </Widget>

        <Widget
          className="tw-growth"
          title="Tốc độ tăng trưởng"
          subtitle="CAGR trong khoảng đang xem · sắp xếp giảm dần"
          icon={<IconSparkle />}
          status={baseStatus}
          onRetry={() => setDemo("auto")}
          emptyMessage="Chưa có chủ đề nào được chọn"
        >
          <ul className="growth">
            {growth.map((g) => (
              <li className="growth__row" key={g.key}>
                <span className="growth__dot" style={{ background: `var(${g.token})` }} />
                <div className="growth__meta">
                  <span className="growth__label">{g.label}</span>
                  <span className="growth__latest num">{formatInt(g.latest)} công bố</span>
                </div>
                <Sparkline values={g.trend} token={g.token} />
                <div className="growth__figs">
                  <span className={`growth__cagr num growth__cagr--${g.status}`}>
                    <Arrow status={g.status} />
                    {formatPercent(Math.round(g.cagr * 100))}
                  </span>
                  <span className={`growth__badge growth__badge--${g.status}`}>
                    {STATUS_LABEL[g.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Widget>

        <Widget
          className="tw-cooc"
          title="Mạng đồng xuất hiện từ khóa"
          subtitle="Từ khóa thường xuất hiện cùng nhau trong các công bố"
          icon={<IconGap />}
          status={baseStatus}
          onRetry={() => setDemo("auto")}
          emptyMessage="Chọn chủ đề để dựng mạng từ khóa"
        >
          <CoocNetwork
            nodes={remoteNetwork?.nodes ?? COOC_NODES}
            edges={remoteNetwork?.edges ?? COOC_EDGES}
            selected={selected}
            themeKey={theme}
          />
        </Widget>
      </div>

      <div className="statepick statepick--search" role="group" aria-label="Xem trước trạng thái (demo)">
        <span className="statepick__label">Xem trạng thái</span>
        {(["auto", "loading", "empty", "error"] as Demo[]).map((d) => (
          <button
            key={d}
            className={`statepick__btn ${demo === d ? "is-active" : ""}`}
            onClick={() => setDemo(d)}
          >
            {d === "auto" ? "Thực tế" : d === "loading" ? "Đang tải" : d === "empty" ? "Trống" : "Lỗi"}
          </button>
        ))}
      </div>
    </main>
  );
}

function SumStat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "up" | "down" | "flat";
}) {
  return (
    <div className="sumstat">
      <span className="sumstat__label">{label}</span>
      <span className={`sumstat__value num ${tone ? `sumstat__value--${tone}` : ""}`}>
        {value}
        {unit && <span className="sumstat__unit">{unit}</span>}
      </span>
    </div>
  );
}

function Arrow({ status }: { status: GrowthRow["status"] }) {
  if (status === "emerging")
    return (
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
        <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === "declining")
    return (
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
