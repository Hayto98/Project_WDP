import { useEffect, useMemo, useRef, useState } from "react";
import { IconBookmark, IconExternal, IconQuote, IconSparkle } from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle";
import type { Theme } from "../hooks/useTheme";
import { aiApi, paperApi } from "../lib/api";
import { formatInt } from "../lib/format";
import type { PaperResult } from "../data/searchSample";

type ViewSource = "Search_Result" | "Library" | "Recommendation" | "Dashboard";

interface Props {
  paperId: string;
  source: ViewSource;
  theme: Theme;
  toggle: () => void;
}

function deviceKind(): "desktop" | "tablet" | "mobile" {
  if (window.innerWidth < 640) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function useReadingSession(paperId: string, source: ViewSource) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tracking, setTracking] = useState<"starting" | "active" | "unavailable">("starting");
  const viewIdRef = useRef("");
  const accumulatedMsRef = useRef(0);
  const visibleSinceRef = useRef<number | null>(document.visibilityState === "visible" ? performance.now() : null);
  const finalizedRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    let startTimer = 0;
    viewIdRef.current = "";
    accumulatedMsRef.current = 0;
    visibleSinceRef.current = document.visibilityState === "visible" ? performance.now() : null;
    finalizedRef.current = false;
    setElapsedSeconds(0);
    setTracking("starting");

    const activeSeconds = () => {
      const liveMs = visibleSinceRef.current === null ? 0 : performance.now() - visibleSinceRef.current;
      return Math.max(0, Math.round((accumulatedMsRef.current + liveMs) / 1000));
    };

    const pause = () => {
      if (visibleSinceRef.current !== null) {
        accumulatedMsRef.current += performance.now() - visibleSinceRef.current;
        visibleSinceRef.current = null;
      }
    };

    const resume = () => {
      if (visibleSinceRef.current === null) visibleSinceRef.current = performance.now();
    };

    const pushDuration = (finalized: boolean) => {
      const viewId = viewIdRef.current;
      if (!viewId || (finalized && finalizedRef.current)) return;
      if (finalized) finalizedRef.current = true;
      void paperApi
        .updateReadingSession(paperId, viewId, activeSeconds(), finalized, finalized)
        .catch(() => undefined);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pause();
        pushDuration(false);
      } else {
        resume();
      }
    };

    const finish = () => {
      pause();
      pushDuration(true);
    };

    // Delay one tick so React StrictMode's development probe does not create
    // a duplicate reading session.
    startTimer = window.setTimeout(() => {
      paperApi
        .startReadingSession(paperId, source, deviceKind())
        .then((session) => {
          viewIdRef.current = session.viewId;
          if (disposed) {
            void paperApi
              .updateReadingSession(paperId, session.viewId, activeSeconds(), true, true)
              .catch(() => undefined);
            return;
          }
          setTracking("active");
        })
        .catch(() => {
          if (!disposed) setTracking("unavailable");
        });
    }, 0);

    const clock = window.setInterval(() => setElapsedSeconds(activeSeconds()), 1000);
    const heartbeat = window.setInterval(() => pushDuration(false), 15000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", finish);
    window.addEventListener("beforeunload", finish);

    return () => {
      disposed = true;
      window.clearTimeout(startTimer);
      window.clearInterval(clock);
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", finish);
      window.removeEventListener("beforeunload", finish);
      finish();
    };
  }, [paperId, source]);

  return { elapsedSeconds, tracking };
}

export function PaperDetailPage({ paperId, source, theme, toggle }: Props) {
  const [paper, setPaper] = useState<PaperResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [related, setRelated] = useState<PaperResult[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const { elapsedSeconds, tracking } = useReadingSession(paperId, source);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    paperApi
      .getById(paperId, source)
      .then((result) => {
        if (alive) setPaper(result);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "Không tải được bài báo.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [paperId, source]);

  const authors = useMemo(() => paper?.authors.join(", ") || "Chưa rõ tác giả", [paper]);
  const doiHref = paper?.doi
    ? `https://doi.org/${paper.doi.replace(/^https?:\/\/doi\.org\//i, "")}`
    : paper?.url || "#";

  const summarize = async () => {
    if (!paper || aiLoading) return;
    setAiLoading(true);
    try {
      const result = await aiApi.summarize({
        title: paper.title,
        abstract: paper.abstract,
        year: paper.year,
        source: paper.source,
        keywords: paper.keywords,
      });
      setAiSummary(result.summary);
    } catch (err) {
      setAiSummary(err instanceof Error ? err.message : "Không tóm tắt được bài báo.");
    } finally {
      setAiLoading(false);
    }
  };

  const loadRelated = async () => {
    if (!paper || relatedLoading) return;
    setRelatedLoading(true);
    try {
      const rows = await aiApi.relatedPapers({
        paperId: paper.id,
        title: paper.title,
        keywords: paper.keywords,
        fields: paper.fields,
        limit: 4,
      });
      setRelated(rows);
    } catch {
      setRelated([]);
    } finally {
      setRelatedLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="main paper-detail">
        <div className="paper-detail__skeleton">
          <div className="skel skel--line" />
          <div className="skel skel--block" />
          <div className="skel skel--chart" />
        </div>
      </main>
    );
  }

  if (error || !paper) {
    return (
      <main className="main paper-detail">
        <div className="state state--error">
          <p className="state__title">Không mở được bài báo</p>
          <p className="state__body">{error || "Bài báo không tồn tại trong corpus."}</p>
          <a className="btn btn--primary" href="#search">Quay lại tìm kiếm</a>
        </div>
      </main>
    );
  }

  return (
    <main className="main paper-detail">
      <header className="paper-detail__toolbar">
        <a className="btn btn--ghost" href="#search">← Quay lại kết quả</a>
        <div className="paper-detail__tracking" role="status">
          <span className={`paper-detail__tracking-dot ${tracking === "active" ? "is-active" : ""}`} aria-hidden />
          <span>
            {tracking === "active"
              ? `Đang ghi nhận thời gian đọc · ${formatElapsed(elapsedSeconds)}`
              : tracking === "starting"
                ? "Đang bắt đầu phiên đọc…"
                : "Không thể ghi nhận phiên đọc"}
          </span>
        </div>
        <ThemeToggle theme={theme} toggle={toggle} />
      </header>

      <article className="paper-detail__article">
        <div className="paper-detail__heading">
          <div className="paper-detail__source-row">
            <span>{paper.source}</span>
            <span aria-hidden>·</span>
            <span className="num">{paper.year}</span>
            <span className="rtype">{paper.type}</span>
          </div>
          <h1>{paper.title}</h1>
          <p className="paper-detail__authors">{authors}</p>
          <div className="paper-detail__actions">
            <a className="btn btn--primary" href={paper.url} target="_blank" rel="noreferrer noopener">
              <IconExternal width={16} height={16} /> Mở tại nguồn
            </a>
            <button className="btn btn--ghost" type="button" onClick={() => void summarize()} disabled={aiLoading}>
              <IconSparkle width={16} height={16} />
              {aiLoading ? "Đang tóm tắt…" : "AI tóm tắt"}
            </button>
          </div>
        </div>

        <div className="paper-detail__layout">
          <div className="paper-detail__content">
            <section>
              <h2>Tóm tắt</h2>
              <p className="paper-detail__abstract">
                {paper.abstract || `Chưa có abstract nguyên văn từ ${paper.source}.`}
              </p>
            </section>

            {aiSummary && (
              <section className="paper-detail__ai">
                <div>
                  <IconSparkle width={18} height={18} />
                  <h2>Tóm tắt bằng AI</h2>
                </div>
                <p>{aiSummary}</p>
              </section>
            )}

            <section>
              <div className="paper-detail__section-head">
                <h2>Bài báo liên quan</h2>
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => void loadRelated()} disabled={relatedLoading}>
                  {relatedLoading ? "Đang tìm…" : related.length ? "Làm mới" : "Tìm bài liên quan"}
                </button>
              </div>
              {related.length ? (
                <div className="paper-detail__related">
                  {related.map((item) => (
                    <a key={item.id} href={`#paper/${item.id}?source=Recommendation`}>
                      <strong>{item.title}</strong>
                      <span>{item.year} · {item.source}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="paper-detail__muted">Dùng “Tìm bài liên quan” để khám phá các công trình cùng chủ đề.</p>
              )}
            </section>
          </div>

          <aside className="paper-detail__facts" aria-label="Thông tin bài báo">
            <div className="paper-detail__citation">
              <IconQuote width={18} height={18} />
              <strong className="num">{formatInt(paper.citations)}</strong>
              <span>lượt trích dẫn</span>
            </div>
            <dl>
              <div>
                <dt>Loại tài liệu</dt>
                <dd>{paper.type}</dd>
              </div>
              <div>
                <dt>Nguồn</dt>
                <dd>{paper.source}</dd>
              </div>
              <div>
                <dt>DOI</dt>
                <dd><a href={doiHref} target="_blank" rel="noreferrer noopener">{paper.doi || "Không có"}</a></dd>
              </div>
              <div>
                <dt>Lĩnh vực</dt>
                <dd>{paper.fields.join(", ") || "Chưa phân loại"}</dd>
              </div>
            </dl>
            <div className="paper-detail__tags">
              <span className="paper-detail__label">Từ khóa</span>
              <div>
                {paper.keywords.length
                  ? paper.keywords.map((keyword) => <span className="tag" key={keyword}>{keyword}</span>)
                  : <span className="paper-detail__muted">Chưa có từ khóa</span>}
              </div>
            </div>
            <div className="paper-detail__reading-note">
              <IconBookmark width={16} height={16} />
              Thời gian chỉ được tính khi tab này đang hiển thị. Phiên đọc từ 2 phút được ghi nhận là đã đọc.
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}
