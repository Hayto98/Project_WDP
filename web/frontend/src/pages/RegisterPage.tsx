import { useState } from "react";
import { authApi } from "../lib/api";
import "./Auth.css";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      await authApi.register(name.trim(), email.trim(), password);
      setToastMessage("Đăng ký thành công! Đang chuyển hướng...");
      setTimeout(() => {
        window.location.hash = "overview";
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng ký. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      {toastMessage && (
        <div className="auth-toast">
          <div className="auth-toast-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="auth-bg-blob auth-bg-blob--1" />
      <div className="auth-bg-blob auth-bg-blob--2" />

      <div className="auth-card">
        
        <a href="#login" className="auth-back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </a>

        <div className="auth-header" style={{ marginBottom: '32px', textAlign: 'left' }}>
          <h1 className="auth-title">Tạo tài khoản</h1>
          <p className="auth-subtitle">Bắt đầu theo dõi các xu hướng nghiên cứu mới nhất.</p>
        </div>

        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
          
          <div className="auth-input-group">
            <label className="auth-label">Họ và tên</label>
            <input 
              type="text"
              placeholder="Nguyễn Văn A"
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Email</label>
            <input 
              type="email"
              placeholder="Nhập email của bạn"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Mật khẩu</label>
            <input 
              type="password"
              placeholder="Tạo mật khẩu"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="auth-subtitle" role="alert">{error}</p>}

          <div style={{ marginTop: '16px' }}>
            <button 
              type="submit"
              className="auth-btn auth-btn--primary"
              disabled={loading}
            >
              {loading ? "Đang đăng ký..." : "Đăng ký"}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <span>Đã có tài khoản? </span>
          <a href="#login" className="auth-link">Đăng nhập</a>
        </div>

      </div>
    </main>
  );
}
