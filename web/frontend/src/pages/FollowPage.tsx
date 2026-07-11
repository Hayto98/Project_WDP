import { useEffect, useMemo, useState } from "react";
import {
  IconBell,
  IconBookmark,
  IconExternal,
  IconFilter,
  IconPlus,
  IconSearch,
  IconX,
} from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  FOLLOW_ALERTS,
  FOLLOW_SUBJECTS,
  makeFollowAlerts,
  type AlertPriority,
  type AlertThreshold,
  type DeliveryFrequency,
  type FollowAlertEntry,
  type FollowRule,
  type FollowSubject,
  type FollowType,
} from "../data/followSample";
import type { Theme } from "../hooks/useTheme";
import { formatInt } from "../lib/format";
import { followApi } from "../lib/api";
import { SHOW_DEMO_CONTROLS, USE_SAMPLE_FALLBACK } from "../lib/flags";

type FeedFilter = "all" | "unread" | "high";
type SortKey = "newest" | "priority";
type Demo = "auto" | "loading" | "empty" | "error";

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "unread", label: "Chưa đọc" },
  { id: "high", label: "Ưu tiên cao" },
];

const PRIORITY_LABEL: Record<AlertPriority, string> = {
  high: "Cao",
  medium: "Vừa",
  low: "Thấp",
};

const TYPE_LABEL: Record<FollowType, string> = {
  field: "Lĩnh vực",
  keyword: "Từ khóa",
  author: "Tác giả",
};

const FREQ_LABEL: Record<DeliveryFrequency, string> = {
  instant: "Ngay lập tức",
  daily: "Hằng ngày",
  weekly: "Hằng tuần",
};

const THRESHOLD_LABEL: Record<AlertThreshold, string> = {
  all: "Mọi bài khớp",
  highCitation: "Chỉ citation cao",
  trustedSources: "Chỉ nguồn uy tín",
};

interface Props {
  theme: Theme;
  toggle: () => void;
}

export function FollowPage({ theme, toggle }: Props) {
  const [subjects, setSubjects] = useState<FollowSubject[]>(USE_SAMPLE_FALLBACK ? FOLLOW_SUBJECTS : []);
  const [alerts, setAlerts] = useState(USE_SAMPLE_FALLBACK ? FOLLOW_ALERTS : []);
  const [activeId, setActiveId] = useState("all");
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<FollowType>("keyword");
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState<Demo>("auto");
  const [notice, setNotice] = useState("");

  const reloadFollowData = async () => {
    const [nextSubjects, nextAlerts] = await Promise.all([followApi.subjects(), followApi.alerts()]);
    setSubjects(nextSubjects);
    setAlerts(nextAlerts);
    return [nextSubjects, nextAlerts] as const;
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    reloadFollowData()
      .then(([nextSubjects]) => {
        if (!alive) return;
        if (nextSubjects.length) setActiveId("all");
      })
      .catch((err) => {
        if (alive) {
          if (!USE_SAMPLE_FALLBACK) {
            setSubjects([]);
            setAlerts([]);
          }
          setNotice(err instanceof Error ? err.message : "Không tải được dữ liệu theo dõi.");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const entries = useMemo(() => makeFollowAlerts(subjects, alerts), [subjects, alerts]);
  const activeSubject = subjects.find((s) => s.id === activeId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = entries.filter((entry) => {
      const hay = [
        entry.subject.label,
        entry.paper.title,
        entry.paper.authors.join(" "),
        entry.paper.source,
        entry.reason,
      ]
        .join(" ")
        .toLowerCase();
      if (activeId !== "all" && entry.subjectId !== activeId) return false;
      if (filter === "unread" && !entry.unread) return false;
      if (filter === "high" && entry.priority !== "high") return false;
      if (q && !hay.includes(q)) return false;
      return true;
    });

    rows.sort((a, b) => {
      if (sort === "priority") return priorityWeight(b.priority) - priorityWeight(a.priority);
      return alerts.findIndex((x) => x.id === a.id) - alerts.findIndex((x) => x.id === b.id);
    });
    return rows;
  }, [entries, activeId, filter, query, sort, alerts]);

  const unreadCount = alerts.filter((a) => a.unread).length;
  const activeCount = subjects.filter((s) => s.active).length;
  const highCount = alerts.filter((a) => a.priority === "high").length;

  const view: "loading" | "error" | "empty" | "ready" =
    demo === "loading" || loading
      ? "loading"
      : demo === "error"
        ? "error"
        : demo === "empty" || subjects.length === 0
          ? "empty"
          : "ready";

  const updateSubject = async (id: string, patch: Partial<FollowSubject>) => {
    setNotice("");
    const previous = subjects;
    setSubjects((current) => current.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    try {
      const updated = await followApi.updateSubject(id, { active: patch.active });
      setSubjects((current) => current.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      setSubjects(previous);
      setNotice(err instanceof Error ? err.message : "Không cập nhật được mục theo dõi.");
    }
  };

  const updateRule = async (id: string, patch: Partial<FollowRule>) => {
    setNotice("");
    const previous = subjects;
    setSubjects((current) =>
      current.map((s) => (s.id === id ? { ...s, rule: { ...s.rule, ...patch } } : s)),
    );
    try {
      const updated = await followApi.updateSubject(id, { rule: patch });
      setSubjects((current) => current.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      setSubjects(previous);
      setNotice(err instanceof Error ? err.message : "Không cập nhật được luật theo dõi.");
    }
  };

  const removeSubject = async (id: string) => {
    setNotice("");
    const previousSubjects = subjects;
    const previousAlerts = alerts;
    setSubjects((current) => current.filter((s) => s.id !== id));
    setAlerts((current) => current.filter((a) => a.subjectId !== id));
    setActiveId((current) => (current === id ? "all" : current));
    try {
      await followApi.removeSubject(id);
      setNotice("Đã xóa mục theo dõi.");
    } catch (err) {
      setSubjects(previousSubjects);
      setAlerts(previousAlerts);
      setNotice(err instanceof Error ? err.message : "Không xóa được mục theo dõi.");
    }
  };

  const addSubject = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setNotice("");
    try {
      const subject = await followApi.addSubject({
        value: label,
        type: newType,
        rule: { frequency: "daily", threshold: "all", email: false, inApp: true, exclude: [] },
      });
      setSubjects((current) => [subject, ...current]);
      setNewLabel("");
      setActiveId(subject.id);
      setNotice("Đã thêm mục theo dõi.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không thêm được mục theo dõi.");
    }
  };

  const markAlert = async (id: string, unread: boolean) => {
    setNotice("");
    setAlerts((current) => current.map((a) => (a.id === id ? { ...a, unread } : a)));
    if (unread) return;
    try {
      await followApi.markAlertRead(id);
    } catch (err) {
      setAlerts((current) => current.map((a) => (a.id === id ? { ...a, unread: true } : a)));
      setNotice(err instanceof Error ? err.message : "Không đánh dấu được thông báo.");
    }
  };

  return (
    <main className="main followpage">
      <header className="topbar">
        <div className="topbar__lead">
          <h1>Theo dõi</h1>
          <p className="topbar__sub">
            Quản lý chủ đề, luật thông báo và luồng bài mới phù hợp với hướng nghiên cứu của bạn
          </p>
        </div>
        <div className="topbar__controls">
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      <div className="trendsum followsum" aria-label="Tổng quan theo dõi">
        <Summary label="Mục đang bật" value={formatInt(activeCount)} />
        <Summary label="Thông báo chưa đọc" value={formatInt(unreadCount)} tone={unreadCount ? "up" : undefined} />
        <Summary label="Ưu tiên cao" value={formatInt(highCount)} />
        <Summary label="Bài mới 7 ngày" value={formatInt(subjects.reduce((a, s) => a + s.papers7d, 0))} />
      </div>
      {notice && <p className="notice">{notice}</p>}

      <div className="follow-layout">
        <aside className="follow-side" aria-label="Mục đang theo dõi">
          <div className="follow-side__head">
            <span className="follow-side__title">
              <IconBookmark width={17} height={17} /> Mục theo dõi
            </span>
          </div>

          <button
            className={`fsubject ${activeId === "all" ? "is-active" : ""}`}
            onClick={() => setActiveId("all")}
            aria-current={activeId === "all" ? "page" : undefined}
          >
            <span className="fsubject__main">
              <strong>Tất cả</strong>
              <small>Toàn bộ thông báo</small>
            </span>
            <span className="fsubject__count num">{alerts.length}</span>
          </button>

          <ul className="fsubject-list">
            {subjects.map((subject) => (
              <li key={subject.id}>
                <button
                  className={`fsubject ${activeId === subject.id ? "is-active" : ""} ${
                    !subject.active ? "is-paused" : ""
                  }`}
                  onClick={() => setActiveId(subject.id)}
                  aria-current={activeId === subject.id ? "page" : undefined}
                >
                  <span className="fsubject__main">
                    <strong>{subject.label}</strong>
                    <small>{TYPE_LABEL[subject.type]}</small>
                  </span>
                  <span className="fsubject__count num">+{formatInt(subject.newPapers)}</span>
                </button>
              </li>
            ))}
          </ul>

          <form
            className="follow-new"
            onSubmit={(e) => {
              e.preventDefault();
              addSubject();
            }}
          >
            <label htmlFor="follow-new">Thêm theo dõi</label>
            <div className="follow-new__type seg" role="group" aria-label="Loại mục theo dõi">
              {(["keyword", "field", "author"] as FollowType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`seg__btn ${newType === type ? "is-active" : ""}`}
                  onClick={() => setNewType(type)}
                  aria-pressed={newType === type}
                >
                  {TYPE_LABEL[type]}
                </button>
              ))}
            </div>
            <div className="follow-new__row">
              <input
                id="follow-new"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ví dụ: graph retrieval"
              />
              <button type="submit" className="icon-btn" aria-label="Thêm mục theo dõi">
                <IconPlus width={16} height={16} />
              </button>
            </div>
          </form>
        </aside>

        <section className="follow-feed" aria-live="polite">
          <div className="follow-toolbar">
            <div className="follow-toolbar__title">
              <h2>{activeSubject ? activeSubject.label : "Tất cả thông báo"}</h2>
              <p>
                <span className="num">{formatInt(filtered.length)}</span> thông báo khớp bộ lọc
              </p>
            </div>
            <div className="follow-search">
              <IconSearch width={18} height={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo bài báo, tác giả, lý do khớp…"
                aria-label="Tìm trong thông báo theo dõi"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Xóa từ khóa">
                  <IconX width={14} height={14} />
                </button>
              )}
            </div>
            <div className="seg" role="group" aria-label="Lọc thông báo">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={`seg__btn ${filter === f.id ? "is-active" : ""}`}
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <label className="follow-sort">
              <IconFilter width={15} height={15} />
              <span>Sắp xếp</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="newest">Mới nhất</option>
                <option value="priority">Ưu tiên</option>
              </select>
            </label>
          </div>

          {view === "loading" && <FollowSkeleton />}

          {view === "error" && (
            <div className="state state--error">
              <p className="state__title">Không tải được thông báo theo dõi</p>
              <p className="state__body">Có lỗi khi lấy luồng bài mới. Vui lòng thử lại.</p>
              <button className="btn btn--primary" onClick={() => setDemo("auto")}>
                Thử lại
              </button>
            </div>
          )}

          {view === "empty" && <FollowEmpty onReset={() => setDemo("auto")} />}

          {view === "ready" && filtered.length === 0 && (
            <div className="state state--empty">
              <p className="state__title">Không có thông báo khớp bộ lọc</p>
              <p className="state__body">
                Thử đổi mục theo dõi, xóa từ khóa hoặc chuyển về “Tất cả”.
              </p>
              <button
                className="btn btn--ghost"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                  setActiveId("all");
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}

          {view === "ready" && filtered.length > 0 && (
            <ol className="alert-list">
              {filtered.map((entry) => (
                <AlertRow
                  key={entry.id}
                  entry={entry}
                  onMark={(unread) => markAlert(entry.id, unread)}
                  onSubject={() => setActiveId(entry.subjectId)}
                />
              ))}
            </ol>
          )}
        </section>

        <aside className="follow-detail" aria-label="Cấu hình mục theo dõi">
          {view === "ready" && activeSubject ? (
            <FollowDetail
              subject={activeSubject}
              onUpdate={(patch) => updateSubject(activeSubject.id, patch)}
              onRule={(patch) => updateRule(activeSubject.id, patch)}
              onRemove={() => removeSubject(activeSubject.id)}
            />
          ) : (
            <div className="follow-detail__empty">
              <IconBell width={24} height={24} />
              <p>Chọn một mục theo dõi để chỉnh tần suất, ngưỡng thông báo và kênh nhận tin.</p>
            </div>
          )}
        </aside>
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
    </main>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "up" }) {
  return (
    <div className="sumstat">
      <span className="sumstat__label">{label}</span>
      <span className={`sumstat__value num ${tone === "up" ? "sumstat__value--up" : ""}`}>{value}</span>
    </div>
  );
}

function AlertRow({
  entry,
  onMark,
  onSubject,
}: {
  entry: FollowAlertEntry;
  onMark: (unread: boolean) => void;
  onSubject: () => void;
}) {
  return (
    <li className={`alertrow ${entry.unread ? "is-unread" : ""}`}>
      <div className="alertrow__body">
        <button className="alertrow__subject" onClick={onSubject}>
          <span className={`alertrow__type alertrow__type--${entry.subject.type}`}>
            {TYPE_LABEL[entry.subject.type]}
          </span>
          {entry.subject.label}
        </button>
        <h3>
          <a href={entry.paper.url} target="_blank" rel="noreferrer noopener">
            {entry.paper.title}
          </a>
        </h3>
        <p className="alertrow__meta">
          {entry.paper.authors.slice(0, 3).join(", ")} · <span className="num">{entry.paper.year}</span> ·{" "}
          {entry.paper.source} · {entry.when}
        </p>
        <p className="alertrow__reason">{entry.reason}</p>
      </div>
      <div className="alertrow__side">
        <span className={`priority priority--${entry.priority}`}>{PRIORITY_LABEL[entry.priority]}</span>
        <button className="btn btn--ghost btn--sm" onClick={() => onMark(!entry.unread)}>
          {entry.unread ? "Đã đọc" : "Chưa đọc"}
        </button>
        <a className="iconpill" href={entry.paper.url} target="_blank" rel="noreferrer noopener">
          <IconExternal width={15} height={15} /> Nguồn
        </a>
      </div>
    </li>
  );
}

function FollowDetail({
  subject,
  onUpdate,
  onRule,
  onRemove,
}: {
  subject: FollowSubject;
  onUpdate: (patch: Partial<FollowSubject>) => void;
  onRule: (patch: Partial<FollowRule>) => void;
  onRemove: () => void;
}) {
  const excludeText = subject.rule.exclude.join(", ");

  return (
    <div className="follow-detail__body">
      <div className="follow-detail__head">
        <span className={`alertrow__type alertrow__type--${subject.type}`}>{TYPE_LABEL[subject.type]}</span>
        <button
          className={`switch ${subject.active ? "is-on" : ""}`}
          onClick={() => onUpdate({ active: !subject.active })}
          aria-pressed={subject.active}
        >
          {subject.active ? "Đang bật" : "Tạm dừng"}
        </button>
      </div>

      <h2>{subject.label}</h2>
      <p className="follow-detail__sub">
        <span className="num">+{formatInt(subject.newPapers)}</span> bài mới ·{" "}
        <span className="num">{formatInt(subject.papers7d)}</span> bài trong 7 ngày
      </p>

      <div className="follow-detail__section">
        <span className="follow-detail__label">Tần suất</span>
        <div className="seg" role="group" aria-label="Tần suất thông báo">
          {(["instant", "daily", "weekly"] as DeliveryFrequency[]).map((f) => (
            <button
              key={f}
              className={`seg__btn ${subject.rule.frequency === f ? "is-active" : ""}`}
              aria-pressed={subject.rule.frequency === f}
              onClick={() => onRule({ frequency: f })}
            >
              {FREQ_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <label className="follow-detail__section">
        <span className="follow-detail__label">Ngưỡng thông báo</span>
        <select
          value={subject.rule.threshold}
          onChange={(e) => onRule({ threshold: e.target.value as AlertThreshold })}
        >
          {(["all", "highCitation", "trustedSources"] as AlertThreshold[]).map((t) => (
            <option key={t} value={t}>
              {THRESHOLD_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      <div className="follow-detail__section">
        <span className="follow-detail__label">Kênh nhận tin</span>
        <div className="channel-grid">
          <button
            className={`channel ${subject.rule.inApp ? "is-on" : ""}`}
            onClick={() => onRule({ inApp: !subject.rule.inApp })}
            aria-pressed={subject.rule.inApp}
          >
            Trong ứng dụng
          </button>
          <button
            className={`channel ${subject.rule.email ? "is-on" : ""}`}
            onClick={() => onRule({ email: !subject.rule.email })}
            aria-pressed={subject.rule.email}
          >
            Email
          </button>
        </div>
      </div>

      <label className="follow-detail__section">
        <span className="follow-detail__label">Từ khóa loại trừ</span>
        <textarea
          rows={3}
          value={excludeText}
          onChange={(e) =>
            onRule({
              exclude: e.target.value
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
            })
          }
          aria-label="Từ khóa loại trừ, phân tách bằng dấu phẩy"
        />
      </label>

      <div className="follow-detail__actions">
        <button className="btn btn--ghost" onClick={onRemove}>
          <IconX width={16} height={16} /> Xóa theo dõi
        </button>
      </div>
    </div>
  );
}

function FollowSkeleton() {
  return (
    <ol className="alert-list" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <li className="alertrow alertrow--skel" key={i}>
          <div className="alertrow__body">
            <div className="skel" style={{ height: 14, width: "28%" }} />
            <div className="skel" style={{ height: 18, width: "72%", marginTop: 10 }} />
            <div className="skel" style={{ height: 12, width: "48%", marginTop: 10 }} />
            <div className="skel" style={{ height: 12, width: "86%", marginTop: 12 }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function FollowEmpty({ onReset }: { onReset: () => void }) {
  return (
    <div className="state state--empty">
      <p className="state__title">Bạn chưa theo dõi mục nào</p>
      <p className="state__body">
        Thêm lĩnh vực, từ khóa hoặc tác giả để nhận thông báo khi có bài mới phù hợp.
      </p>
      <button className="btn btn--primary" onClick={onReset}>
        Bắt đầu theo dõi
      </button>
    </div>
  );
}

function priorityWeight(p: AlertPriority) {
  return p === "high" ? 3 : p === "medium" ? 2 : 1;
}
