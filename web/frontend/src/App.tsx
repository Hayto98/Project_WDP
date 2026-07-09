import "./App.css";
import { Sidebar, NAV } from "./components/Sidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import { useHashRoute } from "./hooks/useHashRoute";
import { useTheme } from "./hooks/useTheme";
import { AdminPage } from "./pages/AdminPage";
import { FollowPage } from "./pages/FollowPage";
import { GapPage } from "./pages/GapPage";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { NotificationPage } from "./pages/NotificationPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SearchPage } from "./pages/SearchPage";
import { TrendsPage } from "./pages/TrendsPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

export default function App() {
  const { theme, toggle } = useTheme();
  const route = useHashRoute("home");

  if (route === "admin") {
    return <AdminPage theme={theme} toggle={toggle} />;
  }
  if (route === "login") {
    return <LoginPage theme={theme} toggle={toggle} />;
  }
  if (route === "register") {
    return <RegisterPage theme={theme} toggle={toggle} />;
  }
  if (route === "home") {
    return <HomePage theme={theme} toggle={toggle} />;
  }

  return (
    <div className="app">
      <Sidebar active={route} />
      {route === "search" ? (
        <SearchPage theme={theme} toggle={toggle} />
      ) : route === "notifications" ? (
        <NotificationPage theme={theme} toggle={toggle} />
      ) : route === "trends" ? (
        <TrendsPage theme={theme} toggle={toggle} />
      ) : route === "gap" ? (
        <GapPage theme={theme} toggle={toggle} />
      ) : route === "library" ? (
        <LibraryPage theme={theme} toggle={toggle} />
      ) : route === "follow" ? (
        <FollowPage theme={theme} toggle={toggle} />
      ) : route === "workspace" ? (
        <WorkspacePage theme={theme} toggle={toggle} />
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
