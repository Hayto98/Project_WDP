import { IconExternal, IconX } from "../icons";
import { KIND_LABEL, STATUS_LABEL, ROLE_LABEL, PAPERS } from "../../data/workspaceSample";
import type { WorkStatus, MemberRole, WorkspaceMember, WorkspaceItem, WorkspaceItemEntry } from "../../data/workspaceSample";
import { ItemActivityTimeline } from "./ItemActivityTimeline";

export function WorkspaceDetail({
  item,
  members,
  onUpdate,
  onMember,
  onRemove,
  newComment,
  onNewComment,
  onAddComment,
  editingCommentId,
  editingCommentContent,
  onEditingCommentId,
  onEditingCommentContent,
  onEditComment,
  onDeleteComment,
  currentUserId,
  activities,
  canEdit,
  canManageMembers,
}: {
  item: WorkspaceItemEntry;
  members: WorkspaceMember[];
  onUpdate: (patch: Partial<WorkspaceItem>) => void;
  onMember: (id: string, patch: Partial<WorkspaceMember>) => void;
  onRemove: () => void;
  newComment: string;
  onNewComment: (comment: string) => void;
  onAddComment: () => void;
  editingCommentId: string;
  editingCommentContent: string;
  onEditingCommentId: (id: string) => void;
  onEditingCommentContent: (content: string) => void;
  onEditComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  currentUserId: string;
  activities: { id: string; actor: string; action: string; when: string }[];
  canEdit: boolean;
  canManageMembers: boolean;
}) {
  return (
    <div className="workspace-detail__body">
      <div className="workspace-detail__head">
        <span className={`workitem__kind workitem__kind--${item.kind}`}>{KIND_LABEL[item.kind]}</span>
        {canEdit && (
          <button className="btn btn--ghost btn--sm" onClick={onRemove}>
            <IconX width={15} height={15} /> Xóa
          </button>
        )}
      </div>

      <h2>{item.title}</h2>
      <div className="item-meta-strip" aria-label="Tóm tắt item">
        <span>{KIND_LABEL[item.kind]}</span>
        <span>{item.assignee?.name ?? "Chưa phân công"}</span>
        <span className="num">{item.due || "Chưa đặt"}</span>
      </div>

      <div className="workspace-detail__section">
        <span className="workspace-detail__label">Trạng thái</span>
        <div className="seg" role="group" aria-label="Cập nhật trạng thái item">
          {(["backlog", "doing", "done"] as WorkStatus[]).map((status) => (
            <button
              key={status}
              className={`seg__btn ${item.status === status ? "is-active" : ""}`}
              onClick={() => onUpdate({ status })}
              aria-pressed={item.status === status}
              disabled={!canEdit}
            >
              {STATUS_LABEL[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="workspace-detail__grid">
        <label>
          <span className="workspace-detail__label">Phụ trách</span>
          <select value={item.assigneeId} onChange={(e) => onUpdate({ assigneeId: e.target.value })} disabled={!canEdit}>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="workspace-detail__label">Deadline</span>
          <input
            value={item.due}
            onChange={(e) => onUpdate({ due: e.target.value })}
            placeholder="Ví dụ: 18/07"
            disabled={!canEdit}
          />
        </label>
        <label>
          <span className="workspace-detail__label">Bài liên kết</span>
          <select value={item.paperId} onChange={(e) => onUpdate({ paperId: e.target.value })} disabled={!canEdit}>
            {PAPERS.slice(0, 8).map((paper) => (
              <option key={paper.id} value={paper.id}>
                {paper.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="workspace-detail__section">
        <span className="workspace-detail__label">Nội dung ghi chú</span>
        <textarea
          value={item.note}
          onChange={(e) => onUpdate({ note: e.target.value })}
          rows={4}
          placeholder="Ghi lại mục tiêu, kết luận đọc paper, hoặc câu hỏi cần nhóm phản hồi."
          readOnly={!canEdit}
        />
      </label>

      <div className="workspace-paper">
        <span className="workspace-detail__label">Bài báo</span>
        <a href={item.paper.url || "#"} target="_blank" rel="noreferrer noopener">
          <IconExternal width={15} height={15} /> {item.paper.title}
        </a>
        <p>
          {item.paper.authors?.slice(0, 3).join(", ")} · <span className="num">{item.paper.year}</span> ·{" "}
          {item.paper.source}
        </p>
      </div>

      <div className="workspace-detail__section">
        <span className="workspace-detail__label">Thành viên & quyền</span>
        <ul className="member-list">
          {members.map((member) => (
            <li key={member.id}>
              <span className="member-avatar" aria-hidden>
                {member.initials}
              </span>
              <span className="member-name">{member.name}</span>
              <select
                value={member.role}
                onChange={(e) => onMember(member.id, { role: e.target.value as MemberRole })}
                aria-label={`Quyền của ${member.name}`}
                disabled={!canManageMembers || member.role === "owner"}
              >
                {(["editor", "viewer", ...(member.role === "owner" ? ["owner" as const] : [])] as MemberRole[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </div>

      <div className="workspace-detail__section">
        <span className="workspace-detail__label">Discussion</span>
        <ul className="comment-list">
          {item.comments.map((comment, idx) => {
            const isEditing = editingCommentId === comment.id;
            const canEditComment = comment.authorId === currentUserId;
            const canDeleteComment = canEdit || canEditComment; // owner/editor or author
            return (
              <li key={`${item.id}-${idx}`} className="comment-item">
                <div className="comment-item__meta">
                  <strong className="comment-item__author">{comment.authorName}</strong>
                  <span className="comment-item__time">{comment.createdAt}</span>
                  {!isEditing && (canEditComment || canDeleteComment) && (
                    <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
                      {canEditComment && (
                        <button
                          className="btn btn--ghost btn--sm"
                          style={{ padding: "0 4px", minWidth: "auto", height: "auto" }}
                          onClick={() => {
                            onEditingCommentId(comment.id);
                            onEditingCommentContent(comment.content);
                          }}
                        >
                          Sửa
                        </button>
                      )}
                      {canDeleteComment && (
                        <button
                          className="btn btn--ghost btn--sm"
                          style={{ padding: "0 4px", minWidth: "auto", height: "auto", color: "var(--danger)" }}
                          onClick={() => {
                            if (window.confirm("Bạn có chắc chắn muốn xóa bình luận này?")) {
                              onDeleteComment(comment.id);
                            }
                          }}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="comment-compose" style={{ marginTop: "4px" }}>
                    <textarea
                      value={editingCommentContent}
                      onChange={(e) => onEditingCommentContent(e.target.value)}
                      rows={2}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                      <button className="btn btn--primary btn--sm" onClick={() => onEditComment(comment.id)}>
                        Lưu
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => onEditingCommentId("")}>
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="comment-item__body">{comment.content}</p>
                )}
              </li>
            );
          })}
        </ul>
        <form
          className="comment-compose"
          onSubmit={(e) => {
            e.preventDefault();
            onAddComment();
          }}
        >
          <textarea
            value={newComment}
            onChange={(e) => onNewComment(e.target.value)}
            rows={3}
            placeholder="Thêm bình luận cho nhóm…"
            aria-label="Thêm bình luận cho item"
          />
          <button className="btn btn--primary btn--sm" type="submit">
            Gửi bình luận
          </button>
        </form>
      </div>

      <div className="workspace-detail__section">
        <span className="workspace-detail__label">Hoạt động của item</span>
        <ItemActivityTimeline item={item} activities={activities} />
      </div>
    </div>
  );
}
