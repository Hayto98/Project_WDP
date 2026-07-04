import { useEffect, useMemo, useState } from "react";
import type { Theme } from "../hooks/useTheme";
import type { WidgetStatus } from "../data/types";
import { ThemeToggle } from "../components/ThemeToggle";
import { Widget } from "../components/Widget";
import { GapMatrix } from "../components/GapMatrix";
import { GapScatter } from "../components/GapScatter";
import { Sparkline } from "../components/Sparkline";
import { IconGap, IconGrid, IconSparkle, IconTrend } from "../components/icons";
import { formatInt } from "../lib/format";
import {
  GAP_ASPECTS,
  GAP_FIELDS,
  buildGaps,
  isGap,
  type GapItem,
} from "../data/gapSample";

type Demo = "auto" | "loading" | "empty" | "error";

interface Props {
  theme: Theme;
  toggle: () => void;
}

export function GapPage({ theme, toggle }: Props) {
  const allItems = useMemo(() => buildGaps(), []);
  const [threshold, setThreshold] = useState(0.35);
  const [fields, setFields] = useState<Set<string>>(
    () => new Set(GAP_FIELDS.map((f) => f.key)),
  );
  const [aspects, setAspects] = useState<Set<string>>(() => new Set(GAP_ASPECTS));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState<Demo>("auto");

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 520);
    return () => clearTimeout(t);
  }, []);

  const items = useMemo(
    () => allItems.filter((i) => fields.has(i.fieldKey) && aspects.has(i.aspect)),
    [allItems, fields, aspects],
  );

  const gapItems = useMemo(
    () =>
      items
        .filter((i) => isGap(i, threshold))
        .sort((a, b) => b.score - a.score),
    [items, threshold],
  );

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const shownFields = GAP_FIELDS.filter((f) => fields.has(f.key));

  const strongest = gapItems[0];
  const avgScore = gapItems.length
    ? gapItems.reduce((a, g) => a + g.score, 0) / gapItems.length
    : 0;

  const status: WidgetStatus =
    demo === "error"
      ? "error"
      : demo === "empty"
        ? "empty"
        : demo === "loading" || loading
          ? "loading"
          : items.length === 0
            ? "empty"
            : "ready";

  const toggleField = (key: string) =>
    setFields((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const toggleAspect = (a: string) =>
    setAspects((prev) => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });

  return (
    <main className="main gap">
      <header className="topbar">
        <div className="topbar__lead">
          <h1>Research Gap</h1>
          <p className="topbar__sub">
            Phát hiện khoảng trống nghiên cứu — nơi mức quan tâm cao nhưng công bố còn thưa
          </p>
        </div>
        <div className="topbar__controls">
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      {/* controls */}
      <div className="gapctl">
        <div className="gapctl__threshold">
          <label htmlFor="gap-th">
            Ngưỡng mật độ ≤ <strong className="num">{Math.round(threshold * 100)}%</strong>
          </label>
          <input
            id="gap-th"
            type="range"
            min={10}
            max={60}
            step={5}
            value={Math.round(threshold * 100)}
            onChange={(e) => setThreshold(Number(e.target.value) / 100)}
          />
          <span className="gapctl__hint num">{gapItems.length} khoảng trống</span>
        </div>

        <div className="gapctl__filters">
          <div className="gapchips" role="group" aria-label="Lọc lĩnh vực">
            {GAP_FIELDS.map((f) => {
              const on = fields.has(f.key);
              return (
                <button
                  key={f.key}
                  className={`gapchip ${on ? "is-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggleField(f.key)}
                  style={on ? ({ "--chip": `var(${f.token})` } as React.CSSProperties) : undefined}
                >
                  <span className="gapchip__dot" style={{ background: `var(${f.token})` }} />
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="gapchips gapchips--aspect" role="group" aria-label="Lọc khía cạnh">
            {GAP_ASPECTS.map((a) => {
              const on = aspects.has(a);
              return (
                <button
                  key={a}
                  className={`gapchip gapchip--plain ${on ? "is-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggleAspect(a)}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* summary */}
      <div className="trendsum">
        <div className="sumstat">
          <span className="sumstat__label">Khoảng trống phát hiện</span>
          <span className="sumstat__value num">{formatInt(gapItems.length)}</span>
        </div>
        <div className="sumstat">
          <span className="sumstat__label">Điểm cơ hội TB</span>
          <span className="sumstat__value num">{Math.round(avgScore * 100)}</span>
        </div>
        <div className="sumstat">
          <span className="sumstat__label">Cơ hội nổi bật nhất</span>
          <span className="sumstat__value sumstat__value--sm">
            {strongest ? `${strongest.fieldLabel} · ${strongest.aspect}` : "—"}
          </span>
        </div>
      </div>

      {/* heatmap + detail */}
      <div className="gap-top">
        <Widget
          className="gw-map"
          title="Bản đồ khoảng trống"
          subtitle="Mật độ công bố theo Lĩnh vực × Khía cạnh · chọn ô để xem chi tiết"
          icon={<IconGrid />}
          status={status}
          onRetry={() => setDemo("auto")}
          emptyMessage="Không có ô nào khớp bộ lọc"
          skeleton={<div className="skel skel--block" style={{ height: 260 }} />}
        >
          <GapMatrix
            items={items}
            fields={shownFields}
            aspects={[...aspects]}
            densityThreshold={threshold}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </Widget>

        <Widget
          className="gw-detail"
          title="Chi tiết khoảng trống"
          icon={<IconSparkle />}
          status={status}
          onRetry={() => setDemo("auto")}
          emptyMessage="Chọn một ô trên bản đồ"
        >
          {selected ? (
            <GapDetail item={selected} isGapCell={isGap(selected, threshold)} />
          ) : (
            <div className="gapdetail__empty">
              <p>Chọn một ô trên bản đồ hoặc một điểm trên biểu đồ để xem phân tích chi tiết.</p>
            </div>
          )}
        </Widget>
      </div>

      {/* ranking + scatter */}
      <div className="gap-bottom">
        <Widget
          className="gw-rank"
          title="Xếp hạng cơ hội nghiên cứu"
          subtitle="Điểm cơ hội = mức quan tâm × độ khan hiếm công bố"
          icon={<IconTrend />}
          status={status}
          onRetry={() => setDemo("auto")}
          emptyMessage="Không có khoảng trống nào với ngưỡng hiện tại"
        >
          {gapItems.length ? (
            <ol className="gaprank">
              {gapItems.map((g, idx) => (
                <li
                  key={g.id}
                  className={`gaprank__row ${selectedId === g.id ? "is-selected" : ""}`}
                >
                  <button className="gaprank__btn" onClick={() => setSelectedId(g.id)}>
                    <span className="gaprank__rank num">{idx + 1}</span>
                    <span className="gaprank__dot" style={{ background: `var(${g.token})` }} />
                    <span className="gaprank__meta">
                      <span className="gaprank__title">
                        {g.fieldLabel} · {g.aspect}
                      </span>
                      <span className="gaprank__sub num">
                        {formatInt(g.papers)} bài · mật độ {Math.round(g.density * 100)}% · quan tâm{" "}
                        {Math.round(g.interest * 100)}%
                      </span>
                    </span>
                    <span className="gaprank__score">
                      <span className="gaprank__bar" aria-hidden>
                        <span style={{ width: `${g.score * 100}%`, background: `var(${g.token})` }} />
                      </span>
                      <span className="gaprank__scoreval num">{Math.round(g.score * 100)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="widget__state">
              <p className="widget__state-title">Không có khoảng trống nào</p>
              <p className="widget__state-desc">
                Hạ ngưỡng mật độ hoặc mở rộng bộ lọc để tìm cơ hội.
              </p>
            </div>
          )}
        </Widget>

        <Widget
          className="gw-scatter"
          title="Tiềm năng × Mật độ"
          subtitle="Góc trên-trái = quan tâm cao, công bố thấp = khoảng trống"
          icon={<IconGap />}
          status={status}
          onRetry={() => setDemo("auto")}
          emptyMessage="Không có dữ liệu để hiển thị"
        >
          <GapScatter
            items={items}
            densityThreshold={threshold}
            selectedId={selectedId}
            onSelect={setSelectedId}
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

function GapDetail({ item, isGapCell }: { item: GapItem; isGapCell: boolean }) {
  return (
    <div className="gapdetail">
      <div className="gapdetail__head">
        <span className="gapdetail__dot" style={{ background: `var(${item.token})` }} />
        <div>
          <p className="gapdetail__field">{item.fieldLabel}</p>
          <p className="gapdetail__aspect">{item.aspect}</p>
        </div>
        {isGapCell && <span className="gapdetail__flag">◆ Khoảng trống</span>}
      </div>

      <div className="gapdetail__metrics">
        <Metric label="Công bố" value={formatInt(item.papers)} />
        <Metric label="Mật độ" value={`${Math.round(item.density * 100)}%`} />
        <Metric label="Quan tâm" value={`${Math.round(item.interest * 100)}%`} />
        <Metric label="Điểm cơ hội" value={String(Math.round(item.score * 100))} accent={isGapCell} />
      </div>

      <div className="gapdetail__trend">
        <span className="gapdetail__sublabel">Xu hướng công bố 6 kỳ</span>
        <Sparkline values={item.trend} token={item.token} width={220} height={44} />
      </div>

      <div className="gapdetail__kw">
        <span className="gapdetail__sublabel">Từ khóa liên quan</span>
        <div className="gapdetail__tags">
          {item.keywords.map((k) => (
            <span key={k} className="tag">
              {k}
            </span>
          ))}
        </div>
      </div>

      <div className="gapdetail__dir">
        <span className="gapdetail__sublabel">Gợi ý hướng nghiên cứu</span>
        <p>{item.direction}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`gmetric ${accent ? "gmetric--accent" : ""}`}>
      <span className="gmetric__value num">{value}</span>
      <span className="gmetric__label">{label}</span>
    </div>
  );
}
