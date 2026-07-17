import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { IconRefresh, IconUser } from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle";
import type { Theme } from "../hooks/useTheme";
import { authApi, feedbackApi, getCurrentUser, userApi, type AuthUser } from "../lib/api";

type FeedbackStatus = "Pending" | "Reviewed" | "Resolved";

interface FeedbackMessage {
  _id?: string;
  sender_role: "User" | "Admin";
  sender_name?: string;
  content: string;
  created_at?: string;
}

interface FeedbackItem {
  _id?: string;
  id?: string;
  content: string;
  status: FeedbackStatus;
  admin_note?: string | null;
  messages?: FeedbackMessage[];
  last_message?: string;
  last_message_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  theme: Theme;
  toggle: () => void;
}

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  Pending: "Đang chờ",
  Reviewed: "Đã xem",
  Resolved: "Đã xử lý",
};

function feedbackId(item: FeedbackItem) {
  return item._id ?? item.id ?? "";
}

function threadMessages(item: FeedbackItem): FeedbackMessage[] {
  if (item.messages?.length) return item.messages;
  const rows: FeedbackMessage[] = [];
  if (item.content) {
    rows.push({
      sender_role: "User",
      sender_name: "Bạn",
      content: item.content,
      created_at: item.created_at,
    });
  }
  if (item.admin_note) {
    rows.push({
      sender_role: "Admin",
      sender_name: "Admin",
      content: item.admin_note,
      created_at: item.updated_at,
    });
  }
  return rows;
}

export function AccountPage({ theme, toggle }: Props) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [profileName, setProfileName] = useState(() => getCurrentUser()?.full_name ?? "");
  const [profileEmail, setProfileEmail] = useState(() => getCurrentUser()?.email ?? "");
  const [profileNotice, setProfileNotice] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const selectedFeedback = feedbacks.find((item) => feedbackId(item) === selectedFeedbackId) ?? feedbacks[0] ?? null;

  const loadFeedbacks = async () => {
    setFeedbackNotice("");
    try {
      const result = await feedbackApi.list({ page: 1, limit: 20 });
      const rows = Array.isArray(result.data) ? result.data : [];
      setFeedbacks(rows);
      setSelectedFeedbackId((current) => {
        if (current && rows.some((item) => feedbackId(item) === current)) return current;
        return rows[0] ? feedbackId(rows[0]) : null;
      });
    } catch (err) {
      setFeedbackNotice(err instanceof Error ? err.message : "Không tải được phản hồi.");
    }
  };

  useEffect(() => {
    void loadFeedbacks();
  }, []);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [selectedFeedback?.messages, selectedFeedbackId]);

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileNotice("");
    setProfileBusy(true);
    try {
      const nextUser = await userApi.updateProfile({
        full_name: profileName.trim(),
        email: profileEmail.trim(),
      });
      setCurrentUser(nextUser);
      setProfileName(nextUser.full_name);
      setProfileEmail(nextUser.email);
      setProfileNotice("Đã cập nhật thông tin tài khoản.");
    } catch (err) {
      setProfileNotice(err instanceof Error ? err.message : "Không cập nhật được tài khoản.");
    } finally {
      setProfileBusy(false);
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordNotice("");
    if (newPassword !== confirmPassword) {
      setPasswordNotice("Mật khẩu mới chưa khớp.");
      return;
    }
    setPasswordBusy(true);
    try {
      const result = await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice(result.message || "Đã đổi mật khẩu.");
    } catch (err) {
      setPasswordNotice(err instanceof Error ? err.message : "Không đổi được mật khẩu.");
    } finally {
      setPasswordBusy(false);
    }
  };

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = feedbackContent.trim();
    if (!content) return;
    setFeedbackBusy(true);
    setFeedbackNotice("");
    try {
      const created = (await feedbackApi.create(content)) as FeedbackItem;
      setFeedbackContent("");
      setFeedbacks((current) => {
        const id = feedbackId(created);
        const without = current.filter((item) => feedbackId(item) !== id);
        return [created, ...without];
      });
      setSelectedFeedbackId(feedbackId(created));
      setFeedbackNotice("Đã gửi tin nhắn cho admin.");
    } catch (err) {
      setFeedbackNotice(err instanceof Error ? err.message : "Không gửi được phản hồi.");
    } finally {
      setFeedbackBusy(false);
    }
  };

  const replyInThread = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFeedback) return;
    const content = replyContent.trim();
    if (!content) return;
    setFeedbackBusy(true);
    setFeedbackNotice("");
    try {
      const updated = (await feedbackApi.reply(feedbackId(selectedFeedback), content)) as FeedbackItem;
      setReplyContent("");
      setFeedbacks((current) => current.map((item) => (feedbackId(item) === feedbackId(updated) ? updated : item)));
      setFeedbackNotice("Đã gửi tin nhắn tiếp theo.");
    } catch (err) {
      setFeedbackNotice(err instanceof Error ? err.message : "Không gửi được tin nhắn.");
    } finally {
      setFeedbackBusy(false);
    }
  };

  return (
    <main className="main">
      <header className="topbar">
        <div className="topbar__lead">
          <h1>Tài khoản</h1>
          <p className="topbar__sub">Quản lý bảo mật tài khoản và gửi phản hồi vận hành</p>
        </div>
        <div className="topbar__controls">
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      <section className="account-grid">
        <article className="account-panel">
          <header className="account-panel__head">
            <span className="account-panel__icon" aria-hidden>
              <IconUser width={18} height={18} />
            </span>
            <span>
              <h2>Thông tin tài khoản</h2>
              <small>{currentUser?.email ?? "Chưa xác định email"}</small>
            </span>
          </header>
          <dl className="account-profile">
            <div>
              <dt>Họ tên</dt>
              <dd>{currentUser?.full_name ?? "Người dùng"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{currentUser?.email ?? "Chưa xác định email"}</dd>
            </div>
            <div>
              <dt>Vai trò</dt>
              <dd>{currentUser?.roles.join(", ") ?? "Student"}</dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>{currentUser?.status ?? "Active"}</dd>
            </div>
          </dl>
          <form className="account-form" onSubmit={submitProfile}>
            <label>
              <span>Họ tên</span>
              <input
                type="text"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </label>
            <button className="btn btn--primary" type="submit" disabled={profileBusy}>
              {profileBusy ? "Đang lưu..." : "Lưu thông tin"}
            </button>
          </form>
          {profileNotice && <p className="invite-notice account-notice" role="status">{profileNotice}</p>}
        </article>

        <article className="account-panel">
          <header className="account-panel__head">
            <span>
              <h2>Đổi mật khẩu</h2>
              <small>Yêu cầu nhập mật khẩu hiện tại trước khi cập nhật</small>
            </span>
          </header>
          <form className="account-form" onSubmit={submitPassword}>
            <label>
              <span>Mật khẩu hiện tại</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
            <label>
              <span>Mật khẩu mới</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
            <label>
              <span>Nhập lại mật khẩu mới</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
            <button className="btn btn--primary" type="submit" disabled={passwordBusy}>
              {passwordBusy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>
          </form>
          {passwordNotice && <p className="invite-notice account-notice" role="status">{passwordNotice}</p>}
        </article>

        <article className="account-panel account-panel--wide">
          <header className="account-panel__head">
            <span>
              <h2>Chat phản hồi với Admin</h2>
              <small>Gửi góp ý và xem lại toàn bộ lịch sử hội thoại</small>
            </span>
            <button className="btn btn--ghost btn--sm" type="button" onClick={loadFeedbacks}>
              <IconRefresh width={14} height={14} /> Làm mới
            </button>
          </header>

          <form className="account-form account-form--feedback" onSubmit={submitFeedback}>
            <label>
              <span>Bắt đầu / tiếp tục hội thoại</span>
              <textarea
                value={feedbackContent}
                onChange={(event) => setFeedbackContent(event.target.value)}
                rows={3}
                minLength={1}
                maxLength={2000}
                placeholder="Nhập tin nhắn gửi admin…"
                required
              />
            </label>
            <button className="btn btn--primary" type="submit" disabled={feedbackBusy}>
              {feedbackBusy ? "Đang gửi..." : "Gửi tin nhắn"}
            </button>
          </form>
          {feedbackNotice && <p className="invite-notice account-notice" role="status">{feedbackNotice}</p>}

          <div className="feedback-chat feedback-chat--account" aria-label="Lịch sử chat phản hồi">
            <aside className="feedback-chat__list">
              {feedbacks.length === 0 ? (
                <div className="state state--empty">
                  <p className="state__title">Chưa có hội thoại</p>
                </div>
              ) : (
                feedbacks.map((item) => {
                  const id = feedbackId(item);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`feedback-chat__item ${selectedFeedback && feedbackId(selectedFeedback) === id ? "is-active" : ""}`}
                      onClick={() => setSelectedFeedbackId(id)}
                    >
                      <span className="feedback-chat__meta">
                        <strong>{STATUS_LABEL[item.status]}</strong>
                        <small>{item.last_message || item.content}</small>
                      </span>
                      <time>{formatWhen(item.last_message_at || item.created_at)}</time>
                    </button>
                  );
                })
              )}
            </aside>

            <section className="feedback-chat__panel">
              {selectedFeedback ? (
                <>
                  <header className="feedback-chat__head">
                    <div>
                      <strong>Hội thoại với Admin</strong>
                      <small>{STATUS_LABEL[selectedFeedback.status]}</small>
                    </div>
                  </header>
                  <div className="feedback-chat__thread" ref={threadRef}>
                    {threadMessages(selectedFeedback).map((message, index) => {
                      const mine = message.sender_role === "User";
                      return (
                        <div
                          key={message._id || `${message.sender_role}-${index}`}
                          className={`feedback-bubble ${mine ? "is-user" : "is-admin"}`}
                        >
                          <div className="feedback-bubble__meta">
                            <strong>{mine ? "Bạn" : "Admin"}</strong>
                            <time>{formatWhen(message.created_at)}</time>
                          </div>
                          <p>{message.content}</p>
                        </div>
                      );
                    })}
                  </div>
                  <form className="feedback-chat__composer" onSubmit={replyInThread}>
                    <textarea
                      value={replyContent}
                      onChange={(event) => setReplyContent(event.target.value)}
                      rows={2}
                      placeholder="Nhắn tiếp cho admin…"
                      aria-label="Tin nhắn tiếp theo"
                    />
                    <button className="btn btn--primary" type="submit" disabled={feedbackBusy || !replyContent.trim()}>
                      Gửi
                    </button>
                  </form>
                </>
              ) : (
                <div className="state state--empty">
                  <p className="state__title">Chưa chọn hội thoại</p>
                </div>
              )}
            </section>
          </div>
        </article>
      </section>
    </main>
  );
}

function formatWhen(value?: string) {
  if (!value) return "vừa xong";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}
