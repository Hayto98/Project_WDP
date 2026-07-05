import { PAPERS, type PaperResult } from "./searchSample";

export type MemberRole = "owner" | "editor" | "viewer";
export type WorkStatus = "backlog" | "doing" | "done";
export type WorkKind = "task" | "note" | "discussion";
export type InviteStatus = "pending" | "accepted" | "declined";

export interface Workspace {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  name: string;
  initials: string;
  role: MemberRole;
}

export interface ResearcherProfile {
  id: string;
  name: string;
  initials: string;
  email: string;
  field: string;
  affiliation: string;
  match: number;
}

export interface CollaborationInvite {
  id: string;
  workspaceId: string;
  researcherId?: string;
  inviteeEmail: string;
  inviteeName?: string;
  direction: "incoming" | "outgoing";
  topic: string;
  message: string;
  status: InviteStatus;
  sentAt: string;
}

export interface WorkspaceItem {
  id: string;
  workspaceId: string;
  kind: WorkKind;
  title: string;
  status: WorkStatus;
  assigneeId: string;
  paperId: string;
  due: string;
  comments: string[];
  note: string;
}

export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  actor: string;
  action: string;
  when: string;
}

export interface WorkspaceItemEntry extends WorkspaceItem {
  paper: PaperResult;
  assignee?: WorkspaceMember;
}

export const WORKSPACES: Workspace[] = [
  {
    id: "ws-ai-lab",
    name: "AI Lab",
    description: "Nhóm đọc bài và định hướng đề tài AI ứng dụng",
    active: true,
  },
  {
    id: "ws-thesis",
    name: "Luận văn 2026",
    description: "Workspace chuẩn bị proposal và survey nền",
    active: true,
  },
  {
    id: "ws-fl",
    name: "FL Reading Group",
    description: "Nhóm học liên kết, bảo mật và dữ liệu phân tán",
    active: true,
  },
];

export const MEMBERS: WorkspaceMember[] = [
  { id: "m-minh", workspaceId: "ws-ai-lab", name: "Minh Thành", initials: "MT", role: "owner" },
  { id: "m-lan", workspaceId: "ws-ai-lab", name: "Lan Anh", initials: "LA", role: "editor" },
  { id: "m-khoa", workspaceId: "ws-ai-lab", name: "Khoa Nguyễn", initials: "KN", role: "viewer" },
  { id: "m-minh-t", workspaceId: "ws-thesis", name: "Minh Thành", initials: "MT", role: "owner" },
  { id: "m-thao", workspaceId: "ws-thesis", name: "Thảo Phạm", initials: "TP", role: "editor" },
  { id: "m-huy", workspaceId: "ws-thesis", name: "Huy Trần", initials: "HT", role: "viewer" },
  { id: "m-minh-f", workspaceId: "ws-fl", name: "Minh Thành", initials: "MT", role: "editor" },
  { id: "m-quang", workspaceId: "ws-fl", name: "Quang Lê", initials: "QL", role: "owner" },
  { id: "m-chi", workspaceId: "ws-fl", name: "Chi Đỗ", initials: "CD", role: "editor" },
];

export const RESEARCHERS: ResearcherProfile[] = [
  {
    id: "r-ngoc",
    name: "Ngọc Vũ",
    initials: "NV",
    email: "ngoc.vu@hust.edu.vn",
    field: "Graph neural networks",
    affiliation: "ĐH Bách khoa Hà Nội",
    match: 92,
  },
  {
    id: "r-binh",
    name: "Bình Lâm",
    initials: "BL",
    email: "binh.lam@uit.edu.vn",
    field: "Federated learning",
    affiliation: "UIT",
    match: 88,
  },
  {
    id: "r-mai",
    name: "Mai Hoàng",
    initials: "MH",
    email: "mai.hoang@phenikaa-uni.edu.vn",
    field: "Biomedical RAG",
    affiliation: "Phenikaa University",
    match: 84,
  },
  {
    id: "r-son",
    name: "Sơn Trịnh",
    initials: "ST",
    email: "son.trinh@vnu.edu.vn",
    field: "Science mapping",
    affiliation: "VNU-HCM",
    match: 79,
  },
];

export const COLLAB_INVITES: CollaborationInvite[] = [
  {
    id: "ci-1",
    workspaceId: "ws-ai-lab",
    researcherId: "r-mai",
    inviteeEmail: "mai.hoang@phenikaa-uni.edu.vn",
    inviteeName: "Mai Hoàng",
    direction: "incoming",
    topic: "Đồng nghiên cứu RAG y sinh tiếng Việt",
    message: "Mai muốn cùng đọc nhóm paper clinical RAG và xây survey gap cho dữ liệu tiếng Việt.",
    status: "pending",
    sentAt: "15 phút trước",
  },
  {
    id: "ci-2",
    workspaceId: "ws-fl",
    researcherId: "r-binh",
    inviteeEmail: "binh.lam@uit.edu.vn",
    inviteeName: "Bình Lâm",
    direction: "incoming",
    topic: "So sánh bảo mật trong federated learning",
    message: "Bình đề xuất cùng viết ghi chú so sánh secure aggregation và differential privacy.",
    status: "pending",
    sentAt: "1 giờ trước",
  },
  {
    id: "ci-3",
    workspaceId: "ws-thesis",
    researcherId: "r-ngoc",
    inviteeEmail: "ngoc.vu@hust.edu.vn",
    inviteeName: "Ngọc Vũ",
    direction: "outgoing",
    topic: "Benchmark GNN cho vật liệu tinh thể",
    message: "Mời Ngọc review bảng benchmark và gợi ý paper nền.",
    status: "pending",
    sentAt: "hôm qua",
  },
  {
    id: "ci-4",
    workspaceId: "ws-ai-lab",
    inviteeEmail: "linh.tran@hcmut.edu.vn",
    inviteeName: "Linh Trần",
    direction: "outgoing",
    topic: "Survey nhanh về agentic RAG cho luận văn",
    message: "Mình đang tổng hợp paper nền về agentic RAG và muốn mời bạn cùng đọc, ghi chú, rồi chốt hướng nghiên cứu trong workspace này.",
    status: "pending",
    sentAt: "30 phút trước",
  },
];

export const WORK_ITEMS: WorkspaceItem[] = [
  {
    id: "wi-1",
    workspaceId: "ws-ai-lab",
    kind: "task",
    title: "Tóm tắt scaling laws cho MoE multilingual reasoning",
    status: "doing",
    assigneeId: "m-lan",
    paperId: "s1",
    due: "08/07",
    comments: ["Ưu tiên biểu đồ routing entropy.", "Cần thêm so sánh với dense model."],
    note: "Dùng cho phần bối cảnh mô hình ngôn ngữ lớn đa ngôn ngữ.",
  },
  {
    id: "wi-2",
    workspaceId: "ws-ai-lab",
    kind: "discussion",
    title: "Có nên đưa RAG y sinh vào hướng demo?",
    status: "backlog",
    assigneeId: "m-minh",
    paperId: "s6",
    due: "10/07",
    comments: ["K. Adebayo paper có metric hallucination tốt.", "Cần kiểm tra dữ liệu tiếng Việt."],
    note: "Thảo luận phạm vi demo, tránh mở quá rộng sang clinical NLP.",
  },
  {
    id: "wi-3",
    workspaceId: "ws-thesis",
    kind: "note",
    title: "Ghi chú benchmark GNN cho chương related work",
    status: "done",
    assigneeId: "m-thao",
    paperId: "s3",
    due: "05/07",
    comments: ["Đã trích bảng benchmark.", "Cần format citation sau."],
    note: "Benchmark 1.2M crystalline structures, phù hợp đoạn so sánh model đồ thị.",
  },
  {
    id: "wi-4",
    workspaceId: "ws-thesis",
    kind: "task",
    title: "Viết đoạn Research Gap: FL + Y sinh",
    status: "doing",
    assigneeId: "m-minh-t",
    paperId: "s12",
    due: "12/07",
    comments: ["Liên kết với concept drift.", "Đừng dùng quá nhiều thuật ngữ chưa giải thích."],
    note: "Tập trung vào thay đổi phân phối dữ liệu theo thời gian.",
  },
  {
    id: "wi-5",
    workspaceId: "ws-fl",
    kind: "task",
    title: "So sánh secure aggregation và differential privacy",
    status: "doing",
    assigneeId: "m-chi",
    paperId: "s7",
    due: "09/07",
    comments: ["Cần một bảng ưu/nhược điểm.", "Quang sẽ review phần MPC."],
    note: "Nền cho buổi reading group tuần này.",
  },
  {
    id: "wi-6",
    workspaceId: "ws-fl",
    kind: "note",
    title: "Communication-efficient FL trên edge devices",
    status: "backlog",
    assigneeId: "m-quang",
    paperId: "s2",
    due: "14/07",
    comments: ["Đọc phần gradient sketching trước."],
    note: "Liên quan trực tiếp đến triển khai thiết bị không đồng nhất.",
  },
];

export const ACTIVITIES: WorkspaceActivity[] = [
  { id: "a1", workspaceId: "ws-ai-lab", actor: "Lan Anh", action: "cập nhật task MoE multilingual", when: "12 phút trước" },
  { id: "a2", workspaceId: "ws-ai-lab", actor: "Minh Thành", action: "gắn paper RAG clinical notes", when: "1 giờ trước" },
  { id: "a3", workspaceId: "ws-thesis", actor: "Thảo Phạm", action: "hoàn tất ghi chú benchmark GNN", when: "hôm nay" },
  { id: "a4", workspaceId: "ws-fl", actor: "Chi Đỗ", action: "thêm bình luận về secure aggregation", when: "hôm qua" },
];

export function makeWorkspaceEntries(
  items: WorkspaceItem[] = WORK_ITEMS,
  members: WorkspaceMember[] = MEMBERS,
): WorkspaceItemEntry[] {
  return items.flatMap((item) => {
    const paper = PAPERS.find((p) => p.id === item.paperId);
    if (!paper) return [];
    return [
      {
        ...item,
        paper,
        assignee: members.find((m) => m.id === item.assigneeId),
      },
    ];
  });
}
