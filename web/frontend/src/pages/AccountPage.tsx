import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { IconRefresh, IconUser } from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle";
import type { Theme } from "../hooks/useTheme";
import { authApi, feedbackApi, getCurrentUser, userApi, type AuthUser } from "../lib/api";

type FeedbackStatus = "Pending" | "Reviewed" | "Resolved";

interface FeedbackItem {
  _id?: string;
  id?: string;
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

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  Pending: "Đang chờ",
  Reviewed: "Đã xem",
  Resolved: "Đã xử lý",
};

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
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  const loadFeedbacks = async () => {
    setFeedbackNotice("");
    try {
      const result = await feedbackApi.list({ page: 1, limit: 20 });
      setFeedbacks(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setFeedbackNotice(err instanceof Error ? err.message : "Không tải được phản hồi.");
    }
  };

  useEffect(() => {
    void loadFeedbacks();
  }, []);

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
      setFeedbacks((current) => [created, ...current]);
      setFeedbackNotice("Đã gửi phản hồi cho admin.");
    } catch (err) {
      setFeedbackNotice(err instanceof Error ? err.message : "Không gửi được phản hồi.");
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
            <label>
              <span>Email</span>
              <input
                type="email"
                value={profileEmail}
                onChange={(event) => setProfileEmail(event.target.value)}
                maxLength={255}
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
              <h2>Phản hồi hệ thống</h2>
              <small>Gửi lỗi, góp ý hoặc nhu cầu chức năng cho admin</small>
            </span>
            <button className="btn btn--ghost btn--sm" type="button" onClick={loadFeedbacks}>
              <IconRefresh width={14} height={14} /> Làm mới
            </button>
          </header>
          <form className="account-form account-form--feedback" onSubmit={submitFeedback}>
            <label>
              <span>Nội dung phản hồi</span>
              <textarea
                value={feedbackContent}
                onChange={(event) => setFeedbackContent(event.target.value)}
                rows={5}
                minLength={5}
                maxLength={2000}
                required
              />
            </label>
            <button className="btn btn--primary" type="submit" disabled={feedbackBusy}>
              {feedbackBusy ? "Đang gửi..." : "Gửi phản hồi"}
            </button>
          </form>
          {feedbackNotice && <p className="invite-notice account-notice" role="status">{feedbackNotice}</p>}
          <div className="feedback-list" aria-label="Phản hồi đã gửi">
            {feedbacks.length === 0 ? (
              <div className="state state--empty">
                <p className="state__title">Chưa có phản hồi</p>
                <p className="state__body">Các phản hồi đã gửi sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              feedbacks.map((item) => (
                <article className="feedback-card" key={item._id ?? item.id ?? item.content}>
                  <div className="feedback-card__head">
                    <StatusPill status={item.status} />
                    <time>{formatWhen(item.created_at)}</time>
                  </div>
                  <p>{item.content}</p>
                  {item.admin_note && <small>Admin: {item.admin_note}</small>}
                </article>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: FeedbackStatus }) {
  return <span className={`admin-status admin-status--${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>;
}

function formatWhen(value?: string) {
  if (!value) return "vừa xong";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}
