import { useState } from "react";
import { IconTelescope } from "../components/icons";
import { authApi } from "../lib/api";
import "./Auth.css";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await authApi.login(email.trim(), password);
      window.location.hash = result.user.roles.includes("Admin") ? "admin" : "overview";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-bg-blob auth-bg-blob--1" />
      <div className="auth-bg-blob auth-bg-blob--2" />

      <div className="auth-card">
        
        <div className="auth-header">
          <div className="auth-logo">
            <IconTelescope width={32} height={32} />
          </div>
          <h1 className="auth-title">ResearchTrends</h1>
          <p className="auth-subtitle">Khám phá tri thức học thuật</p>
        </div>

        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
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
              placeholder="Nhập mật khẩu"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="auth-subtitle" role="alert">{error}</p>}

          <div style={{ marginTop: '8px' }}>
            <button 
              type="submit"
              className="auth-btn auth-btn--primary"
              disabled={loading}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <span>Chưa có tài khoản? </span>
          <a href="#register" className="auth-link">Đăng ký ngay</a>
        </div>

      </div>
    </main>
  );
}
