export type TimeRange = "12m" | "24m" | "5y";

export type WidgetStatus = "ready" | "loading" | "error" | "empty";

export interface Kpi {
  id: string;
  label: string;
  value: number;
  /** formatted delta vs previous period, e.g. "+4.812" */
  delta?: number;
  deltaKind?: "up" | "down" | "neutral";
  hint: string;
  format: "int" | "percent";
}

export interface TrendPoint {
  period: string; // "2016" ... "2025"
  [field: string]: string | number;
}

export interface TrendSeries {
  key: string;
  label: string;
  token: string; // css custom-property name, e.g. "--c1"
}

export interface AxisOption {
  key: string;
  label: string;
  token?: string;
}

export interface GapCell {
  field: string;
  aspect: string;
  density: number; // publication density 0..1 (normalized)
  interest?: number; // recent publications + citation signal 0..1
  score?: number; // interest * (1 - density)
  papers: number;
  gap: boolean; // high potential, low density
}

export interface TrendingPaper {
  id: string;
  title: string;
  authors: string;
  year: number;
  source: string;
  field: string;
  views30d: number;
  url: string;
}

export interface AiInsight {
  summary: string;
  directions: { topic: string; rationale: string }[];
  evidence: { label: string; papers: number }[];
}

export interface FollowedSubject {
  id: string;
  label: string;
  type: "keyword" | "field";
  newPapers: number;
}

export interface NotificationItem {
  id: string;
  subject: string;
  paperTitle: string;
  when: string;
  unread: boolean;
}

export interface DashboardData {
  updatedAt: string;
  kpis: Kpi[];
  trendSeries: TrendSeries[];
  trend: TrendPoint[];
  gapFields: AxisOption[];
  gapAspects: AxisOption[];
  gaps: GapCell[];
  trending: TrendingPaper[];
  ai: AiInsight;
  followed: FollowedSubject[];
  notifications: NotificationItem[];
}
