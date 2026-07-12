import { useEffect, useMemo, useState } from "react";
import {
  IconGrid,
  IconPlus,
  IconSparkle,
} from "../components/icons";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  ACTIVITIES,
  COLLAB_INVITES,
  KIND_LABEL,
  MEMBERS,
  RESEARCHERS,
  STATUS_LABEL,
  WORK_ITEMS,
  WORKSPACES,
  makeWorkspaceEntries,
  type CollaborationInvite,
  type InviteStatus,
  type ResearcherProfile,
  type WorkKind,
  type WorkStatus,
  type Workspace,
  type WorkspaceItem,
  type WorkspaceMember,
} from "../data/workspaceSample";
import { PAPERS } from "../data/searchSample";
import type { Theme } from "../hooks/useTheme";
import { formatInt } from "../lib/format";
import { getCurrentUser, workspaceApi } from "../lib/api";
import { SHOW_DEMO_CONTROLS, USE_SAMPLE_FALLBACK } from "../lib/flags";

import { WorkspaceSkeleton } from "../components/workspace/WorkspaceSkeleton";
import { WorkspaceEmpty } from "../components/workspace/WorkspaceEmpty";
import { WorkItemRow } from "../components/workspace/WorkItemRow";
import { CollaborationInbox } from "../components/workspace/CollaborationInbox";
import { WorkspaceInvitePanel } from "../components/workspace/WorkspaceInvitePanel";
import { WorkspaceDetail } from "../components/workspace/WorkspaceDetail";
import { nameFromEmail, initialsFromName } from "../components/workspace/utils";

type Demo = "auto" | "loading" | "empty" | "error";
type WorkspaceMode = "board" | "createTask" | "invites";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  theme: Theme;
  toggle: () => void;
}

export function WorkspacePage({ theme, toggle }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(USE_SAMPLE_FALLBACK ? WORKSPACES : []);
  const [members, setMembers] = useState<WorkspaceMember[]>(USE_SAMPLE_FALLBACK ? MEMBERS : []);
  const [items, setItems] = useState<WorkspaceItem[]>(USE_SAMPLE_FALLBACK ? WORK_ITEMS : []);
  const [invites, setInvites] = useState<CollaborationInvite[]>(USE_SAMPLE_FALLBACK ? COLLAB_INVITES : []);
  const [researchers, setResearchers] = useState<ResearcherProfile[]>(USE_SAMPLE_FALLBACK ? RESEARCHERS : []);
  const [remoteActivities, setRemoteActivities] = useState(USE_SAMPLE_FALLBACK ? ACTIVITIES : []);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(USE_SAMPLE_FALLBACK ? WORKSPACES[0]?.id ?? "" : "");
  const [selectedId, setSelectedId] = useState(USE_SAMPLE_FALLBACK ? WORK_ITEMS[0]?.id ?? "" : "");
  const [newWorkspace, setNewWorkspace] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemKind, setNewItemKind] = useState<WorkKind>("task");
  const [newItemStatus, setNewItemStatus] = useState<WorkStatus>("backlog");
  const [newItemAssigneeId, setNewItemAssigneeId] = useState(USE_SAMPLE_FALLBACK ? MEMBERS[0]?.id ?? "" : "");
  const [newItemDue, setNewItemDue] = useState("");
  const [newItemPaperId, setNewItemPaperId] = useState(USE_SAMPLE_FALLBACK ? PAPERS[0]?.id ?? "" : "");
  const [newItemNote, setNewItemNote] = useState("");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [inviteEmail, setInviteEmail] = useState(USE_SAMPLE_FALLBACK ? RESEARCHERS[0]?.email ?? "" : "");
  const [inviteTopic, setInviteTopic] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteNotice, setInviteNotice] = useState("");
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("board");
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState<Demo>("auto");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    workspaceApi
      .workspaces()
      .then(async (nextWorkspaces) => {
        if (!nextWorkspaces.length) {
          if (!alive) return;
          setWorkspaces([]);
          setMembers([]);
          setItems([]);
          setInvites([]);
          setRemoteActivities([]);
          setActiveWorkspaceId("");
          setSelectedId("");
          return;
        }
        const [memberGroups, itemGroups, activityGroups, nextInvites, nextResearchers] = await Promise.all([
          Promise.all(nextWorkspaces.map((workspace) => workspaceApi.workspaceMembers(workspace.id).catch(() => []))),
          Promise.all(nextWorkspaces.map((workspace) => workspaceApi.items(workspace.id).catch(() => []))),
          Promise.all(nextWorkspaces.map((workspace) => workspaceApi.activities(workspace.id).catch(() => []))),
          workspaceApi.invites().catch(() => []),
          workspaceApi.researchers().catch(() => []),
        ]);
        if (!alive) return;
        const nextMembers = memberGroups.flat();
        const nextItems = itemGroups.flat();
        setWorkspaces(nextWorkspaces);
        setMembers(nextMembers);
        setItems(nextItems);
        setInvites(nextInvites);
        setResearchers(nextResearchers);
        setRemoteActivities(activityGroups.flat());
        setActiveWorkspaceId(nextWorkspaces[0]?.id ?? "");
        setSelectedId(nextItems[0]?.id ?? "");
      })
      .catch((err) => {
        if (!USE_SAMPLE_FALLBACK) {
          setWorkspaces([]);
          setMembers([]);
          setItems([]);
          setInvites([]);
          setResearchers([]);
          setRemoteActivities([]);
          setActiveWorkspaceId("");
          setSelectedId("");
        }
        setWorkspaceNotice(err instanceof Error ? err.message : "Không tải được workspace.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const entries = useMemo(() => makeWorkspaceEntries(items, members), [items, members]);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const workspaceMembers = members.filter((m) => m.workspaceId === activeWorkspaceId);
  const currentUser = getCurrentUser();
  const currentMember = workspaceMembers.find((member) => member.id === currentUser?.id);
  const currentRole = currentMember?.role ?? "viewer";
  const canEditWorkspace = currentRole === "owner" || currentRole === "editor";
  const canManageMembers = currentRole === "owner";
  const workspaceEntries = entries.filter((item) => item.workspaceId === activeWorkspaceId);
  const selected = entries.find((item) => item.id === selectedId) ?? workspaceEntries[0] ?? null;
  const activities = (remoteActivities.length ? remoteActivities : USE_SAMPLE_FALLBACK ? ACTIVITIES : []).filter((a) => a.workspaceId === activeWorkspaceId);
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

  const refreshWorkspaceDetails = async (workspaceId = activeWorkspaceId) => {
    if (!workspaceId) return;
    const [nextMembers, nextItems, nextActivities, nextInvites] = await Promise.all([
      workspaceApi.workspaceMembers(workspaceId).catch(() => []),
      workspaceApi.items(workspaceId).catch(() => []),
      workspaceApi.activities(workspaceId).catch(() => []),
      workspaceApi.invites().catch(() => invites),
    ]);
    setMembers((current) => [...current.filter((member) => member.workspaceId !== workspaceId), ...nextMembers]);
    setItems((current) => [...current.filter((item) => item.workspaceId !== workspaceId), ...nextItems]);
    setRemoteActivities((current) => [
      ...current.filter((activity) => activity.workspaceId !== workspaceId),
      ...nextActivities,
    ]);
    setInvites(nextInvites);
  };

  const addWorkspace = async () => {
    const name = newWorkspace.trim();
    if (!name) return;
    setWorkspaceNotice("");
    try {
      const workspace = await workspaceApi.createWorkspace({
        name,
        description: "Workspace nhóm do bạn tạo",
        owner_name: "Minh Thành",
        owner_initials: "MT",
      });
      setWorkspaces((current) => [workspace, ...current]);
      setActiveWorkspaceId(workspace.id);
      setSelectedId("");
      setNewWorkspace("");
      await refreshWorkspaceDetails(workspace.id);
      setWorkspaceNotice("Đã tạo workspace.");
    } catch (err) {
      setWorkspaceNotice(err instanceof Error ? err.message : "Không tạo được workspace.");
    }
  };

  const addItem = async () => {
    if (!activeWorkspace || !canEditWorkspace) {
      setWorkspaceNotice("Bạn cần quyền editor hoặc owner để tạo item.");
      return;
    }
    const title = newItemTitle.trim();
    if (!title) return;
    setWorkspaceNotice("");
    const assigneeId =
      workspaceMembers.some((member) => member.id === newItemAssigneeId)
        ? newItemAssigneeId
        : (workspaceMembers[0]?.id ?? "");
    const paperId = PAPERS.some((paper) => paper.id === newItemPaperId) ? newItemPaperId : (PAPERS[0]?.id ?? "");
    try {
      const item = await workspaceApi.createItem(activeWorkspace.id, {
        kind: newItemKind,
        title,
        status: newItemStatus,
        assigneeId,
        paperId,
        due: newItemDue.trim() || "Chưa đặt",
        note: newItemNote.trim() || "Chưa có mô tả. Bổ sung mục tiêu, câu hỏi hoặc kết luận đọc paper tại đây.",
      });
      setItems((current) => [item, ...current]);
      setSelectedId(item.id);
      setNewItemTitle("");
      setNewItemStatus("backlog");
      setNewItemDue("");
      setNewItemNote("");
      setWorkspaceMode("board");
      await refreshWorkspaceDetails(activeWorkspace.id);
      setWorkspaceNotice("Đã tạo item.");
    } catch (err) {
      setWorkspaceNotice(err instanceof Error ? err.message : "Không tạo được item.");
    }
  };

  const updateItem = async (id: string, patch: Partial<WorkspaceItem>) => {
    if (!activeWorkspace || !canEditWorkspace) {
      setWorkspaceNotice("Bạn cần quyền editor hoặc owner để cập nhật item.");
      return;
    }
    const previous = items;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    try {
      const updated = await workspaceApi.updateItem(activeWorkspace.id, id, patch);
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setItems(previous);
      setWorkspaceNotice(err instanceof Error ? err.message : "Không cập nhật được item.");
    }
  };

  const addComment = async (id: string) => {
    if (!activeWorkspace) return;
    const comment = newComment.trim();
    if (!comment) return;
    const authorName = currentUser?.full_name ?? "Người dùng";
    const previous = items;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, comments: [...item.comments, { id: Date.now().toString(), content: comment, authorId: currentUser?.id ?? "", authorName, createdAt: "vừa xong" }] } : item)));
    try {
      await workspaceApi.addComment(activeWorkspace.id, id, { content: comment, author_name: authorName });
      setNewComment("");
      await refreshWorkspaceDetails(activeWorkspace.id);
    } catch {
      setItems(previous);
      setWorkspaceNotice("Không thêm được bình luận.");
    }
  };

  const handleEditComment = async (itemId: string, commentId: string) => {
    if (!activeWorkspace) return;
    const content = editingCommentContent.trim();
    if (!content) return;
    const previous = items;
    setItems((current) => current.map((item) => {
      if (item.id === itemId) {
        return { ...item, comments: item.comments.map(c => c.id === commentId ? { ...c, content } : c) };
      }
      return item;
    }));
    try {
      await workspaceApi.editComment(activeWorkspace.id, itemId, commentId, content);
      setEditingCommentId("");
      await refreshWorkspaceDetails(activeWorkspace.id);
    } catch {
      setItems(previous);
      setWorkspaceNotice("Không sửa được bình luận.");
    }
  };

  const handleDeleteComment = async (itemId: string, commentId: string) => {
    if (!activeWorkspace) return;
    const previous = items;
    setItems((current) => current.map((item) => {
      if (item.id === itemId) {
        return { ...item, comments: item.comments.filter(c => c.id !== commentId) };
      }
      return item;
    }));
    try {
      await workspaceApi.deleteComment(activeWorkspace.id, itemId, commentId);
      await refreshWorkspaceDetails(activeWorkspace.id);
    } catch {
      setItems(previous);
      setWorkspaceNotice("Không xóa được bình luận.");
    }
  };

  const updateMember = async (id: string, patch: Partial<WorkspaceMember>) => {
    if (!activeWorkspace || !canManageMembers || !patch.role || patch.role === "owner") {
      if (!canManageMembers) setWorkspaceNotice("Chỉ owner được cập nhật quyền thành viên.");
      return;
    }
    const previous = members;
    setMembers((current) => current.map((member) => (member.id === id ? { ...member, ...patch } : member)));
    try {
      const nextMembers = await workspaceApi.updateMember(activeWorkspace.id, id, patch.role);
      setMembers((current) => [...current.filter((member) => member.workspaceId !== activeWorkspace.id), ...nextMembers]);
    } catch (err) {
      setMembers(previous);
      setWorkspaceNotice(err instanceof Error ? err.message : "Không cập nhật được thành viên.");
    }
  };

  const removeItem = async (id: string) => {
    if (!activeWorkspace || !canEditWorkspace) {
      setWorkspaceNotice("Bạn cần quyền editor hoặc owner để xóa item.");
      return;
    }
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    setSelectedId((current) => (current === id ? "" : current));
    try {
      await workspaceApi.deleteItem(activeWorkspace.id, id);
      await refreshWorkspaceDetails(activeWorkspace.id);
    } catch (err) {
      setItems(previous);
      setWorkspaceNotice(err instanceof Error ? err.message : "Không xóa được item.");
    }
  };

  const sendInvite = async () => {
    if (!activeWorkspace || !canEditWorkspace) {
      setInviteNotice("Bạn cần quyền editor hoặc owner để gửi lời mời.");
      return;
    }
    const email = inviteEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setInviteNotice("Vui lòng nhập email hợp lệ để gửi lời mời.");
      return;
    }
    const researcher = researchers.find((r) => r.email.toLowerCase() === email);
    const topic = inviteTopic.trim() || `Cùng nghiên cứu trong ${activeWorkspace.name}`;
    const message =
      inviteMessage.trim() ||
      `Mình muốn mời bạn tham gia workspace "${activeWorkspace.name}" để cùng nghiên cứu chủ đề "${topic}".`;
    try {
      const invite = await workspaceApi.createInvite({
        workspaceId: activeWorkspace.id,
        researcherId: researcher?.id,
        inviteeEmail: email,
        inviteeName: researcher?.name ?? nameFromEmail(email),
        direction: "outgoing",
        topic,
        message,
      });
      setInvites((current) => [invite, ...current]);
      setInviteTopic("");
      setInviteMessage("");
      setInviteNotice(`Đã gửi email mời hợp tác đến ${email}.`);
    } catch (err) {
      setInviteNotice(err instanceof Error ? err.message : "Không gửi được lời mời.");
    }
  };

  const updateInviteStatus = async (inviteId: string, status: InviteStatus) => {
    const invite = invites.find((item) => item.id === inviteId);
    if (!invite) return;
    const researcher = researchers.find((item) => item.id === invite.researcherId);
    try {
      const updated = await workspaceApi.respondInvite(inviteId, status === "accepted" ? "accepted" : "declined");
      setInvites((current) => current.map((item) => (item.id === inviteId ? updated : item)));
    } catch (err) {
      setInviteNotice(err instanceof Error ? err.message : "Không cập nhật được lời mời.");
      return;
    }
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
      {workspaceNotice && <p className="notice">{workspaceNotice}</p>}

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
            researchers={researchers}
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
                disabled={!canEditWorkspace}
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
                disabled={!canEditWorkspace}
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
              researchers={researchers}
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
              editingCommentId={editingCommentId}
              editingCommentContent={editingCommentContent}
              onEditingCommentId={setEditingCommentId}
              onEditingCommentContent={setEditingCommentContent}
              onEditComment={(commentId) => handleEditComment(selected.id, commentId)}
              onDeleteComment={(commentId) => handleDeleteComment(selected.id, commentId)}
              currentUserId={currentUser?.id || ""}
              activities={activities}
              canEdit={canEditWorkspace}
              canManageMembers={canManageMembers}
            />
          ) : (
            <div className="workspace-detail__empty">
              <IconSparkle width={24} height={24} />
              <p>Chọn một item để xem bài báo liên kết, bình luận, activity và phân quyền nhóm.</p>
            </div>
          )}
        </aside>
      </div>

      {SHOW_DEMO_CONTROLS && <div className="statepick statepick--search" role="group" aria-label="Xem trước trạng thái (demo)">
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
      </div>}
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
