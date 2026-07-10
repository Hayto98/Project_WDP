import { PAPERS } from "./searchSample";

export type JobStatus = "running" | "queued" | "success" | "warning" | "failed";
export type SourceStatus = "active" | "paused" | "degraded";
export type AdminUserRole = "Admin" | "Student";
export type AdminUserStatus = "active" | "locked" | "pending";
export type AuditSeverity = "info" | "warning" | "critical";
export type ReadingPersistStatus = "stored" | "queued" | "skipped";

export interface AdminJob {
  id: string;
  name: string;
  source: string;
  status: JobStatus;
  progress: number;
  records: number;
  startedAt: string;
  duration: string;
  owner: string;
  query?: string;
  maxRecords?: number;
  imported?: number;
  skipped?: number;
  sourceTotal?: number;
  errorMessage?: string;
}

export interface DataSource {
  id: string;
  name: string;
  status: SourceStatus;
  coverage: string;
  lastSync: string;
  latency: string;
  errorRate: string;
  enabled: boolean;
  errorMessage?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  lastActive: string;
  savedPapers: number;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  severity: AuditSeverity;
  time: string;
  ip: string;
}

export interface PaperReadLog {
  id: string;
  userName: string;
  userEmail: string;
  paperId: string;
  paperTitle: string;
  topic: string;
  source: string;
  viewedAt: string;
  durationMinutes: number;
  sessionWindow: string;
  device: string;
  persistStatus: ReadingPersistStatus;
  reason: string;
}

export const ADMIN_JOBS: AdminJob[] = [
  {
    id: "job-openalex-nightly",
    name: "Nightly OpenAlex ingest",
    source: "OpenAlex",
    status: "running",
    progress: 68,
    records: 18420,
    startedAt: "23:05",
    duration: "31 phút",
    owner: "Crawler Service",
  },
  {
    id: "job-arxiv-ai",
    name: "arXiv AI refresh",
    source: "arXiv",
    status: "success",
    progress: 100,
    records: 3240,
    startedAt: "22:10",
    duration: "12 phút",
    owner: "Scheduler",
  },
  {
    id: "job-ieee-backfill",
    name: "IEEE Xplore backfill",
    source: "IEEE Xplore",
    status: "warning",
    progress: 74,
    records: 980,
    startedAt: "21:45",
    duration: "58 phút",
    owner: "Admin · Minh Thành",
  },
  {
    id: "job-semantic-enrich",
    name: "Semantic Scholar enrichment",
    source: "Semantic Scholar",
    status: "queued",
    progress: 0,
    records: 0,
    startedAt: "Đang chờ",
    duration: "—",
    owner: "ML Pipeline",
  },
];

export const DATA_SOURCES: DataSource[] = [
  {
    id: "src-openalex",
    name: "OpenAlex",
    status: "active",
    coverage: "82%",
    lastSync: "5 phút trước",
    latency: "1.4s",
    errorRate: "0.2%",
    enabled: true,
  },
  {
    id: "src-semantic",
    name: "Semantic Scholar",
    status: "active",
    coverage: "76%",
    lastSync: "18 phút trước",
    latency: "1.9s",
    errorRate: "0.4%",
    enabled: true,
  },
  {
    id: "src-crossref",
    name: "Crossref",
    status: "degraded",
    coverage: "69%",
    lastSync: "42 phút trước",
    latency: "4.8s",
    errorRate: "3.1%",
    enabled: true,
  },
  {
    id: "src-ieee",
    name: "IEEE Xplore",
    status: "paused",
    coverage: "54%",
    lastSync: "Hôm qua",
    latency: "—",
    errorRate: "—",
    enabled: false,
  },
];

export const ADMIN_USERS: AdminUser[] = [
  {
    id: "user-minh",
    name: "Minh Thành",
    email: "minh.thanh@uni.edu.vn",
    role: "Admin",
    status: "active",
    lastActive: "Vừa xong",
    savedPapers: 128,
  },
  {
    id: "user-lan",
    name: "Lan Anh",
    email: "lan.anh@uni.edu.vn",
    role: "Student",
    status: "active",
    lastActive: "12 phút trước",
    savedPapers: 74,
  },
  {
    id: "user-khoa",
    name: "Khoa Nguyễn",
    email: "khoa.nguyen@uni.edu.vn",
    role: "Student",
    status: "pending",
    lastActive: "Chưa kích hoạt",
    savedPapers: 0,
  },
  {
    id: "user-huy",
    name: "Huy Trần",
    email: "huy.tran@uni.edu.vn",
    role: "Student",
    status: "locked",
    lastActive: "3 ngày trước",
    savedPapers: 19,
  },
];

export const AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-1",
    actor: "Minh Thành",
    action: "Tạm dừng nguồn IEEE Xplore",
    target: "Data Source",
    severity: "warning",
    time: "23:12",
    ip: "10.0.0.14",
  },
  {
    id: "log-2",
    actor: "Crawler Service",
    action: "Hoàn tất batch arXiv AI refresh",
    target: "Corpus Job",
    severity: "info",
    time: "22:22",
    ip: "internal",
  },
  {
    id: "log-3",
    actor: "Lan Anh",
    action: "Tạo workspace nghiên cứu chung",
    target: "Workspace",
    severity: "info",
    time: "21:54",
    ip: "10.0.0.29",
  },
  {
    id: "log-4",
    actor: "Auth Guard",
    action: "Chặn đăng nhập sai mật khẩu nhiều lần",
    target: "User · Huy Trần",
    severity: "critical",
    time: "20:18",
    ip: "118.70.12.4",
  },
];

export const PAPER_READ_LOGS: PaperReadLog[] = [
  {
    id: "read-1",
    userName: "Lan Anh",
    userEmail: "lan.anh@uni.edu.vn",
    paperId: PAPERS[0]?.id ?? "paper-1",
    paperTitle: PAPERS[0]?.title ?? "Retrieval-Augmented Generation for Biomedical QA",
    topic: "Biomedical RAG",
    source: PAPERS[0]?.source ?? "arXiv",
    viewedAt: "23:42",
    durationMinutes: 18,
    sessionWindow: "23:30-00:00",
    device: "Chrome · Windows",
    persistStatus: "stored",
    reason: "Đọc paper >= 2 phút, hợp lệ để thống kê mức quan tâm.",
  },
  {
    id: "read-5",
    userName: "Minh Thành",
    userEmail: "minh.thanh@uni.edu.vn",
    paperId: PAPERS[0]?.id ?? "paper-1",
    paperTitle: PAPERS[0]?.title ?? "Retrieval-Augmented Generation for Biomedical QA",
    topic: "Biomedical RAG",
    source: PAPERS[0]?.source ?? "arXiv",
    viewedAt: "23:40",
    durationMinutes: 11,
    sessionWindow: "23:30-00:00",
    device: "Chrome · Windows",
    persistStatus: "stored",
    reason: "Paper đã lưu trong database, cộng vào thống kê top lượt đọc.",
  },
  {
    id: "read-6",
    userName: "Thảo Phạm",
    userEmail: "thao.pham@uni.edu.vn",
    paperId: PAPERS[0]?.id ?? "paper-1",
    paperTitle: PAPERS[0]?.title ?? "Retrieval-Augmented Generation for Biomedical QA",
    topic: "Biomedical RAG",
    source: PAPERS[0]?.source ?? "arXiv",
    viewedAt: "23:33",
    durationMinutes: 7,
    sessionWindow: "23:30-00:00",
    device: "Firefox · macOS",
    persistStatus: "stored",
    reason: "Đủ ngưỡng đọc, ghi vào paper_read_stats_30m.",
  },
  {
    id: "read-2",
    userName: "Khoa Nguyễn",
    userEmail: "khoa.nguyen@uni.edu.vn",
    paperId: PAPERS[1]?.id ?? "paper-2",
    paperTitle: PAPERS[1]?.title ?? "Graph Neural Networks for Scientific Discovery",
    topic: "Graph Neural Networks",
    source: PAPERS[1]?.source ?? "Semantic Scholar",
    viewedAt: "23:36",
    durationMinutes: 9,
    sessionWindow: "23:30-00:00",
    device: "Edge · Windows",
    persistStatus: "stored",
    reason: "Ghi vào collection paper_view_events để tính top paper trong 30 phút.",
  },
  {
    id: "read-7",
    userName: "Lan Anh",
    userEmail: "lan.anh@uni.edu.vn",
    paperId: PAPERS[1]?.id ?? "paper-2",
    paperTitle: PAPERS[1]?.title ?? "Graph Neural Networks for Scientific Discovery",
    topic: "Graph Neural Networks",
    source: PAPERS[1]?.source ?? "Semantic Scholar",
    viewedAt: "23:31",
    durationMinutes: 6,
    sessionWindow: "23:30-00:00",
    device: "Chrome · Windows",
    persistStatus: "stored",
    reason: "Paper đã có trong database, cập nhật bộ đếm lượt đọc.",
  },
  {
    id: "read-3",
    userName: "Minh Thành",
    userEmail: "minh.thanh@uni.edu.vn",
    paperId: PAPERS[2]?.id ?? "paper-3",
    paperTitle: PAPERS[2]?.title ?? "Federated Learning Survey",
    topic: "Federated Learning",
    source: PAPERS[2]?.source ?? "OpenAlex",
    viewedAt: "23:25",
    durationMinutes: 4,
    sessionWindow: "23:00-23:30",
    device: "Chrome · Windows",
    persistStatus: "queued",
    reason: "Đã nhận event, đang chờ batch flush vào database thống kê.",
  },
  {
    id: "read-4",
    userName: "Huy Trần",
    userEmail: "huy.tran@uni.edu.vn",
    paperId: PAPERS[3]?.id ?? "paper-4",
    paperTitle: PAPERS[3]?.title ?? "AI Safety Evaluation",
    topic: "AI Safety",
    source: PAPERS[3]?.source ?? "Crossref",
    viewedAt: "23:18",
    durationMinutes: 1,
    sessionWindow: "23:00-23:30",
    device: "Safari · iPad",
    persistStatus: "skipped",
    reason: "Thời lượng dưới ngưỡng 2 phút, không dùng cho thống kê quan tâm.",
  },
];
