import { useMemo, useState } from "react";
import { Widget } from "./Widget";
import { IconTrend } from "./icons";
import { analyticsApi } from "../lib/api";
import { TrendChart } from "./TrendChart";
import { SavedLiveTrendsModal } from "./SavedLiveTrendsModal";

const LIVE_SOURCES = ["OpenAlex", "Crossref", "arXiv", "Semantic Scholar", "Exa"] as const;

type LiveTrendResult = Awaited<ReturnType<typeof analyticsApi.liveTrends>>;

interface Props {
  theme: string;
}

function friendlyLiveError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err || "");
  const lower = message.toLowerCase();
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many")) {
    return "Nguồn học thuật đang giới hạn tốc độ (rate limit). Đợi khoảng 1 phút rồi thử lại, hoặc giảm số bài / bỏ bớt nguồn.";
  }
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("abort")) {
    return "Yêu cầu Live Trends bị timeout. Thử giảm max bài mỗi nguồn xuống 20 hoặc chọn ít nguồn hơn.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Không kết nối được backend. Kiểm tra server đang chạy rồi thử lại.";
  }
  return message || "Không phân tích được Live Trends.";
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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
        setNotice("Không tìm thấy dữ liệu xu hướng cho từ khóa này. Thử topic rộng hơn hoặc thêm nguồn.");
      }
    } catch (err) {
      setResult(null);
      setError(friendlyLiveError(err));
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

  const chartStatus = loading ? "loading" : error ? "error" : result?.trendPoints?.length ? "ready" : "empty";

  return (
    <div className="livegap">
      <div className="livegap__form">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="livegap__title" style={{ margin: 0 }}>
            <IconTrend width={18} height={18} />
            <span>Live Trend Analysis</span>
          </h2>
          <button 
            className="btn btn--outline btn--sm" 
            onClick={() => setIsHistoryOpen(true)}
          >
            Lịch sử đã lưu
          </button>
        </div>
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
                if (e.key === "Enter") void runLive();
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

          <div className="livegap__row" style={{ alignItems: "flex-end" }}>
            <div className="livegap__field" style={{ flex: 1, marginBottom: 0 }}>
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
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn--primary"
                onClick={() => void runLive()}
                disabled={loading || !topic.trim()}
                style={{ width: "100%", height: "42px" }}
              >
                {loading ? "Đang phân tích..." : "Phân tích Live"}
              </button>
            </div>
          </div>
        </div>

        {error && <div className="livegap__error">{error}</div>}
        {notice && <div className="livegap__notice">{notice}</div>}
      </div>

      <div className="livegap__results">
        {(loading || error || (result && result.trendPoints?.length > 0) || (result && !result.trendPoints?.length)) && (
          <div className="livegap__main">
            {result && result.trendPoints?.length > 0 && !loading && (
              <div className="livegap__header">
                <div className="livegap__meta">
                  Đã quét <strong>{result.totalFetched}</strong> bài báo từ {result.sources.length} nguồn.
                  {result.cached && <span className="livegap__cached">(Cached)</span>}
                </div>
                <button
                  className="btn btn--outline btn--sm"
                  onClick={() => void saveAnalysis()}
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : "Lưu kết quả"}
                </button>
              </div>
            )}

            {result?.warnings && result.warnings.length > 0 && !loading && (
              <div className="livegap__warnings">
                {result.warnings.map((w, i) => (
                  <div key={i} className="livegap__warning">
                    {w}
                  </div>
                ))}
              </div>
            )}

            <div className="trends-grid" style={{ gridTemplateColumns: "1fr", marginTop: result ? 24 : 0 }}>
              <Widget
                className="tw-compare"
                title="So sánh xu hướng theo thời gian"
                subtitle="Số bài báo nhắc đến các chủ đề liên quan"
                icon={<IconTrend />}
                status={chartStatus}
                onRetry={() => void runLive()}
                emptyMessage="Chưa có chuỗi thời gian. Chạy Phân tích Live với topic và nguồn phù hợp."
                skeleton={<div className="skel skel--chart" aria-hidden />}
              >
                {result?.trendPoints?.length ? (
                  <div style={{ padding: "0 24px", minHeight: 300, display: "flex", flexDirection: "column" }}>
                    <TrendChart data={result.trendPoints} series={series} themeKey={theme} />
                  </div>
                ) : null}
              </Widget>
            </div>
          </div>
        )}
      </div>

      <SavedLiveTrendsModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={(savedResult) => {
          setTopic(savedResult.topic);
          setSources(new Set(savedResult.sources || []));
          setYearFrom(savedResult.yearFrom);
          setYearTo(savedResult.yearTo);
          setResult(savedResult);
          setError("");
          setNotice("Đã tải lại phân tích từ lịch sử.");
        }}
      />
    </div>
  );
}
