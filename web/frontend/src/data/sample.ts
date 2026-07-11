import type { DashboardData, TimeRange, TrendPoint } from "./types";

/**
 * Realistic sample corpus data for the overview dashboard.
 * Paper metadata is kept in English (source language); UI chrome is Vietnamese.
 * Numbers are illustrative but internally consistent across widgets.
 */

const SERIES = [
  { key: "llm", label: "Large Language Models", token: "--c1" },
  { key: "cv", label: "Computer Vision", token: "--c2" },
  { key: "fl", label: "Federated Learning", token: "--c3" },
  { key: "gnn", label: "Graph Neural Networks", token: "--c4" },
  { key: "quantum", label: "Quantum Machine Learning", token: "--c5" },
  { key: "edge", label: "Edge & TinyML", token: "--c6" },
];

// publications per year per field (10-year window)
const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const RAW: Record<string, number[]> = {
  llm: [180, 240, 360, 620, 1150, 2100, 4300, 8800, 15200, 21400],
  cv: [3200, 3900, 4700, 5600, 6400, 7100, 7600, 7900, 8100, 8000],
  fl: [40, 90, 210, 480, 980, 1720, 2600, 3400, 4200, 5100],
  gnn: [120, 260, 540, 990, 1600, 2350, 3100, 3700, 4100, 4300],
  quantum: [90, 130, 190, 280, 410, 560, 720, 910, 1150, 1480],
  edge: [60, 120, 240, 430, 720, 1100, 1600, 2150, 2800, 3550],
};

function buildTrend(range: TimeRange): TrendPoint[] {
  const count = range === "5y" ? 10 : range === "24m" ? 3 : 2; // years shown
  const start = YEARS.length - count;
  return YEARS.slice(start).map((year, i) => {
    const point: TrendPoint = { period: String(year) };
    for (const s of SERIES) point[s.key] = RAW[s.key][start + i];
    return point;
  });
}

const TRENDING = [
  {
    id: "p1",
    title:
      "Sparse Mixture-of-Experts Scaling Laws for Multilingual Reasoning",
    authors: "N. Patel, L. Zhou, A. Rossi +3",
    year: 2025,
    source: "arXiv",
    field: "Large Language Models",
    views30d: 4820,
    url: "https://arxiv.org/",
  },
  {
    id: "p2",
    title: "Communication-Efficient Federated Learning on Heterogeneous Edge Devices",
    authors: "M. Okafor, S. Kim",
    year: 2025,
    source: "IEEE Xplore",
    field: "Federated Learning",
    views30d: 3110,
    url: "https://ieeexplore.ieee.org/",
  },
  {
    id: "p3",
    title: "Graph Neural Networks for Materials Discovery: A Benchmark Study",
    authors: "R. Duarte, H. Nakamura +5",
    year: 2024,
    source: "OpenAlex",
    field: "Graph Neural Networks",
    views30d: 2740,
    url: "https://openalex.org/",
  },
  {
    id: "p4",
    title: "Variational Quantum Circuits Meet Contrastive Representation Learning",
    authors: "E. Halvorsen, P. Iyer",
    year: 2025,
    source: "arXiv",
    field: "Quantum Machine Learning",
    views30d: 1980,
    url: "https://arxiv.org/",
  },
  {
    id: "p5",
    title: "On-Device Vision Transformers Under 1M Parameters",
    authors: "C. Alvarez, T. Berg +2",
    year: 2024,
    source: "Semantic Scholar",
    field: "Edge & TinyML",
    views30d: 1560,
    url: "https://www.semanticscholar.org/",
  },
  {
    id: "p6",
    title: "Retrieval-Augmented Generation for Low-Resource Clinical Notes",
    authors: "J. Fernández, K. Adebayo",
    year: 2025,
    source: "Crossref",
    field: "Large Language Models",
    views30d: 1330,
    url: "https://www.crossref.org/",
  },
  {
    id: "p7",
    title: "Privacy-Preserving Aggregation with Secure Multiparty Computation",
    authors: "D. Petrov, Y. Chen +1",
    year: 2024,
    source: "IEEE Xplore",
    field: "Federated Learning",
    views30d: 1105,
    url: "https://ieeexplore.ieee.org/",
  },
];

const GAP_FIELDS = [
  { key: "llm", label: "Large Language Models", token: "--c1" },
  { key: "cv", label: "Computer Vision", token: "--c2" },
  { key: "fl", label: "Federated Learning", token: "--c3" },
  { key: "gnn", label: "Graph Neural Networks", token: "--c4" },
  { key: "quantum", label: "Quantum ML", token: "--c5" },
  { key: "edge", label: "Edge & TinyML", token: "--c6" },
];
const GAP_ASPECTS = [
  { key: "theory", label: "Lý thuyết" },
  { key: "performance", label: "Hiệu năng" },
  { key: "security", label: "An toàn & Riêng tư" },
  { key: "biomed", label: "Y sinh" },
  { key: "sustainability", label: "Bền vững" },
];

// density normalized 0..1; gaps = high potential + low density
const GAP_MATRIX: { d: number; p: number; gap?: boolean }[][] = [
  // LLM
  [{ d: 0.9, p: 22400 }, { d: 0.82, p: 18100 }, { d: 0.4, p: 3200, gap: true }, { d: 0.55, p: 6100 }, { d: 0.18, p: 640, gap: true }],
  // CV
  [{ d: 0.7, p: 12400 }, { d: 0.95, p: 26300 }, { d: 0.5, p: 4800 }, { d: 0.66, p: 8900 }, { d: 0.22, p: 980, gap: true }],
  // FL
  [{ d: 0.45, p: 2600 }, { d: 0.6, p: 5100 }, { d: 0.88, p: 9800 }, { d: 0.2, p: 720, gap: true }, { d: 0.15, p: 410, gap: true }],
  // GNN
  [{ d: 0.58, p: 4300 }, { d: 0.62, p: 5200 }, { d: 0.3, p: 1400, gap: true }, { d: 0.48, p: 3100 }, { d: 0.26, p: 1150 }],
  // Quantum
  [{ d: 0.5, p: 1480 }, { d: 0.42, p: 1100 }, { d: 0.16, p: 240, gap: true }, { d: 0.12, p: 160, gap: true }, { d: 0.1, p: 90, gap: true }],
  // Edge
  [{ d: 0.4, p: 2100 }, { d: 0.72, p: 3550 }, { d: 0.36, p: 1600 }, { d: 0.24, p: 880, gap: true }, { d: 0.55, p: 2400 }],
];

export function makeDashboardData(range: TimeRange): DashboardData {
  const gaps = GAP_FIELDS.flatMap((field, fi) =>
    GAP_ASPECTS.map((aspect, ai) => ({
      field: field.label,
      aspect: aspect.label,
      density: GAP_MATRIX[fi][ai].d,
      papers: GAP_MATRIX[fi][ai].p,
      gap: Boolean(GAP_MATRIX[fi][ai].gap),
    })),
  );

  const gapCount = gaps.filter((g) => g.gap).length;

  const rangeLabel =
    range === "5y" ? "5 năm" : range === "24m" ? "24 tháng" : "12 tháng";

  return {
    updatedAt: "hôm nay, 06:00",
    kpis: [
      {
        id: "corpus",
        label: "Bài báo trong corpus",
        value: 1284630,
        delta: 48120,
        deltaKind: "up",
        hint: `+48.120 trong ${rangeLabel} qua`,
        format: "int",
      },
      {
        id: "new",
        label: `Bài mới (${rangeLabel})`,
        value: range === "5y" ? 61200 : range === "24m" ? 26400 : 14380,
        delta: 12.4,
        deltaKind: "up",
        hint: "so với kỳ trước",
        format: "int",
      },
      {
        id: "growth",
        label: "Lĩnh vực tăng nhanh nhất",
        value: 141,
        delta: 141,
        deltaKind: "up",
        hint: "Large Language Models",
        format: "percent",
      },
      {
        id: "gaps",
        label: "Khoảng trống tiềm năng",
        value: gapCount,
        deltaKind: "neutral",
        hint: "mật độ thấp · tiềm năng cao",
        format: "int",
      },
    ],
    trendSeries: SERIES,
    trend: buildTrend(range),
    gapFields: GAP_FIELDS,
    gapAspects: GAP_ASPECTS,
    gaps,
    trending: TRENDING,
    ai: {
      summary:
        "Trong 12 tháng qua, Large Language Models tiếp tục dẫn dắt đà tăng trưởng (+141%), nhưng mật độ nghiên cứu tập trung ở hiệu năng và mở rộng quy mô. Các giao điểm giữa Quantum ML và An toàn/Riêng tư, cùng Federated Learning trong Y sinh, cho thấy dư địa lớn với ít công bố.",
      directions: [
        {
          topic: "Quantum ML cho bảo mật & riêng tư",
          rationale: "Chỉ 240 công bố, tiềm năng học thuật cao, ít nhóm khai thác.",
        },
        {
          topic: "Federated Learning ứng dụng y sinh",
          rationale: "Nhu cầu dữ liệu phân tán trong y tế tăng, mật độ hiện thấp.",
        },
        {
          topic: "Edge & TinyML bền vững (green AI)",
          rationale: "Giao điểm mới nổi giữa tiết kiệm năng lượng và suy luận trên thiết bị.",
        },
      ],
      evidence: [
        { label: "Quantum ML × An toàn", papers: 240 },
        { label: "Federated × Y sinh", papers: 720 },
        { label: "Edge × Bền vững", papers: 880 },
      ],
    },
    followed: [
      { id: "f1", label: "Large Language Models", type: "field", newPapers: 312 },
      { id: "f2", label: "retrieval-augmented generation", type: "keyword", newPapers: 47 },
      { id: "f3", label: "federated learning", type: "keyword", newPapers: 63 },
      { id: "f4", label: "Quantum Machine Learning", type: "field", newPapers: 18 },
    ],
    notifications: [
      {
        id: "n1",
        subject: "retrieval-augmented generation",
        paperTitle: "Retrieval-Augmented Generation for Low-Resource Clinical Notes",
        when: "2 giờ trước",
        unread: true,
      },
      {
        id: "n2",
        subject: "federated learning",
        paperTitle: "Communication-Efficient Federated Learning on Heterogeneous Edge Devices",
        when: "hôm nay, 04:00",
        unread: true,
      },
      {
        id: "n3",
        subject: "Large Language Models",
        paperTitle: "Sparse Mixture-of-Experts Scaling Laws for Multilingual Reasoning",
        when: "hôm qua",
        unread: false,
      },
    ],
  };
}
