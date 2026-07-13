import { STATUS_LABEL } from "../../data/workspaceSample";
import type { WorkspaceItemEntry } from "../../data/workspaceSample";

export function ItemActivityTimeline({
  item,
  activities,
}: {
  item: WorkspaceItemEntry;
  activities: { id: string; actor: string; action: string; when: string }[];
}) {
  const timeline = [
    {
      id: `${item.id}-status`,
      actor: item.assignee?.name ?? "Nhóm",
      action: `đang giữ trạng thái "${STATUS_LABEL[item.status]}"`,
      when: "hiện tại",
    },
    {
      id: `${item.id}-paper`,
      actor: "Workspace",
      action: `liên kết với paper "${item.paper.title}"`,
      when: item.due || "Chưa đặt",
    },
    ...activities.slice(0, 2),
  ];

  return (
    <ul className="activity-list activity-list--item">
      {timeline.map((activity) => (
        <li key={activity.id}>
          <strong>{activity.actor}</strong> {activity.action}
          <span>{activity.when}</span>
        </li>
      ))}
    </ul>
  );
}
