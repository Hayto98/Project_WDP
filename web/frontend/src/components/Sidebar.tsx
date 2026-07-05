import {
  IconBell,
  IconGap,
  IconGrid,
  IconLibrary,
  IconSearch,
  IconTelescope,
  IconTrend,
} from "./icons";

export const NAV = [
  { id: "overview", label: "Tổng quan", icon: IconGrid },
  { id: "notifications", label: "Thông báo", icon: IconBell },
  { id: "search", label: "Tìm kiếm", icon: IconSearch },
  { id: "trends", label: "Phân tích xu hướng", icon: IconTrend },
  { id: "workspace", label: "Workspace", icon: IconGrid },
  { id: "gap", label: "Research Gap", icon: IconGap },
  { id: "library", label: "Thư viện", icon: IconLibrary },
  { id: "follow", label: "Theo dõi", icon: IconBell },
];

export function Sidebar({ active }: { active: string }) {
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
            MT
          </span>
          <span className="userchip__meta">
            <span className="userchip__name">Minh Thành</span>
            <span className="userchip__role">Student</span>
          </span>
        </div>
      </div>
    </nav>
  );
}
