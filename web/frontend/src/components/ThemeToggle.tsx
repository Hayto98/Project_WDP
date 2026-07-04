import type { Theme } from "../hooks/useTheme";
import { IconMoon, IconSun } from "./icons";

export function ThemeToggle({ theme, toggle }: { theme: Theme; toggle: () => void }) {
  return (
    <button
      className="icon-btn"
      onClick={toggle}
      aria-label={theme === "light" ? "Chuyển sang giao diện tối" : "Chuyển sang giao diện sáng"}
      title="Đổi giao diện sáng/tối"
    >
      {theme === "light" ? <IconMoon /> : <IconSun />}
    </button>
  );
}
