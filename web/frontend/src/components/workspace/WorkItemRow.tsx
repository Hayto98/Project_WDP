import { KIND_LABEL } from "../../data/workspaceSample";
import type { WorkspaceItemEntry } from "../../data/workspaceSample";
import { IconLibrary } from "../icons";

export function WorkItemRow({
  item,
  selected,
  onSelect,
}: {
  item: WorkspaceItemEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li className={`workitem ${selected ? "is-selected" : ""}`}>
      <button onClick={onSelect} aria-pressed={selected}>
        <span className={`workitem__kind workitem__kind--${item.kind}`}>{KIND_LABEL[item.kind]}</span>
        <strong>{item.title}</strong>
        <span className="workitem__paper">
          <IconLibrary width={13} height={13} /> {item.paper.title}
        </span>
        <span className="workitem__meta">
          <span style={{ display: "flex", alignItems: "center" }}>
            {(item.assignees?.length ?? 0) > 0
              ? item.assignees!.slice(0, 3).map((a, i) => (
                  <span
                    key={a.id}
                    className="member-avatar"
                    title={a.name}
                    aria-label={a.name}
                    style={{
                      width: "20px",
                      height: "20px",
                      fontSize: "9px",
                      marginLeft: i > 0 ? "-6px" : "0",
                      border: "2px solid var(--bg)",
                      zIndex: 3 - i,
                      position: "relative",
                    }}
                  >
                    {a.initials}
                  </span>
                ))
              : <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>—</span>
            }
            {(item.assignees?.length ?? 0) > 3 && (
              <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "4px" }}>
                +{item.assignees!.length - 3}
              </span>
            )}
          </span>
          <span className="num">
            {(() => {
              if (!item.due || item.due === "Chưa đặt") return "Chưa đặt";
              if (/^\d{4}-\d{2}-\d{2}$/.test(item.due)) {
                const [, month, day] = item.due.split("-");
                return `${day}/${month}`;
              }
              return item.due;
            })()}
          </span>
          <span>{item.comments.length} bình luận</span>
        </span>
      </button>
    </li>
  );
}
