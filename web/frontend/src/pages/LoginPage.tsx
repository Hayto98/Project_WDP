import { useState } from "react";
import { IconTelescope } from "../components/icons";
import "./Auth.css";

interface Props {
  theme?: any;
  toggle?: () => void;
}

export function LoginPage({ theme }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    // Basic mock login: if email contains 'admin', go to admin page, else go to home
    if (email.includes('admin')) {
      window.location.hash = "admin";
    } else {
      window.location.hash = "home";
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
              placeholder="Nhập email của bạn (dùng 'admin' để test Admin)"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            />
          </div>

          <div style={{ marginTop: '8px' }}>
            <button 
              type="submit"
              className="auth-btn auth-btn--primary"
            >
              Đăng nhập
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
