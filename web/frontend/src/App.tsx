import "./App.css";
import { lazy, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Sidebar, NAV } from "./components/Sidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import { useHashRoute } from "./hooks/useHashRoute";
import { useTheme } from "./hooks/useTheme";
import { authApi, getAccessToken, getCurrentUser, storeCurrentUser, type AuthUser } from "./lib/api";

const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const AccountPage = lazy(() => import("./pages/AccountPage").then((m) => ({ default: m.AccountPage })));
const FollowPage = lazy(() => import("./pages/FollowPage").then((m) => ({ default: m.FollowPage })));
const GapPage = lazy(() => import("./pages/GapPage").then((m) => ({ default: m.GapPage })));
const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const LibraryPage = lazy(() => import("./pages/LibraryPage").then((m) => ({ default: m.LibraryPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const NotificationPage = lazy(() => import("./pages/NotificationPage").then((m) => ({ default: m.NotificationPage })));
const OverviewPage = lazy(() => import("./pages/OverviewPage").then((m) => ({ default: m.OverviewPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const SearchPage = lazy(() => import("./pages/SearchPage").then((m) => ({ default: m.SearchPage })));
const TrendsPage = lazy(() => import("./pages/TrendsPage").then((m) => ({ default: m.TrendsPage })));
const WorkspacePage = lazy(() => import("./pages/WorkspacePage").then((m) => ({ default: m.WorkspacePage })));

export default function App() {
  const { theme, toggle } = useTheme();
  const route = useHashRoute("home");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser());
  const isAdmin = currentUser?.roles.includes("Admin") ?? false;

  useEffect(() => {
    let alive = true;
    if (!getAccessToken()) {
      setCurrentUser(null);
      return () => {
        alive = false;
      };
    }

    authApi.me()
      .then((user) => {
        if (!alive) return;
        storeCurrentUser(user);
        setCurrentUser(user);
      })
      .catch(() => {
        if (alive) setCurrentUser(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (isAdmin && route !== "admin" && route !== "login" && route !== "register") {
      window.location.hash = "admin";
    }
    if (route === "admin" && !isAdmin) {
      window.location.hash = currentUser ? "overview" : "login";
    }
  }, [currentUser, isAdmin, route]);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, [route]);

  if (isAdmin && route !== "login" && route !== "register") {
    return (
      <RouteSuspense>
        <AdminPage theme={theme} toggle={toggle} />
      </RouteSuspense>
    );
  }

  if (route === "admin") {
    return (
      <RouteSuspense>
        {currentUser ? <OverviewPage theme={theme} toggle={toggle} /> : <LoginPage />}
      </RouteSuspense>
    );
  }
  if (route === "login") {
    return (
      <RouteSuspense>
        <LoginPage />
      </RouteSuspense>
    );
  }
  if (route === "register") {
    return (
      <RouteSuspense>
        <RegisterPage />
      </RouteSuspense>
    );
  }
  if (route === "home") {
    return (
      <RouteSuspense>
        <HomePage theme={theme} toggle={toggle} />
      </RouteSuspense>
    );
  }
  if (!currentUser) {
    return (
      <RouteSuspense>
        <LoginPage />
      </RouteSuspense>
    );
  }

  return (
    <div className="app">
      <Sidebar active={route} />
      <RouteSuspense>
        {route === "search" ? (
          <SearchPage theme={theme} toggle={toggle} />
        ) : route === "account" ? (
          <AccountPage theme={theme} toggle={toggle} />
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
      </RouteSuspense>
    </div>
  );
}

function RouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<RouteFallback />}>
      {children}
    </Suspense>
  );
}

function RouteFallback() {
  return (
    <main className="main">
      <div className="state state--empty" style={{ marginTop: 24 }}>
        <p className="state__title">Đang tải trang</p>
      </div>
    </main>
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
