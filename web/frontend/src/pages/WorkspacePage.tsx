import { useEffect, useMemo, useState } from "react";
import {
  IconExternal,
  IconGrid,
  IconLibrary,
  IconPlus,
  IconSparkle,
  IconX,
} from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  ACTIVITIES,
  COLLAB_INVITES,
  MEMBERS,
  RESEARCHERS,
  WORK_ITEMS,
  WORKSPACES,
  makeWorkspaceEntries,
  type CollaborationInvite,
  type InviteStatus,
  type MemberRole,
  type ResearcherProfile,
  type WorkKind,
  type WorkStatus,
  type Workspace,
  type WorkspaceItem,
  type WorkspaceItemEntry,
  type WorkspaceMember,
} from "../data/workspaceSample";
import { PAPERS } from "../data/searchSample";
import type { Theme } from "../hooks/useTheme";
import { formatInt } from "../lib/format";

type Demo = "auto" | "loading" | "empty" | "error";
type WorkspaceMode = "board" | "createTask" | "invites";

const STATUS_LABEL: Record<WorkStatus, string> = {
  backlog: "Backlog",
  doing: "Đang làm",
  done: "Đã xong",
};

const KIND_LABEL: Record<WorkKind, string> = {
  task: "Task",
  note: "Ghi chú",
  discussion: "Thảo luận",
};

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
  pending: "Đang chờ",
  accepted: "Đã chấp nhận",
  declined: "Đã từ chối",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  theme: Theme;
  toggle: () => void;
}

export function WorkspacePage({ theme, toggle }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(WORKSPACES);
  const [members, setMembers] = useState<WorkspaceMember[]>(MEMBERS);
  const [items, setItems] = useState<WorkspaceItem[]>(WORK_ITEMS);
  const [invites, setInvites] = useState<CollaborationInvite[]>(COLLAB_INVITES);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(WORKSPACES[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState(WORK_ITEMS[0]?.id ?? "");
  const [newWorkspace, setNewWorkspace] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemKind, setNewItemKind] = useState<WorkKind>("task");
  const [newItemStatus, setNewItemStatus] = useState<WorkStatus>("backlog");
  const [newItemAssigneeId, setNewItemAssigneeId] = useState(MEMBERS[0]?.id ?? "");
  const [newItemDue, setNewItemDue] = useState("");
  const [newItemPaperId, setNewItemPaperId] = useState(PAPERS[0]?.id ?? "");
  const [newItemNote, setNewItemNote] = useState("");
  const [newComment, setNewComment] = useState("");
  const [inviteEmail, setInviteEmail] = useState(RESEARCHERS[0]?.email ?? "");
  const [inviteTopic, setInviteTopic] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteNotice, setInviteNotice] = useState("");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("board");
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState<Demo>("auto");

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 520);
    return () => clearTimeout(t);
  }, []);

  const entries = useMemo(() => makeWorkspaceEntries(items, members), [items, members]);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const workspaceMembers = members.filter((m) => m.workspaceId === activeWorkspaceId);
  const workspaceEntries = entries.filter((item) => item.workspaceId === activeWorkspaceId);
  const selected = entries.find((item) => item.id === selectedId) ?? workspaceEntries[0] ?? null;
  const activities = ACTIVITIES.filter((a) => a.workspaceId === activeWorkspaceId);
  const workspaceInvites = invites.filter((invite) => invite.workspaceId === activeWorkspaceId);
  const pendingWorkspaceInviteCount = workspaceInvites.filter((invite) => invite.status === "pending").length;

  const view: "loading" | "error" | "empty" | "ready" =
    demo === "loading" || loading
      ? "loading"
      : demo === "error"
        ? "error"
        : demo === "empty" || workspaces.length === 0
          ? "empty"
          : "ready";

  const counts = useMemo(() => {
    const map: Record<string, { items: number; members: number }> = {};
    for (const workspace of workspaces) {
      map[workspace.id] = {
        items: items.filter((item) => item.workspaceId === workspace.id).length,
        members: members.filter((member) => member.workspaceId === workspace.id).length,
      };
    }
    return map;
  }, [workspaces, items, members]);

  const addWorkspace = () => {
    const name = newWorkspace.trim();
    if (!name) return;
    const id = `ws-custom-${Date.now()}`;
    const ownerId = `m-${Date.now()}`;
    setWorkspaces((current) => [
      { id, name, description: "Workspace nhóm do bạn tạo", active: true },
      ...current,
    ]);
    setMembers((current) => [
      { id: ownerId, workspaceId: id, name: "Minh Thành", initials: "MT", role: "owner" },
      ...current,
    ]);
    setActiveWorkspaceId(id);
    setNewItemAssigneeId(ownerId);
    setSelectedId("");
    setNewWorkspace("");
  };

  const addItem = () => {
    if (!activeWorkspace) return;
    const title = newItemTitle.trim();
    if (!title) return;
    const id = `wi-custom-${Date.now()}`;
    const assigneeId =
      workspaceMembers.some((member) => member.id === newItemAssigneeId)
        ? newItemAssigneeId
        : (workspaceMembers[0]?.id ?? "");
    const paperId = PAPERS.some((paper) => paper.id === newItemPaperId) ? newItemPaperId : (PAPERS[0]?.id ?? "");
    setItems((current) => [
      {
        id,
        workspaceId: activeWorkspace.id,
        kind: newItemKind,
        title,
        status: newItemStatus,
        assigneeId,
        paperId,
        due: newItemDue.trim() || "Chưa đặt",
        comments: [],
        note: newItemNote.trim() || "Chưa có mô tả. Bổ sung mục tiêu, câu hỏi hoặc kết luận đọc paper tại đây.",
      },
      ...current,
    ]);
    setSelectedId(id);
    setNewItemTitle("");
    setNewItemStatus("backlog");
    setNewItemDue("");
    setNewItemNote("");
    setWorkspaceMode("board");
  };

  const updateItem = (id: string, patch: Partial<WorkspaceItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addComment = (id: string) => {
    const comment = newComment.trim();
    if (!comment) return;
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, comments: [...item.comments, comment] } : item)),
    );
    setNewComment("");
  };

  const updateMember = (id: string, patch: Partial<WorkspaceMember>) => {
    setMembers((current) => current.map((member) => (member.id === id ? { ...member, ...patch } : member)));
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setSelectedId((current) => (current === id ? "" : current));
  };

  const sendInvite = () => {
    if (!activeWorkspace) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setInviteNotice("Vui lòng nhập email hợp lệ để gửi lời mời.");
      return;
    }
    const researcher = RESEARCHERS.find((r) => r.email.toLowerCase() === email);
    const topic = inviteTopic.trim() || `Cùng nghiên cứu trong ${activeWorkspace.name}`;
    const message =
      inviteMessage.trim() ||
      `Mình muốn mời bạn tham gia workspace "${activeWorkspace.name}" để cùng nghiên cứu chủ đề "${topic}".`;
    setInvites((current) => [
      {
        id: `ci-custom-${Date.now()}`,
        workspaceId: activeWorkspace.id,
        researcherId: researcher?.id,
        inviteeEmail: email,
        inviteeName: researcher?.name,
        direction: "outgoing",
        topic,
        message,
        status: "pending",
        sentAt: "vừa xong",
      },
      ...current,
    ]);
    setInviteTopic("");
    setInviteMessage("");
    setInviteNotice(`Đã gửi email mời hợp tác đến ${email}.`);
  };

  const updateInviteStatus = (inviteId: string, status: InviteStatus) => {
    const invite = invites.find((item) => item.id === inviteId);
    if (!invite) return;
    const researcher = RESEARCHERS.find((item) => item.id === invite.researcherId);
    setInvites((current) => current.map((item) => (item.id === inviteId ? { ...item, status } : item)));
    const displayName = invite.inviteeName ?? researcher?.name ?? nameFromEmail(invite.inviteeEmail);
    const initials = researcher?.initials ?? initialsFromName(displayName);
    if (status === "declined") {
      setInviteNotice(`${displayName} đã từ chối lời mời tham gia workspace.`);
      return;
    }
    if (status !== "accepted") return;
    setActiveWorkspaceId(invite.workspaceId);
    setSelectedId(items.find((item) => item.workspaceId === invite.workspaceId)?.id ?? "");
    setMembers((current) => {
      const exists = current.some(
        (member) => member.workspaceId === invite.workspaceId && member.name.toLowerCase() === displayName.toLowerCase(),
      );
      if (exists) return current;
      return [
        ...current,
        {
          id: `m-accepted-${invite.id}-${Date.now()}`,
          workspaceId: invite.workspaceId,
          name: displayName,
          initials,
          role: "editor",
        },
      ];
    });
    setInviteNotice(`${displayName} đã xác nhận tham gia workspace qua link email.`);
  };

  return (
    <main className="main workspace">
      <header className="topbar">
        <div className="topbar__lead">
          <h1>Workspace</h1>
          <p className="topbar__sub">
            Làm việc nhóm trên thư viện nghiên cứu: phân công, ghi chú, thảo luận và theo dõi tiến độ
          </p>
        </div>
        <div className="topbar__controls">
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      <div className="trendsum workspacesum" aria-label="Tổng quan workspace">
        <Summary label="Workspace" value={formatInt(workspaces.length)} />
        <Summary label="Thành viên" value={formatInt(workspaceMembers.length)} />
        <Summary label="Đang làm" value={formatInt(workspaceEntries.filter((i) => i.status === "doing").length)} />
        <Summary label="Lời mời chờ" value={formatInt(pendingWorkspaceInviteCount)} />
      </div>

      <div className="workspace-layout">
        <aside className="workspace-side" aria-label="Danh sách workspace">
          <div className="workspace-side__head">
            <span className="workspace-side__title">
              <IconGrid width={17} height={17} /> Workspace nhóm
            </span>
          </div>

          <ul className="wspace-list">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <button
                  className={`wspace ${activeWorkspaceId === workspace.id ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveWorkspaceId(workspace.id);
                    setSelectedId(items.find((item) => item.workspaceId === workspace.id)?.id ?? "");
                    setNewItemAssigneeId(members.find((member) => member.workspaceId === workspace.id)?.id ?? "");
                    setWorkspaceMode("board");
                  }}
                  aria-current={activeWorkspaceId === workspace.id ? "page" : undefined}
                >
                  <span className="wspace__main">
                    <strong>{workspace.name}</strong>
                    <small>{workspace.description}</small>
                  </span>
                  <span className="wspace__count num">{counts[workspace.id]?.items ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>

          <form
            className="workspace-new"
            onSubmit={(e) => {
              e.preventDefault();
              addWorkspace();
            }}
          >
            <label htmlFor="workspace-new">Tạo workspace</label>
            <div className="workspace-new__row">
              <input
                id="workspace-new"
                value={newWorkspace}
                onChange={(e) => setNewWorkspace(e.target.value)}
                placeholder="Ví dụ: AI Safety Team"
              />
              <button type="submit" className="icon-btn" aria-label="Tạo workspace">
                <IconPlus width={16} height={16} />
              </button>
            </div>
          </form>

          <CollaborationInbox
            invites={workspaceInvites}
            researchers={RESEARCHERS}
            workspaces={workspaces}
          />
        </aside>

        <section className="workspace-main" aria-live="polite">
          <div className="workspace-toolbar">
            <div>
              <h2>{activeWorkspace?.name ?? "Workspace"}</h2>
              <p>
                <span className="num">{formatInt(workspaceEntries.length)}</span> item ·{" "}
                <span className="num">{formatInt(workspaceMembers.length)}</span> thành viên
              </p>
            </div>
            <div className="workspace-toolbar__actions">
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => {
                  setWorkspaceMode("createTask");
                }}
                aria-current={workspaceMode === "createTask" ? "page" : undefined}
              >
                <IconPlus width={15} height={15} /> Thêm task
              </button>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => {
                  setWorkspaceMode("invites");
                }}
                aria-current={workspaceMode === "invites" ? "page" : undefined}
              >
                Lời mời nghiên cứu chung
              </button>
            </div>
          </div>

          {workspaceMode === "createTask" && (
            <form
              className="workspace-add workspace-panel workspace-pageform"
              onSubmit={(e) => {
                e.preventDefault();
                addItem();
              }}
            >
              <div className="workspace-pageform__hero">
                <div>
                  <span className="workspace-detail__label">Tạo item mới</span>
                  <h3>Thêm task cho {activeWorkspace?.name ?? "workspace"}</h3>
                  <p>Điền thông tin như một issue nghiên cứu: loại việc, người phụ trách, deadline, paper liên kết và mô tả ban đầu.</p>
                </div>
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => setWorkspaceMode("board")}>
                  Quay lại board
                </button>
              </div>
              <div className="workspace-add__top">
                <div className="seg" role="group" aria-label="Loại item mới">
                  {(["task", "note", "discussion"] as WorkKind[]).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className={`seg__btn ${newItemKind === kind ? "is-active" : ""}`}
                      onClick={() => setNewItemKind(kind)}
                      aria-pressed={newItemKind === kind}
                    >
                      {KIND_LABEL[kind]}
                    </button>
                  ))}
                </div>
                <div className="seg" role="group" aria-label="Trạng thái ban đầu">
                  {(["backlog", "doing", "done"] as WorkStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`seg__btn ${newItemStatus === status ? "is-active" : ""}`}
                      onClick={() => setNewItemStatus(status)}
                      aria-pressed={newItemStatus === status}
                    >
                      {STATUS_LABEL[status]}
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Tên task, ghi chú hoặc thảo luận…"
                aria-label="Tên item workspace mới"
              />
              <div className="workspace-add__grid">
                <label>
                  <span>Phụ trách</span>
                  <select value={newItemAssigneeId} onChange={(e) => setNewItemAssigneeId(e.target.value)}>
                    {workspaceMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Deadline</span>
                  <input
                    value={newItemDue}
                    onChange={(e) => setNewItemDue(e.target.value)}
                    placeholder="Ví dụ: 18/07"
                    aria-label="Deadline task mới"
                  />
                </label>
                <label className="workspace-add__paper">
                  <span>Bài báo liên kết</span>
                  <select value={newItemPaperId} onChange={(e) => setNewItemPaperId(e.target.value)}>
                    {PAPERS.slice(0, 8).map((paper) => (
                      <option key={paper.id} value={paper.id}>
                        {paper.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="workspace-add__note">
                <span>Mô tả ban đầu</span>
                <textarea
                  value={newItemNote}
                  onChange={(e) => setNewItemNote(e.target.value)}
                  rows={3}
                  placeholder="Mục tiêu, câu hỏi nghiên cứu, việc cần nhóm phản hồi…"
                />
              </label>
              <div className="workspace-add__actions">
                <button className="btn btn--ghost" type="button" onClick={() => setWorkspaceMode("board")}>
                  Hủy
                </button>
                <button className="btn btn--primary" type="submit">
                  <IconPlus width={15} height={15} /> Tạo task
                </button>
              </div>
            </form>
          )}

          {workspaceMode === "invites" && (
            <WorkspaceInvitePanel
              researchers={RESEARCHERS}
              invites={workspaceInvites}
              inviteEmail={inviteEmail}
              inviteTopic={inviteTopic}
              inviteMessage={inviteMessage}
              inviteNotice={inviteNotice}
              onInviteEmail={setInviteEmail}
              onInviteTopic={setInviteTopic}
              onInviteMessage={setInviteMessage}
              onSendInvite={sendInvite}
              onConfirmInvite={(inviteId) => updateInviteStatus(inviteId, "accepted")}
              onDeclineInvite={(inviteId) => updateInviteStatus(inviteId, "declined")}
              onClose={() => setWorkspaceMode("board")}
            />
          )}

          {view === "loading" && <WorkspaceSkeleton />}
          {view === "error" && (
            <div className="state state--error">
              <p className="state__title">Không tải được workspace</p>
              <p className="state__body">Có lỗi khi lấy dữ liệu làm việc nhóm. Vui lòng thử lại.</p>
              <button className="btn btn--primary" onClick={() => setDemo("auto")}>
                Thử lại
              </button>
            </div>
          )}
          {view === "empty" && <WorkspaceEmpty onReset={() => setDemo("auto")} />}
          {workspaceMode === "board" && view === "ready" && workspaceEntries.length === 0 && (
            <div className="state state--empty">
              <p className="state__title">Workspace này chưa có item</p>
              <p className="state__body">Tạo task hoặc ghi chú đầu tiên để bắt đầu phối hợp nhóm.</p>
            </div>
          )}
          {workspaceMode === "board" && view === "ready" && workspaceEntries.length > 0 && (
            <div className="workboard">
              {(["backlog", "doing", "done"] as WorkStatus[]).map((status) => (
                <section className="workcol" key={status}>
                  <header className="workcol__head">
                    <h3>{STATUS_LABEL[status]}</h3>
                    <span className="num">{workspaceEntries.filter((item) => item.status === status).length}</span>
                  </header>
                  <ol className="workitems">
                    {workspaceEntries
                      .filter((item) => item.status === status)
                      .map((item) => (
                        <WorkItemRow
                          key={item.id}
                          item={item}
                          selected={selected?.id === item.id}
                          onSelect={() => setSelectedId(item.id)}
                        />
                      ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </section>

        <aside className="workspace-detail" aria-label="Chi tiết workspace">
          {view === "ready" && selected ? (
            <WorkspaceDetail
              item={selected}
              members={workspaceMembers}
              onUpdate={(patch) => updateItem(selected.id, patch)}
              onMember={updateMember}
              onRemove={() => removeItem(selected.id)}
              newComment={newComment}
              onNewComment={setNewComment}
              onAddComment={() => addComment(selected.id)}
              activities={activities}
            />
          ) : (
            <div className="workspace-detail__empty">
              <IconSparkle width={24} height={24} />
              <p>Chọn một item để xem bài báo liên kết, bình luận, activity và phân quyền nhóm.</p>
            </div>
          )}
        </aside>
      </div>

      <div className="statepick statepick--search" role="group" aria-label="Xem trước trạng thái (demo)">
        <span className="statepick__label">Xem trạng thái</span>
        {(["auto", "loading", "empty", "error"] as Demo[]).map((d) => (
          <button
            key={d}
            className={`statepick__btn ${demo === d ? "is-active" : ""}`}
            onClick={() => setDemo(d)}
          >
            {d === "auto" ? "Thực tế" : d === "loading" ? "Đang tải" : d === "empty" ? "Trống" : "Lỗi"}
          </button>
        ))}
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="sumstat">
      <span className="sumstat__label">{label}</span>
      <span className="sumstat__value num">{value}</span>
    </div>
  );
}

function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "collaborator";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || "NC";
}

function getInvitePerson(invite: CollaborationInvite, researchers: ResearcherProfile[]) {
  const researcher = researchers.find((item) => item.id === invite.researcherId);
  const name = invite.inviteeName ?? researcher?.name ?? nameFromEmail(invite.inviteeEmail);
  return {
    name,
    initials: researcher?.initials ?? initialsFromName(name),
    email: invite.inviteeEmail,
  };
}

function WorkItemRow({
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
          <span className="num">{item.due}</span>
          <span>{item.comments.length} bình luận</span>
        </span>
      </button>
    </li>
  );
}

function CollaborationInbox({
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

function WorkspaceInvitePanel({
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

function WorkspaceDetail({
  item,
  members,
  onUpdate,
  onMember,
  onRemove,
  newComment,
  onNewComment,
  onAddComment,
  activities,
}: {
  item: WorkspaceItemEntry;
  members: WorkspaceMember[];
  onUpdate: (patch: Partial<WorkspaceItem>) => void;
  onMember: (id: string, patch: Partial<WorkspaceMember>) => void;
  onRemove: () => void;
  newComment: string;
  onNewComment: (comment: string) => void;
  onAddComment: () => void;
  activities: { id: string; actor: string; action: string; when: string }[];
}) {
  return (
    <div className="workspace-detail__body">
      <div className="workspace-detail__head">
        <span className={`workitem__kind workitem__kind--${item.kind}`}>{KIND_LABEL[item.kind]}</span>
        <button className="btn btn--ghost btn--sm" onClick={onRemove}>
          <IconX width={15} height={15} /> Xóa
        </button>
      </div>

      <h2>{item.title}</h2>
      <div className="item-meta-strip" aria-label="Tóm tắt item">
        <span>{KIND_LABEL[item.kind]}</span>
        <span>{item.assignee?.name ?? "Chưa phân công"}</span>
        <span className="num">{item.due}</span>
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
            >
              {STATUS_LABEL[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="workspace-detail__grid">
        <label>
          <span className="workspace-detail__label">Phụ trách</span>
          <select value={item.assigneeId} onChange={(e) => onUpdate({ assigneeId: e.target.value })}>
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
          />
        </label>
        <label>
          <span className="workspace-detail__label">Bài liên kết</span>
          <select value={item.paperId} onChange={(e) => onUpdate({ paperId: e.target.value })}>
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
        />
      </label>

      <div className="workspace-paper">
        <span className="workspace-detail__label">Bài báo</span>
        <a href={item.paper.url} target="_blank" rel="noreferrer noopener">
          <IconExternal width={15} height={15} /> {item.paper.title}
        </a>
        <p>
          {item.paper.authors.slice(0, 3).join(", ")} · <span className="num">{item.paper.year}</span> ·{" "}
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
              >
                {(["owner", "editor", "viewer"] as MemberRole[]).map((role) => (
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
          {item.comments.map((comment, idx) => (
            <li key={`${item.id}-${idx}`}>{comment}</li>
          ))}
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

function ItemActivityTimeline({
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
      when: item.due,
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

function WorkspaceSkeleton() {
  return (
    <div className="workboard" aria-hidden>
      {Array.from({ length: 3 }, (_, c) => (
        <section className="workcol" key={c}>
          <div className="skel" style={{ height: 18, width: "52%", marginBottom: 14 }} />
          {Array.from({ length: 2 }, (_, i) => (
            <div className="workitem workitem--skel" key={i}>
              <div className="skel" style={{ height: 16, width: "70%" }} />
              <div className="skel" style={{ height: 12, width: "92%", marginTop: 10 }} />
              <div className="skel" style={{ height: 12, width: "46%", marginTop: 10 }} />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function WorkspaceEmpty({ onReset }: { onReset: () => void }) {
  return (
    <div className="state state--empty">
      <p className="state__title">Chưa có workspace nhóm</p>
      <p className="state__body">
        Tạo workspace đầu tiên để chia sẻ thư viện, gắn paper vào task và phân công người phụ trách.
      </p>
      <button className="btn btn--primary" onClick={onReset}>
        Bắt đầu tạo workspace
      </button>
    </div>
  );
}
