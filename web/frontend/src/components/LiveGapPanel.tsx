import { useMemo, useState } from "react";
import { Widget } from "./Widget";
import { IconGap, IconSparkle, IconTrend } from "./icons";
import { formatInt } from "../lib/format";
import { aiApi, analyticsApi } from "../lib/api";

const LIVE_SOURCES = ["OpenAlex", "Crossref", "arXiv", "Semantic Scholar", "Exa"] as const;

type LiveGapResult = Awaited<ReturnType<typeof analyticsApi.liveGaps>>;
type LiveGapItem = LiveGapResult["gaps"][number];

function levelLabel(level: LiveGapItem["level"]) {
  if (level === "strong") return "Gap mạnh";
  if (level === "potential") return "Gap tiềm năng";
  if (level === "needs_data") return "Cần thêm dữ liệu";
  return "Chưa rõ";
}

function friendlyLiveError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err || "");
  const lower = message.toLowerCase();
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many")) {
    return "Nguồn học thuật đang giới hạn tốc độ (rate limit). Đợi khoảng 1 phút rồi thử lại, hoặc giảm số bài / bỏ bớt nguồn.";
  }
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("abort")) {
    return "Yêu cầu Live Gap bị timeout. Thử giảm max bài mỗi nguồn xuống 20 hoặc chọn ít nguồn hơn.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Không kết nối được backend. Kiểm tra server đang chạy rồi thử lại.";
  }
  return message || "Không phân tích được Live Gap.";
}

export function LiveGapPanel() {
  const [topic, setTopic] = useState("federated learning medical imaging");
  const [sources, setSources] = useState<Set<string>>(new Set(["OpenAlex", "Crossref", "arXiv"]));
  const [yearFrom, setYearFrom] = useState(2021);
  const [yearTo, setYearTo] = useState(new Date().getFullYear());
  const [maxRecordsPerSource, setMaxRecordsPerSource] = useState(30);
  const [topK, setTopK] = useState(12);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<LiveGapResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const selected = useMemo(
    () => result?.gaps.find((gap) => gap.id === selectedId) ?? result?.gaps[0] ?? null,
    [result, selectedId],
  );

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
    setAiText("");
    try {
      const data = await analyticsApi.liveGaps({
        topic: cleaned,
        sources: [...sources],
        yearFrom,
        yearTo,
        maxRecordsPerSource,
        topK,
      });
      setResult(data);
      setSelectedId(data.gaps[0]?.id ?? null);
      if (!data.gaps.length) {
        setNotice("Không đủ tín hiệu gap với bộ lọc hiện tại. Hãy mở rộng topic hoặc tăng số paper mỗi nguồn.");
      }
    } catch (err) {
      setResult(null);
      setSelectedId(null);
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
      const saved = await analyticsApi.saveLiveGaps(result);
      setNotice(`Đã lưu phân tích live (#${saved.id.slice(-6)}).`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không lưu được phân tích.");
    } finally {
      setSaving(false);
    }
  };

  const suggestAi = async () => {
    if (!selected || aiLoading) return;
    setAiLoading(true);
    setAiText("");
    try {
      const response = await aiApi.suggestDirections({
        field: `${selected.field} / ${selected.aspect}`,
        gaps: [{
          id: selected.id,
          fieldKey: selected.id,
          fieldLabel: selected.field,
          token: "--c1",
          aspect: selected.aspect,
          fi: 0,
          ai: 0,
          density: 1 - selected.metrics.scarcityScore,
          interest: selected.metrics.adjacencyScore,
          papers: selected.metrics.directCount,
          keywords: [selected.field, selected.aspect],
          direction: selected.reasons[0] || "",
          trend: [],
          score: selected.gapScore / 100,
        }],
      });
      const first = response.directions[0];
      setAiText(first ? `${first.topic}: ${first.rationale}` : "AI chưa có gợi ý thêm cho gap này.");
    } catch (err) {
      setAiText(err instanceof Error ? err.message : "Không lấy được gợi ý AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const rankStatus = loading
    ? "loading"
    : error
      ? "error"
      : result?.gaps.length
        ? "ready"
        : result
          ? "empty"
          : "empty";

  const showResultsShell = loading || !!error || !!result;

  return (
    <div className="livegap">
      <div className="livegap__form">
        <h2 className="livegap__title">
          <IconGap width={18} height={18} />
          <span>Phân tích Live Gap</span>
        </h2>
        <p className="livegap__desc">
          Tìm khoảng trống nghiên cứu theo thời gian thực từ các thư viện học thuật mở — không cần import trước vào corpus.
        </p>

        <div className="livegap__fields">
          <div className="livegap__field">
            <label>Chủ đề nghiên cứu</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ví dụ: federated learning medical imaging"
              onKeyDown={(e) => {
                if (e.key === "Enter") void runLive();
              }}
            />
            <span className="livegap__hint">Từ khóa hoặc cụm chủ đề cần tìm gap</span>
          </div>

          <div className="livegap__row">
            <div className="livegap__field">
              <label>Từ năm</label>
              <input
                type="number"
                value={yearFrom}
                min={1990}
                max={yearTo}
                onChange={(e) => setYearFrom(Number(e.target.value))}
              />
            </div>
            <div className="livegap__field">
              <label>Đến năm</label>
              <input
                type="number"
                value={yearTo}
                min={yearFrom}
                max={2030}
                onChange={(e) => setYearTo(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="livegap__row">
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
              <label>Số gap hiển thị</label>
              <select value={topK} onChange={(e) => setTopK(Number(e.target.value))}>
                <option value={8}>Top 8</option>
                <option value={12}>Top 12</option>
                <option value={20}>Top 20</option>
              </select>
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

          <div className="livegap__actions">
            <button
              className="btn btn--primary"
              type="button"
              onClick={() => void runLive()}
              disabled={loading || !topic.trim()}
            >
              {loading ? "Đang phân tích…" : "Phân tích Live"}
            </button>
            {result && (
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => void saveAnalysis()}
                disabled={saving || loading}
              >
                {saving ? "Đang lưu…" : "Lưu phân tích"}
              </button>
            )}
          </div>
        </div>

        {error && <div className="livegap__error" role="alert">{error}</div>}
        {notice && <div className="livegap__notice" role="status">{notice}</div>}
      </div>

      {showResultsShell && (
        <div className="livegap__results">
          <div className="livegap__main">
            {result && !loading && !error && (
              <div className="livegap__header">
                <div className="livegap__meta">
                  Đã quét <strong>{formatInt(result.totalFetched)}</strong> bài từ {result.sources.length} nguồn
                  {result.cached ? <span className="livegap__cached">(Cached)</span> : null}
                  {" · "}
                  Gap mạnh: <strong>{formatInt(result.summary.strongGaps)}</strong>
                  {" · "}
                  Tiềm năng: <strong>{formatInt(result.summary.potentialGaps)}</strong>
                </div>
              </div>
            )}

            {!!result?.warnings?.length && !loading && (
              <div className="livegap__warnings">
                {result.warnings.map((warning) => (
                  <div key={warning} className="livegap__warning">
                    {warning}
                  </div>
                ))}
              </div>
            )}

            <div className="gap-top" style={{ marginTop: result && !loading ? 16 : 0 }}>
              <Widget
                className="gw-rank"
                title="Ứng viên gap (Live)"
                subtitle={
                  result
                    ? `Chủ đề: ${result.topic}${result.cached ? " · đã cache" : ""}`
                    : "Kết quả xếp hạng theo gap score"
                }
                icon={<IconTrend />}
                status={rankStatus}
                onRetry={() => void runLive()}
                emptyMessage="Không tìm thấy gap đủ điểm từ dữ liệu live. Thử mở rộng topic hoặc tăng số bài mỗi nguồn."
                skeleton={<div className="skel skel--list" aria-hidden />}
              >
                {result?.gaps.length ? (
                  <ol className="gaprank">
                    {result.gaps.map((gap, index) => (
                      <li key={gap.id} className={`gaprank__row ${selected?.id === gap.id ? "is-selected" : ""}`}>
                        <button className="gaprank__btn" type="button" onClick={() => setSelectedId(gap.id)}>
                          <span className="gaprank__rank num">{index + 1}</span>
                          <span className="gaprank__meta">
                            <span className="gaprank__title">
                              {gap.field} × {gap.aspect}
                            </span>
                            <span className="gaprank__sub num">
                              {levelLabel(gap.level)} · độ tin cậy {gap.confidence} ·{" "}
                              {gap.metrics.directCount}/{Math.round(gap.metrics.expectedCount)} bài
                            </span>
                          </span>
                          <span className="gaprank__scoreval num">{gap.gapScore}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </Widget>

              <Widget
                className="gw-detail"
                title="Chi tiết gap"
                icon={<IconSparkle />}
                status={loading ? "loading" : error ? "error" : selected ? "ready" : "empty"}
                onRetry={() => void runLive()}
                emptyMessage="Chọn một gap trong danh sách để xem chi tiết"
                skeleton={<div className="skel skel--card" aria-hidden />}
              >
                {selected && !loading && (
                  <div className="gapdetail">
                    <div className="gapdetail__head">
                      <div>
                        <p className="gapdetail__field">{selected.field}</p>
                        <p className="gapdetail__aspect">{selected.aspect}</p>
                      </div>
                      <span className="gapdetail__flag">
                        {levelLabel(selected.level)} · {selected.gapScore}
                      </span>
                    </div>

                    <div className="gapdetail__metrics">
                      <div className="gmetric">
                        <span className="gmetric__value num">{selected.metrics.directCount}</span>
                        <span className="gmetric__label">Trực tiếp</span>
                      </div>
                      <div className="gmetric">
                        <span className="gmetric__value num">{Math.round(selected.metrics.expectedCount)}</span>
                        <span className="gmetric__label">Kỳ vọng</span>
                      </div>
                      <div className="gmetric">
                        <span className="gmetric__value num">{Math.round(selected.metrics.growthRate * 100)}%</span>
                        <span className="gmetric__label">Tăng trưởng</span>
                      </div>
                      <div className="gmetric gmetric--accent">
                        <span className="gmetric__value num">{selected.gapScore}</span>
                        <span className="gmetric__label">Điểm gap</span>
                      </div>
                    </div>

                    <div className="gapdetail__dir">
                      <span className="gapdetail__sublabel">Lý do</span>
                      <ul>
                        {selected.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="gapdetail__kw">
                      <span className="gapdetail__sublabel">Paper bằng chứng</span>
                      <ul>
                        {selected.evidence.map((paper) => (
                          <li key={`${paper.title}-${paper.year}`}>
                            {paper.url ? (
                              <a href={paper.url} target="_blank" rel="noreferrer">
                                {paper.title}
                              </a>
                            ) : (
                              paper.title
                            )}
                            {paper.year ? ` (${paper.year})` : ""} · {paper.source || "Không rõ nguồn"}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="gapdetail__dir">
                      <span className="gapdetail__sublabel">Gợi ý đề tài bằng AI</span>
                      <button
                        className="btn btn--ghost btn--sm"
                        type="button"
                        onClick={() => void suggestAi()}
                        disabled={aiLoading}
                      >
                        {aiLoading ? "Đang hỏi AI…" : "AI gợi ý thêm"}
                      </button>
                      {aiText && <p>{aiText}</p>}
                    </div>
                  </div>
                )}
              </Widget>
            </div>

            {!!result?.sourceErrors?.length && !loading && (
              <Widget title="Cảnh báo nguồn" icon={<IconGap />} status="ready">
                <ul>
                  {result.sourceErrors.map((row) => (
                    <li key={row.source}>
                      {row.source}: {row.message}
                    </li>
                  ))}
                </ul>
              </Widget>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
