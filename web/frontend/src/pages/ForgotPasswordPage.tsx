import { useState } from "react";
import { authApi } from "../lib/api";
import "./Auth.css";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await authApi.forgotPassword(email.trim());
      setDone(true);
      setDevResetUrl(result.resetUrl || "");
    } catch (err) {
      setError(toForgotMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-bg-blob auth-bg-blob--1" />
      <div className="auth-bg-blob auth-bg-blob--2" />

      <div className="auth-card">
        <a href="#login" className="auth-back-btn" aria-label="Quay lại đăng nhập">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </a>

        <div className="auth-header" style={{ marginBottom: "32px", textAlign: "left" }}>
          <h1 className="auth-title">Quên mật khẩu</h1>
          <p className="auth-subtitle">
            Nhập email đã đăng ký. Nếu tài khoản tồn tại, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
          </p>
        </div>

        {done ? (
          <div className="auth-form">
            <p className="auth-success" role="status">
              Nếu email hợp lệ, liên kết đặt lại mật khẩu đã được gửi. Hãy kiểm tra hộp thư (và mục Spam).
            </p>
            {devResetUrl && (
              <p className="auth-subtitle">
                Dev mode — mở liên kết:{" "}
                <a className="auth-link" href={devResetUrl}>
                  Đặt lại mật khẩu
                </a>
              </p>
            )}
            <a href="#login" className="auth-btn auth-btn--primary">
              Quay lại đăng nhập
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
              <label className="auth-label">Email</label>
              <input
                type="email"
                placeholder="Nhập email của bạn"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {error && (
              <p className="auth-subtitle" role="alert">
                {error}
              </p>
            )}

            <div style={{ marginTop: "8px" }}>
              <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
                {loading ? "Đang gửi..." : "Gửi liên kết đặt lại"}
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          <span>Nhớ mật khẩu? </span>
          <a href="#login" className="auth-link">
            Đăng nhập
          </a>
        </div>
      </div>
    </main>
  );
}

function toForgotMessage(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("valid email") || message.includes("must be a valid email")) {
    return "Email chưa đúng định dạng.";
  }
  if (message.includes("Failed to send") || message.includes("EMAIL_UNAVAILABLE")) {
    return "Không gửi được email lúc này. Vui lòng thử lại sau.";
  }
  if (message.includes("Too many")) {
    return "Bạn thao tác quá nhiều lần. Vui lòng chờ rồi thử lại.";
  }
  return message || "Không thể gửi yêu cầu. Vui lòng thử lại.";
}
