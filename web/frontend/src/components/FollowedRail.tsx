import type { FollowedSubject, NotificationItem } from "../data/types";
import { formatInt } from "../lib/format";
import { IconBell, IconBookmark, IconPlus } from "./icons";

interface Props {
  followed: FollowedSubject[];
  notifications: NotificationItem[];
}

export function FollowedRail({ followed, notifications }: Props) {
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <aside className="rail" aria-label="Theo dõi & thông báo cá nhân">
      <section className="rail__card">
        <header className="rail__head">
          <h2>
            <IconBookmark width={17} height={17} /> Chủ đề theo dõi
          </h2>
          <button className="btn btn--ghost btn--sm">
            <IconPlus width={15} height={15} /> Thêm
          </button>
        </header>
        <ul className="follow-list">
          {followed.map((f) => (
            <li key={f.id}>
              <button className="follow">
                <span className="follow__label">{f.label}</span>
                <span className={`follow__type follow__type--${f.type}`}>
                  {f.type === "field" ? "Lĩnh vực" : "Từ khóa"}
                </span>
                {f.newPapers > 0 && (
                  <span className="follow__badge num">+{formatInt(f.newPapers)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rail__card">
        <header className="rail__head">
          <h2>
            <IconBell width={17} height={17} /> Thông báo
            {unread > 0 && <span className="rail__count num">{unread}</span>}
          </h2>
        </header>
        <ul className="notif-list">
          {notifications.map((n) => (
            <li key={n.id} className={`notif ${n.unread ? "is-unread" : ""}`}>
              {n.unread && <span className="notif__dot" aria-label="chưa đọc" />}
              <div className="notif__body">
                <p className="notif__paper">{n.paperTitle}</p>
                <p className="notif__meta">
                  Chủ đề <b>{n.subject}</b> · {n.when}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="rail__foot">Thông báo tự động xóa sau 30 ngày.</p>
      </section>
    </aside>
  );
}
