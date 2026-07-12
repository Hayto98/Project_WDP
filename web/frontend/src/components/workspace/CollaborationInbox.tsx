import type { CollaborationInvite, InviteStatus, ResearcherProfile, Workspace } from "../../data/workspaceSample";
import { getInvitePerson } from "./utils";

export function CollaborationInbox({
  invites,
  researchers,
  workspaces,
}: {
  invites: CollaborationInvite[];
  researchers: ResearcherProfile[];
  workspaces: Workspace[];
}) {
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
                    <div className="invite-watch__item" key={invite.id}>
                      <strong>{person.name}</strong>
                      <small>{person.email} · {workspace?.name ?? "Workspace"}</small>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
