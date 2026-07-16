import { useCallback, useEffect, useMemo, useState } from "react";
import type { Theme } from "../hooks/useTheme";
import type { WidgetStatus } from "../data/types";
import { ThemeToggle } from "../components/ThemeToggle";
import { Widget } from "../components/Widget";
import { GapMatrix } from "../components/GapMatrix";
import { GapScatter } from "../components/GapScatter";
import { Sparkline } from "../components/Sparkline";
import { LiveGapPanel } from "../components/LiveGapPanel";
import { IconGap, IconGrid, IconRefresh, IconSparkle, IconTrend } from "../components/icons";
import { formatInt } from "../lib/format";
import { aiApi, analyticsApi } from "../lib/api";
import { SHOW_DEMO_CONTROLS, USE_SAMPLE_FALLBACK } from "../lib/flags";
import {
  GAP_ASPECTS,
  GAP_FIELDS,
  buildGaps,
  isGap,
  type GapItem,
} from "../data/gapSample";

type Demo = "auto" | "loading" | "empty" | "error";
type GapMode = "corpus" | "live";

interface GapAiSnapshot {
  summary: string;
  directions: { topic: string; rationale: string }[];
  evidence: { label: string; papers: number }[];
}

interface Props {
  theme: Theme;
  toggle: () => void;
}

export function GapPage({ theme, toggle }: Props) {
  const [mode, setMode] = useState<GapMode>("corpus");
  const [remoteItems, setRemoteItems] = useState<GapItem[] | null>(null);
  const [hasReport, setHasReport] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [corpusAi, setCorpusAi] = useState<GapAiSnapshot>({ summary: "", directions: [], evidence: [] });
  const [loadError, setLoadError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const allItems = useMemo(() => {
    if (mode === 'live') return [];
    return remoteItems ?? (USE_SAMPLE_FALLBACK && !loadError ? buildGaps() : []);
  }, [remoteItems, loadError, mode]);
  const fieldOptions = useMemo(() => {
    if (mode === 'live') return [];
    const seen = new Map<string, { key: string; label: string; token: string }>();
    for (const item of allItems) {
      if (!seen.has(item.fieldKey)) {
        seen.set(item.fieldKey, { key: item.fieldKey, label: item.fieldLabel, token: item.token });
      }
    }
    return seen.size ? [...seen.values()] : USE_SAMPLE_FALLBACK && !loadError ? GAP_FIELDS : [];
  }, [allItems, loadError, mode]);
  const aspectOptions = useMemo(() => {
    if (mode === 'live') return [];
    const values = [...new Set(allItems.map((item) => item.aspect))];
    return values.length ? values : USE_SAMPLE_FALLBACK && !loadError ? GAP_ASPECTS : [];
  }, [allItems, loadError, mode]);
  const [threshold, setThreshold] = useState(0.35);
  const [fields, setFields] = useState<Set<string>>(
    () => new Set(USE_SAMPLE_FALLBACK ? GAP_FIELDS.map((f) => f.key) : []),
  );
  const [aspects, setAspects] = useState<Set<string>>(() => new Set(USE_SAMPLE_FALLBACK ? GAP_ASPECTS : []));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState<Demo>("auto");

  const loadGaps = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const result = await analyticsApi.gaps(0.35);
      setRemoteItems(result.items);
      setHasReport(result.hasReport);
      setGeneratedAt(result.generatedAt);
      setCorpusAi(result.ai);
      setFields(new Set(result.items.map((item) => item.fieldKey)));
      setAspects(new Set(result.items.map((item) => item.aspect)));
      setLoadError(false);
      setSelectedId((current) => {
        if (current && result.items.some((item) => item.id === current)) return current;
        const firstGap = result.items.find((item) => isGap(item, 0.35)) ?? result.items[0];
        return firstGap?.id ?? null;
      });
    } catch (err) {
      setRemoteItems(null);
      setHasReport(false);
      setGeneratedAt(null);
      setCorpusAi({ summary: "", directions: [], evidence: [] });
      setFields(USE_SAMPLE_FALLBACK ? new Set(GAP_FIELDS.map((f) => f.key)) : new Set());
      setAspects(USE_SAMPLE_FALLBACK ? new Set(GAP_ASPECTS) : new Set());
      setLoadError(true);
      setErrorMessage(err instanceof Error ? err.message : "Không tải được báo cáo Research Gap.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "corpus") void loadGaps();
    else setSelectedId(null);
  }, [mode, loadGaps]);

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
  const shownFields = fieldOptions.filter((f) => fields.has(f.key));
  const shownAspects = aspectOptions.filter((a) => aspects.has(a));

  const strongest = gapItems[0];
  const avgScore = gapItems.length
    ? gapItems.reduce((a, g) => a + g.score, 0) / gapItems.length
    : 0;

  const emptyMessage = loadError
    ? errorMessage || "Không tải được báo cáo Research Gap."
    : !hasReport && !USE_SAMPLE_FALLBACK
      ? "Chưa có báo cáo Research Gap từ corpus. Báo cáo tự chạy sau khi đồng bộ dữ liệu, hoặc nhờ admin bấm Refresh reports."
      : "Không có ô nào khớp bộ lọc hiện tại.";

  const status: WidgetStatus =
    demo === "error"
      ? "error"
      : loadError
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

  const generatedLabel = generatedAt
    ? new Date(generatedAt).toLocaleString("vi-VN")
    : hasReport
      ? "—"
      : "chưa có báo cáo";

  return (
    <main className="main gap">
      <header className="topbar">
        <div className="topbar__lead">
          <h1>Research Gap</h1>
          <p className="topbar__sub">
            {mode === "corpus"
              ? "Phân tích khoảng trống từ corpus nội bộ — quan tâm cao nhưng công bố còn thưa"
              : "Phân tích live từ OpenAlex / Crossref / arXiv — không cần import trước vào DB"}
          </p>
          {mode === "corpus" && <p className="topbar__sub">Cập nhật báo cáo: {generatedLabel}</p>}
        </div>
        <div className="topbar__controls">
          <div className="seg" role="tablist" aria-label="Chế độ Research Gap">
            <button
              type="button"
              className={`seg__btn ${mode === "corpus" ? "is-active" : ""}`}
              aria-selected={mode === "corpus"}
              onClick={() => setMode("corpus")}
            >
              Corpus Gap
            </button>
            <button
              type="button"
              className={`seg__btn ${mode === "live" ? "is-active" : ""}`}
              aria-selected={mode === "live"}
              onClick={() => setMode("live")}
            >
              Live Gap
            </button>
          </div>
          {mode === "corpus" && (
            <button
              className="icon-btn"
              type="button"
              onClick={() => void loadGaps()}
              aria-label="Làm mới dữ liệu Research Gap"
              title="Làm mới"
              disabled={loading}
            >
              <IconRefresh />
            </button>
          )}
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      {mode === "live" ? (
        <LiveGapPanel />
      ) : (
        <>
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
            {fieldOptions.map((f) => {
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
            {aspectOptions.map((a) => {
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

      {corpusAi.summary && status === "ready" && (
        <div className="state__body" role="status" style={{ marginBottom: "1rem" }}>
          {corpusAi.summary}
          {corpusAi.directions.length > 0 && (
            <ul>
              {corpusAi.directions.slice(0, 3).map((direction) => (
                <li key={direction.topic}>
                  <strong>{direction.topic}</strong> — {direction.rationale}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* heatmap + detail */}
      <div className="gap-top">
        <Widget
          className="gw-map"
          title="Bản đồ khoảng trống"
          subtitle="Mật độ công bố theo Lĩnh vực × Khía cạnh · chọn ô để xem chi tiết"
          icon={<IconGrid />}
          status={status}
          onRetry={() => void loadGaps()}
          emptyMessage={emptyMessage}
          errorMessage={errorMessage || undefined}
          skeleton={<div className="skel skel--block" style={{ height: 260 }} />}
        >
          <GapMatrix
            items={items}
            fields={shownFields}
            aspects={shownAspects}
            densityThreshold={threshold}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </Widget>

        <Widget
          className="gw-detail"
          title="Chi tiết khoảng trống"
          icon={<IconSparkle />}
          status={status === "ready" && !selected ? "empty" : status}
          onRetry={() => void loadGaps()}
          emptyMessage="Chọn một ô trên bản đồ"
          errorMessage={errorMessage || undefined}
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
          onRetry={() => void loadGaps()}
          emptyMessage={!hasReport && !USE_SAMPLE_FALLBACK ? emptyMessage : "Không có khoảng trống nào với ngưỡng hiện tại"}
          errorMessage={errorMessage || undefined}
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
          onRetry={() => void loadGaps()}
          emptyMessage={emptyMessage}
          errorMessage={errorMessage || undefined}
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

      {SHOW_DEMO_CONTROLS && <div className="statepick statepick--search" role="group" aria-label="Xem trước trạng thái (demo)">
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
      </div>}
        </>
      )}
    </main>
  );
}

function GapDetail({ item, isGapCell }: { item: GapItem; isGapCell: boolean }) {
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    setAiText("");
    setAiError("");
  }, [item.id]);

  const suggest = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const result = await aiApi.suggestDirections({ field: item.fieldLabel, gaps: [item] });
      const first = result.directions[0];
      setAiText(first ? `${first.topic}: ${first.rationale}` : "AI chưa có gợi ý mới cho khoảng trống này.");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Không lấy được gợi ý AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const explainKeyword = async (keyword: string) => {
    setAiLoading(true);
    setAiError("");
    try {
      const result = await aiApi.explainTerm({ term: keyword, context: `${item.fieldLabel} / ${item.aspect}` });
      setAiText(result.explanation);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Không giải thích được thuật ngữ.");
    } finally {
      setAiLoading(false);
    }
  };

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
            <button key={k} className="tag" type="button" onClick={() => explainKeyword(k)}>
              {k}
            </button>
          ))}
        </div>
      </div>

      {!!item.evidence?.length && (
        <div className="gapdetail__kw">
          <span className="gapdetail__sublabel">Paper đại diện trong corpus</span>
          <ul>
            {item.evidence.map((paper) => (
              <li key={paper.id || paper.title}>
                {paper.title}
                {paper.year ? ` (${paper.year})` : ""}
                {typeof paper.citations === "number" ? ` · ${formatInt(paper.citations)} citations` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="gapdetail__dir">
        <span className="gapdetail__sublabel">Gợi ý hướng nghiên cứu</span>
        <p>{item.direction}</p>
        <button className="btn btn--ghost btn--sm" type="button" onClick={suggest} disabled={aiLoading}>
          {aiLoading ? "Đang hỏi AI..." : "AI gợi ý thêm"}
        </button>
        {aiError && <p>{aiError}</p>}
        {aiText && <p>{aiText}</p>}
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
