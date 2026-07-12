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
          <span>{item.assignee?.initials ?? "—"}</span>
          <span className="num">{item.due || "Chưa đặt"}</span>
          <span>{item.comments.length} bình luận</span>
        </span>
      </button>
    </li>
  );
}
