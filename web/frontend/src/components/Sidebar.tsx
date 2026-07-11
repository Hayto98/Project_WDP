import {
  IconBell,
  IconGap,
  IconGrid,
  IconLibrary,
  IconSearch,
  IconTelescope,
  IconTrend,
  IconUser,
} from "./icons";
import { authApi, getCurrentUser } from "../lib/api";

export const NAV = [
  { id: "overview", label: "Tổng quan", icon: IconGrid },
  { id: "notifications", label: "Thông báo", icon: IconBell },
  { id: "search", label: "Tìm kiếm", icon: IconSearch },
  { id: "trends", label: "Phân tích xu hướng", icon: IconTrend },
  { id: "workspace", label: "Workspace", icon: IconGrid },
  { id: "gap", label: "Research Gap", icon: IconGap },
  { id: "library", label: "Thư viện", icon: IconLibrary },
  { id: "follow", label: "Theo dõi", icon: IconBell },
  { id: "account", label: "Tài khoản", icon: IconUser },
];

export function Sidebar({ active }: { active: string }) {
  const user = getCurrentUser();
  const handleLogout = async () => {
    await authApi.logout();
    window.location.hash = "login";
  };

  let initials = "MT";
  if (user && user.full_name) {
    const parts = user.full_name.trim().split(/\s+/);
    if (parts.length > 1) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0]) {
      initials = parts[0].substring(0, 2).toUpperCase();
    }
  }

  return (
    <nav className="sidebar" aria-label="Điều hướng chính">
      <a className="sidebar__brand" href="#home">
        <span className="sidebar__logo" aria-hidden>
          <IconTelescope />
        </span>
        <span className="sidebar__brand-text">
          Research<strong>Trends</strong>
        </span>
      </a>

      <ul className="sidebar__nav">
        {NAV.map((n) => {
          const Icon = n.icon;
          const isActive = active === n.id;
          return (
            <li key={n.id}>
              <a
                className={`navlink ${isActive ? "is-active" : ""}`}
                href={`#${n.id}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon width={19} height={19} />
                <span>{n.label}</span>
              </a>
            </li>
          );
        })}
      </ul>

      <div className="sidebar__foot">
        <div className="userchip">
          <span className="userchip__avatar" aria-hidden>
            {initials}
          </span>
          <span className="userchip__meta">
            <span className="userchip__name">{user ? user.full_name : "Khách"}</span>
            <span className="userchip__role">{user ? user.roles.join(", ") : "Khách"}</span>
          </span>
        </div>
        <button
          className="btn btn--ghost mt-2 w-full text-left"
          type="button"
          onClick={handleLogout}
        >
          Đăng xuất
        </button>
      </div>
    </nav>
  );
}
