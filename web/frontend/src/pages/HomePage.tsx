import { useState } from "react";
import {
  IconArrowUp,
  IconExternal,
  IconGap,
  IconGrid,
  IconLibrary,
  IconSearch,
  IconTelescope,
  IconTrend,
  IconUser,
} from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle";
import type { Theme } from "../hooks/useTheme";
import { useReveal } from "../hooks/useReveal";
import { WelcomeScreen } from "../components/WelcomeScreen";
import { Footer } from "../components/Footer";
import { getCurrentUser } from "../lib/api";

interface Props {
  theme: Theme;
  toggle: () => void;
}

const MODULES = [
  {
    title: "Tìm kiếm học thuật",
    body: "Tra cứu paper từ OpenAlex, Semantic Scholar, Crossref, arXiv và các nguồn uy tín với bộ lọc rõ ràng.",
    href: "#search",
    icon: IconSearch,
    span: "col-span-1 row-span-1 md:col-span-8 md:row-span-2"
  },
  {
    title: "Phân tích xu hướng",
    body: "Theo dõi chủ đề tăng trưởng, mật độ công bố và tín hiệu mới nổi.",
    href: "#trends",
    icon: IconTrend,
    span: "col-span-1 row-span-1 md:col-span-4 md:row-span-1"
  },
  {
    title: "Research Gap",
    body: "Định vị khoảng trống nghiên cứu dựa trên citation và mức bão hòa chủ đề.",
    href: "#gap",
    icon: IconGap,
    span: "col-span-1 row-span-1 md:col-span-4 md:row-span-1"
  },
  {
    title: "Workspace nhóm",
    body: "Tạo task, mời cộng tác, ghi chú và bình luận trên cùng một không gian nghiên cứu.",
    href: "#workspace",
    icon: IconGrid,
    span: "col-span-1 row-span-1 md:col-span-12 md:row-span-1"
  },
];

export function HomePage({ theme, toggle }: Props) {
  const revealRef = useReveal();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.roles.includes("Admin") ?? false;
  const roleLabel = isAdmin ? "Admin" : "Student";
  const roleHref = isAdmin ? "#admin" : "#overview";
  const [showWelcome, setShowWelcome] = useState(() => {
    return !sessionStorage.getItem("hasSeenWelcome");
  });

  const handleWelcomeComplete = () => {
    sessionStorage.setItem("hasSeenWelcome", "true");
    setShowWelcome(false);
  };

  return (
    <>
      {showWelcome && <WelcomeScreen onEnter={handleWelcomeComplete} />}
      <main className="home-site" ref={revealRef}>
        <nav className="home-nav" aria-label="Điều hướng trang giới thiệu">
          <a className="home-brand group" href="#home">
            <span className="home-brand__mark transition-transform duration-700 ease-fluid group-hover:scale-105" aria-hidden>
              <IconTelescope width={20} height={20} />
            </span>
            <span>
              Research<strong>Trends</strong>
            </span>
          </a>
          <div className="home-nav__links" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div className="home-nav__links-inner">
            <a href="#search" className="nav-item">Tìm kiếm</a>
            <a href="#trends" className="nav-item">Xu hướng</a>
            <a href="#workspace" className="nav-item">Workspace</a>
            {currentUser ? (
              <a href={roleHref} className="nav-item">{roleLabel}</a>
            ) : null}
            <div className="theme-toggle-wrapper">
              <ThemeToggle theme={theme} toggle={toggle} />
            </div>
          </div>
          
          <div className="home-nav__auth" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentUser ? (
              <a href={roleHref} className="nav-item" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} title="Vào Dashboard">
                <IconUser width={18} height={18} />
                <span className="hidden md:inline">{currentUser.full_name || "Dashboard"}</span>
              </a>
            ) : (
              <>
                <a href="#login" className="nav-item" style={{ padding: '8px 12px' }}>Đăng nhập</a>
                <a href="#register" className="btn btn--primary" style={{ padding: '8px 16px', minHeight: '0', borderRadius: '999px', fontSize: '13px' }}>
                  Đăng ký
                </a>
              </>
            )}
          </div>
          </div>
        </nav>

        <section className="home-hero">
          <div className="home-hero__copy reveal-up">
            <p className="home-kicker">
              <span className="pulse-dot" /> Scientific Research Trend Tracking System
            </p>
            <h1 className="hero-title">Đài quan sát xu hướng nghiên cứu cho quyết định đề tài <span className="text-highlight">có căn cứ.</span></h1>
            <p className="hero-desc">
              ResearchTrends tổng hợp metadata học thuật, phát hiện chủ đề tăng trưởng, gợi ý khoảng trống nghiên cứu và
              giúp nhóm học thuật làm việc trên cùng một corpus đáng tin cậy.
            </p>
            <div className="home-hero__actions">
              <a className="btn btn--primary btn--magnetic group" href="#overview">
                <span>Vào dashboard</span>
                <span className="btn__icon-wrapper">
                  <IconExternal width={15} height={15} className="group-hover:translate-x-1 group-hover:-translate-y-[1px] transition-transform duration-500 ease-fluid" />
                </span>
              </a>
              <a className="btn btn--ghost" href="#search">
                Tra cứu paper
              </a>
            </div>
            <dl className="home-proof">
              <div>
                <dt className="num">1.28M</dt>
                <dd>metadata trong Research Corpus</dd>
              </div>
              <div>
                <dt className="num">6</dt>
                <dd>nguồn học thuật tích hợp</dd>
              </div>
              <div>
                <dt className="num">30p</dt>
                <dd>cửa sổ thống kê lượt đọc</dd>
              </div>
            </dl>
          </div>

          <div className="home-observatory reveal-up" style={{ transitionDelay: '100ms' }} aria-label="Minh họa dashboard phân tích nghiên cứu">
            <div className="observatory-glow" aria-hidden />

            <section className="home-console home-console--main double-bezel">
              <div className="console-inner">
                <header>
                  <span>Trend Observatory</span>
                  <strong className="num text-primary">Live corpus</strong>
                </header>
                <div className="home-chart">
                  <span className="bar bar-1" style={{ height: "38%" }} />
                  <span className="bar bar-2" style={{ height: "52%" }} />
                  <span className="bar bar-3" style={{ height: "44%" }} />
                  <span className="bar bar-4" style={{ height: "68%" }} />
                  <span className="bar bar-5" style={{ height: "82%" }} />
                  <span className="bar bar-6" style={{ height: "74%" }} />
                  <span className="bar bar-7" style={{ height: "92%" }} />
                </div>
                <div className="home-signal-row">
                  <span>Biomedical RAG</span>
                  <strong className="num text-success">+24%</strong>
                </div>
                <div className="home-signal-row">
                  <span>Graph Neural Networks</span>
                  <strong className="num text-success">+18%</strong>
                </div>
              </div>
            </section>

            <section className="home-console home-console--gap double-bezel z-cascade-1">
              <div className="console-inner">
                <span className="home-console__label">Research Gap</span>
                <strong>Low publication density · high citation momentum</strong>
                <div className="home-heatmap" aria-hidden>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <span key={i} className={`heat-${(i % 5) + 1} heat-cell stagger-${i % 5}`} />
                  ))}
                </div>
              </div>
            </section>

            <section className="home-console home-console--read double-bezel z-cascade-2">
              <div className="console-inner">
                <span className="home-console__label">Admin signal</span>
                <strong>Paper được đọc nhiều</strong>
                <p>3 lượt đọc · 36 phút · Biomedical RAG</p>
              </div>
            </section>
          </div>
        </section>

        <section className="home-modules" aria-label="Các phân hệ chính">
          <div className="home-section-head reveal-up">
            <p className="eyebrow-tag">Architecture</p>
            <h2>Một hệ thống,<br /> ba lớp quyết định</h2>
            <p>Từ khám phá paper đến vận hành corpus, mọi tín hiệu đều được gom về một giao diện có thể kiểm chứng, thiết kế chuẩn mực agency.</p>
          </div>
          <div className="bento-grid reveal-up" style={{ transitionDelay: '150ms' }}>
            {MODULES.map((module, idx) => {
              const Icon = module.icon;
              return (
                <a className={`bento-card double-bezel group ${module.span} stagger-up`} style={{ transitionDelay: `${idx * 100}ms` }} href={module.href} key={module.title}>
                  <div className="bento-inner">
                    <div className="bento-icon-wrapper">
                      <Icon width={24} height={24} />
                    </div>
                    <strong>{module.title}</strong>
                    <span>{module.body}</span>
                    <div className="bento-arrow">
                      <IconExternal width={16} height={16} />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <section className="home-flow reveal-up">
          <div className="flow-content">
            <p className="eyebrow-tag">Workflow</p>
            <h2>Luồng nghiên cứu khép kín</h2>
            <p>
              Sinh viên, giảng viên và nhà nghiên cứu có thể đi từ tìm kiếm tài liệu đến chọn hướng nghiên cứu, lưu thư
              viện, theo dõi chủ đề và cộng tác trong workspace.
            </p>
          </div>
          <ol className="flow-steps">
            <li className="flow-step double-bezel group">
              <div className="flow-step-inner">
                <span className="num">01</span>
                <div>
                  <strong>Thu thập corpus</strong>
                  <p>Batch crawler đồng bộ metadata từ nguồn học thuật uy tín.</p>
                </div>
              </div>
            </li>
            <li className="flow-step double-bezel group">
              <div className="flow-step-inner">
                <span className="num">02</span>
                <div>
                  <strong>Phân tích tín hiệu</strong>
                  <p>Dashboard đọc xu hướng, Research Gap và paper đang được quan tâm.</p>
                </div>
              </div>
            </li>
            <li className="flow-step double-bezel group">
              <div className="flow-step-inner">
                <span className="num">03</span>
                <div>
                  <strong>Hành động nhóm</strong>
                  <p>Lưu paper, tạo workspace, giao task và mời cộng tác qua email.</p>
                </div>
              </div>
            </li>
          </ol>
        </section>

        <section className="home-admin-band double-bezel reveal-up">
          <div className="admin-band-inner">
            <div className="admin-band-content">
              <div className="icon-glass">
                <IconLibrary width={24} height={24} />
              </div>
              <div>
                <h2>Website Admin riêng cho vận hành corpus</h2>
                <p>Quản trị viên có dashboard tách biệt để theo dõi batch jobs, nguồn dữ liệu, user, audit log và thống kê lượt đọc.</p>
              </div>
            </div>
            <a className="btn btn--primary btn--magnetic group" href="#admin">
              <span>Mở Admin</span>
              <span className="btn__icon-wrapper">
                <IconArrowUp width={15} height={15} className="group-hover:translate-x-1 group-hover:-translate-y-[1px] transition-transform duration-500 ease-fluid" />
              </span>
            </a>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
