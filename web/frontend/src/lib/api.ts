import type { PaperResult } from "../data/searchSample";
import type { AiInsight, AxisOption, DashboardData, GapCell, TrendPoint, TrendSeries } from "../data/types";
import type {
  CoocEdge,
  CoocNode,
  Granularity,
  GrowthRow,
  TrendRange,
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

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001/api/v1";
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

export function formatWhen(value: unknown) {
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
  // paper_id may be populated by backend (object) or just an ID string
  const rawPaper = item.paper_id && typeof item.paper_id === "object" ? item.paper_id : null;
  // Support both new assignee_ids[] and legacy assignee_id
  const assigneeIds: string[] = item.assignee_ids?.length
    ? (item.assignee_ids as any[]).map(asId)
    : item.assignee_id ? [asId(item.assignee_id)] : [];
  return {
    id: asId(item._id),
    workspaceId,
    kind: item.kind,
    title: item.title,
    status: item.status,
    assigneeIds,
    assigneeId: assigneeIds[0] ?? "",
    paperId: rawPaper ? asId(rawPaper._id) : asId(item.paper_id),
    due: item.due || "Chưa đặt",
    comments: (item.comments ?? []).map((comment: any) => ({
      id: String(comment.comment_id || comment.id || ""),
      authorId: asId(comment.author_id || comment.authorId),
      content: typeof comment === "string" ? comment : (comment.content ?? ""),
      authorName: comment.author_name ?? comment.authorName ?? "Thành viên",
      createdAt: formatWhen(comment.created_at ?? comment.createdAt ?? null),
    })),
    note: item.note ?? "",
    // Store populated paper data so the UI can display it without a library lookup
    _populatedPaper: rawPaper ? mapPaper(rawPaper) : undefined,
  } as WorkspaceItem & { _populatedPaper?: PaperResult };
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
  async logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {
      // Local logout should still complete if the server token is already invalid.
    } finally {
      clearAuth();
    }
  },
  async me() {
    const raw = await request<any>("/auth/me");
    return { ...raw, id: asId(raw._id ?? raw.id) } as AuthUser;
  },
  async changePassword(currentPassword: string, newPassword: string) {
    return request<{ message?: string }>("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

export const userApi = {
  async updateProfile(data: { full_name: string; email: string }) {
    const raw = await request<any>("/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
    const nextUser = { ...raw, id: asId(raw._id ?? raw.id) } as AuthUser;
    storeCurrentUser(nextUser);
    return nextUser;
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
  async getById(id: string, source = "Search_Result") {
    return mapPaper(await request<any>(`/papers/${id}?source=${encodeURIComponent(source)}&track=false`));
  },
  startReadingSession(
    id: string,
    source: "Search_Result" | "Library" | "Recommendation" | "Dashboard" = "Search_Result",
    device: "desktop" | "tablet" | "mobile" = "desktop",
  ) {
    return request<{ viewId: string; startedAt: string; thresholdSeconds: number }>(
      `/papers/${id}/view-session`,
      {
        method: "POST",
        body: JSON.stringify({ source, device }),
      },
    );
  },
  updateReadingSession(
    id: string,
    viewId: string,
    durationSeconds: number,
    finalized = false,
    keepalive = false,
  ) {
    return request<{
      viewId: string;
      durationSeconds: number;
      durationMinutes: number;
      finalized: boolean;
      persistStatus: "stored" | "queued" | "skipped";
    }>(`/papers/${id}/view-session/${viewId}`, {
      method: "PATCH",
      body: JSON.stringify({ durationSeconds, finalized }),
      keepalive,
    });
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
    .map((value, index): AxisOption | null => {
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
    token: item.token || tokens[index % tokens.length],
  }));
}

export const analyticsApi = {
  async trends(range: TrendRange, granularity: Granularity): Promise<{
    points: TrendPoint[];
    series: TrendSeries[];
  }> {
    const data = await request<TrendPoint[] | { points?: TrendPoint[]; series?: { key: string; label: string; token?: string }[] }>(
      `/analytics/trends${toSearchParams({ range, granularity })}`,
    );
    if (Array.isArray(data)) {
      return {
        points: data,
        series: withTrendTokens(
          Object.keys(data[0] ?? {})
            .filter((key) => key !== "period")
            .map((key) => ({ key, label: key, token: "" })),
        ),
      };
    }
    const points = data.points ?? [];
    const series = withTrendTokens(
      (data.series ?? []).map((item) => ({
        key: item.key,
        label: item.label || item.key,
        token: item.token || "",
      })),
    );
    return {
      points,
      series: series.length
        ? series
        : withTrendTokens(
            Object.keys(points[0] ?? {})
              .filter((key) => key !== "period")
              .map((key) => ({ key, label: key, token: "" })),
          ),
    };
  },
  async growth(range: TrendRange, granularity: Granularity): Promise<GrowthRow[]> {
    const rows = await request<any[]>(
      `/analytics/trends/growth${toSearchParams({ range, granularity })}`,
    );
    const tokens = ["--c1", "--c2", "--c3", "--c4", "--c5", "--c6"];
    return rows.map((row, index) => ({
      key: row.key ?? String(row.label ?? index),
      label: row.label ?? row.key ?? "Unknown",
      token: row.token ?? tokens[index % tokens.length],
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
  async gaps(threshold = 0.35): Promise<{
    items: GapItem[];
    hasReport: boolean;
    generatedAt: string | null;
    gapCount: number;
    ai: { summary: string; directions: { topic: string; rationale: string }[]; evidence: { label: string; papers: number }[] };
  }> {
    const data = await request<{
      fields?: unknown[];
      aspects?: unknown[];
      gaps?: any[];
      hasReport?: boolean;
      generatedAt?: string | null;
      gapCount?: number;
      ai?: {
        summary?: string;
        directions?: { topic?: string; rationale?: string }[];
        evidence?: { label?: string; papers?: number }[];
      };
    }>(`/analytics/gaps?densityThreshold=${threshold}`);

    const hasReport = Boolean(data.hasReport ?? (data.gaps?.length || data.fields?.length));
    if (!data.gaps?.length) {
      return {
        items: [],
        hasReport,
        generatedAt: data.generatedAt ? String(data.generatedAt) : null,
        gapCount: Number(data.gapCount ?? 0),
        ai: {
          summary: data.ai?.summary ?? "",
          directions: (data.ai?.directions ?? []).map((row) => ({
            topic: row.topic ?? "",
            rationale: row.rationale ?? "",
          })),
          evidence: (data.ai?.evidence ?? []).map((row) => ({
            label: row.label ?? "",
            papers: Number(row.papers ?? 0),
          })),
        },
      };
    }

    const fieldDefs = normalizeAxisOptions(data.fields);
    const normalizedFields = fieldDefs.length
      ? fieldDefs.map((field, index) => ({
          ...field,
          token: field.token ?? GAP_FIELDS[index % GAP_FIELDS.length]?.token ?? "--c1",
        }))
      : GAP_FIELDS;
    const normalizedAspects = normalizeAxisOptions(data.aspects);
    const items = data.gaps.map((gap, index) => {
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
        evidence: Array.isArray(gap.evidence)
          ? gap.evidence.map((row: any) => ({
              id: String(row.id ?? ""),
              title: row.title ?? "Untitled paper",
              year: row.year ?? null,
              citations: Number(row.citations ?? 0),
            }))
          : [],
      };
    });

    return {
      items,
      hasReport,
      generatedAt: data.generatedAt ? String(data.generatedAt) : null,
      gapCount: Number(data.gapCount ?? items.length),
      ai: {
        summary: data.ai?.summary ?? "",
        directions: (data.ai?.directions ?? []).map((row) => ({
          topic: row.topic ?? "",
          rationale: row.rationale ?? "",
        })),
        evidence: (data.ai?.evidence ?? []).map((row) => ({
          label: row.label ?? "",
          papers: Number(row.papers ?? 0),
        })),
      },
    };
  },
  async liveGaps(payload: {
    topic: string;
    sources?: string[];
    yearFrom?: number;
    yearTo?: number;
    maxRecordsPerSource?: number;
    topK?: number;
  }) {
    return request<{
      topic: string;
      mode: "live";
      sources: string[];
      yearFrom: number;
      yearTo: number;
      totalFetched: number;
      generatedAt: string;
      summary: { strongGaps: number; potentialGaps: number; lowConfidence: number };
      gaps: Array<{
        id: string;
        field: string;
        aspect: string;
        gapScore: number;
        level: "strong" | "potential" | "needs_data" | "unclear";
        confidence: "low" | "medium" | "high";
        metrics: {
          directCount: number;
          countA: number;
          countB: number;
          expectedCount: number;
          recentDirectCount: number;
          oldDirectCount: number;
          growthRate: number;
          scarcityScore: number;
          growthScore: number;
          adjacencyScore: number;
          noveltyScore: number;
          evidenceScore: number;
        };
        reasons: string[];
        evidence: Array<{
          title: string;
          year?: number | null;
          source?: string;
          doi?: string;
          url?: string;
          citationCount?: number;
        }>;
      }>;
      sourceErrors?: Array<{ source: string; message: string }>;
      warnings?: string[];
      cached?: boolean;
    }>("/analytics/gaps/live", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  saveLiveGaps(result: unknown) {
    return request<{ id: string; reportType: string; generatedAt: string }>("/analytics/gaps/live/save", {
      method: "POST",
      body: JSON.stringify({ result }),
    });
  },
  async liveTrends(payload: {
    topic: string;
    sources?: string[];
    yearFrom?: number;
    yearTo?: number;
    maxRecordsPerSource?: number;
  }) {
    return request<{
      topic: string;
      mode: "live_trend";
      sources: string[];
      yearFrom: number;
      yearTo: number;
      totalFetched: number;
      generatedAt: string;
      trendPoints: TrendPoint[];
      sourceErrors?: Array<{ source: string; message: string }>;
      warnings?: string[];
      cached?: boolean;
    }>("/analytics/trends/live", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  saveLiveTrends(result: unknown) {
    return request<{ id: string; reportType: string; generatedAt: string }>("/analytics/trends/live/save", {
      method: "POST",
      body: JSON.stringify({ result }),
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
  async savedLiveTrends() {
    return request<Array<{
      id: string;
      topic: string;
      sources: string[];
      yearFrom: number;
      yearTo: number;
      generatedAt: string;
      result: any;
    }>>("/analytics/trends/live/saved");
  },
};

export const adminApi = {
  async stats(): Promise<{ totalPapers: number; totalUsers: number; activeJobs: number; dataSources: number }> {
    return request("/admin/stats");
  },
  async users(query?: { q?: string; role?: string; status?: string; active_from?: string; active_to?: string; min_saved?: number; max_saved?: number }): Promise<AdminUser[]> {
    const qs = toSearchParams({ limit: 100, ...query });
    const { data } = await requestWithMeta<any[]>(`/admin/users${qs}`);
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
  async createUser(payload: { full_name: string; email: string; password?: string; roles: string[]; status: string }): Promise<AdminUser> {
    const user = await request<any>("/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
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
        durationSeconds: Number(view.duration_seconds ?? Math.round(Number(view.duration_minutes ?? 0) * 60)),
        sessionWindow: view.session_window || "N/A",
        device: view.device ?? "web",
        persistStatus: view.persist_status ?? "stored",
        reason: view.reason ?? "",
      };
    });
  },
  broadcastNotification(payload: { title: string; content: string; priority?: "high" | "normal" | "low" }) {
    return request<{ message: string; sent: number }>("/admin/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify(payload),
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
    // A paper can live in several collections (backend stores one saved_paper
    // entry per collection). Merge those rows into a single library entry that
    // carries every collectionId, so the UI shows one row per paper with
    // multiple collection tags. Status/note are treated as paper-level and taken
    // from the most recently saved copy.
    const byPaper = new Map<string, LibraryEntry>();
    for (const item of data) {
      const paper = mapPaper(item.paper ?? item);
      const collectionId = asId(item.collection_id);
      const savedAt = String(item.saved_at ?? "");
      const key = paper.id || asId(item.paper_id) || `${collectionId}-${byPaper.size}`;
      const existing = byPaper.get(key);
      if (existing) {
        if (collectionId && !existing.collectionIds.includes(collectionId)) {
          existing.collectionIds.push(collectionId);
        }
        // Prefer the most recently saved copy for paper-level fields.
        if (savedAt > existing.savedAt) {
          existing.savedAt = savedAt;
          existing.status = item.status ?? existing.status;
          if (item.note) existing.note = item.note;
        } else if (!existing.note && item.note) {
          existing.note = item.note;
        }
      } else {
        byPaper.set(key, {
          id: key,
          paperId: paper.id,
          savedAt,
          status: item.status ?? "unread",
          collectionIds: collectionId ? [collectionId] : [],
          note: item.note ?? "",
          paper,
        });
      }
    }
    return [...byPaper.values()];
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
        assignee_ids: (payload.assigneeIds ?? (payload.assigneeId ? [payload.assigneeId] : [])).map(asObjectId).filter(Boolean),
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
        assignee_ids: patch.assigneeIds !== undefined
          ? patch.assigneeIds.map(asObjectId).filter(Boolean)
          : patch.assigneeId !== undefined
            ? [asObjectId(patch.assigneeId)].filter(Boolean)
            : undefined,
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
    return request<{ content: string; author_name?: string; created_at?: string; comment_id?: string; author_id?: string }>(`/workspaces/${workspaceId}/items/${itemId}/comments`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  editComment(workspaceId: string, itemId: string, commentId: string, content: string) {
    return request<{ content: string }>(`/workspaces/${workspaceId}/items/${itemId}/comments/${commentId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  },
  deleteComment(workspaceId: string, itemId: string, commentId: string) {
    return request(`/workspaces/${workspaceId}/items/${itemId}/comments/${commentId}`, {
      method: "DELETE",
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
  async deleteInvite(id: string): Promise<void> {
    await request(`/collaboration/invites/${id}`, {
      method: "DELETE",
    });
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
  async pendingCount() {
    const data = await request<{ count?: number }>("/feedbacks/pending-count");
    return Number(data.count ?? 0);
  },
  getById(id: string) {
    return request(`/feedbacks/${id}`);
  },
  update(id: string, patch: { status?: "Pending" | "Reviewed" | "Resolved"; admin_note?: string | null }) {
    return request(`/feedbacks/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  },
  reply(id: string, content: string, status?: "Pending" | "Reviewed" | "Resolved") {
    return request(`/feedbacks/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, ...(status ? { status } : {}) }),
    });
  },
};

export const fallback = {
  mapPaper,
};
