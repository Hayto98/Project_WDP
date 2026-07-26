import { useMemo, useState } from "react";
import { IconEye, IconEyeOff } from "../components/icons";
import { authApi } from "../lib/api";
import "./Auth.css";

export function ResetPasswordPage({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const hasToken = useMemo(() => Boolean(token && token.length >= 32), [token]);

  const handleSubmit = async () => {
    setError("");
    if (!hasToken) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu mới cần ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => {
        window.location.hash = "login";
      }, 1200);
    } catch (err) {
      setError(toResetMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      {done && (
        <div className="auth-toast">
          <div className="auth-toast-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span>Đặt lại mật khẩu thành công! Đang chuyển đến đăng nhập...</span>
        </div>
      )}

      <div className="auth-bg-blob auth-bg-blob--1" />
      <div className="auth-bg-blob auth-bg-blob--2" />

      <div className="auth-card">
        <a href="#login" className="auth-back-btn" aria-label="Quay lại đăng nhập">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </a>

        <div className="auth-header" style={{ marginBottom: "32px", textAlign: "left" }}>
          <h1 className="auth-title">Đặt lại mật khẩu</h1>
          <p className="auth-subtitle">Nhập mật khẩu mới cho tài khoản của bạn.</p>
        </div>

        {!hasToken ? (
          <div className="auth-form">
            <p className="auth-subtitle" role="alert">
              Liên kết không hợp lệ. Vui lòng yêu cầu gửi lại email đặt lại mật khẩu.
            </p>
            <a href="#forgot-password" className="auth-btn auth-btn--primary">
              Quên mật khẩu
            </a>
          </div>
        ) : (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="auth-input-group">
              <label className="auth-label">Mật khẩu mới</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Ít nhất 8 ký tự"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: "40px" }}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-password-toggle"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <IconEyeOff width={20} height={20} /> : <IconEye width={20} height={20} />}
                </button>
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Xác nhận mật khẩu</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nhập lại mật khẩu mới"
                className="auth-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="auth-subtitle" role="alert">
                {error}
              </p>
            )}

            <div style={{ marginTop: "8px" }}>
              <button type="submit" className="auth-btn auth-btn--primary" disabled={loading || done}>
                {loading ? "Đang lưu..." : "Đặt lại mật khẩu"}
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          <a href="#login" className="auth-link">
            Quay lại đăng nhập
          </a>
        </div>
      </div>
    </main>
  );
}

function toResetMessage(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("Invalid or expired")) {
    return "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.";
  }
  if (message.includes("banned")) {
    return "Tài khoản đang bị khóa. Vui lòng liên hệ admin.";
  }
  if (message.includes("must be at least") || message.includes("length must be")) {
    return "Mật khẩu mới cần ít nhất 8 ký tự.";
  }
  if (message.includes("Too many")) {
    return "Bạn thao tác quá nhiều lần. Vui lòng chờ rồi thử lại.";
  }
  return message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.";
}
