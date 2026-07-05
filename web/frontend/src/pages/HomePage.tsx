import {
  IconArrowUp,
  IconExternal,
  IconGap,
  IconGrid,
  IconLibrary,
  IconSearch,
  IconTelescope,
  IconTrend,
} from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle";
import type { Theme } from "../hooks/useTheme";

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
  },
  {
    title: "Phân tích xu hướng",
    body: "Theo dõi chủ đề tăng trưởng, mật độ công bố và tín hiệu mới nổi theo thời gian.",
    href: "#trends",
    icon: IconTrend,
  },
  {
    title: "Research Gap",
    body: "Định vị khoảng trống nghiên cứu dựa trên mật độ paper, citation và mức bão hòa chủ đề.",
    href: "#gap",
    icon: IconGap,
  },
  {
    title: "Workspace nhóm",
    body: "Tạo task, mời cộng tác, ghi chú và bình luận trên cùng một không gian nghiên cứu chung.",
    href: "#workspace",
    icon: IconGrid,
  },
];

export function HomePage({ theme, toggle }: Props) {
  return (
    <main className="home-site">
      <nav className="home-nav" aria-label="Điều hướng trang giới thiệu">
        <a className="home-brand" href="#home">
          <span className="home-brand__mark" aria-hidden>
            <IconTelescope width={20} height={20} />
          </span>
          <span>
            Research<strong>Trends</strong>
          </span>
        </a>
        <div className="home-nav__links">
          <a href="#search">Tìm kiếm</a>
          <a href="#trends">Xu hướng</a>
          <a href="#workspace">Workspace</a>
          <a href="#admin">Admin</a>
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </nav>

      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="home-kicker">
            <span /> Scientific Research Trend Tracking System
          </p>
          <h1>Đài quan sát xu hướng nghiên cứu cho quyết định đề tài có căn cứ.</h1>
          <p>
            ResearchTrends tổng hợp metadata học thuật, phát hiện chủ đề tăng trưởng, gợi ý khoảng trống nghiên cứu và
            giúp nhóm học thuật làm việc trên cùng một corpus đáng tin cậy.
          </p>
          <div className="home-hero__actions">
            <a className="btn btn--primary" href="#overview">
              Vào dashboard <IconExternal width={15} height={15} />
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

        <div className="home-observatory" aria-label="Minh họa dashboard phân tích nghiên cứu">
          <div className="home-orbit" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <section className="home-console home-console--main">
            <header>
              <span>Trend Observatory</span>
              <strong className="num">Live corpus</strong>
            </header>
            <div className="home-chart">
              <span style={{ height: "38%" }} />
              <span style={{ height: "52%" }} />
              <span style={{ height: "44%" }} />
              <span style={{ height: "68%" }} />
              <span style={{ height: "82%" }} />
              <span style={{ height: "74%" }} />
              <span style={{ height: "92%" }} />
            </div>
            <div className="home-signal-row">
              <span>Biomedical RAG</span>
              <strong className="num">+24%</strong>
            </div>
            <div className="home-signal-row">
              <span>Graph Neural Networks</span>
              <strong className="num">+18%</strong>
            </div>
          </section>

          <section className="home-console home-console--gap">
            <span className="home-console__label">Research Gap</span>
            <strong>Low publication density · high citation momentum</strong>
            <div className="home-heatmap" aria-hidden>
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className={`heat-${(i % 5) + 1}`} />
              ))}
            </div>
          </section>

          <section className="home-console home-console--read">
            <span className="home-console__label">Admin signal</span>
            <strong>Paper được đọc nhiều</strong>
            <p>3 lượt đọc · 36 phút · Biomedical RAG</p>
          </section>
        </div>
      </section>

      <section className="home-modules" aria-label="Các phân hệ chính">
        <div className="home-section-head">
          <h2>Một hệ thống, ba lớp quyết định</h2>
          <p>Từ khám phá paper đến vận hành corpus, mọi tín hiệu đều được gom về một giao diện có thể kiểm chứng.</p>
        </div>
        <div className="home-module-grid">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <a className="home-module" href={module.href} key={module.title}>
                <Icon width={18} height={18} />
                <strong>{module.title}</strong>
                <span>{module.body}</span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="home-flow">
        <div>
          <h2>Luồng nghiên cứu khép kín</h2>
          <p>
            Sinh viên, giảng viên và nhà nghiên cứu có thể đi từ tìm kiếm tài liệu đến chọn hướng nghiên cứu, lưu thư
            viện, theo dõi chủ đề và cộng tác trong workspace.
          </p>
        </div>
        <ol>
          <li>
            <span className="num">01</span>
            <strong>Thu thập corpus</strong>
            <p>Batch crawler đồng bộ metadata từ nguồn học thuật uy tín.</p>
          </li>
          <li>
            <span className="num">02</span>
            <strong>Phân tích tín hiệu</strong>
            <p>Dashboard đọc xu hướng, Research Gap và paper đang được quan tâm.</p>
          </li>
          <li>
            <span className="num">03</span>
            <strong>Hành động nhóm</strong>
            <p>Lưu paper, tạo workspace, giao task và mời cộng tác qua email.</p>
          </li>
        </ol>
      </section>

      <section className="home-admin-band">
        <div>
          <IconLibrary width={20} height={20} />
          <h2>Website Admin riêng cho vận hành corpus</h2>
          <p>Quản trị viên có dashboard tách biệt để theo dõi batch jobs, nguồn dữ liệu, user, audit log và thống kê lượt đọc.</p>
        </div>
        <a className="btn btn--primary" href="#admin">
          Mở Admin <IconArrowUp width={15} height={15} />
        </a>
      </section>
    </main>
  );
}
