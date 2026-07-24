import { useEffect, useMemo, useState } from "react";
import { makeDashboardData } from "../data/sample";
import type { DashboardData, TimeRange, WidgetStatus } from "../data/types";
import type { Theme } from "../hooks/useTheme";
import { AiInsights } from "../components/AiInsights";
import { FollowedRail } from "../components/FollowedRail";
import { KpiStrip } from "../components/KpiStrip";
import { ResearchGapHeatmap } from "../components/ResearchGapHeatmap";
import { ThemeToggle } from "../components/ThemeToggle";
import { TrendChart } from "../components/TrendChart";
import { TrendingPapers } from "../components/TrendingPapers";
import { Widget } from "../components/Widget";
import {
  IconBookmark,
  IconGap,
  IconLibrary,
  IconRefresh,
  IconSparkle,
  IconTrend,
} from "../components/icons";
import { dashboardApi } from "../lib/api";
import { SHOW_DEMO_CONTROLS, USE_SAMPLE_FALLBACK } from "../lib/flags";

const RANGES: { id: TimeRange; label: string }[] = [
  { id: "12m", label: "12 tháng" },
  { id: "24m", label: "24 tháng" },
  { id: "5y", label: "5 năm" },
];

const EMPTY_DASHBOARD: DashboardData = {
  updatedAt: "chưa có dữ liệu",
  kpis: [],
  trendSeries: [],
  trend: [],
  gapFields: [],
  gapAspects: [],
  gaps: [],
  trending: [],
  ai: { summary: "", directions: [], evidence: [] },
  followed: [],
  notifications: [],
};

type ViewState = "default" | "loading" | "empty" | "error";

interface Props {
  theme: Theme;
  toggle: () => void;
}

export function OverviewPage({ theme, toggle }: Props) {
  const [range, setRange] = useState<TimeRange>("12m");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>("default");
  const [remoteData, setRemoteData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState(false);

  const data = useMemo(
    () => remoteData ?? (USE_SAMPLE_FALLBACK ? makeDashboardData(range) : EMPTY_DASHBOARD),
    [range, remoteData],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    dashboardApi
      .overview()
      .then((next) => {
        if (!alive) return;
        setRemoteData(next);
        setLoadError(false);
      })
      .catch(() => {
        if (!alive) return;
        setRemoteData(null);
        setLoadError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [range]);

  const status: WidgetStatus =
    view === "loading" || loading
      ? "loading"
      : view === "error" || (!USE_SAMPLE_FALLBACK && loadError)
        ? "error"
        : view === "empty" || (!USE_SAMPLE_FALLBACK && !remoteData)
          ? "empty"
          : "ready";

  const railFirstRun = view === "empty";

  return (
    <main className="main">
      <header className="topbar">
        <div className="topbar__lead">
          <h1>Tổng quan</h1>
          <p className="topbar__sub">
            Bức tranh xu hướng nghiên cứu &amp; khoảng trống tiềm năng
            <span className="topbar__updated num" title="Thời điểm cập nhật dữ liệu">
              <span className="dot" /> Cập nhật {data.updatedAt}
            </span>
          </p>
        </div>

        <div className="topbar__controls">
          <div className="seg" role="group" aria-label="Khoảng thời gian phân tích">
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

          <button
            className="icon-btn"
            onClick={() => {
              setLoading(true);
              dashboardApi
                .overview()
                .then((next) => {
                  setRemoteData(next);
                  setLoadError(false);
                })
                .catch(() => {
                  setRemoteData(null);
                  setLoadError(true);
                })
                .finally(() => setLoading(false));
            }}
            aria-label="Làm mới dữ liệu"
            title="Làm mới"
          >
            <IconRefresh />
          </button>

          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      {SHOW_DEMO_CONTROLS && <div className="statepick" role="group" aria-label="Xem trước trạng thái (demo)">
        <span className="statepick__label">Xem trạng thái</span>
        {(["default", "loading", "empty", "error"] as ViewState[]).map((v) => (
          <button
            key={v}
            className={`statepick__btn ${view === v ? "is-active" : ""}`}
            onClick={() => setView(v)}
          >
            {v === "default" ? "Mặc định" : v === "loading" ? "Đang tải" : v === "empty" ? "Trống" : "Lỗi"}
          </button>
        ))}
      </div>}

      <KpiStrip kpis={data.kpis} loading={status === "loading"} />

      <div className="grid">
        <div className="col-main">
          <Widget
            className="w-trend"
            title="Xu hướng công bố theo thời gian"
            subtitle="Số bài báo / năm theo lĩnh vực · nhấn để bật tắt lĩnh vực"
            icon={<IconTrend />}
            status={status}
            onRetry={() => setView("default")}
            skeleton={<div className="skel skel--chart" />}
          >
            <TrendChart data={data.trend} series={data.trendSeries} themeKey={theme} />
          </Widget>

          <Widget
            className="w-gap"
            title="Cơ hội nghiên cứu nổi bật"
            subtitle="Các tổ hợp có mật độ công bố thấp cần ưu tiên xem xét"
            icon={<IconGap />}
            status={status}
            onRetry={() => setView("default")}
            skeleton={<div className="skel skel--block" style={{ height: 220 }} />}
          >
            <ResearchGapHeatmap
              fields={data.gapFields}
              aspects={data.gapAspects}
              gaps={data.gaps}
            />
          </Widget>

          <Widget
            className="w-trending"
            title="Top bài báo thịnh hành"
            subtitle="Theo lượt xem (Unique Views) 30 ngày qua"
            icon={<IconLibrary />}
            status={status}
            onRetry={() => setView("default")}
          >
            <TrendingPapers papers={data.trending} />
          </Widget>

          <Widget
            className="w-ai"
            title="Phân tích từ AI"
            subtitle="Tóm tắt & gợi ý hướng nghiên cứu"
            icon={<IconSparkle />}
            status={status}
            onRetry={() => setView("default")}
          >
            <AiInsights ai={data.ai} />
          </Widget>
        </div>

        <div className="col-rail">
          <Widget
            className="w-rail"
            title="Không gian của bạn"
            icon={<IconBookmark />}
            status={railFirstRun ? "empty" : status === "loading" ? "loading" : "ready"}
            onRetry={() => setView("default")}
            emptyMessage="Bạn chưa theo dõi chủ đề nào"
            emptyAction={<button className="btn btn--primary">Theo dõi lĩnh vực đầu tiên</button>}
          >
            <FollowedRail followed={data.followed} notifications={data.notifications} />
          </Widget>
        </div>
      </div>
    </main>
  );
}
