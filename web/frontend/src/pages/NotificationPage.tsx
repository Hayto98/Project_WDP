import { useEffect, useMemo, useState } from "react";
import { IconAlert, IconBell, IconExternal, IconFilter, IconGrid, IconLibrary, IconTrend } from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  NOTIFICATIONS,
  type NotificationItem,
  type NotificationKind,
  type NotificationPriority,
} from "../data/notificationSample";
import type { Theme } from "../hooks/useTheme";
import { formatInt } from "../lib/format";
import { notificationApi } from "../lib/api";
import { USE_SAMPLE_FALLBACK } from "../lib/flags";

type InboxFilter = "all" | "unread" | NotificationKind;

interface Props {
  theme: Theme;
  toggle: () => void;
}

const FILTERS: { id: InboxFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "unread", label: "Chưa đọc" },
  { id: "task", label: "Task" },
  { id: "invite", label: "Lời mời" },
  { id: "comment", label: "Bình luận" },
  { id: "system", label: "Tín hiệu hệ thống" },
];

const KIND_LABEL: Record<NotificationKind, string> = {
  task: "Task",
  invite: "Lời mời",
  comment: "Bình luận",
  paper: "Paper mới",
  trend: "Xu hướng",
  system: "Tín hiệu hệ thống",
};

const PRIORITY_LABEL: Record<NotificationPriority, string> = {
  high: "Ưu tiên cao",
  normal: "Bình thường",
  low: "Thông tin",
};

export function NotificationPage({ theme, toggle }: Props) {
  const [notifications, setNotifications] = useState(USE_SAMPLE_FALLBACK ? NOTIFICATIONS : []);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [selectedId, setSelectedId] = useState(USE_SAMPLE_FALLBACK ? NOTIFICATIONS[0]?.id ?? "" : "");

  useEffect(() => {
    let alive = true;
    notificationApi
      .list()
      .then((items) => {
        if (!alive) return;
        setNotifications(items);
        setSelectedId(items[0]?.id ?? "");
      })
      .catch(() => {
        if (!USE_SAMPLE_FALLBACK && alive) {
          setNotifications([]);
          setSelectedId("");
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return notifications.filter((item) => {
      if (filter === "all") return true;
      if (filter === "unread") return item.unread;
      return item.kind === filter;
    });
  }, [filter, notifications]);

  const selected = notifications.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const unreadCount = notifications.filter((item) => item.unread).length;
  const highCount = notifications.filter((item) => item.priority === "high").length;
  const taskCount = notifications.filter((item) => item.kind === "task" || item.kind === "comment").length;
  const inviteCount = notifications.filter((item) => item.kind === "invite").length;
  const systemCount = notifications.filter((item) => item.kind === "system").length;

  const markRead = (id: string, unread: boolean) => {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, unread } : item)));
    if (!unread) notificationApi.markRead(id).catch(() => undefined);
  };

  const markAllRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
    notificationApi.markAllRead().catch(() => undefined);
  };

  return (
    <main className="main notifications">
      <header className="topbar">
        <div className="topbar__lead">
          <h1>Hộp thư</h1>
          <p className="topbar__sub">
            Cập nhật task, lời mời nghiên cứu chung, bình luận và tín hiệu hệ thống (bảo trì, thông báo chung)
          </p>
        </div>
        <div className="topbar__controls">
          <button className="btn btn--ghost" type="button" onClick={markAllRead} disabled={unreadCount === 0}>
            Đánh dấu đã đọc
          </button>
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      <div className="trendsum notification-sum" aria-label="Tổng quan hộp thư">
        <Summary label="Chưa đọc" value={formatInt(unreadCount)} />
        <Summary label="Ưu tiên cao" value={formatInt(highCount)} />
        <Summary label="Task & bình luận" value={formatInt(taskCount)} />
        <Summary label="Lời mời" value={formatInt(inviteCount)} />
        <Summary label="Tín hiệu hệ thống" value={formatInt(systemCount)} />
      </div>

      <section className="notification-toolbar" aria-label="Bộ lọc thông báo">
        <div className="searchbar notification-searchbar">
          <span className="searchbar__scope">
            <IconFilter width={15} height={15} /> Bộ lọc
          </span>
          <div className="seg" role="group" aria-label="Lọc hộp thư thông báo">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                className={`seg__btn ${filter === item.id ? "is-active" : ""}`}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="notification-layout">
        <section className="notification-list" aria-label="Danh sách thông báo">
          {filtered.length === 0 ? (
            <div className="state state--empty">
              <p className="state__title">Hộp thư trống</p>
              <p className="state__body">
                Bạn sẽ thấy task được giao, lời mời cộng tác, bình luận và tín hiệu bảo trì từ admin tại đây.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                selected={selected?.id === item.id}
                onSelect={() => {
                  setSelectedId(item.id);
                  markRead(item.id, false);
                }}
              />
            ))
          )}
        </section>

        <aside className="notification-detail" aria-label="Chi tiết thông báo">
          {selected ? (
            <>
              <div className="notification-detail__head">
                <span className={`notification-kind notification-kind--${selected.kind}`}>
                  {iconForKind(selected.kind)}
                  {KIND_LABEL[selected.kind]}
                </span>
                <span className={`notification-priority notification-priority--${selected.priority}`}>
                  {PRIORITY_LABEL[selected.priority]}
                </span>
              </div>
              <h2>{selected.title}</h2>
              <p>{selected.body}</p>
              <dl className="notification-facts">
                <div>
                  <dt>Nguồn</dt>
                  <dd>{selected.source}</dd>
                </div>
                <div>
                  <dt>Người gửi</dt>
                  <dd>{selected.actor}</dd>
                </div>
                <div>
                  <dt>Thời gian</dt>
                  <dd>{selected.time}</dd>
                </div>
              </dl>
              <ul className="notification-meta">
                {selected.meta.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="notification-detail__actions">
                <a className="btn btn--primary" href={selected.targetHref}>
                  {selected.targetLabel} <IconExternal width={14} height={14} />
                </a>
                <button className="btn btn--ghost" type="button" onClick={() => markRead(selected.id, !selected.unread)}>
                  {selected.unread ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc"}
                </button>
              </div>
            </>
          ) : (
            <div className="workspace-detail__empty">
              <IconBell width={24} height={24} />
              <p>Chọn một thông báo để xem chi tiết và hành động tiếp theo.</p>
            </div>
          )}
        </aside>
      </div>
    </main>
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

function NotificationRow({
  item,
  selected,
  onSelect,
}: {
  item: NotificationItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={`notification-row ${selected ? "is-selected" : ""}`} type="button" onClick={onSelect}>
      <span className={`notification-row__icon notification-row__icon--${item.kind}`}>{iconForKind(item.kind)}</span>
      <span className="notification-row__main">
        <span className="notification-row__title">
          {item.unread && <span className="notification-dot" aria-label="Chưa đọc" />}
          <strong>{item.title}</strong>
        </span>
        <span className="notification-row__body">{item.body}</span>
        <span className="notification-row__meta">
          <span>{item.source}</span>
          <span>{item.time}</span>
        </span>
      </span>
      <span className={`notification-priority notification-priority--${item.priority}`}>
        {PRIORITY_LABEL[item.priority]}
      </span>
    </button>
  );
}

function iconForKind(kind: NotificationKind) {
  if (kind === "task") return <IconGrid width={15} height={15} />;
  if (kind === "invite") return <IconBell width={15} height={15} />;
  if (kind === "paper") return <IconLibrary width={15} height={15} />;
  if (kind === "trend") return <IconTrend width={15} height={15} />;
  if (kind === "system") return <IconAlert width={15} height={15} />;
  return <IconBell width={15} height={15} />;
}
