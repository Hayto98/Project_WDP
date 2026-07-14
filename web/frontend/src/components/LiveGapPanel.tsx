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
      setError(err instanceof Error ? err.message : "Không phân tích được Live Gap.");
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

  return (
    <div className="livegap">
      <form
        className="livegap__form"
        onSubmit={(event) => {
          event.preventDefault();
          void runLive();
        }}
      >
        <label className="livegap__field">
          <span>Chủ đề nghiên cứu</span>
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="VD: federated learning medical imaging"
            aria-label="Topic live gap"
          />
        </label>

        <div className="livegap__row">
          <label>
            <span>Từ năm</span>
            <input type="number" value={yearFrom} min={1990} max={yearTo} onChange={(e) => setYearFrom(Number(e.target.value))} />
          </label>
          <label>
            <span>Đến năm</span>
            <input type="number" value={yearTo} min={yearFrom} max={2030} onChange={(e) => setYearTo(Number(e.target.value))} />
          </label>
          <label>
            <span>Paper / nguồn</span>
            <input type="number" value={maxRecordsPerSource} min={10} max={100} step={10} onChange={(e) => setMaxRecordsPerSource(Number(e.target.value))} />
          </label>
          <label>
            <span>Top gaps</span>
            <input type="number" value={topK} min={3} max={30} onChange={(e) => setTopK(Number(e.target.value))} />
          </label>
        </div>

        <div className="gapchips" role="group" aria-label="Nguồn live gap">
          {LIVE_SOURCES.map((source) => {
            const on = sources.has(source);
            return (
              <button
                key={source}
                type="button"
                className={`gapchip gapchip--plain ${on ? "is-on" : ""}`}
                aria-pressed={on}
                onClick={() => toggleSource(source)}
              >
                {source}
              </button>
            );
          })}
        </div>

        <div className="state__actions">
          <button className="btn btn--primary" type="submit" disabled={loading || !topic.trim()}>
            {loading ? "Đang phân tích live…" : "Phân tích live"}
          </button>
          {result && (
            <button className="btn btn--ghost" type="button" onClick={() => void saveAnalysis()} disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu phân tích"}
            </button>
          )}
        </div>
      </form>

      {error && <p className="state__body" role="alert">{error}</p>}
      {notice && <p className="state__body" role="status">{notice}</p>}
      {!!result?.warnings?.length && (
        <div className="state__body" role="status">
          {result.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      {result && (
        <>
          <div className="trendsum">
            <div className="sumstat">
              <span className="sumstat__label">Paper đã fetch</span>
              <span className="sumstat__value num">{formatInt(result.totalFetched)}</span>
            </div>
            <div className="sumstat">
              <span className="sumstat__label">Gap mạnh</span>
              <span className="sumstat__value num">{formatInt(result.summary.strongGaps)}</span>
            </div>
            <div className="sumstat">
              <span className="sumstat__label">Gap tiềm năng</span>
              <span className="sumstat__value num">{formatInt(result.summary.potentialGaps)}</span>
            </div>
            <div className="sumstat">
              <span className="sumstat__label">Nguồn</span>
              <span className="sumstat__value sumstat__value--sm">{result.sources.join(", ")}</span>
            </div>
          </div>

          <div className="gap-top">
            <Widget
              className="gw-rank"
              title="Live gap candidates"
              subtitle={`Topic: ${result.topic}${result.cached ? " · cached" : ""}`}
              icon={<IconTrend />}
              status={loading ? "loading" : result.gaps.length ? "ready" : "empty"}
              emptyMessage="Không tìm thấy gap đủ điểm từ dữ liệu live."
            >
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
                          {levelLabel(gap.level)} · confidence {gap.confidence} · {gap.metrics.directCount}/{Math.round(gap.metrics.expectedCount)} papers
                        </span>
                      </span>
                      <span className="gaprank__scoreval num">{gap.gapScore}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </Widget>

            <Widget
              className="gw-detail"
              title="Chi tiết live gap"
              icon={<IconSparkle />}
              status={selected ? "ready" : "empty"}
              emptyMessage="Chọn một gap để xem chi tiết"
            >
              {selected && (
                <div className="gapdetail">
                  <div className="gapdetail__head">
                    <div>
                      <p className="gapdetail__field">{selected.field}</p>
                      <p className="gapdetail__aspect">{selected.aspect}</p>
                    </div>
                    <span className="gapdetail__flag">{levelLabel(selected.level)} · {selected.gapScore}</span>
                  </div>

                  <div className="gapdetail__metrics">
                    <div className="gmetric"><span className="gmetric__value num">{selected.metrics.directCount}</span><span className="gmetric__label">Direct</span></div>
                    <div className="gmetric"><span className="gmetric__value num">{Math.round(selected.metrics.expectedCount)}</span><span className="gmetric__label">Expected</span></div>
                    <div className="gmetric"><span className="gmetric__value num">{Math.round(selected.metrics.growthRate * 100)}%</span><span className="gmetric__label">Growth</span></div>
                    <div className="gmetric gmetric--accent"><span className="gmetric__value num">{selected.gapScore}</span><span className="gmetric__label">Gap score</span></div>
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
                          {paper.year ? ` (${paper.year})` : ""} · {paper.source || "Unknown"}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="gapdetail__dir">
                    <span className="gapdetail__sublabel">Gợi ý đề tài bằng AI</span>
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => void suggestAi()} disabled={aiLoading}>
                      {aiLoading ? "Đang hỏi AI…" : "AI gợi ý thêm"}
                    </button>
                    {aiText && <p>{aiText}</p>}
                  </div>
                </div>
              )}
            </Widget>
          </div>

          {!!result.sourceErrors?.length && (
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
        </>
      )}
    </div>
  );
}
