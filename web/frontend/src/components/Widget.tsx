import type { ReactNode } from "react";
import type { WidgetStatus } from "../data/types";
import { IconAlert, IconRefresh } from "./icons";

interface WidgetProps {
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  status?: WidgetStatus;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  /** skeleton shown while loading */
  skeleton?: ReactNode;
}

export function Widget({
  title,
  icon,
  subtitle,
  actions,
  status = "ready",
  onRetry,
  emptyMessage,
  emptyAction,
  className = "",
  bodyClassName = "",
  children,
  skeleton,
}: WidgetProps) {
  return (
    <section className={`widget ${className}`} aria-busy={status === "loading"}>
      <header className="widget__head">
        <div className="widget__title">
          {icon && <span className="widget__icon">{icon}</span>}
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="widget__subtitle">{subtitle}</p>}
          </div>
        </div>
        {status === "ready" && actions && (
          <div className="widget__actions">{actions}</div>
        )}
      </header>

      <div className={`widget__body ${bodyClassName}`}>
        {status === "loading" && (skeleton ?? <DefaultSkeleton />)}

        {status === "error" && (
          <div className="widget__state" role="alert">
            <span className="widget__state-icon widget__state-icon--error">
              <IconAlert />
            </span>
            <p className="widget__state-title">Không tải được dữ liệu</p>
            <p className="widget__state-desc">
              Đã xảy ra lỗi khi lấy phân tích cho khu vực này.
            </p>
            {onRetry && (
              <button className="btn btn--ghost" onClick={onRetry}>
                <IconRefresh width={16} height={16} /> Thử lại
              </button>
            )}
          </div>
        )}

        {status === "empty" && (
          <div className="widget__state">
            <p className="widget__state-title">{emptyMessage ?? "Chưa có dữ liệu"}</p>
            {emptyAction}
          </div>
        )}

        {status === "ready" && children}
      </div>
    </section>
  );
}

function DefaultSkeleton() {
  return (
    <div className="skel-stack">
      <div className="skel skel--line" style={{ width: "70%" }} />
      <div className="skel skel--line" style={{ width: "90%" }} />
      <div className="skel skel--block" />
    </div>
  );
}
