import { useState } from "react";
import type { WorkspaceMember } from "../../data/workspaceSample";
import { ROLE_LABEL } from "../../data/workspaceSample";
import { initialsFromName } from "./utils";
import { ConfirmModal, type ConfirmConfig } from "../ConfirmModal";

export function WorkspaceMembersPanel({
  members,
  canManageMembers,
  currentUserId,
  onRemoveMember,
  onClose,
  onUpdateRole,
}: {
  members: WorkspaceMember[];
  canManageMembers: boolean;
  currentUserId: string;
  onRemoveMember: (memberId: string) => void;
  onClose: () => void;
  onUpdateRole?: (memberId: string, role: "editor" | "viewer") => void;
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
  return (
    <div className="workspace-panel workspace-pageform">
      <div className="workspace-pageform__hero">
        <div>
          <span className="workspace-detail__label">Thành viên Workspace</span>
          <h3>Danh sách thành viên hiện tại</h3>
          <p>Xem ai đang có mặt trong nhóm nghiên cứu này và vai trò của họ.</p>
        </div>
        <button className="btn btn--ghost btn--sm" type="button" onClick={onClose}>
          Quay lại board
        </button>
      </div>
      <div className="workspace-members-list" style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px 24px" }}>
        {members.map((member) => (
          <div key={member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--surface)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="member-avatar" aria-hidden="true" style={{ width: "32px", height: "32px", fontSize: "12px" }}>
                {member.initials || initialsFromName(member.name)}
              </span>
              <div>
                <strong>{member.name} {member.id === currentUserId ? "(Bạn)" : ""}</strong>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                  Vai trò:
                  {canManageMembers && member.id !== currentUserId && member.role !== "owner" ? (
                    <select
                      className="input input--sm"
                      style={{ padding: "0 24px 0 8px", height: "24px", fontSize: "12px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                      value={member.role}
                      onChange={(e) => {
                        if (onUpdateRole) onUpdateRole(member.id, e.target.value as any);
                      }}
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span>{ROLE_LABEL[member.role] ?? member.role}</span>
                  )}
                </div>
              </div>
            </div>
            {canManageMembers && member.id !== currentUserId && (
              <button
                className="btn btn--ghost btn--sm"
                style={{ color: "var(--danger)" }}
                onClick={() => {
                  showConfirm(
                    "Xóa thành viên",
                    `Bạn có chắc muốn mời ${member.name} rời khỏi workspace?`,
                    () => onRemoveMember(member.id),
                    true,
                    "Xóa"
                  );
                }}
              >
                Xóa
              </button>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Chưa có thành viên nào.</p>
        )}
      </div>
      <ConfirmModal config={confirmConfig} />
    </div>
  );
}
