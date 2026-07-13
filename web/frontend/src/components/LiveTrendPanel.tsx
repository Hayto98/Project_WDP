import { useMemo, useState } from "react";
import { Widget } from "./Widget";
import { IconTrend } from "./icons";
import { analyticsApi } from "../lib/api";
import { TrendChart } from "./TrendChart";

const LIVE_SOURCES = ["OpenAlex", "Crossref", "arXiv", "Semantic Scholar", "Exa"] as const;

type LiveTrendResult = Awaited<ReturnType<typeof analyticsApi.liveTrends>>;

interface Props {
  theme: string;
}

export function LiveTrendPanel({ theme }: Props) {
  const [topic, setTopic] = useState("federated learning medical imaging");
  const [sources, setSources] = useState<Set<string>>(new Set(["OpenAlex", "Crossref", "arXiv"]));
  const [yearFrom, setYearFrom] = useState(2021);
  const [yearTo, setYearTo] = useState(new Date().getFullYear());
  const [maxRecordsPerSource, setMaxRecordsPerSource] = useState(30);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<LiveTrendResult | null>(null);

  const toggleSource = (source: string) => {
    setSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        if (next.size > 1) next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  };

  const runLive = async () => {
    const cleaned = topic.trim();
    if (!cleaned || loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await analyticsApi.liveTrends({
        topic: cleaned,
        sources: [...sources],
        yearFrom,
        yearTo,
        maxRecordsPerSource,
      });
      setResult(data);
      if (!data.trendPoints?.length) {
        setNotice("Không tìm thấy dữ liệu xu hướng cho từ khóa này.");
      }
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Không phân tích được Live Trends.");
    } finally {
      setLoading(false);
    }
  };

  const saveAnalysis = async () => {
    if (!result || saving) return;
    setSaving(true);
    setNotice("");
    try {
      const saved = await analyticsApi.saveLiveTrends(result);
      setNotice(`Đã lưu phân tích live (#${saved.id.slice(-6)}).`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không lưu được phân tích.");
    } finally {
      setSaving(false);
    }
  };

  const series = useMemo(() => {
    if (!result?.trendPoints?.length) return [];
    return analyticsApi.seriesFromPoints(result.trendPoints);
  }, [result]);

  return (
    <div className="livegap">
      <div className="livegap__form">
        <h2 className="livegap__title">
          <IconTrend width={18} height={18} />
          <span>Live Trend Analysis</span>
        </h2>
        <p className="livegap__desc">
          Phân tích xu hướng công bố trong thời gian thực từ các thư viện học thuật mở.
        </p>

        <div className="livegap__fields">
          <div className="livegap__field">
            <label>Topic / Keywords</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ví dụ: federated learning"
              onKeyDown={(e) => {
                if (e.key === "Enter") runLive();
              }}
            />
            <span className="livegap__hint">Từ khóa nghiên cứu cần phân tích xu hướng</span>
          </div>

          <div className="livegap__row">
            <div className="livegap__field">
              <label>Từ năm</label>
              <input type="number" value={yearFrom} onChange={(e) => setYearFrom(Number(e.target.value))} />
            </div>
            <div className="livegap__field">
              <label>Đến năm</label>
              <input type="number" value={yearTo} onChange={(e) => setYearTo(Number(e.target.value))} />
            </div>
          </div>

          <div className="livegap__field">
            <label>Số bài tối đa mỗi nguồn</label>
            <select
              value={maxRecordsPerSource}
              onChange={(e) => setMaxRecordsPerSource(Number(e.target.value))}
            >
              <option value={20}>20 bài (nhanh)</option>
              <option value={50}>50 bài (chuẩn)</option>
              <option value={100}>100 bài (chậm)</option>
            </select>
          </div>

          <div className="livegap__field">
            <label>Nguồn dữ liệu</label>
            <div className="livegap__sources">
              {LIVE_SOURCES.map((src) => (
                <button
                  key={src}
                  type="button"
                  className={`topicchip ${sources.has(src) ? "is-on" : ""}`}
                  aria-pressed={sources.has(src)}
                  onClick={() => toggleSource(src)}
                >
                  <span className="topicchip__dot" />
                  {src}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn--primary"
            onClick={runLive}
            disabled={loading || !topic.trim()}
          >
            {loading ? "Đang phân tích..." : "Phân tích Live"}
          </button>
        </div>

        {error && <div className="livegap__error">{error}</div>}
        {notice && <div className="livegap__notice">{notice}</div>}
      </div>

      <div className="livegap__results">
        {result && result.trendPoints?.length > 0 && (
          <div className="livegap__main">
            <div className="livegap__header">
              <div className="livegap__meta">
                Đã quét <strong>{result.totalFetched}</strong> bài báo từ {result.sources.length} nguồn.
                {result.cached && <span className="livegap__cached">(Cached)</span>}
              </div>
              <button
                className="btn btn--outline btn--sm"
                onClick={saveAnalysis}
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu kết quả"}
              </button>
            </div>

            {result.warnings && result.warnings.length > 0 && (
              <div className="livegap__warnings">
                {result.warnings.map((w, i) => (
                  <div key={i} className="livegap__warning">
                    ⚠️ {w}
                  </div>
                ))}
              </div>
            )}

            <div className="trends-grid" style={{ gridTemplateColumns: "1fr", marginTop: 24 }}>
              <Widget
                className="tw-compare"
                title="So sánh xu hướng theo thời gian"
                subtitle="Số bài báo nhắc đến các chủ đề liên quan"
                icon={<IconTrend />}
                status="ready"
              >
                <div style={{ padding: "0 24px", minHeight: 300, display: "flex", flexDirection: "column" }}>
                  <TrendChart data={result.trendPoints} series={series} themeKey={theme} />
                </div>
              </Widget>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
