import { useEffect, useMemo, useState } from "react";
import "../components/Modal.css";
import {
  IconEdit,
  IconGrid,
  IconLogOut,
  IconPlus,
  IconSparkle,
  IconTrash,
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
  type ResearcherProfile,
  type WorkKind,
  type WorkStatus,
  type Workspace,
  type WorkspaceItem,
  type WorkspaceMember,
} from "../data/workspaceSample";
import type { LibraryEntry } from "../data/librarySample";
import type { Theme } from "../hooks/useTheme";
import { formatInt } from "../lib/format";
import { getCurrentUser, workspaceApi, libraryApi } from "../lib/api";
import { SHOW_DEMO_CONTROLS, USE_SAMPLE_FALLBACK } from "../lib/flags";

import { WorkspaceSkeleton } from "../components/workspace/WorkspaceSkeleton";
import { WorkspaceEmpty } from "../components/workspace/WorkspaceEmpty";
import { WorkItemRow } from "../components/workspace/WorkItemRow";
import { CollaborationInbox } from "../components/workspace/CollaborationInbox";
import { WorkspaceInvitePanel } from "../components/workspace/WorkspaceInvitePanel";
import { WorkspaceMembersPanel } from "../components/workspace/WorkspaceMembersPanel";
import { WorkspaceDetail } from "../components/workspace/WorkspaceDetail";
import { ConfirmModal, type ConfirmConfig } from "../components/ConfirmModal";
import { initialsFromName, nameFromEmail } from "../components/workspace/utils";

type Demo = "auto" | "loading" | "empty" | "error";
type WorkspaceMode = "board" | "createTask" | "invites" | "members";

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
  const [newItemAssigneeIds, setNewItemAssigneeIds] = useState<string[]>([]);
  const [newItemDue, setNewItemDue] = useState("");
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([]);
  const [newItemPaperId, setNewItemPaperId] = useState("");
  const [newItemNote, setNewItemNote] = useState("");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [inviteEmail, setInviteEmail] = useState(USE_SAMPLE_FALLBACK ? RESEARCHERS[0]?.email ?? "" : "");
  const [inviteTopic, setInviteTopic] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteNotice, setInviteNotice] = useState("");
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({ isOpen: false, title: "", message: "", onConfirm: () => {}, onCancel: () => {} });
  const showConfirm = (title: string, message: string, onConfirm: () => void, danger = true, confirmText = "Xóa") => {
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
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("board");
  const [isRenamingWorkspace, setIsRenamingWorkspace] = useState(false);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState<Demo>("auto");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    workspaceApi
      .workspaces()
      .then(async (nextWorkspaces) => {
        // Fetch invites and researchers even if the user has no workspaces
        const [nextInvites, nextResearchers] = await Promise.all([
          workspaceApi.invites().catch(() => []),
          workspaceApi.researchers().catch(() => []),
        ]);

        if (!nextWorkspaces.length) {
          if (!alive) return;
          setWorkspaces([]);
          setMembers([]);
          setItems([]);
          setInvites(nextInvites);
          setResearchers(nextResearchers);
          setRemoteActivities([]);
          setActiveWorkspaceId("");
          setSelectedId("");
          return;
        }
        
        const [memberGroups, itemGroups, activityGroups] = await Promise.all([
          Promise.all(nextWorkspaces.map((workspace) => workspaceApi.workspaceMembers(workspace.id).catch(() => []))),
          Promise.all(nextWorkspaces.map((workspace) => workspaceApi.items(workspace.id).catch(() => []))),
          Promise.all(nextWorkspaces.map((workspace) => workspaceApi.activities(workspace.id).catch(() => []))),
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

  useEffect(() => {
    let alive = true;
    libraryApi
      .papers()
      .then((entries) => {
        if (alive) setLibraryEntries(entries);
      })
      .catch(() => {
        if (alive) setLibraryEntries([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const libraryPapers = useMemo(
    () => libraryEntries.map((entry) => ({ id: entry.paperId, title: entry.paper.title })),
    [libraryEntries],
  );
  // Papers in the active workspace that are already linked to a task (1 paper = 1 task / workspace).
  const usedPaperIds = useMemo(
    () => new Set(items.filter((item) => item.workspaceId === activeWorkspaceId).map((item) => item.paperId)),
    [items, activeWorkspaceId],
  );
  const availablePapers = useMemo(
    () => libraryPapers.filter((paper) => !usedPaperIds.has(paper.id)),
    [libraryPapers, usedPaperIds],
  );
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const workspaceMembers = members.filter((m) => m.workspaceId === activeWorkspaceId);
  const currentUser = getCurrentUser();
  const currentMember = workspaceMembers.find((member) => member.id === currentUser?.id);
  const currentRole = currentMember?.role ?? "viewer";
  const canEditWorkspace = currentRole === "owner" || currentRole === "editor";
  const canManageMembers = currentRole === "owner";

  const entries = useMemo(
    () => makeWorkspaceEntries(items.filter(i => i.workspaceId === activeWorkspaceId), workspaceMembers, libraryEntries),
    [items, activeWorkspaceId, workspaceMembers, libraryEntries],
  );

  // Keep the "new task" paper selection pointing at a paper that is still free.
  useEffect(() => {
    setNewItemPaperId((current) =>
      availablePapers.some((paper) => paper.id === current) ? current : (availablePapers[0]?.id ?? ""),
    );
  }, [availablePapers]);
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
    setWorkspaceNotice("");
    try {
      const workspace = await workspaceApi.createWorkspace({
        name,
        description: "Workspace nhóm do bạn tạo",
        owner_name: currentUser?.full_name ?? "Người dùng",
        owner_initials: initialsFromName(currentUser?.full_name ?? "Người dùng"),
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

  const saveWorkspaceName = async () => {
    if (!activeWorkspace) return;
    const name = editingWorkspaceName.trim();
    setIsRenamingWorkspace(false);
    if (name === activeWorkspace.name) return;
    setWorkspaceNotice("");
    const previous = workspaces;
    setWorkspaces((current) => current.map((w) => (w.id === activeWorkspace.id ? { ...w, name } : w)));
    try {
      const updated = await workspaceApi.updateWorkspace(activeWorkspace.id, { name });
      setWorkspaces((current) => current.map((w) => (w.id === activeWorkspace.id ? updated : w)));
      setWorkspaceNotice("Đã đổi tên workspace.");
    } catch (err) {
      setWorkspaces(previous);
      setWorkspaceNotice(err instanceof Error ? err.message : "Không đổi được tên workspace.");
    }
  };

  const removeWorkspace = async (id: string) => {
    const workspace = workspaces.find((w) => w.id === id);
    if (!workspace) return;
    
    showConfirm(
      "Xóa workspace",
      `Xóa workspace "${workspace.name}"? Toàn bộ task và bình luận bên trong sẽ bị xóa.`,
      async () => {
        setWorkspaceNotice("");
        const previous = workspaces;
        const remaining = workspaces.filter((w) => w.id !== id);
        setWorkspaces(remaining);
        if (activeWorkspaceId === id) {
          const nextActive = remaining[0]?.id ?? "";
          setActiveWorkspaceId(nextActive);
          setSelectedId(items.find((item) => item.workspaceId === nextActive)?.id ?? "");
        }
        try {
          await workspaceApi.deleteWorkspace(id);
          setWorkspaceNotice("Đã xóa workspace.");
        } catch (err) {
          setWorkspaces(previous);
          setWorkspaceNotice(err instanceof Error ? err.message : "Không xóa được workspace.");
        }
      }
    );
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspaceId) return;
    setWorkspaceNotice("");
    const previous = members;
    setMembers((current) => current.filter((m) => m.id !== memberId));
    try {
      await workspaceApi.removeMember(activeWorkspaceId, memberId);
      setWorkspaceNotice("Đã xóa thành viên khỏi workspace.");
    } catch (err) {
      setMembers(previous);
      setWorkspaceNotice(err instanceof Error ? err.message : "Không xóa được thành viên.");
    }
  };

  const addItem = async () => {
    if (!activeWorkspace || !canEditWorkspace) {
      setWorkspaceNotice("Bạn cần quyền editor hoặc owner để tạo item.");
      return;
    }
    const title = newItemTitle.trim();
    // Validate deadline - không cho phép ngày quá khứ
    if (newItemDue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const picked = new Date(newItemDue); // input type=date trả về yyyy-mm-dd
      if (picked < today) {
        setWorkspaceNotice("Deadline không được là ngày trong quá khứ.");
        return;
      }
    }
    setWorkspaceNotice("");
    const paperId = availablePapers.some((paper) => paper.id === newItemPaperId) ? newItemPaperId : (availablePapers[0]?.id ?? "");
    if (paperId && usedPaperIds.has(paperId)) {
      setWorkspaceNotice("Bài báo này đã được gắn cho một task trong workspace.");
      return;
    }
    try {
      const item = await workspaceApi.createItem(activeWorkspace.id, {
        kind: newItemKind,
        title,
        status: newItemStatus,
        assigneeIds: newItemAssigneeIds.filter(id => workspaceMembers.some(m => m.id === id)),
        paperId,
        due: newItemDue || "Chưa đặt",
        note: newItemNote.trim() || "Chưa có mô tả. Bổ sung mục tiêu, câu hỏi hoặc kết luận đọc paper tại đây.",
      });
      setItems((current) => [item, ...current]);
      setSelectedId(item.id);
      setNewItemTitle("");
      setNewItemStatus("backlog");
      setNewItemAssigneeIds([]);
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

  const handleRespondInvite = async (inviteId: string, status: "accepted" | "declined") => {
    try {
      await workspaceApi.respondInvite(inviteId, status);
      setWorkspaceNotice(`Đã ${status === "accepted" ? "chấp nhận" : "từ chối"} lời mời.`);
      
      // Refresh workspaces and invites
      const [w, inv] = await Promise.all([
        workspaceApi.workspaces(),
        workspaceApi.invites()
      ]);
      setWorkspaces(w);
      setInvites(inv);
    } catch (err) {
      setWorkspaceNotice(err instanceof Error ? err.message : "Không thể phản hồi lời mời.");
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

    const existingInvite = invites.find(
      (invite) =>
        invite.workspaceId === activeWorkspace.id &&
        invite.inviteeEmail.toLowerCase() === email &&
        invite.status !== "declined"
    );
    if (existingInvite) {
      if (existingInvite.status === "pending") {
        setInviteNotice("Email này đã được mời và đang chờ xác nhận.");
      } else {
        setInviteNotice("Người này đã đồng ý tham gia workspace từ trước.");
      }
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
      
      {workspaceNotice && (() => {
        const isSuccess = workspaceNotice.startsWith("Đã ");
        return (
          <div className="modal-overlay" onClick={() => setWorkspaceNotice("")}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className={`modal-icon ${isSuccess ? "success" : "error"}`}>
                  {isSuccess ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  )}
                </div>
                <h3 className="modal-title">Thông báo</h3>
              </div>
              <div className="modal-body">
                {workspaceNotice}
              </div>
              <div className="modal-footer">
                <button className="btn btn--primary" onClick={() => setWorkspaceNotice("")}>Đóng</button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="workspace-layout">
        <aside className="workspace-side" aria-label="Danh sách workspace">
          {(() => {
            const incomingInvites = invites.filter(
              (inv) =>
                inv.status === "pending" &&
                (inv.researcherId === currentUser?.id ||
                  inv.inviteeEmail.toLowerCase() === currentUser?.email?.toLowerCase())
            );

            if (incomingInvites.length === 0) return null;

            return (
              <div className="incoming-invites" style={{ marginBottom: "24px" }}>
                <div className="workspace-side__head" style={{ borderBottom: "none", paddingBottom: 0 }}>
                  <span className="workspace-side__title" style={{ color: "var(--primary)" }}>
                    Lời mời đến tôi ({incomingInvites.length})
                  </span>
                </div>
                <ul style={{ margin: "12px 0 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {incomingInvites.map((invite) => {
                    return (
                      <li key={invite.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "12px" }}>
                        <p style={{ margin: "0 0 12px 0", fontSize: "13px", lineHeight: 1.4 }}>
                          Bạn nhận được lời mời tham gia workspace: <br />
                          <strong>"{invite.topic || "Nghiên cứu chung"}"</strong>
                        </p>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn btn--primary btn--sm"
                            style={{ flex: 1, justifyContent: "center" }}
                            onClick={() => handleRespondInvite(invite.id, "accepted")}
                          >
                            Chấp nhận
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            style={{ flex: 1, justifyContent: "center" }}
                            onClick={() => handleRespondInvite(invite.id, "declined")}
                          >
                            Từ chối
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}

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
                    setNewItemAssigneeIds([]);
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
            onRevoke={canManageMembers ? async (inviteId) => {
              if (!activeWorkspace) return;
              const previous = invites;
              setInvites((current) => current.filter((inv) => inv.id !== inviteId));
              try {
                await workspaceApi.deleteInvite(inviteId);
                setWorkspaceNotice("Đã thu hồi lời mời.");
              } catch (err) {
                setInvites(previous);
                setWorkspaceNotice(err instanceof Error ? err.message : "Không thu hồi được lời mời.");
              }
            } : undefined}
          />
        </aside>

        <section className="workspace-main" aria-live="polite">
          <div className="workspace-toolbar">
            <div>
              {isRenamingWorkspace ? (
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                  <input
                    autoFocus
                    value={editingWorkspaceName}
                    onChange={(e) => setEditingWorkspaceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveWorkspaceName();
                      if (e.key === "Escape") setIsRenamingWorkspace(false);
                    }}
                    onBlur={saveWorkspaceName}
                    style={{
                      fontSize: "clamp(20px, 4vw, 24px)",
                      fontWeight: 700,
                      fontFamily: "inherit",
                      padding: "2px 0",
                      margin: "0",
                      background: "transparent",
                      color: "var(--ink)",
                      border: "none",
                      borderBottom: "2px solid var(--primary)",
                      borderRadius: "0",
                      outline: "none",
                      boxShadow: "none",
                      width: "300px",
                      maxWidth: "100%",
                    }}
                  />
                </div>
              ) : (
                <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {activeWorkspace?.name ?? "Workspace"}
                  {activeWorkspace && canEditWorkspace && (
                    <button
                      className="btn btn--ghost btn--icon"
                      style={{ padding: "4px", minWidth: "auto", height: "auto" }}
                      type="button"
                      title="Đổi tên workspace"
                      onClick={() => {
                        setEditingWorkspaceName(activeWorkspace.name);
                        setIsRenamingWorkspace(true);
                      }}
                    >
                      <IconEdit width={15} height={15} />
                    </button>
                  )}
                  {activeWorkspace && canManageMembers ? (
                    <button
                      className="btn btn--ghost btn--icon"
                      style={{ padding: "4px", minWidth: "auto", height: "auto", color: "var(--danger)" }}
                      type="button"
                      title="Xóa workspace"
                      onClick={() => removeWorkspace(activeWorkspace.id)}
                    >
                      <IconTrash width={15} height={15} />
                    </button>
                  ) : activeWorkspace && currentMember ? (
                    <button
                      className="btn btn--ghost btn--icon"
                      style={{ padding: "4px", minWidth: "auto", height: "auto", color: "var(--danger)" }}
                      type="button"
                      title="Rời khỏi workspace"
                      onClick={() => {
                        showConfirm(
                          "Rời khỏi workspace",
                          "Bạn có chắc chắn muốn rời khỏi workspace này không?",
                          () => handleRemoveMember(currentMember.id),
                          true,
                          "Rời khỏi"
                        );
                      }}
                    >
                      <IconLogOut width={15} height={15} />
                    </button>
                  ) : null}
                </h2>
              )}
              <p>
                <span className="num">{formatInt(workspaceEntries.length)}</span> item
              </p>
            </div>
            <div className="workspace-toolbar__actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                className="btn btn--ghost"
                style={{ padding: "8px 12px", display: "flex", alignItems: "center" }}
                onClick={() => setWorkspaceMode("members")}
                title="Xem thành viên"
              >
                {workspaceMembers.length} thành viên
              </button>
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
              </div>
              <input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Tên task, ghi chú hoặc thảo luận…"
                aria-label="Tên item workspace mới"
              />
              <div className="workspace-add__grid">
                <div>
                  <span>Phụ trách</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px", alignItems: "center" }}>
                    {workspaceMembers
                      .filter(m => newItemAssigneeIds.includes(m.id))
                      .map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          title={`Bỏ ${member.name}`}
                          onClick={() =>
                            setNewItemAssigneeIds((prev) => prev.filter((id) => id !== member.id))
                          }
                          style={{
                            background: "var(--primary)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "16px",
                            height: "28px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "0 10px 0 4px",
                            transition: "opacity 0.15s",
                          }}
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
                          <span style={{ opacity: 0.7, marginLeft: "2px", fontSize: "10px" }}>✕</span>
                        </button>
                      ))}
                    
                    {workspaceMembers.length > newItemAssigneeIds.length && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setNewItemAssigneeIds(prev => [...prev, e.target.value]);
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
                        {workspaceMembers
                          .filter(m => !newItemAssigneeIds.includes(m.id))
                          .map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                      </select>
                    )}
                    {workspaceMembers.length === 0 && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Chưa có thành viên</span>}
                  </div>
                </div>
                <label>
                  <span>Deadline</span>
                  <input
                    type="date"
                    value={newItemDue}
                    onChange={(e) => setNewItemDue(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    aria-label="Deadline task mới"
                  />
                </label>
                <label className="workspace-add__paper">
                  <span>Bài báo liên kết</span>
                  <select
                    value={newItemPaperId}
                    onChange={(e) => setNewItemPaperId(e.target.value)}
                    disabled={availablePapers.length === 0}
                  >
                    {availablePapers.length === 0 ? (
                      <option value="">
                        {libraryPapers.length === 0
                          ? "Thư viện của bạn chưa có bài báo"
                          : "Mọi bài trong thư viện đã được gắn task"}
                      </option>
                    ) : (
                      availablePapers.map((paper) => (
                        <option key={paper.id} value={paper.id}>
                          {paper.title}
                        </option>
                      ))
                    )}
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
              inviteEmail={inviteEmail}
              inviteTopic={inviteTopic}
              inviteMessage={inviteMessage}
              inviteNotice={inviteNotice}
              onInviteEmail={setInviteEmail}
              onInviteTopic={setInviteTopic}
              onInviteMessage={setInviteMessage}
              onSendInvite={sendInvite}
              onClose={() => setWorkspaceMode("board")}
            />
          )}

          {workspaceMode === "members" && (
            <WorkspaceMembersPanel
              members={workspaceMembers}
              canManageMembers={canManageMembers}
              currentUserId={currentUser?.id ?? ""}
              onRemoveMember={handleRemoveMember}
              onUpdateRole={async (memberId, role) => {
                if (!activeWorkspaceId) return;
                try {
                  const nextMembers = await workspaceApi.updateMember(activeWorkspaceId, memberId, role);
                  setMembers((current) => [...current.filter((m) => m.workspaceId !== activeWorkspaceId), ...nextMembers]);
                  setWorkspaceNotice("Cập nhật vai trò thành công.");
                } catch (err) {
                  setWorkspaceNotice(err instanceof Error ? err.message : "Không cập nhật được vai trò.");
                }
              }}
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
          {view === "empty" && <WorkspaceEmpty onReset={() => {
            const input = document.getElementById("workspace-new");
            if (input) input.focus();
          }} />}
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
          {view === "ready" && workspaceMode === "board" && selected ? (
            <WorkspaceDetail
              item={selected}
              members={workspaceMembers}
              papers={libraryPapers}
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


      
      <ConfirmModal config={confirmConfig} />
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
