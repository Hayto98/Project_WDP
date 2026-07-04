import type { TrendPoint, TrendSeries } from "./types";

export const TREND_TOPICS: TrendSeries[] = [
  { key: "llm", label: "Large Language Models", token: "--c1" },
  { key: "cv", label: "Computer Vision", token: "--c2" },
  { key: "fl", label: "Federated Learning", token: "--c3" },
  { key: "gnn", label: "Graph Neural Networks", token: "--c4" },
  { key: "quantum", label: "Quantum Machine Learning", token: "--c5" },
  { key: "edge", label: "Edge & TinyML", token: "--c6" },
];

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

/** Yearly publication counts per topic (illustrative, hand-shaped for realistic curves). */
const YEARLY: Record<string, number[]> = {
  llm: [140, 210, 320, 560, 1180, 2600, 4100],
  cv: [820, 910, 980, 1040, 1080, 1050, 1010], // matured, slight recent decline
  fl: [90, 150, 230, 340, 470, 620, 780],
  gnn: [160, 240, 350, 470, 590, 700, 810],
  quantum: [40, 60, 95, 140, 200, 275, 360],
  edge: [70, 120, 190, 280, 380, 500, 640],
};

const Q_FACTORS = [0.82, 0.94, 1.06, 1.18];

/** deterministic ±jitter so quarterly lines look organic but stable across renders */
function jitter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = (h >>> 0) / 4294967295; // 0..1
  return 0.94 + n * 0.12; // 0.94..1.06
}

export const YEARLY_POINTS: TrendPoint[] = YEARS.map((y, i) => {
  const row: TrendPoint = { period: String(y) };
  for (const t of TREND_TOPICS) row[t.key] = YEARLY[t.key][i];
  return row;
});

export const QUARTERLY_POINTS: TrendPoint[] = YEARS.flatMap((y, yi) =>
  Q_FACTORS.map((f, qi) => {
    const row: TrendPoint = { period: `${String(y).slice(2)}Q${qi + 1}` };
    for (const t of TREND_TOPICS) {
      const base = YEARLY[t.key][yi] / 4;
      row[t.key] = Math.round(base * f * jitter(`${t.key}${y}${qi}`));
    }
    return row;
  }),
);

export type Granularity = "year" | "quarter";
export type TrendRange = "12m" | "24m" | "5y";

export function slicePoints(range: TrendRange, granularity: Granularity): TrendPoint[] {
  if (granularity === "quarter") {
    const n = range === "12m" ? 4 : range === "24m" ? 8 : 20;
    return QUARTERLY_POINTS.slice(-n);
  }
  const n = range === "12m" ? 2 : range === "24m" ? 3 : 6;
  return YEARLY_POINTS.slice(-n);
}

export interface GrowthRow {
  key: string;
  label: string;
  token: string;
  latest: number;
  cagr: number; // fractional, e.g. 0.42 = +42%
  trend: number[]; // sparkline values over window
  status: "emerging" | "stable" | "declining";
}

export function computeGrowth(points: TrendPoint[]): GrowthRow[] {
  const years = Math.max(1, points.length - 1);
  return TREND_TOPICS.map((t) => {
    const vals = points.map((p) => Number(p[t.key]));
    const first = Math.max(1, vals[0]);
    const last = vals[vals.length - 1];
    const cagr = Math.pow(last / first, 1 / years) - 1;
    const status: GrowthRow["status"] =
      cagr >= 0.18 ? "emerging" : cagr <= -0.03 ? "declining" : "stable";
    return { key: t.key, label: t.label, token: t.token, latest: last, cagr, trend: vals, status };
  }).sort((a, b) => b.cagr - a.cagr);
}

/* -------------------------------------------------------------------------
   Keyword co-occurrence graph
   ------------------------------------------------------------------------- */

export interface CoocNode {
  id: string;
  label: string;
  topic: string; // topic key → color token
  freq: number; // 1..100 relative frequency (node size)
}

export interface CoocEdge {
  a: string;
  b: string;
  weight: number; // 1..5 co-occurrence strength
}

export const COOC_NODES: CoocNode[] = [
  { id: "transformers", label: "transformers", topic: "llm", freq: 96 },
  { id: "instruction-tuning", label: "instruction tuning", topic: "llm", freq: 58 },
  { id: "rag", label: "retrieval-augmented", topic: "llm", freq: 64 },
  { id: "vit", label: "vision transformer", topic: "cv", freq: 72 },
  { id: "segmentation", label: "segmentation", topic: "cv", freq: 49 },
  { id: "secure-agg", label: "secure aggregation", topic: "fl", freq: 41 },
  { id: "dp", label: "differential privacy", topic: "fl", freq: 55 },
  { id: "message-passing", label: "message passing", topic: "gnn", freq: 52 },
  { id: "equivariance", label: "equivariance", topic: "gnn", freq: 44 },
  { id: "vqc", label: "variational circuits", topic: "quantum", freq: 33 },
  { id: "quantization", label: "quantization", topic: "edge", freq: 60 },
  { id: "on-device", label: "on-device", topic: "edge", freq: 57 },
];

export const COOC_EDGES: CoocEdge[] = [
  { a: "transformers", b: "instruction-tuning", weight: 5 },
  { a: "transformers", b: "rag", weight: 4 },
  { a: "transformers", b: "vit", weight: 3 },
  { a: "transformers", b: "message-passing", weight: 2 },
  { a: "rag", b: "dp", weight: 2 },
  { a: "instruction-tuning", b: "on-device", weight: 2 },
  { a: "vit", b: "segmentation", weight: 4 },
  { a: "vit", b: "quantization", weight: 3 },
  { a: "quantization", b: "on-device", weight: 5 },
  { a: "secure-agg", b: "dp", weight: 5 },
  { a: "dp", b: "on-device", weight: 2 },
  { a: "message-passing", b: "equivariance", weight: 4 },
  { a: "vqc", b: "equivariance", weight: 2 },
  { a: "vqc", b: "dp", weight: 2 },
  { a: "segmentation", b: "on-device", weight: 2 },
];
