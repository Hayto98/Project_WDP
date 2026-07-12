import { IconPlus } from "../icons";
import type { CollaborationInvite, InviteStatus, ResearcherProfile } from "../../data/workspaceSample";
import { getInvitePerson, INVITE_STATUS_LABEL } from "./utils";

export function WorkspaceInvitePanel({
  researchers,
  invites,
  inviteEmail,
  inviteTopic,
  inviteMessage,
  inviteNotice,
  onInviteEmail,
  onInviteTopic,
  onInviteMessage,
  onSendInvite,
  onConfirmInvite,
  onDeclineInvite,
  onClose,
}: {
  researchers: ResearcherProfile[];
  invites: CollaborationInvite[];
  inviteEmail: string;
  inviteTopic: string;
  inviteMessage: string;
  inviteNotice: string;
  onInviteEmail: (email: string) => void;
  onInviteTopic: (topic: string) => void;
  onInviteMessage: (message: string) => void;
  onSendInvite: () => void;
  onConfirmInvite: (inviteId: string) => void;
  onDeclineInvite: (inviteId: string) => void;
  onClose: () => void;
}) {
  const outgoingInvites = invites.filter((invite) => invite.direction === "outgoing");
  const inviteGroups: Array<{ status: InviteStatus; label: string; empty: string }> = [
    { status: "pending", label: "Chờ xác nhận", empty: "Chưa có email nào đang chờ xác nhận." },
    { status: "accepted", label: "Đã chấp nhận", empty: "Chưa có lời mời nào được chấp nhận." },
    { status: "declined", label: "Đã từ chối", empty: "Chưa có lời mời nào bị từ chối." },
  ];

  return (
    <form
      className="research-invite workspace-panel workspace-pageform"
      onSubmit={(e) => {
        e.preventDefault();
        onSendInvite();
      }}
    >
      <div className="workspace-pageform__hero">
        <div>
          <span className="workspace-detail__label">Lời mời nghiên cứu chung</span>
          <h3>Gửi email mời cộng tác</h3>
          <p>Theo dõi email đang chờ xác nhận, đã chấp nhận và đã từ chối trong cùng một màn quản lý workspace.</p>
        </div>
        <button className="btn btn--ghost btn--sm" type="button" onClick={onClose}>
          Quay lại board
        </button>
      </div>
      <label>
        <span>Email người muốn hợp tác</span>
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => onInviteEmail(e.target.value)}
          placeholder="ten.nguoi.nhan@truong.edu.vn"
          autoComplete="email"
        />
      </label>
      <label>
        <span>Chủ đề muốn nghiên cứu chung</span>
        <input
          value={inviteTopic}
          onChange={(e) => onInviteTopic(e.target.value)}
          placeholder="Ví dụ: Đồng viết survey về biomedical RAG"
        />
      </label>
      <label>
        <span>Nội dung gửi trong email</span>
        <textarea
          value={inviteMessage}
          onChange={(e) => onInviteMessage(e.target.value)}
          placeholder="Ví dụ: Mình đang tổng hợp paper nền và muốn mời bạn cùng đọc, ghi chú và phân tích hướng nghiên cứu."
          rows={4}
        />
      </label>
      <div className="researcher-suggestions" aria-label="Gợi ý nhà nghiên cứu">
        {researchers.slice(0, 3).map((researcher) => (
          <button
            key={researcher.id}
            type="button"
            className={`researcher-chip ${inviteEmail.toLowerCase() === researcher.email.toLowerCase() ? "is-active" : ""}`}
            onClick={() => onInviteEmail(researcher.email)}
          >
            <span className="member-avatar" aria-hidden>
              {researcher.initials}
            </span>
            <span>
              <strong>{researcher.name}</strong>
              <small>{researcher.email} · {researcher.match}% phù hợp</small>
            </span>
          </button>
        ))}
      </div>
      <p className="email-preview">
        Đây là chức năng cấp workspace: email chứa chủ đề, nội dung lời mời và link xác nhận tham gia workspace.
      </p>
      <button className="btn btn--primary" type="submit">
        <IconPlus width={15} height={15} /> Gửi email mời
      </button>
      {inviteNotice && <p className="invite-notice" role="status">{inviteNotice}</p>}
      {outgoingInvites.length > 0 && (
        <div className="invite-status-groups" aria-label="Danh sách lời mời theo trạng thái">
          {inviteGroups.map((group) => {
            const groupInvites = outgoingInvites.filter((invite) => invite.status === group.status);
            return (
              <section className="invite-status-group" key={group.status}>
                <div className="invite-status-group__head">
                  <span>{group.label}</span>
                  <span className="num">{groupInvites.length}</span>
                </div>
                {groupInvites.length === 0 ? (
                  <p>{group.empty}</p>
                ) : (
                  <ul className="sent-invites">
                    {groupInvites.map((invite) => {
                      const person = getInvitePerson(invite, researchers);
                      return (
                        <li key={invite.id}>
                          <span>
                            <strong>{person.name}</strong>
                            <small>{person.email}</small>
                          </span>
                          <span className={`sent-invites__status sent-invites__status--${invite.status}`}>
                            {INVITE_STATUS_LABEL[invite.status]}
                          </span>
                          <p className="sent-invites__message">{invite.message}</p>
                          {invite.status === "pending" && (
                            <span className="sent-invites__actions">
                              <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => onConfirmInvite(invite.id)}
                              >
                                Chấp nhận
                              </button>
                              <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => onDeclineInvite(invite.id)}
                              >
                                Từ chối
                              </button>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </form>
  );
}
