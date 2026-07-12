import { IconPlus } from "../icons";
import type { ResearcherProfile } from "../../data/workspaceSample";

export function WorkspaceInvitePanel({
  researchers,
  inviteEmail,
  inviteTopic,
  inviteMessage,
  inviteNotice,
  onInviteEmail,
  onInviteTopic,
  onInviteMessage,
  onSendInvite,
  onClose,
}: {
  researchers: ResearcherProfile[];
  inviteEmail: string;
  inviteTopic: string;
  inviteMessage: string;
  inviteNotice: string;
  onInviteEmail: (email: string) => void;
  onInviteTopic: (topic: string) => void;
  onInviteMessage: (message: string) => void;
  onSendInvite: () => void;
  onClose: () => void;
}) {

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
        {researchers
          .filter(
            (r) =>
              r.email.toLowerCase().includes(inviteEmail.toLowerCase()) ||
              r.name.toLowerCase().includes(inviteEmail.toLowerCase())
          )
          .slice(0, 3)
          .map((researcher) => (
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

    </form>
  );
}
