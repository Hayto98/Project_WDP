import "./App.css";
import { Sidebar, NAV } from "./components/Sidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import { useHashRoute } from "./hooks/useHashRoute";
import { useTheme } from "./hooks/useTheme";
import { FollowPage } from "./pages/FollowPage";
import { GapPage } from "./pages/GapPage";
import { LibraryPage } from "./pages/LibraryPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SearchPage } from "./pages/SearchPage";
import { TrendsPage } from "./pages/TrendsPage";

export default function App() {
  const { theme, toggle } = useTheme();
  const route = useHashRoute("overview");

  return (
    <div className="app">
      <Sidebar active={route} />
      {route === "search" ? (
        <SearchPage theme={theme} toggle={toggle} />
      ) : route === "trends" ? (
        <TrendsPage theme={theme} toggle={toggle} />
      ) : route === "gap" ? (
        <GapPage theme={theme} toggle={toggle} />
      ) : route === "library" ? (
        <LibraryPage theme={theme} toggle={toggle} />
      ) : route === "follow" ? (
        <FollowPage theme={theme} toggle={toggle} />
      ) : route === "overview" ? (
        <OverviewPage theme={theme} toggle={toggle} />
      ) : (
        <ComingSoon route={route} theme={theme} toggle={toggle} />
      )}
    </div>
  );
}

function ComingSoon({
  route,
  theme,
  toggle,
}: {
  route: string;
  theme: ReturnType<typeof useTheme>["theme"];
  toggle: () => void;
}) {
  const nav = NAV.find((n) => n.id === route);
  const label = nav?.label ?? (route === "admin" ? "Phân hệ Admin" : "Trang");

  return (
    <main className="main">
      <header className="topbar">
        <div className="topbar__lead">
          <h1>{label}</h1>
          <p className="topbar__sub">Phân hệ này đang được phát triển</p>
        </div>
        <div className="topbar__controls">
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      <div className="state state--empty" style={{ marginTop: 24 }}>
        <p className="state__title">“{label}” sắp ra mắt</p>
        <p className="state__body">
          Màn hình này chưa được dựng. Quay lại Tổng quan hoặc dùng Tìm kiếm để tra cứu tài liệu.
        </p>
        <a className="btn btn--primary" href="#overview">
          Về Tổng quan
        </a>
      </div>
    </main>
  );
}
