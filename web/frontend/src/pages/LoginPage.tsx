import { useState } from "react";
import { IconTelescope, IconEye, IconEyeOff } from "../components/icons";
import { authApi } from "../lib/api";
import "./Auth.css";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await authApi.login(email.trim(), password);
      window.location.hash = result.user.roles.includes("Admin") ? "admin" : "overview";
    } catch (err) {
      setError(toLoginMessage(err));
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
            <div style={{ position: "relative" }}>
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: "40px" }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0
                }}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <IconEyeOff width={20} height={20} /> : <IconEye width={20} height={20} />}
              </button>
            </div>
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

function toLoginMessage(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("valid email")) return "Email chưa đúng định dạng.";
  if (message.includes("Invalid credentials")) return "Email hoặc mật khẩu không đúng.";
  if (message.includes("banned")) return "Tài khoản đang bị khóa. Vui lòng liên hệ admin.";
  if (message.includes("Too many authentication")) return "Bạn thử đăng nhập quá nhiều lần. Vui lòng chờ rồi thử lại.";
  return message || "Không thể đăng nhập. Vui lòng thử lại.";
}
