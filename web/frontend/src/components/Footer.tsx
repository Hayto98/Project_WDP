import { IconTelescope } from "./icons";
import { useEffect, useRef } from "react";
import "./Footer.css";

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("footer--visible");
          }
        });
      },
      { threshold: 0.1 } // Triggers when 10% of footer is visible
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <footer className="footer-container" ref={footerRef}>
      <div className="footer-content">
        
        {/* Brand */}
        <div className="footer-brand footer-animate-item">
          <div className="footer-logo">
            <IconTelescope width={24} height={24} />
            <span>ResearchTrends</span>
          </div>
          <p className="footer-desc">
            Đài quan sát và phân tích xu hướng dữ liệu học thuật số một. Khám phá những khoảng trống nghiên cứu và xây dựng báo cáo khoa học với sự tự tin tuyệt đối.
          </p>
        </div>

        {/* Links */}
        <div className="footer-links-group footer-animate-item" style={{ transitionDelay: "100ms" }}>
          <h4 className="footer-heading">Khám phá</h4>
          <ul>
            <li><a href="#trends">Xu hướng 2026</a></li>
            <li><a href="#workspace">Workspace</a></li>
            <li><a href="#admin">Admin Dashboard</a></li>
            <li><a href="#api">API Citation</a></li>
          </ul>
        </div>

        {/* Support */}
        <div className="footer-links-group footer-animate-item" style={{ transitionDelay: "200ms" }}>
          <h4 className="footer-heading">Hỗ trợ</h4>
          <ul>
            <li><a href="#docs">Tài liệu hướng dẫn</a></li>
            <li><a href="#faq">Câu hỏi thường gặp</a></li>
            <li><a href="#contact">Liên hệ hỗ trợ</a></li>
          </ul>
        </div>

        {/* Legal */}
        <div className="footer-links-group footer-animate-item" style={{ transitionDelay: "300ms" }}>
          <h4 className="footer-heading">Pháp lý</h4>
          <ul>
            <li><a href="#privacy">Chính sách bảo mật</a></li>
            <li><a href="#terms">Điều khoản sử dụng</a></li>
            <li><a href="#cookies">Cookie Policy</a></li>
          </ul>
        </div>
        
      </div>

      <div className="footer-bottom footer-animate-item" style={{ transitionDelay: "400ms" }}>
        <p>&copy; 2026 ResearchTrends. All rights reserved.</p>
        <div className="footer-socials">
          <a href="#fb">Facebook</a>
          <a href="#tw">Twitter</a>
          <a href="#li">LinkedIn</a>
        </div>
      </div>
    </footer>
  );
}
