import { useState } from "react";
import { IconExternal, IconX } from "../icons";
import { KIND_LABEL, STATUS_LABEL, ROLE_LABEL } from "../../data/workspaceSample";
import type { WorkStatus, MemberRole, WorkspaceMember, WorkspaceItem, WorkspaceItemEntry } from "../../data/workspaceSample";
import { ItemActivityTimeline } from "./ItemActivityTimeline";
import { ConfirmModal, type ConfirmConfig } from "../ConfirmModal";
import { PaperPicker } from "./PaperPicker";

export function WorkspaceDetail({
  item,
  members,
  papers,
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
  papers: { id: string; title: string }[];
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
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({ isOpen: false, title: "", message: "", onConfirm: () => {}, onCancel: () => {} });
  const showConfirm = (title: string, message: string, onConfirm: () => void, danger = true, confirmText = "Xác nhận") => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      danger,
      confirmText,
      onConfirm,
      onCancel: () => setConfirmConfig(prev => ({ ...prev, isOpen: false }))
    });
  };
  const formatDue = (due?: string) => {
    if (!due || due === "Chưa đặt") return "Chưa đặt";
    if (/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      const [, month, day] = due.split("-");
      return `${day}/${month}`;
    }
    return due;
  };

  return (
    <div className="workspace-detail__body">
      <div className="workspace-detail__head">
        <span className={`workitem__kind workitem__kind--${item.kind}`}>{KIND_LABEL[item.kind]}</span>
        {canManageMembers ? (
          <button className="btn btn--ghost btn--sm" onClick={() => {
            showConfirm(
              "Xóa item",
              `Bạn có chắc chắn muốn xóa "${item.title}"?`,
              onRemove
            );
          }}>
            <IconX width={15} height={15} /> Xóa
          </button>
        ) : item.assigneeIds?.includes(currentUserId) ? (
          <button className="btn btn--ghost btn--sm" style={{ color: "var(--danger)" }} onClick={() => {
            showConfirm(
              "Thoát task",
              `Bạn có chắc chắn muốn thoát khỏi task "${item.title}"?`,
              () => onUpdate({ assigneeIds: (item.assigneeIds ?? []).filter(id => id !== currentUserId) }),
              true,
              "Thoát task"
            );
          }}>
            Thoát task
          </button>
        ) : null}
      </div>

      <h2>{item.title}</h2>
      <div className="item-meta-strip" aria-label="Tóm tắt item">
        <span>{KIND_LABEL[item.kind]}</span>
        <span>
          {item.assignees?.length
            ? item.assignees.map(a => a.name).join(", ")
            : "Chưa phân công"}
        </span>
        <span className="num">{formatDue(item.due)}</span>
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
        <div>
          <span className="workspace-detail__label">Phụ trách</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px", marginTop: "4px", alignItems: "center" }}>
            {item.assignees?.map((member) => {
              const canToggle = canEdit || member.id === currentUserId;
              return (
                <button
                  key={member.id}
                  type="button"
                  title={canToggle ? `Bỏ ${member.name}` : member.name}
                  onClick={() => {
                    if (!canToggle) return;
                    showConfirm(
                      member.id === currentUserId ? "Thoát task" : "Bỏ người phụ trách",
                      member.id === currentUserId 
                        ? `Bạn có chắc chắn muốn thoát khỏi task "${item.title}"?`
                        : `Bạn có chắc chắn muốn bỏ "${member.name}" khỏi task "${item.title}"?`,
                      () => onUpdate({ assigneeIds: (item.assigneeIds ?? []).filter(id => id !== member.id) }),
                      true,
                      member.id === currentUserId ? "Thoát task" : "Bỏ"
                    );
                  }}
                  style={{
                    background: "var(--primary)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "16px",
                    height: "28px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: canToggle ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0 10px 0 4px",
                    transition: "opacity 0.15s",
                  }}
                  aria-label={`Bỏ ${member.name}`}
                >
                  <span style={{ 
                    background: "rgba(255,255,255,0.2)", 
                    borderRadius: "50%", 
                    width: "20px", height: "20px", 
                    display: "flex", alignItems: "center", justifyContent: "center", 
                    fontSize: "10px" 
                  }}>
                    {member.initials}
                  </span>
                  {member.name}
                  {canToggle && <span style={{ opacity: 0.7, marginLeft: "2px", fontSize: "10px" }}>✕</span>}
                </button>
              );
            })}
            
            {(item.assignees?.length ?? 0) === 0 && (
              <span style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>Chưa phân công</span>
            )}

            {canEdit && members.length > (item.assignees?.length ?? 0) && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    onUpdate({ assigneeIds: [...(item.assigneeIds ?? []), e.target.value] });
                  }
                }}
                style={{
                  height: "28px",
                  borderRadius: "14px",
                  padding: "0 24px 0 10px",
                  fontSize: "12px",
                  background: "var(--surface)",
                  border: "1px dashed var(--border)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  width: "auto"
                }}
              >
                <option value="" disabled>+ Thêm</option>
                {members
                  .filter(m => !(item.assigneeIds ?? []).includes(m.id))
                  .map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
              </select>
            )}
          </div>
        </div>
        <label>
          <span className="workspace-detail__label">Deadline</span>
          <input
            type="date"
            className="input"
            value={item.due && /^\d{4}-\d{2}-\d{2}$/.test(item.due) ? item.due : ""}
            onChange={(e) => onUpdate({ due: e.target.value })}
            disabled={!canEdit}
            min={new Date().toISOString().split('T')[0]}
          />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          <span className="workspace-detail__label">Bài liên kết</span>
          <PaperPicker
            value={item.paperId}
            onChange={(paperId) => onUpdate({ paperId })}
            libraryPapers={papers}
            disabled={!canEdit}
          />
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
            // Only the comment's author may edit or delete their own comment.
            const canEditComment = comment.authorId === currentUserId;
            const canDeleteComment = canEditComment;
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
                            showConfirm(
                              "Xóa bình luận",
                              "Bạn có chắc chắn muốn xóa bình luận này?",
                              () => onDeleteComment(comment.id)
                            );
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

      <ConfirmModal config={confirmConfig} />
    </div>
  );
}
