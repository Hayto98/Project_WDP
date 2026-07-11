import type { PaperResult } from "../data/searchSample";
import type { AiInsight, AxisOption, DashboardData, GapCell, TrendPoint, TrendSeries } from "../data/types";
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
  ResearcherProfile,
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

type ApiRequestInit = RequestInit & { _isRetry?: boolean };

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

export function storeCurrentUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function refreshAuthTokens() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });
  const payload = (await res.json()) as ApiEnvelope<AuthResult>;
  if (!res.ok || !payload.success) return null;
  storeAuth(payload.data);
  return payload.data.accessToken;
}

function redirectToLogin() {
  clearAuth();
  if (window.location.hash !== "#login") window.location.hash = "login";
}

async function request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const payload = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !payload.success) {
    if (res.status === 401 && !init._isRetry && path !== "/auth/refresh" && path !== "/auth/login") {
      const nextToken = await refreshAuthTokens().catch(() => null);
      if (nextToken) {
        return request<T>(path, { ...init, _isRetry: true });
      }
      redirectToLogin();
    }
    throw new Error(payload.error?.message ?? `API request failed: ${res.status}`);
  }
  return payload.data;
}

async function requestWithMeta<T>(path: string, init: ApiRequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const payload = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !payload.success) {
    if (res.status === 401 && !init._isRetry) {
      const nextToken = await refreshAuthTokens().catch(() => null);
      if (nextToken) {
        return requestWithMeta<T>(path, { ...init, _isRetry: true });
      }
      redirectToLogin();
    }
    throw new Error(payload.error?.message ?? `API request failed: ${res.status}`);
  }
  return { data: payload.data, meta: payload.meta };
}

function asId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toString" in value) return String(value);
  return "";
}

function asObjectId(value: unknown) {
  const id = asId(value);
  return /^[a-f\d]{24}$/i.test(id) ? id : undefined;
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

function denormalizeFollowType(type: FollowType) {
  return type === "field" ? "Field" : type === "author" ? "Author" : "Keyword";
}

function mapAdminJob(job: any): AdminJob {
  return {
    id: asId(job._id),
    name: job.name,
    source: job.source_name,
    status: job.status,
    progress: Number(job.progress ?? 0),
    records: Number(job.records_processed ?? 0),
    startedAt: formatWhen(job.started_at ?? job.created_at),
    duration: job.duration_seconds ? `${Math.round(job.duration_seconds / 60)} phút` : "—",
    owner: typeof job.owner === "string" ? job.owner : job.owner?.full_name ?? "Scheduler",
    query: job.query ?? "",
    maxRecords: Number(job.max_records ?? 25),
    imported: Number(job.result?.imported ?? job.records_processed ?? 0),
    skipped: Number(job.result?.skipped ?? 0),
    sourceTotal: Number(job.result?.source_total ?? 0),
    errorMessage: job.error_message ?? "",
  };
}

function mapDataSource(source: any): DataSource {
  return {
    id: asId(source._id),
    name: source.name,
    status: source.enabled ? (source.last_sync_status === "failed" || source.last_sync_status === "Failed" ? "degraded" : "active") : "paused",
    coverage: source.coverage ?? "0%",
    lastSync: formatWhen(source.last_sync_at),
    latency: source.latency ?? "—",
    errorRate: source.error_rate ?? "0%",
    enabled: Boolean(source.enabled),
    errorMessage: source.last_error ?? "",
  };
}

function mapFollowSubject(subject: any): FollowSubject {
  return {
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
  };
}

function mapFollowAlert(alert: any): FollowAlert {
  return {
    id: asId(alert._id),
    subjectId: alert.follow_id ?? "all",
    paperId: asId(alert.related_paper_ids?.[0] ?? alert.papers?.[0]?._id),
    when: formatWhen(alert.created_at),
    unread: !alert.is_read,
    priority: alert.priority === "normal" ? "medium" : alert.priority ?? "low",
    reason: alert.content ?? alert.title ?? "Paper mới khớp mục theo dõi",
  };
}

function mapWorkspace(workspace: any): Workspace {
  return {
    id: asId(workspace._id),
    name: workspace.name,
    description: workspace.description ?? "",
    active: Boolean(workspace.active),
  };
}

function mapWorkspaceItem(item: any, workspaceId: string): WorkspaceItem {
  return {
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
  };
}

function mapInvite(invite: any): CollaborationInvite {
  return {
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
  };
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
  async me() {
    return request<AuthUser>("/auth/me");
  },
  async logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } finally {
      clearAuth();
    }
  },
  async changePassword(currentPassword: string, newPassword: string) {
    return request<{ message: string }>("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

export const userApi = {
  async updateProfile(patch: { full_name?: string; email?: string }) {
    const user = await request<AuthUser>("/users/me", {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    storeCurrentUser(user);
    return user;
  },
  updateDashboardLayout(widgets: string[]) {
    return request<{ widgets: string[] }>("/users/me/dashboard-layout", {
      method: "PUT",
      body: JSON.stringify({ widgets }),
    });
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
  async getById(id: string) {
    return mapPaper(await request<any>(`/papers/${id}`));
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
    let ai = data.ai ?? { summary: "", directions: [], evidence: [] };
    try {
      ai = await aiApi.insights();
    } catch {
      // Keep cached report AI if the live LLM endpoint is unavailable.
    }
    return {
      updatedAt: data.updatedAt ? new Date(data.updatedAt).toLocaleString("vi-VN") : "",
      kpis: data.kpis ?? [],
      trendSeries: normalizeTrendSeries(data.trendSeries),
      trend: data.trend ?? [],
      gapFields: normalizeAxisOptions(data.gapFields),
      gapAspects: normalizeAxisOptions(data.gapAspects),
      gaps: normalizeGapCells(data.gaps),
      trending: data.trending ?? [],
      ai,
      followed: data.followed ?? [],
      notifications: data.notifications ?? [],
    };
  },
};

function normalizeAxisOptions(values: unknown): AxisOption[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value, index) => {
      if (typeof value === "string") return { key: value, label: value };
      if (!value || typeof value !== "object") return null;
      const raw = value as Record<string, unknown>;
      const label = stringValue(raw.label ?? raw.name ?? raw.value ?? raw.key);
      if (!label) return null;
      return {
        key: stringValue(raw.key ?? raw.id ?? label) || `axis-${index}`,
        label,
        token: stringValue(raw.token) || undefined,
      };
    })
    .filter((value): value is AxisOption => Boolean(value));
}

function normalizeTrendSeries(values: unknown): TrendSeries[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value, index) => {
      if (!value || typeof value !== "object") return null;
      const raw = value as Record<string, unknown>;
      const key = stringValue(raw.key ?? raw.id ?? raw.label);
      const label = stringValue(raw.label ?? raw.name ?? raw.key);
      if (!key || !label) return null;
      return {
        key,
        label,
        token: stringValue(raw.token) || `--c${(index % 6) + 1}`,
      };
    })
    .filter((value): value is TrendSeries => Boolean(value));
}

function normalizeGapCells(values: unknown): GapCell[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => {
      if (!value || typeof value !== "object") return null;
      const raw = value as Record<string, unknown>;
      const field = axisLabel(raw.field);
      const aspect = axisLabel(raw.aspect);
      if (!field || !aspect) return null;
      const density = clamp01(numberValue(raw.density ?? raw.d));
      const papers = Math.max(0, Math.round(numberValue(raw.papers ?? raw.p)));
      return {
        field,
        aspect,
        density,
        papers,
        gap: Boolean(raw.gap),
      };
    })
    .filter((value): value is GapCell => Boolean(value));
}

function axisLabel(value: unknown) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const raw = value as Record<string, unknown>;
  return stringValue(raw.label ?? raw.name ?? raw.value ?? raw.key);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function numberValue(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export const aiApi = {
  summarize(payload: {
    title?: string;
    abstract?: string;
    year?: number;
    source?: string;
    keywords?: string[];
  }) {
    return request<{ summary: string; provider?: string; model?: string }>("/ai/summarize", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  explainTerm(payload: { term: string; context?: string }) {
    return request<{ term: string; explanation: string; provider?: string; model?: string }>("/ai/explain-term", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  suggestDirections(payload: { field?: string; gaps?: GapItem[] }) {
    return request<{ directions: AiInsight["directions"]; provider?: string; model?: string }>("/ai/suggest-directions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async relatedPapers(payload: { paperId?: string; title?: string; keywords?: string[]; fields?: string[]; limit?: number }): Promise<PaperResult[]> {
    const data = await request<{ related: any[]; provider?: string }>("/ai/related-papers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return (data.related ?? []).map(mapPaper);
  },
  async insights(): Promise<AiInsight> {
    const data = await request<AiInsight & { provider?: string; model?: string }>("/ai/insights");
    return {
      summary: data.summary ?? "",
      directions: data.directions ?? [],
      evidence: data.evidence ?? [],
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
    const data = await request<{ fields?: unknown[]; aspects?: unknown[]; gaps?: any[] }>(
      `/analytics/gaps?densityThreshold=${threshold}`,
    );
    if (!data.gaps?.length) return [];
    const fieldDefs = normalizeAxisOptions(data.fields);
    const normalizedFields = fieldDefs.length
      ? fieldDefs.map((field, index) => ({
          ...field,
          token: field.token ?? GAP_FIELDS[index % GAP_FIELDS.length]?.token ?? "--c1",
        }))
      : GAP_FIELDS;
    const normalizedAspects = normalizeAxisOptions(data.aspects);
    return data.gaps.map((gap, index) => {
      const fallbackField = normalizedFields[index % Math.max(normalizedFields.length, 1)]?.label ?? "Other";
      const fieldLabel = axisLabel(gap.field ?? gap.fieldLabel) || fallbackField;
      const fieldDef = normalizedFields.find((item) => item.label === fieldLabel || item.key === fieldLabel)
        ?? normalizedFields[index % normalizedFields.length]
        ?? { key: "other", label: "Other", token: "--c1" };
      const aspect = axisLabel(gap.aspect)
        || normalizedAspects[index % Math.max(normalizedAspects.length, 1)]?.label
        || GAP_ASPECTS[0];
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
    return rows.map(mapAdminJob);
  },
  async runJob(id: string): Promise<AdminJob> {
    const job = await request<any>(`/admin/jobs/${id}/run`, { method: "POST" });
    return mapAdminJob(job);
  },
  async createJob(payload: { name: string; source_name: string; source_id?: string; query: string; max_records?: number }): Promise<AdminJob> {
    const job = await request<any>("/admin/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapAdminJob(job);
  },
  async updateUser(id: string, patch: { status?: "Active" | "Inactive" | "Banned"; roles?: string[] }): Promise<AdminUser> {
    const user = await request<any>(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    return {
      id: asId(user._id),
      name: user.full_name ?? user.email,
      email: user.email,
      role: user.roles?.includes("Admin") ? "Admin" : "Student",
      status: user.status === "Banned" ? "locked" : user.status === "Inactive" ? "pending" : "active",
      lastActive: formatWhen(user.updated_at ?? user.created_at),
      savedPapers: user.saved_papers_count ?? 0,
    };
  },
  async dataSources(): Promise<DataSource[]> {
    const rows = await request<any[]>("/admin/data-sources");
    return rows.map(mapDataSource);
  },
  async updateDataSource(id: string, patch: { enabled?: boolean; sync_schedule?: string; api_endpoint?: string }): Promise<DataSource> {
    const source = await request<any>(`/admin/data-sources/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    return mapDataSource(source);
  },
  async checkDataSources() {
    await request("/admin/data-sources/check", { method: "POST" });
    return adminApi.dataSources();
  },
  refreshReports() {
    return request<{ generatedAt: string; reports: { id: string; type: string; generated_at: string }[] }>("/admin/reports/refresh", {
      method: "POST",
    });
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
  createCollection(collectionName: string, description = "") {
    return request<any>("/library/collections", {
      method: "POST",
      body: JSON.stringify({ collection_name: collectionName, description }),
    });
  },
  updateCollection(id: string, patch: { collection_name?: string; description?: string }) {
    return request<any>(`/library/collections/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  },
  deleteCollection(id: string) {
    return request(`/library/collections/${id}`, { method: "DELETE" });
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
  savePaper(paperId: string, collectionIds: string[], note = "") {
    return request("/library/papers", {
      method: "POST",
      body: JSON.stringify({ paper_id: paperId, collection_ids: collectionIds, note }),
    });
  },
  updateSavedPaper(collectionId: string, paperId: string, patch: { status?: string; note?: string }) {
    return request(`/library/papers/${collectionId}/${paperId}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  },
  removePaper(collectionId: string, paperId: string) {
    return request(`/library/papers/${collectionId}/${paperId}`, { method: "DELETE" });
  },
};

export const searchApi = {
  getSavedSearches() {
    return request<any[]>("/searches");
  },
  createSavedSearch(name: string, criteria: Record<string, unknown>) {
    return request("/searches", {
      method: "POST",
      body: JSON.stringify({ name, criteria }),
    });
  },
  deleteSavedSearch(id: string) {
    return request(`/searches/${id}`, { method: "DELETE" });
  },
};

export const followApi = {
  async subjects(): Promise<FollowSubject[]> {
    const rows = await request<any[]>("/follow/subjects");
    return rows.map(mapFollowSubject);
  },
  async alerts(): Promise<FollowAlert[]> {
    const rows = await request<any[]>("/follow/alerts");
    return rows.map(mapFollowAlert);
  },
  async addSubject(payload: { type: FollowType; value: string; rule?: Partial<FollowSubject["rule"]> }): Promise<FollowSubject> {
    const subject = await request<any>("/follow/subjects", {
      method: "POST",
      body: JSON.stringify({
        type: denormalizeFollowType(payload.type),
        value: payload.value,
        rule: payload.rule ? {
          frequency: payload.rule.frequency,
          threshold: payload.rule.threshold,
          email: payload.rule.email,
          in_app: payload.rule.inApp,
          exclude: payload.rule.exclude,
        } : undefined,
      }),
    });
    return mapFollowSubject(subject);
  },
  async updateSubject(id: string, patch: { active?: boolean; rule?: Partial<FollowSubject["rule"]> }): Promise<FollowSubject> {
    const subject = await request<any>(`/follow/subjects/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        active: patch.active,
        rule: patch.rule ? {
          frequency: patch.rule.frequency,
          threshold: patch.rule.threshold,
          email: patch.rule.email,
          in_app: patch.rule.inApp,
          exclude: patch.rule.exclude,
        } : undefined,
      }),
    });
    return mapFollowSubject(subject);
  },
  removeSubject(id: string) {
    return request(`/follow/subjects/${id}`, { method: "DELETE" });
  },
  markAlertRead(id: string) {
    return request(`/follow/alerts/${id}/read`, { method: "PUT" });
  },
  markAllAlertsRead() {
    return request("/follow/alerts/read-all", { method: "PUT" });
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
  async unreadCount(): Promise<number> {
    const data = await request<{ count?: number; unreadCount?: number }>("/notifications/unread-count");
    return Number(data.count ?? data.unreadCount ?? 0);
  },
};

export const workspaceApi = {
  async workspaces(): Promise<Workspace[]> {
    const rows = await request<any[]>("/workspaces");
    return rows.map(mapWorkspace);
  },
  async createWorkspace(payload: { name: string; description?: string; owner_name?: string; owner_initials?: string; active?: boolean }): Promise<Workspace> {
    return mapWorkspace(await request<any>("/workspaces", {
      method: "POST",
      body: JSON.stringify(payload),
    }));
  },
  async updateWorkspace(id: string, patch: { name?: string; description?: string; active?: boolean }): Promise<Workspace> {
    return mapWorkspace(await request<any>(`/workspaces/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }));
  },
  deleteWorkspace(id: string) {
    return request(`/workspaces/${id}`, { method: "DELETE" });
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
    return rows.map((item) => mapWorkspaceItem(item, workspaceId));
  },
  async addMember(workspaceId: string, payload: { user_id: string; name: string; initials: string; role?: "editor" | "viewer" }): Promise<WorkspaceMember[]> {
    const members = await request<any[]>(`/workspaces/${workspaceId}/members`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return members.map((member: any) => ({
      id: asId(member.user_id),
      workspaceId,
      name: member.name,
      initials: member.initials ?? initialsFromName(member.name),
      role: member.role ?? "viewer",
    }));
  },
  async updateMember(workspaceId: string, memberId: string, role: "editor" | "viewer"): Promise<WorkspaceMember[]> {
    const members = await request<any[]>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    return members.map((member: any) => ({
      id: asId(member.user_id),
      workspaceId,
      name: member.name,
      initials: member.initials ?? initialsFromName(member.name),
      role: member.role ?? "viewer",
    }));
  },
  removeMember(workspaceId: string, memberId: string) {
    return request(`/workspaces/${workspaceId}/members/${memberId}`, { method: "DELETE" });
  },
  async createItem(workspaceId: string, payload: Partial<WorkspaceItem> & { title: string; kind: WorkspaceItem["kind"] }): Promise<WorkspaceItem> {
    const item = await request<any>(`/workspaces/${workspaceId}/items`, {
      method: "POST",
      body: JSON.stringify({
        kind: payload.kind,
        title: payload.title,
        status: payload.status,
        assignee_id: asObjectId(payload.assigneeId),
        paper_id: asObjectId(payload.paperId),
        due: payload.due,
        note: payload.note,
      }),
    });
    return mapWorkspaceItem(item, workspaceId);
  },
  async updateItem(workspaceId: string, itemId: string, patch: Partial<WorkspaceItem>): Promise<WorkspaceItem> {
    const item = await request<any>(`/workspaces/${workspaceId}/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({
        kind: patch.kind,
        title: patch.title,
        status: patch.status,
        assignee_id: asObjectId(patch.assigneeId),
        paper_id: asObjectId(patch.paperId),
        due: patch.due,
        note: patch.note,
      }),
    });
    return mapWorkspaceItem(item, workspaceId);
  },
  deleteItem(workspaceId: string, itemId: string) {
    return request(`/workspaces/${workspaceId}/items/${itemId}`, { method: "DELETE" });
  },
  addComment(workspaceId: string, itemId: string, payload: { content: string; author_name?: string }) {
    return request<{ content: string; author_name?: string; created_at?: string }>(`/workspaces/${workspaceId}/items/${itemId}/comments`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
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
    return rows.map(mapInvite);
  },
  async researchers(q?: string): Promise<ResearcherProfile[]> {
    const rows = await request<any[]>(`/collaboration/researchers${toSearchParams({ q })}`);
    return rows.map((researcher) => ({
      id: asId(researcher.id ?? researcher._id),
      name: researcher.name,
      initials: researcher.initials ?? initialsFromName(researcher.name),
      email: researcher.email,
      field: researcher.field ?? "Research",
      affiliation: researcher.affiliation ?? "",
      match: Number(researcher.match ?? 0),
    }));
  },
  async createInvite(payload: {
    workspaceId: string;
    inviteeEmail: string;
    inviteeName?: string;
    researcherId?: string;
    topic: string;
    message?: string;
    direction?: "incoming" | "outgoing";
  }): Promise<CollaborationInvite> {
    return mapInvite(await request<any>("/collaboration/invites", {
      method: "POST",
      body: JSON.stringify({
        workspace_id: payload.workspaceId,
        invitee_email: payload.inviteeEmail,
        invitee_name: payload.inviteeName,
        invitee_user_id: asObjectId(payload.researcherId),
        direction: payload.direction ?? "outgoing",
        topic: payload.topic,
        message: payload.message ?? "",
      }),
    }));
  },
  async respondInvite(id: string, status: "accepted" | "declined"): Promise<CollaborationInvite> {
    return mapInvite(await request<any>(`/collaboration/invites/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }));
  },
};

export const feedbackApi = {
  create(content: string) {
    return request("/feedbacks", {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
  async list(query: { status?: string; page?: number; limit?: number } = {}) {
    return requestWithMeta<any[]>(`/feedbacks${toSearchParams(query)}`);
  },
  update(id: string, patch: { status?: "Pending" | "Reviewed" | "Resolved"; admin_note?: string | null }) {
    return request(`/feedbacks/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  },
};

export const fallback = {
  mapPaper,
};
