import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { IconAlert, IconRefresh, IconSearch, IconTelescope } from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  type AdminJob,
  type AdminUser,
  type AdminUserStatus,
  type AuditLog,
  type DataSource,
  type JobStatus,
  type PaperReadLog,
  type ReadingPersistStatus,
  type SourceStatus,
} from "../data/adminSample";
import type { Theme } from "../hooks/useTheme";
import { formatInt } from "../lib/format";
import { adminApi, authApi, feedbackApi, getCurrentUser } from "../lib/api";

type AdminTab = "overview" | "jobs" | "sources" | "users" | "feedback" | "reading" | "logs";
type AdminReadAction = "refresh" | "export" | "threshold" | "raw";
type FeedbackStatus = "Pending" | "Reviewed" | "Resolved";

interface TopReadPaper {
  paperId: string;
  paperTitle: string;
  topic: string;
  source: string;
  reads: number;
  readers: number;
  totalMinutes: number;
  latestAt: string;
}

interface ReadChartItem {
  id: string;
  label: string;
  value: number;
  detail: string;
}

interface FeedbackItem {
  _id?: string;
  id?: string;
  user_id?: string | { _id?: string; full_name?: string; email?: string };
  content: string;
  status: FeedbackStatus;
  admin_note?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  theme: Theme;
  toggle: () => void;
}

const TABS: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "jobs", label: "Batch jobs" },
  { id: "sources", label: "Nguồn dữ liệu" },
  { id: "users", label: "Người dùng" },
  { id: "feedback", label: "Phản hồi" },
  { id: "reading", label: "Thống kê lượt đọc" },
  { id: "logs", label: "Audit log" },
];

const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  running: "Đang chạy",
  queued: "Đang chờ",
  success: "Hoàn tất",
  warning: "Cảnh báo",
  failed: "Thất bại",
};

const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = {
  active: "Hoạt động",
  paused: "Tạm dừng",
  degraded: "Suy giảm",
};

const USER_STATUS_LABEL: Record<AdminUserStatus, string> = {
  active: "Đang hoạt động",
  locked: "Đã khóa",
  pending: "Chờ kích hoạt",
};

const READING_STATUS_LABEL: Record<ReadingPersistStatus, string> = {
  stored: "Đã ghi DB",
  queued: "Chờ ghi DB",
  skipped: "Không ghi",
};

const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  Pending: "Đang chờ",
  Reviewed: "Đã xem",
  Resolved: "Đã xử lý",
};

export function AdminPage({ theme, toggle }: Props) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [sources, setSources] = useState<DataSource[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [readLogs, setReadLogs] = useState<PaperReadLog[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState({ totalPapers: 0, totalUsers: 0, activeJobs: 0, dataSources: 0 });
  const [query, setQuery] = useState("");
  const [readNotice, setReadNotice] = useState("Thống kê đang dùng cửa sổ 30 phút gần nhất.");
  const [jobNotice, setJobNotice] = useState("");
  const [sourceNotice, setSourceNotice] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [checkingSources, setCheckingSources] = useState(false);
  const currentUser = getCurrentUser();

  useEffect(() => {
    Promise.all([
      adminApi.jobs(),
      adminApi.dataSources(),
      adminApi.users(),
      adminApi.auditLogs(),
      adminApi.paperReads(),
      adminApi.stats(),
      feedbackApi.list({ page: 1, limit: 50 }),
    ])
      .then(([nextJobs, nextSources, nextUsers, nextAuditLogs, nextReadLogs, nextStats, nextFeedbacks]) => {
        setJobs(nextJobs);
        setSources(nextSources);
        setUsers(nextUsers);
        setAuditLogs(nextAuditLogs);
        setReadLogs(nextReadLogs);
        setStats(nextStats);
        setFeedbacks(Array.isArray(nextFeedbacks.data) ? nextFeedbacks.data : []);
      })
      .catch(() => {
        setJobs([]);
        setSources([]);
        setUsers([]);
        setAuditLogs([]);
        setReadLogs([]);
        setFeedbacks([]);
      });
  }, []);

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter((log) =>
      [log.actor, log.action, log.target, log.ip].join(" ").toLowerCase().includes(q),
    );
  }, [auditLogs, query]);

  const runningJobs = jobs.filter((job) => job.status === "running").length;
  const activeSources = sources.filter((source) => source.enabled).length;
  const storedReadLogs = readLogs.filter((log) => log.persistStatus === "stored").length;
  const uniqueReaders = new Set(readLogs.map((log) => log.userEmail)).size;
  const avgReadMinutes = Math.round(
    readLogs.reduce((sum, log) => sum + log.durationMinutes, 0) / Math.max(readLogs.length, 1),
  );
  const topReadPapers = useMemo(() => buildTopReadPapers(readLogs), [readLogs]);
  const mostReadPaper = topReadPapers[0];
  const topicInterest = useMemo(() => buildTopicInterest(readLogs), [readLogs]);
  const windowStats = useMemo(() => buildWindowStats(readLogs), [readLogs]);

  const rerunJob = async (id: string) => {
    setJobNotice("");
    setJobs((current) =>
      current.map((job) => (job.id === id ? { ...job, status: "running", progress: 10 } : job)),
    );
    try {
      const nextJob = await adminApi.runJob(id);
      setJobs((current) => current.map((job) => (job.id === id ? nextJob : job)));
      setJobNotice(
        `Đã chạy ${nextJob.source}: import ${formatInt(nextJob.imported ?? nextJob.records)} bài, bỏ qua ${formatInt(nextJob.skipped ?? 0)} bài trùng.`,
      );
      const [nextStats, nextSources] = await Promise.all([adminApi.stats(), adminApi.dataSources()]);
      setStats(nextStats);
      setSources(nextSources);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không chạy được job đồng bộ.";
      setJobNotice(message);
      setJobs((current) =>
        current.map((job) => (job.id === id ? { ...job, status: "failed", progress: 100, errorMessage: message } : job)),
      );
    }
  };

  const toggleSource = async (id: string) => {
    const currentSource = sources.find((source) => source.id === id);
    if (!currentSource) return;
    const previous = sources;
    setSources((current) =>
      current.map((source) =>
        source.id === id
          ? {
              ...source,
              enabled: !source.enabled,
              status: source.enabled ? "paused" : "active",
              lastSync: source.enabled ? source.lastSync : "vừa bật",
            }
          : source,
      ),
    );
    try {
      const updated = await adminApi.updateDataSource(id, { enabled: !currentSource.enabled });
      setSources((current) => current.map((source) => (source.id === id ? updated : source)));
      setSourceNotice(`${updated.name}: ${updated.enabled ? "đã bật" : "đã tạm dừng"}.`);
    } catch (err) {
      setSources(previous);
      setSourceNotice(err instanceof Error ? err.message : "Không cập nhật được nguồn dữ liệu.");
    }
  };

  const toggleUserLock = async (id: string) => {
    const currentUserRow = users.find((user) => user.id === id);
    if (!currentUserRow) return;
    const previous = users;
    const nextStatus = currentUserRow.status === "locked" ? "Active" : "Banned";
    setUsers((current) =>
      current.map((user) =>
        user.id === id ? { ...user, status: user.status === "locked" ? "active" : "locked" } : user,
      ),
    );
    try {
      const updated = await adminApi.updateUser(id, { status: nextStatus });
      setUsers((current) => current.map((user) => (user.id === id ? updated : user)));
    } catch (err) {
      setUsers(previous);
      setSourceNotice(err instanceof Error ? err.message : "Không cập nhật được người dùng.");
    }
  };

  const handleReadAction = (action: AdminReadAction) => {
    const messages: Record<AdminReadAction, string> = {
      refresh: "Đã làm mới thống kê lượt đọc từ bảng paper_read_stats_30m.",
      export: "Đã tạo file báo cáo CSV demo cho top paper được đọc nhiều.",
      threshold: "Ngưỡng ghi DB hiện tại: chỉ tính lượt đọc từ 2 phút trở lên.",
      raw: "Đang hiển thị cả event thô và trạng thái ghi database bên dưới.",
    };
    setReadNotice(messages[action]);
  };

  const checkSourceApis = async () => {
    setCheckingSources(true);
    setSourceNotice("");
    try {
      const nextSources = await adminApi.checkDataSources();
      setSources(nextSources);
      const okCount = nextSources.filter((source) => source.status === "active").length;
      setSourceNotice(`Đã kiểm tra API: ${formatInt(okCount)}/${formatInt(nextSources.length)} nguồn hoạt động.`);
    } catch (err) {
      setSourceNotice(err instanceof Error ? err.message : "Không kiểm tra được API nguồn.");
    } finally {
      setCheckingSources(false);
    }
  };

  const refreshReports = async () => {
    setJobNotice("");
    try {
      const result = await adminApi.refreshReports();
      setJobNotice(`Đã refresh ${formatInt(result.reports.length)} báo cáo phân tích.`);
    } catch (err) {
      setJobNotice(err instanceof Error ? err.message : "Không refresh được reports.");
    }
  };

  const updateFeedback = async (id: string, patch: { status?: FeedbackStatus; admin_note?: string | null }) => {
    setFeedbackNotice("");
    try {
      const updated = (await feedbackApi.update(id, patch)) as FeedbackItem;
      setFeedbacks((current) => current.map((item) => (feedbackId(item) === id ? updated : item)));
      setFeedbackNotice("Đã cập nhật phản hồi.");
    } catch (err) {
      setFeedbackNotice(err instanceof Error ? err.message : "Không cập nhật được phản hồi.");
    }
  };

  return (
    <div className="admin-site">
      <aside className="admin-site__nav" aria-label="Điều hướng website admin">
        <div className="admin-brand">
          <span className="admin-brand__mark" aria-hidden>
            <IconTelescope width={20} height={20} />
          </span>
          <span>
            ResearchTrends<strong>Admin</strong>
          </span>
        </div>

        <div className="admin-operator">
          <span className="userchip__avatar" aria-hidden>AD</span>
          <span>
            <strong>{currentUser?.full_name ?? "Admin"}</strong>
            <small>Quản trị hệ thống</small>
          </span>
        </div>

        <div className="admin-tabs admin-tabs--side" role="tablist" aria-label="Khu vực admin">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={`admin-tab ${tab === item.id ? "is-active" : ""}`}
              type="button"
              onClick={() => setTab(item.id)}
              role="tab"
              aria-selected={tab === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="admin-site__foot">
          <button
            className="btn btn--ghost"
            type="button"
            onClick={async () => {
              await authApi.logout();
              window.location.hash = "login";
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="main admin-page admin-site__main">
        <header className="topbar">
          <div className="topbar__lead">
            <h1>Website Admin</h1>
            <p className="topbar__sub">
              Không gian vận hành riêng cho quản trị viên: corpus, batch jobs, nguồn dữ liệu, người dùng và audit log
            </p>
          </div>
          <div className="topbar__controls">
            <button className="btn btn--ghost" type="button" onClick={() => setTab("logs")}>
              <IconAlert width={15} height={15} /> Xem audit log
            </button>
            <ThemeToggle theme={theme} toggle={toggle} />
          </div>
        </header>

        <div className="trendsum admin-sum" aria-label="Tổng quan admin">
          <Summary label="Bài báo trong corpus" value={formatInt(stats.totalPapers)} />
          <Summary label="Job đang chạy" value={formatInt(stats.activeJobs || runningJobs)} />
          <Summary label="Nguồn bật" value={`${formatInt(activeSources)}/${formatInt(stats.dataSources || sources.length)}`} />
          <Summary label="Lượt đọc gần đây" value={formatInt(readLogs.length)} />
        </div>

        <section className="admin-shell">

        {tab === "overview" && (
          <div className="admin-overview">
            <section className="admin-panel admin-panel--wide">
              <PanelHead title="Trạng thái pipeline" meta="Cập nhật vài phút trước" />
              <div className="admin-job-stack">
                {jobs.slice(0, 3).map((job) => (
                  <JobRow key={job.id} job={job} onRerun={rerunJob} compact />
                ))}
              </div>
            </section>
            <section className="admin-panel">
              <PanelHead title="Sức khỏe nguồn dữ liệu" meta={`${activeSources} nguồn đang bật`} />
              <div className="admin-source-mini">
                {sources.map((source) => (
                  <div key={source.id}>
                    <span>
                      <strong>{source.name}</strong>
                      <small>{source.lastSync}</small>
                    </span>
                    <StatusPill status={source.status} label={SOURCE_STATUS_LABEL[source.status]} />
                  </div>
                ))}
              </div>
            </section>
            <section className="admin-panel">
              <PanelHead title="Audit gần đây" meta={`${auditLogs.length} sự kiện`} />
              <AuditList logs={auditLogs.slice(0, 3)} />
            </section>
            <section className="admin-panel">
              <PanelHead title="Thống kê lượt đọc" meta={`${storedReadLogs} record đã ghi database`} />
              <div className="admin-read-kpis">
                <Summary label="User duy nhất" value={formatInt(uniqueReaders)} />
                <Summary label="Top paper" value={mostReadPaper ? formatInt(mostReadPaper.reads) : "0"} />
              </div>
              <p className="admin-read-note">
                Theo dõi paper trong database đang được đọc nhiều để biết chủ đề nào đang được user quan tâm.
              </p>
            </section>
          </div>
        )}

        {tab === "jobs" && (
          <section className="admin-panel">
            <PanelHead title="Batch jobs thu thập dữ liệu" meta="OpenAlex, Crossref, arXiv, Semantic Scholar và IEEE" />
            <div className="admin-read-actions" aria-label="Thao tác batch reports">
              <button className="btn btn--primary" type="button" onClick={refreshReports}>
                <IconRefresh width={15} height={15} /> Refresh reports
              </button>
            </div>
            {jobNotice && <p className="invite-notice admin-read-notice" role="status">{jobNotice}</p>}
            <div className="admin-job-stack">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} onRerun={rerunJob} />
              ))}
            </div>
          </section>
        )}

        {tab === "sources" && (
          <section className="admin-panel">
            <PanelHead title="Cấu hình nguồn dữ liệu" meta="Bật/tắt nguồn học thuật và theo dõi độ ổn định" />
            <div className="admin-read-actions" aria-label="Kiểm tra nguồn dữ liệu">
              <button className="btn btn--primary" type="button" onClick={checkSourceApis} disabled={checkingSources}>
                <IconRefresh width={15} height={15} /> {checkingSources ? "Đang kiểm tra..." : "Kiểm tra API nguồn"}
              </button>
            </div>
            {sourceNotice && <p className="invite-notice admin-read-notice" role="status">{sourceNotice}</p>}
            <div className="admin-source-grid">
              {sources.map((source) => (
                <SourceCard key={source.id} source={source} onToggle={toggleSource} />
              ))}
            </div>
          </section>
        )}

        {tab === "users" && (
          <section className="admin-panel">
            <PanelHead title="Quản lý người dùng" meta="Role Student/Admin, trạng thái tài khoản và hoạt động gần đây" />
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Role</th>
                    <th>Trạng thái</th>
                    <th>Hoạt động</th>
                    <th>Paper lưu</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <UserRow key={user.id} user={user} onToggleLock={toggleUserLock} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "feedback" && (
          <section className="admin-panel">
            <PanelHead title="Phản hồi người dùng" meta={`${feedbacks.length} phản hồi gần nhất`} />
            {feedbackNotice && <p className="invite-notice admin-read-notice" role="status">{feedbackNotice}</p>}
            <div className="admin-feedback-list">
              {feedbacks.length === 0 ? (
                <div className="state state--empty">
                  <p className="state__title">Chưa có phản hồi</p>
                  <p className="state__body">Khi người dùng gửi phản hồi, admin sẽ xử lý tại đây.</p>
                </div>
              ) : (
                feedbacks.map((item) => (
                  <FeedbackRow key={feedbackId(item)} feedback={item} onUpdate={updateFeedback} />
                ))
              )}
            </div>
          </section>
        )}

        {tab === "reading" && (
          <section className="admin-panel">
            <PanelHead
              title="Thống kê lượt đọc paper"
              meta="Paper trong database đang được đọc nhiều và event ghi thống kê theo cửa sổ 30 phút"
            />
            <div className="admin-read-kpis admin-read-kpis--wide">
              <Summary label="Lượt xem ghi nhận" value={formatInt(readLogs.length)} />
              <Summary label="User duy nhất" value={formatInt(uniqueReaders)} />
              <Summary label="Đã ghi database" value={formatInt(storedReadLogs)} />
              <Summary label="Thời lượng TB" value={`${formatInt(avgReadMinutes)}p`} />
            </div>
            <div className="admin-read-actions" aria-label="Chức năng thống kê lượt đọc">
              <button className="btn btn--primary" type="button" onClick={() => handleReadAction("refresh")}>
                <IconRefresh width={15} height={15} /> Làm mới thống kê
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => handleReadAction("export")}>
                Xuất báo cáo CSV
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => handleReadAction("threshold")}>
                Cấu hình ngưỡng ghi DB
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => handleReadAction("raw")}>
                Xem event thô
              </button>
            </div>
            <p className="invite-notice admin-read-notice" role="status">{readNotice}</p>
            <div className="admin-read-charts">
              <ChartPanel title="Bài báo được quan tâm" meta="Top paper đã ghi database">
                <BarChart
                  items={topReadPapers.map((paper) => ({
                    id: paper.paperId,
                    label: paper.paperTitle,
                    value: paper.reads,
                    detail: `${paper.readers} user · ${paper.totalMinutes} phút · ${paper.topic}`,
                  }))}
                  unit="lượt"
                />
              </ChartPanel>
              <ChartPanel title="Lĩnh vực được quan tâm" meta="Gom theo topic của paper">
                <BarChart items={topicInterest} unit="lượt" />
              </ChartPanel>
              <ChartPanel title="Phân bổ cửa sổ 30 phút" meta="Event đọc theo time bucket">
                <BarChart items={windowStats} unit="event" />
              </ChartPanel>
            </div>
            <section className="admin-top-papers" aria-label="Paper trong database được đọc nhiều">
              <PanelHead title="Paper đang được đọc nhiều trong database" meta="Xếp hạng theo record đã ghi DB" />
              <div className="admin-top-paper-list">
                {topReadPapers.map((paper, index) => (
                  <TopReadPaperCard key={paper.paperId} paper={paper} rank={index + 1} />
                ))}
              </div>
            </section>
            <p className="admin-read-note">
              Quy tắc demo: chỉ cộng vào thống kê khi paper đã có trong database và user đọc đủ ngưỡng, ví dụ từ 2 phút trở lên. Event quá ngắn vẫn hiện trong log kỹ thuật nhưng không tính vào top quan tâm.
            </p>
            <div className="admin-table-wrap">
              <table className="admin-table admin-read-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Paper đã xem</th>
                    <th>Nguồn</th>
                    <th>Thời điểm</th>
                    <th>Thời lượng</th>
                    <th>Cửa sổ 30p</th>
                    <th>Ghi DB</th>
                  </tr>
                </thead>
                <tbody>
                  {readLogs.map((log) => (
                    <ReadLogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "logs" && (
          <section className="admin-panel">
            <div className="admin-log-head">
              <PanelHead title="Audit log người dùng & hệ thống" meta="Theo dõi hành động quan trọng, IP và mức độ rủi ro" />
              <label className="admin-log-search">
                <IconSearch width={15} height={15} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm actor, hành động, IP..."
                  aria-label="Tìm audit log"
                />
              </label>
            </div>
            <AuditList logs={filteredLogs} />
          </section>
        )}
        </section>
      </main>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="sumstat">
      <span className="sumstat__label">{label}</span>
      <span className="sumstat__value num">{value}</span>
    </div>
  );
}

function buildTopReadPapers(logs: PaperReadLog[]): TopReadPaper[] {
  const map = new Map<string, TopReadPaper & { readerEmails: Set<string> }>();
  for (const log of logs) {
    if (log.persistStatus !== "stored") continue;
    const current = map.get(log.paperId) ?? {
      paperId: log.paperId,
      paperTitle: log.paperTitle,
      topic: log.topic,
      source: log.source,
      reads: 0,
      readers: 0,
      totalMinutes: 0,
      latestAt: log.viewedAt,
      readerEmails: new Set<string>(),
    };
    current.reads += 1;
    current.totalMinutes += log.durationMinutes;
    current.latestAt = log.viewedAt > current.latestAt ? log.viewedAt : current.latestAt;
    current.readerEmails.add(log.userEmail);
    current.readers = current.readerEmails.size;
    map.set(log.paperId, current);
  }
  return Array.from(map.values())
    .map(({ readerEmails: _readerEmails, ...paper }) => paper)
    .sort((a, b) => b.reads - a.reads || b.totalMinutes - a.totalMinutes);
}

function buildTopicInterest(logs: PaperReadLog[]): ReadChartItem[] {
  const map = new Map<string, { reads: number; minutes: number; papers: Set<string> }>();
  for (const log of logs) {
    if (log.persistStatus !== "stored") continue;
    const current = map.get(log.topic) ?? { reads: 0, minutes: 0, papers: new Set<string>() };
    current.reads += 1;
    current.minutes += log.durationMinutes;
    current.papers.add(log.paperId);
    map.set(log.topic, current);
  }
  return Array.from(map.entries())
    .map(([topic, value]) => ({
      id: topic,
      label: topic,
      value: value.reads,
      detail: `${value.papers.size} paper · ${formatInt(value.minutes)} phút đọc`,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildWindowStats(logs: PaperReadLog[]): ReadChartItem[] {
  const map = new Map<string, { events: number; stored: number }>();
  for (const log of logs) {
    const current = map.get(log.sessionWindow) ?? { events: 0, stored: 0 };
    current.events += 1;
    if (log.persistStatus === "stored") current.stored += 1;
    map.set(log.sessionWindow, current);
  }
  return Array.from(map.entries())
    .map(([window, value]) => ({
      id: window,
      label: window,
      value: value.events,
      detail: `${value.stored} record đã ghi DB`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function ChartPanel({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return (
    <section className="admin-chart-panel">
      <PanelHead title={title} meta={meta} />
      {children}
    </section>
  );
}

function BarChart({ items, unit }: { items: ReadChartItem[]; unit: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="admin-bar-chart">
      {items.map((item) => (
        <div className="admin-bar-row" key={item.id}>
          <div className="admin-bar-row__label">
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </div>
          <div className="admin-bar-row__track" aria-label={`${item.label}: ${item.value} ${unit}`}>
            <span style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
          </div>
          <span className="admin-bar-row__value num">
            {formatInt(item.value)} {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function TopReadPaperCard({ paper, rank }: { paper: TopReadPaper; rank: number }) {
  return (
    <article className="admin-top-paper">
      <span className="admin-top-paper__rank num">#{rank}</span>
      <div className="admin-top-paper__main">
        <strong>{paper.paperTitle}</strong>
        <small>{paper.source} · {paper.topic} · cập nhật gần nhất {paper.latestAt}</small>
      </div>
      <div className="admin-top-paper__metrics">
        <span>
          <strong className="num">{formatInt(paper.reads)}</strong>
          <small>lượt đọc</small>
        </span>
        <span>
          <strong className="num">{formatInt(paper.readers)}</strong>
          <small>user</small>
        </span>
        <span>
          <strong className="num">{formatInt(paper.totalMinutes)}p</strong>
          <small>thời lượng</small>
        </span>
      </div>
    </article>
  );
}

function PanelHead({ title, meta }: { title: string; meta: string }) {
  return (
    <header className="admin-panel__head">
      <h2>{title}</h2>
      <span>{meta}</span>
    </header>
  );
}

function JobRow({ job, onRerun, compact = false }: { job: AdminJob; onRerun: (id: string) => void; compact?: boolean }) {
  return (
    <article className={`admin-job ${compact ? "admin-job--compact" : ""}`}>
      <div className="admin-job__main">
        <span className="admin-job__icon" aria-hidden>
          <IconRefresh width={16} height={16} />
        </span>
        <span>
          <strong>{job.name}</strong>
          <small>
            {job.source} · {job.owner} · {job.startedAt}
            {job.query ? ` · query: "${job.query}"` : ""}
            {job.imported || job.skipped ? ` · import ${job.imported ?? 0}, trùng ${job.skipped ?? 0}` : ""}
          </small>
          {job.errorMessage && <small className="admin-read-note">{job.errorMessage}</small>}
        </span>
      </div>
      <div className="admin-progress" aria-label={`Tiến độ ${job.progress}%`}>
        <span style={{ width: `${job.progress}%` }} />
      </div>
      <span className="admin-job__records num">{formatInt(job.records)} records</span>
      <StatusPill status={job.status} label={JOB_STATUS_LABEL[job.status]} />
      <button className="btn btn--ghost btn--sm" type="button" onClick={() => onRerun(job.id)}>
        {job.status === "queued" ? "Chạy sync" : "Chạy lại"}
      </button>
    </article>
  );
}

function SourceCard({ source, onToggle }: { source: DataSource; onToggle: (id: string) => void }) {
  return (
    <article className="admin-source-card">
      <div className="admin-source-card__head">
        <span>
          <strong>{source.name}</strong>
          <small>Đồng bộ {source.lastSync}</small>
        </span>
        <StatusPill status={source.status} label={SOURCE_STATUS_LABEL[source.status]} />
      </div>
      <dl className="admin-source-metrics">
        <div>
          <dt>Coverage</dt>
          <dd>{source.coverage}</dd>
        </div>
        <div>
          <dt>Latency</dt>
          <dd>{source.latency}</dd>
        </div>
        <div>
          <dt>Error</dt>
          <dd>{source.errorRate}</dd>
        </div>
      </dl>
      {source.errorMessage && <p className="admin-read-note">{source.errorMessage}</p>}
      <button className="btn btn--ghost" type="button" onClick={() => onToggle(source.id)}>
        {source.enabled ? "Tạm dừng nguồn" : "Bật lại nguồn"}
      </button>
    </article>
  );
}

function UserRow({ user, onToggleLock }: { user: AdminUser; onToggleLock: (id: string) => void }) {
  return (
    <tr>
      <td>
        <span className="admin-user">
          <span className="member-avatar" aria-hidden>{initials(user.name)}</span>
          <span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </span>
        </span>
      </td>
      <td>{user.role}</td>
      <td>
        <StatusPill status={user.status} label={USER_STATUS_LABEL[user.status]} />
      </td>
      <td>{user.lastActive}</td>
      <td className="num">{formatInt(user.savedPapers)}</td>
      <td>
        <button className="btn btn--ghost btn--sm" type="button" onClick={() => onToggleLock(user.id)}>
          {user.status === "locked" ? "Mở khóa" : "Khóa"}
        </button>
      </td>
    </tr>
  );
}

function FeedbackRow({
  feedback,
  onUpdate,
}: {
  feedback: FeedbackItem;
  onUpdate: (id: string, patch: { status?: FeedbackStatus; admin_note?: string | null }) => void;
}) {
  const [note, setNote] = useState(feedback.admin_note ?? "");
  const id = feedbackId(feedback);
  const userLabel = feedbackUserLabel(feedback);

  useEffect(() => {
    setNote(feedback.admin_note ?? "");
  }, [feedback.admin_note]);

  return (
    <article className="admin-feedback-card">
      <div className="admin-feedback-card__body">
        <div className="admin-feedback-card__head">
          <span>
            <strong>{userLabel}</strong>
            <small>{formatDate(feedback.created_at)}</small>
          </span>
          <StatusPill status={feedback.status.toLowerCase()} label={FEEDBACK_STATUS_LABEL[feedback.status]} />
        </div>
        <p>{feedback.content}</p>
      </div>
      <div className="admin-feedback-card__actions">
        <select
          value={feedback.status}
          onChange={(event) => onUpdate(id, { status: event.target.value as FeedbackStatus })}
          aria-label="Cập nhật trạng thái phản hồi"
        >
          <option value="Pending">Đang chờ</option>
          <option value="Reviewed">Đã xem</option>
          <option value="Resolved">Đã xử lý</option>
        </select>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => onUpdate(id, { admin_note: note.trim() || null })}
          placeholder="Ghi chú admin"
          rows={3}
        />
      </div>
    </article>
  );
}

function ReadLogRow({ log }: { log: PaperReadLog }) {
  return (
    <tr>
      <td>
        <span className="admin-user">
          <span className="member-avatar" aria-hidden>{initials(log.userName)}</span>
          <span>
            <strong>{log.userName}</strong>
            <small>{log.userEmail}</small>
          </span>
        </span>
      </td>
      <td>
        <span className="admin-read-paper">
          <strong>{log.paperTitle}</strong>
            <small>{log.topic} · {log.reason}</small>
        </span>
      </td>
      <td>{log.source}</td>
      <td className="num">{log.viewedAt}</td>
      <td className="num">{formatInt(log.durationMinutes)} phút</td>
      <td className="num">{log.sessionWindow}</td>
      <td>
        <StatusPill status={log.persistStatus} label={READING_STATUS_LABEL[log.persistStatus]} />
      </td>
    </tr>
  );
}

function AuditList({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="state state--empty">
        <p className="state__title">Không tìm thấy audit log</p>
        <p className="state__body">Thử tìm theo actor, hành động, mục tiêu hoặc IP khác.</p>
      </div>
    );
  }
  return (
    <ol className="admin-audit-list">
      {logs.map((log) => (
        <li key={log.id}>
          <span className={`admin-audit__severity admin-audit__severity--${log.severity}`} aria-hidden />
          <span>
            <strong>{log.action}</strong>
            <small>{log.actor} · {log.target} · {log.ip}</small>
          </span>
          <time>{log.time}</time>
        </li>
      ))}
    </ol>
  );
}

function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={`admin-status admin-status--${status}`}>{label}</span>;
}

function feedbackId(feedback: FeedbackItem) {
  return feedback._id ?? feedback.id ?? "";
}

function feedbackUserLabel(feedback: FeedbackItem) {
  if (typeof feedback.user_id === "object" && feedback.user_id) {
    return feedback.user_id.full_name || feedback.user_id.email || "Người dùng";
  }
  return typeof feedback.user_id === "string" ? feedback.user_id : "Người dùng";
}

function formatDate(value?: string) {
  if (!value) return "vừa xong";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
