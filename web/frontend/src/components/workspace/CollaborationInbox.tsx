import { useState } from "react";
import type { CollaborationInvite, InviteStatus, ResearcherProfile, Workspace } from "../../data/workspaceSample";
import { getInvitePerson } from "./utils";
import { ConfirmModal, type ConfirmConfig } from "../ConfirmModal";

export function CollaborationInbox({
  invites,
  researchers,
  workspaces,
  onRevoke,
}: {
  invites: CollaborationInvite[];
  researchers: ResearcherProfile[];
  workspaces: Workspace[];
  onRevoke?: (id: string) => void;
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
  const groups: Array<{ status: InviteStatus; label: string }> = [
    { status: "pending", label: "Chờ xác nhận" },
    { status: "accepted", label: "Đã chấp nhận" },
    { status: "declined", label: "Đã từ chối" },
  ];

  return (
    <section className="collab-inbox" aria-label="Lời mời nghiên cứu chung">
      <div className="collab-inbox__head">
        <span>Lời mời nghiên cứu chung</span>
        <span className="num">{invites.length}</span>
      </div>
      {invites.length === 0 ? (
        <p className="collab-inbox__empty">Không có lời mời đang chờ. Khi có nhóm mời bạn nghiên cứu chung, lời mời sẽ hiện ở đây.</p>
      ) : (
        <div className="invite-watch">
          {groups.map((group) => {
            const groupInvites = invites.filter((invite) => invite.status === group.status);
            return (
              <section className="invite-watch__group" key={group.status}>
                <div className="invite-watch__head">
                  <span>{group.label}</span>
                  <span className="num">{groupInvites.length}</span>
                </div>
                {groupInvites.slice(0, 2).map((invite) => {
                  const workspace = workspaces.find((item) => item.id === invite.workspaceId);
                  const person = getInvitePerson(invite, researchers);
                  return (
                    <div className="invite-watch__item" key={invite.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.name}</strong>
                        <small style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.email} · {workspace?.name ?? "Workspace"}</small>
                        <small style={{ display: "block", color: "var(--ink-muted)", fontSize: "11px", marginTop: "4px" }}>
                          {group.status === "pending" ? "Đã gửi: " : group.status === "accepted" ? "Đã chấp nhận: " : "Đã từ chối: "}
                          {invite.sentAt}
                        </small>
                      </div>
                      {group.status === "pending" && onRevoke && (
                        <button
                          className="btn btn--ghost btn--sm"
                          style={{ color: "var(--danger)", padding: "4px 8px", fontSize: "11px", height: "auto", minHeight: "auto", flexShrink: 0, whiteSpace: "nowrap" }}
                          onClick={() => {
                            showConfirm(
                              "Thu hồi lời mời",
                              `Bạn có chắc muốn thu hồi lời mời gửi đến ${person.name}?`,
                              () => onRevoke(invite.id),
                              true,
                              "Thu hồi"
                            );
                          }}
                        >
                          Thu hồi
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
      <ConfirmModal config={confirmConfig} />
    </section>
  );
}
