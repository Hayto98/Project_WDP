export const GAP_FIELDS = [
  { key: "llm", label: "Large Language Models", token: "--c1" },
  { key: "cv", label: "Computer Vision", token: "--c2" },
  { key: "fl", label: "Federated Learning", token: "--c3" },
  { key: "gnn", label: "Graph Neural Networks", token: "--c4" },
  { key: "quantum", label: "Quantum ML", token: "--c5" },
  { key: "edge", label: "Edge & TinyML", token: "--c6" },
];

export const GAP_ASPECTS = [
  "Lý thuyết",
  "Hiệu năng",
  "An toàn & Riêng tư",
  "Y sinh",
  "Bền vững",
];

/** [density 0..1, interest/demand 0..1] per field row × aspect col */
const MATRIX: [number, number][][] = [
  // LLM
  [[0.9, 0.55], [0.82, 0.8], [0.4, 0.88], [0.55, 0.72], [0.18, 0.85]],
  // CV
  [[0.7, 0.45], [0.95, 0.78], [0.5, 0.6], [0.66, 0.82], [0.22, 0.7]],
  // FL
  [[0.45, 0.4], [0.6, 0.65], [0.88, 0.9], [0.2, 0.86], [0.15, 0.55]],
  // GNN
  [[0.58, 0.42], [0.62, 0.55], [0.3, 0.8], [0.48, 0.85], [0.26, 0.48]],
  // Quantum
  [[0.5, 0.62], [0.42, 0.58], [0.16, 0.75], [0.12, 0.82], [0.1, 0.35]],
  // Edge
  [[0.4, 0.38], [0.72, 0.8], [0.36, 0.7], [0.24, 0.83], [0.55, 0.66]],
];

const FIELD_SCALE: Record<string, number> = {
  llm: 26000,
  cv: 28000,
  fl: 11000,
  gnn: 8000,
  quantum: 3000,
  edge: 4500,
};

const ASPECT_KW: Record<string, string[]> = {
  "Lý thuyết": ["giới hạn lý thuyết", "khả năng biểu diễn", "cận hội tụ"],
  "Hiệu năng": ["hiệu quả tham số", "tăng tốc suy luận", "tối ưu chi phí"],
  "An toàn & Riêng tư": ["riêng tư vi phân", "học liên kết an toàn", "kháng đối kháng"],
  "Y sinh": ["ứng dụng lâm sàng", "dữ liệu y sinh", "hỗ trợ chẩn đoán"],
  "Bền vững": ["tiết kiệm năng lượng", "carbon thấp", "mô hình nhỏ gọn"],
};

const FIELD_KW: Record<string, string> = {
  llm: "mô hình ngôn ngữ",
  cv: "thị giác máy tính",
  fl: "học liên kết",
  gnn: "mạng đồ thị",
  quantum: "học lượng tử",
  edge: "biên & TinyML",
};

export interface GapItem {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  token: string;
  aspect: string;
  fi: number;
  ai: number;
  density: number;
  interest: number;
  papers: number;
  score: number; // opportunity score = interest * (1 - density)
  keywords: string[];
  direction: string;
  trend: number[];
  evidence?: { id: string; title: string; year?: number | null; citations?: number }[];
}

function jitter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 0.9 + ((h >>> 0) / 4294967295) * 0.2; // 0.9..1.1
}

/** 6-point publication trend: emerging gaps ramp up, saturated fields flatten. */
function makeTrend(papers: number, density: number, interest: number, seed: string): number[] {
  const end = Math.max(6, papers);
  const growth = 0.35 + interest * 0.5 - density * 0.3; // higher for gaps
  const start = end / Math.pow(1 + growth, 5);
  const out: number[] = [];
  for (let i = 0; i < 6; i++) {
    const v = start * Math.pow(1 + growth, i) * jitter(`${seed}${i}`);
    out.push(Math.round(v));
  }
  return out;
}

export function buildGaps(): GapItem[] {
  const items: GapItem[] = [];
  GAP_FIELDS.forEach((field, fi) => {
    GAP_ASPECTS.forEach((aspect, ai) => {
      const [density, interest] = MATRIX[fi][ai];
      const papers = Math.round(density * FIELD_SCALE[field.key] * jitter(`${field.key}${aspect}`));
      const score = interest * (1 - density);
      const keywords = [FIELD_KW[field.key], ...ASPECT_KW[aspect].slice(0, 2)];
      const direction =
        score >= 0.45
          ? `Rất ít công bố về "${aspect}" cho ${field.label}, trong khi mức quan tâm cao — cơ hội mở cho nghiên cứu tiên phong.`
          : score >= 0.3
            ? `Mảng "${aspect}" của ${field.label} còn thưa công bố so với nhu cầu; phù hợp cho hướng liên ngành.`
            : `"${aspect}" trong ${field.label} đã tương đối bão hòa hoặc ít được quan tâm.`;
      items.push({
        id: `${field.key}-${ai}`,
        fieldKey: field.key,
        fieldLabel: field.label,
        token: field.token,
        aspect,
        fi,
        ai,
        density,
        interest,
        papers,
        score,
        keywords,
        direction,
        trend: makeTrend(papers, density, interest, `${field.key}${ai}`),
      });
    });
  });
  return items;
}

export function isGap(item: GapItem, densityThreshold: number, interestThreshold = 0.55): boolean {
  return item.density <= densityThreshold && item.interest >= interestThreshold;
}
