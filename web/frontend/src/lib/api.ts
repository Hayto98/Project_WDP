import type { PaperResult } from "../data/searchSample";
import type { DashboardData, TrendPoint, TrendSeries } from "../data/types";
import {
  TREND_TOPICS,
  type CoocEdge,
  type CoocNode,
  type Granularity,
  type GrowthRow,
  type TrendRange,
} from "../data/trendsSample";
import {
  GAP_ASPECTS,
  GAP_FIELDS,
  type GapItem,
} from "../data/gapSample";
import type { AdminJob, AdminUser, DataSource } from "../data/adminSample";
import type { AuditLog, PaperReadLog } from "../data/adminSample";
import type { LibraryCollection, LibraryEntry } from "../data/librarySample";
import type { FollowAlert, FollowSubject, FollowType } from "../data/followSample";
import type { NotificationItem } from "../data/notificationSample";
import type {
  CollaborationInvite,
  Workspace,
  WorkspaceActivity,
  WorkspaceItem,
  WorkspaceMember,
} from "../data/workspaceSample";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001/api/v1";
const TOKEN_KEY = "wdp_access_token";
const REFRESH_TOKEN_KEY = "wdp_refresh_token";
const USER_KEY = "wdp_user";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface ApiRequestInit extends RequestInit {
  _isRetry?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  status: string;
}

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeAuth(result: AuthResult) {
  localStorage.setItem(TOKEN_KEY, result.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(result.user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function refreshAuth() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    const payload = (await res.json()) as ApiEnvelope<AuthResult>;
    if (!res.ok || !payload.success) return false;
    storeAuth(payload.data);
    return true;
  } catch {
    return false;
  }
}

function redirectToLogin() {
  clearAuth();
  if (window.location.hash !== "#login") window.location.hash = "login";
}

async function request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { _isRetry, ...fetchInit } = init;
  const token = getAccessToken();
  const headers = new Headers(fetchInit.headers);
  headers.set("Accept", "application/json");
  if (fetchInit.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchInit,
    headers,
    cache: "no-store",
  });
  const payload = (await res.json()) as ApiEnvelope<T>;
  if (res.status === 401 && !_isRetry && path !== "/auth/refresh") {
    const refreshed = await refreshAuth();
    if (refreshed) return request<T>(path, { ...fetchInit, _isRetry: true });
    redirectToLogin();
  }
  if (!res.ok || !payload.success) {
    throw new Error(payload.error?.message ?? `API request failed: ${res.status}`);
  }
  return payload.data;
}

async function requestWithMeta<T>(path: string, init: ApiRequestInit = {}) {
  const { _isRetry, ...fetchInit } = init;
  const token = getAccessToken();
  const headers = new Headers(fetchInit.headers);
  headers.set("Accept", "application/json");
  if (fetchInit.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchInit,
    headers,
    cache: "no-store",
  });
  const payload = (await res.json()) as ApiEnvelope<T>;
  if (res.status === 401 && !_isRetry && path !== "/auth/refresh") {
    const refreshed = await refreshAuth();
    if (refreshed) return requestWithMeta<T>(path, { ...fetchInit, _isRetry: true });
    redirectToLogin();
  }
  if (!res.ok || !payload.success) {
    throw new Error(payload.error?.message ?? `API request failed: ${res.status}`);
  }
  return { data: payload.data, meta: payload.meta };
}

function asId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toString" in value) return String(value);
  return "";
}

function mapPaper(raw: any): PaperResult {
  return {
    id: asId(raw._id ?? raw.id ?? raw.paper_id),
    title: raw.title ?? raw.title_snapshot ?? "Untitled paper",
    authors: Array.isArray(raw.authors)
      ? raw.authors.map((author: any) => (typeof author === "string" ? author : author.name)).filter(Boolean)
      : [],
    year: Number(raw.publication_year ?? raw.year ?? new Date().getFullYear()),
    source: raw.source_name ?? raw.source ?? "Unknown",
    type: raw.type ?? "Preprint",
    fields: raw.research_fields ?? raw.fields ?? [],
    keywords: raw.keywords ?? [],
    abstract: raw.abstract ?? "",
    citations: Number(raw.citation_count ?? raw.citations ?? 0),
    doi: raw.doi ?? "",
    url: raw.original_url ?? raw.url ?? "#",
  };
}

function formatWhen(value: unknown) {
  if (!value) return "vừa xong";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("vi-VN");
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeFollowType(value: unknown): FollowType {
  const type = String(value ?? "keyword").toLowerCase();
  if (type === "field" || type === "author") return type;
  return "keyword";
}

function toSearchParams(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const authApi = {
  async login(email: string, password: string) {
    const result = await request<AuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    storeAuth(result);
    return result;
  },
  async register(fullName: string, email: string, password: string) {
    const result = await request<AuthResult>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ full_name: fullName, email, password }),
    });
    storeAuth(result);
    return result;
  },
  async logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {
      // Local logout should still complete if the server token is already invalid.
    } finally {
      clearAuth();
    }
  },
};

export const paperApi = {
  async search(params: {
    q?: string;
    scope?: string;
    andTerms?: string;
    orTerms?: string;
    notTerms?: string;
    fields?: string;
    sources?: string;
    type?: string;
    types?: string;
    yearFrom?: number;
    yearTo?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }, init: RequestInit = {}) {
    const { data, meta } = await requestWithMeta<any[]>(
      `/papers/search${toSearchParams(params)}`,
      init,
    );
    return { papers: data.map(mapPaper), meta };
  },
  async trending(limit = 10) {
    const rows = await request<any[]>(`/papers/trending?limit=${limit}`);
    return rows.map((row) => ({
      id: asId(row.paper_id ?? row.id),
      title: row.title ?? "Untitled paper",
      authors: Array.isArray(row.authors)
        ? row.authors.map((author: any) => (typeof author === "string" ? author : author.name)).join(", ")
        : "",
      year: Number(row.year ?? new Date().getFullYear()),
      source: row.source ?? "Unknown",
      field: row.field ?? "Other",
      views30d: Number(row.views ?? row.views30d ?? 0),
      url: row.url ?? "#",
    }));
  },
  recordView(id: string) {
    return request(`/papers/${id}?source=Search_Result`);
  },
  requestSync(query: string, sourceName = "OpenAlex", maxRecords = 25, filters: {
    yearFrom?: number;
    yearTo?: number;
    types?: string;
  } = {}) {
    return request<{
      records_processed?: number;
      result?: { imported?: number; skipped?: number; source_total?: number };
    }>("/papers/sync-request", {
      method: "POST",
      body: JSON.stringify({ query, sourceName, maxRecords, ...filters }),
    });
  },
};

export const dashboardApi = {
  async overview(): Promise<DashboardData> {
    const data = await request<any>("/dashboard/overview");
    return {
      updatedAt: data.updatedAt ? new Date(data.updatedAt).toLocaleString("vi-VN") : "",
      kpis: data.kpis ?? [],
      trendSeries: data.trendSeries ?? [],
      trend: data.trend ?? [],
      gapFields: data.gapFields ?? [],
      gapAspects: data.gapAspects ?? [],
      gaps: data.gaps ?? [],
      trending: data.trending ?? [],
      ai: data.ai ?? { summary: "", directions: [], evidence: [] },
      followed: data.followed ?? [],
      notifications: data.notifications ?? [],
    };
  },
};

function withTrendTokens(series: TrendSeries[]) {
  const tokens = ["--c1", "--c2", "--c3", "--c4", "--c5", "--c6"];
  return series.map((item, index) => ({
    ...item,
    token: item.token ?? tokens[index % tokens.length],
  }));
}

export const analyticsApi = {
  async trends(range: TrendRange, granularity: Granularity) {
    const points = await request<TrendPoint[]>(
      `/analytics/trends${toSearchParams({ range, granularity })}`,
    );
    return points;
  },
  async growth(range: TrendRange, granularity: Granularity): Promise<GrowthRow[]> {
    const rows = await request<any[]>(
      `/analytics/trends/growth${toSearchParams({ range, granularity })}`,
    );
    return rows.map((row, index) => ({
      key: row.key ?? String(row.label ?? index),
      label: row.label ?? row.key ?? "Unknown",
      token: TREND_TOPICS[index % TREND_TOPICS.length]?.token ?? "--c1",
      latest: Number(row.latest ?? 0),
      cagr: Number(row.cagr ?? 0),
      trend: row.trend ?? [],
      status: row.status ?? "stable",
    }));
  },
  async cooccurrence(): Promise<{ nodes: CoocNode[]; edges: CoocEdge[] }> {
    const data = await request<{ nodes?: CoocNode[]; edges?: CoocEdge[] }>("/analytics/trends/cooccurrence");
    return {
      nodes: data.nodes ?? [],
      edges: data.edges ?? [],
    };
  },
  async gaps(threshold: number): Promise<GapItem[]> {
    const data = await request<{ fields?: string[]; aspects?: string[]; gaps?: any[] }>(
      `/analytics/gaps?densityThreshold=${threshold}`,
    );
    if (!data.gaps?.length) return [];
    const fieldDefs = data.fields?.length
      ? data.fields.map((label, index) => ({
          key: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          label,
          token: GAP_FIELDS[index % GAP_FIELDS.length]?.token ?? "--c1",
        }))
      : GAP_FIELDS;
    return data.gaps.map((gap, index) => {
      const fieldLabel = gap.field ?? gap.fieldLabel ?? fieldDefs[index % fieldDefs.length]?.label ?? "Other";
      const fieldDef = fieldDefs.find((item) => item.label === fieldLabel) ?? fieldDefs[index % fieldDefs.length];
      const aspect = gap.aspect ?? data.aspects?.[index % (data.aspects.length || 1)] ?? GAP_ASPECTS[0];
      const density = Number(gap.density ?? 0);
      const interest = Number(gap.interest ?? 0.65);
      return {
        id: gap.id ?? `${fieldDef.key}-${aspect}`,
        fieldKey: fieldDef.key,
        fieldLabel,
        token: fieldDef.token,
        aspect,
        fi: index,
        ai: index,
        density,
        interest,
        papers: Number(gap.papers ?? 0),
        score: Number(gap.score ?? interest * (1 - density)),
        keywords: gap.keywords ?? [],
        direction: gap.direction ?? "Khoảng trống này cần thêm dữ liệu phân tích từ corpus.",
        trend: gap.trend ?? [],
      };
    });
  },
  seriesFromPoints(points: TrendPoint[]) {
    const keys = Object.keys(points[0] ?? {}).filter((key) => key !== "period");
    return withTrendTokens(
      keys.map((key) => ({
        key,
        label: key,
        token: "",
      })),
    );
  },
};

export const adminApi = {
  async stats(): Promise<{ totalPapers: number; totalUsers: number; activeJobs: number; dataSources: number }> {
    return request("/admin/stats");
  },
  async users(): Promise<AdminUser[]> {
    const { data } = await requestWithMeta<any[]>("/admin/users?limit=100");
    return data.map((user) => ({
      id: asId(user._id),
      name: user.full_name ?? user.email,
      email: user.email,
      role: user.roles?.includes("Admin") ? "Admin" : "Student",
      status: user.status === "Banned" ? "locked" : user.status === "Inactive" ? "pending" : "active",
      lastActive: formatWhen(user.updated_at ?? user.created_at),
      savedPapers: user.saved_papers_count ?? 0,
    }));
  },
  async jobs(): Promise<AdminJob[]> {
    const rows = await request<any[]>("/admin/jobs");
    return rows.map((job) => ({
      id: asId(job._id),
      name: job.name,
      source: job.source_name,
      status: job.status,
      progress: Number(job.progress ?? 0),
      records: Number(job.records_processed ?? 0),
      startedAt: formatWhen(job.started_at ?? job.created_at),
      duration: job.duration_seconds ? `${Math.round(job.duration_seconds / 60)} phút` : "—",
      owner: job.owner ?? "Scheduler",
      query: job.query ?? "",
      maxRecords: Number(job.max_records ?? 25),
      imported: Number(job.result?.imported ?? job.records_processed ?? 0),
      skipped: Number(job.result?.skipped ?? 0),
      sourceTotal: Number(job.result?.source_total ?? 0),
      errorMessage: job.error_message ?? "",
    }));
  },
  async runJob(id: string): Promise<AdminJob> {
    const job = await request<any>(`/admin/jobs/${id}/run`, { method: "POST" });
    return {
      id: asId(job._id),
      name: job.name,
      source: job.source_name,
      status: job.status,
      progress: Number(job.progress ?? 0),
      records: Number(job.records_processed ?? 0),
      startedAt: formatWhen(job.started_at ?? job.created_at),
      duration: job.duration_seconds ? `${Math.round(job.duration_seconds / 60)} phút` : "—",
      owner: job.owner ?? "Scheduler",
      query: job.query ?? "",
      maxRecords: Number(job.max_records ?? 25),
      imported: Number(job.result?.imported ?? job.records_processed ?? 0),
      skipped: Number(job.result?.skipped ?? 0),
      sourceTotal: Number(job.result?.source_total ?? 0),
      errorMessage: job.error_message ?? "",
    };
  },
  async dataSources(): Promise<DataSource[]> {
    const rows = await request<any[]>("/admin/data-sources");
    return rows.map((source) => ({
      id: asId(source._id),
      name: source.name,
      status: source.enabled ? (source.last_sync_status === "Failed" ? "degraded" : "active") : "paused",
      coverage: source.coverage ?? "0%",
      lastSync: formatWhen(source.last_sync_at),
      latency: source.latency ?? "—",
      errorRate: source.error_rate ?? "0%",
      enabled: Boolean(source.enabled),
      errorMessage: source.last_error ?? "",
    }));
  },
  async checkDataSources() {
    await request("/admin/data-sources/check", { method: "POST" });
    return adminApi.dataSources();
  },
  async auditLogs(): Promise<AuditLog[]> {
    const { data } = await requestWithMeta<any[]>("/admin/audit-logs?limit=100");
    return data.map((log) => ({
      id: asId(log._id),
      actor: log.details?.actor ?? log.meta?.action_type ?? "System",
      action: log.details?.action ?? log.meta?.action_type ?? "System event",
      target: log.details?.target ?? log.meta?.source_name ?? "System",
      severity: log.details?.severity ?? "info",
      time: formatWhen(log.timestamp),
      ip: log.details?.ip ?? "system",
    }));
  },
  async paperReads(): Promise<PaperReadLog[]> {
    const { data } = await requestWithMeta<any[]>("/admin/paper-reads?limit=100");
    return data.map((view) => {
      const paper = view.paper_id ?? {};
      const user = view.user_id ?? {};
      return {
        id: asId(view._id),
        userName: user.full_name ?? "Unknown user",
        userEmail: user.email ?? "",
        paperId: asId(paper._id ?? view.paper_id),
        paperTitle: paper.title ?? "Unknown paper",
        topic: paper.research_fields?.[0] ?? "Other",
        source: paper.source_name ?? view.source ?? "Unknown",
        viewedAt: formatWhen(view.viewed_at),
        durationMinutes: Number(view.duration_minutes ?? 0),
        sessionWindow: view.session_window || "N/A",
        device: view.device ?? "web",
        persistStatus: view.persist_status ?? "stored",
        reason: view.reason ?? "",
      };
    });
  },
};

export const libraryApi = {
  async collections(): Promise<LibraryCollection[]> {
    const rows = await request<any[]>("/library/collections");
    return rows.map((collection) => ({
      id: asId(collection._id),
      name: collection.collection_name,
      description: collection.description ?? "",
    }));
  },
  async papers(): Promise<LibraryEntry[]> {
    const { data } = await requestWithMeta<any[]>("/library/papers?limit=100");
    return data.map((item) => {
      const paper = mapPaper(item.paper ?? item);
      return {
        id: `${asId(item.collection_id)}-${asId(item.paper_id)}`,
        paperId: paper.id,
        savedAt: String(item.saved_at ?? ""),
        status: item.status ?? "unread",
        collectionIds: [asId(item.collection_id)],
        note: item.note ?? "",
        paper,
      };
    });
  },
};

export const followApi = {
  async subjects(): Promise<FollowSubject[]> {
    const rows = await request<any[]>("/follow/subjects");
    return rows.map((subject) => ({
      id: subject.follow_id,
      label: subject.value,
      type: normalizeFollowType(subject.type),
      active: Boolean(subject.active),
      newPapers: Number(subject.newPapers ?? 0),
      papers7d: Number(subject.papers7d ?? 0),
      rule: {
        frequency: subject.rule?.frequency ?? "daily",
        threshold: subject.rule?.threshold ?? "all",
        email: Boolean(subject.rule?.email),
        inApp: subject.rule?.in_app ?? subject.rule?.inApp ?? true,
        exclude: subject.rule?.exclude ?? [],
      },
    }));
  },
  async alerts(): Promise<FollowAlert[]> {
    const rows = await request<any[]>("/follow/alerts");
    return rows.map((alert) => ({
      id: asId(alert._id),
      subjectId: alert.follow_id ?? "all",
      paperId: asId(alert.related_paper_ids?.[0] ?? alert.papers?.[0]?._id),
      when: formatWhen(alert.created_at),
      unread: !alert.is_read,
      priority: alert.priority === "normal" ? "medium" : alert.priority ?? "low",
      reason: alert.content ?? alert.title ?? "Paper mới khớp mục theo dõi",
    }));
  },
};

export const notificationApi = {
  async list(): Promise<NotificationItem[]> {
    const { data } = await requestWithMeta<any[]>("/notifications?limit=100");
    return data.map((item) => ({
      id: asId(item._id),
      kind: item.notification_type ?? "system",
      title: item.title,
      body: item.content ?? "",
      source: item.source ?? "Hệ thống",
      actor: item.actor ?? "Research Corpus",
      time: formatWhen(item.created_at),
      unread: !item.is_read,
      priority: item.priority ?? "normal",
      targetLabel: item.target_label || "Mở",
      targetHref: item.target_href || "#overview",
      meta: item.meta ?? [],
    }));
  },
  markRead(id: string) {
    return request(`/notifications/${id}/read`, { method: "PUT" });
  },
  markAllRead() {
    return request("/notifications/read-all", { method: "PUT" });
  },
};

export const workspaceApi = {
  async workspaces(): Promise<Workspace[]> {
    const rows = await request<any[]>("/workspaces");
    return rows.map((workspace) => ({
      id: asId(workspace._id),
      name: workspace.name,
      description: workspace.description ?? "",
      active: Boolean(workspace.active),
    }));
  },
  async workspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const workspace = await request<any>(`/workspaces/${workspaceId}`);
    return (workspace.members ?? []).map((member: any) => ({
      id: asId(member.user_id),
      workspaceId,
      name: member.name,
      initials: member.initials ?? initialsFromName(member.name),
      role: member.role ?? "viewer",
    }));
  },
  async items(workspaceId: string): Promise<WorkspaceItem[]> {
    const rows = await request<any[]>(`/workspaces/${workspaceId}/items`);
    return rows.map((item) => ({
      id: asId(item._id),
      workspaceId,
      kind: item.kind,
      title: item.title,
      status: item.status,
      assigneeId: asId(item.assignee_id),
      paperId: asId(item.paper_id),
      due: item.due || "Chưa đặt",
      comments: (item.comments ?? []).map((comment: any) => comment.content ?? String(comment)),
      note: item.note ?? "",
    }));
  },
  async activities(workspaceId: string): Promise<WorkspaceActivity[]> {
    const rows = await request<any[]>(`/workspaces/${workspaceId}/activities`);
    return rows.map((activity) => ({
      id: asId(activity.id ?? activity._id),
      workspaceId,
      actor: activity.actor ?? "Workspace",
      action: activity.action,
      when: formatWhen(activity.when ?? activity.updated_at),
    }));
  },
  async invites(): Promise<CollaborationInvite[]> {
    const rows = await request<any[]>("/collaboration/invites");
    return rows.map((invite) => ({
      id: asId(invite._id),
      workspaceId: asId(invite.workspace_id),
      researcherId: asId(invite.invitee_user_id),
      inviteeEmail: invite.invitee_email ?? "",
      inviteeName: invite.invitee_name,
      direction: invite.direction ?? "outgoing",
      topic: invite.topic ?? "Nghiên cứu chung",
      message: invite.message ?? "",
      status: invite.status ?? "pending",
      sentAt: formatWhen(invite.sent_at ?? invite.created_at),
    }));
  },
};

export const fallback = {
  mapPaper,
};
