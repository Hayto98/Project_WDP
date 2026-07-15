// cache bust
import { PAPERS, type PaperResult } from "./searchSample";

export type FollowType = "field" | "keyword" | "author";
export type AlertPriority = "high" | "medium" | "low";
export type DeliveryFrequency = "instant" | "daily" | "weekly";
export type AlertThreshold = "all" | "highCitation" | "trustedSources";

export interface FollowRule {
  frequency: DeliveryFrequency;
  threshold: AlertThreshold;
  email: boolean;
  inApp: boolean;
  exclude: string[];
}

export interface FollowSubject {
  id: string;
  label: string;
  type: FollowType;
  active: boolean;
  newPapers: number;
  papers7d: number;
  rule: FollowRule;
}

export interface FollowAlert {
  id: string;
  subjectId: string;
  paperId: string;
  when: string;
  unread: boolean;
  priority: AlertPriority;
  reason: string;
}

export interface FollowAlertEntry extends FollowAlert {
  subject: FollowSubject;
  paper: PaperResult;
}

export const FOLLOW_SUBJECTS: FollowSubject[] = [
  {
    id: "fs-llm",
    label: "Large Language Models",
    type: "field",
    active: true,
    newPapers: 312,
    papers7d: 84,
    rule: {
      frequency: "daily",
      threshold: "trustedSources",
      email: false,
      inApp: true,
      exclude: ["survey quá tổng quát"],
    },
  },
  {
    id: "fs-rag",
    label: "retrieval-augmented generation",
    type: "keyword",
    active: true,
    newPapers: 47,
    papers7d: 19,
    rule: {
      frequency: "instant",
      threshold: "all",
      email: true,
      inApp: true,
      exclude: ["blog", "tutorial"],
    },
  },
  {
    id: "fs-fl",
    label: "Federated Learning",
    type: "field",
    active: true,
    newPapers: 88,
    papers7d: 31,
    rule: {
      frequency: "daily",
      threshold: "highCitation",
      email: false,
      inApp: true,
      exclude: ["medical-only"],
    },
  },
  {
    id: "fs-edge",
    label: "Edge & TinyML",
    type: "field",
    active: false,
    newPapers: 21,
    papers7d: 12,
    rule: {
      frequency: "weekly",
      threshold: "trustedSources",
      email: false,
      inApp: true,
      exclude: [],
    },
  },
  {
    id: "fs-adebayo",
    label: "K. Adebayo",
    type: "author",
    active: true,
    newPapers: 3,
    papers7d: 2,
    rule: {
      frequency: "instant",
      threshold: "all",
      email: true,
      inApp: true,
      exclude: [],
    },
  },
];

export const FOLLOW_ALERTS: FollowAlert[] = [
  {
    id: "fa-1",
    subjectId: "fs-rag",
    paperId: "s6",
    when: "12 phút trước",
    unread: true,
    priority: "high",
    reason: "Khớp từ khóa RAG và có nguồn Crossref",
  },
  {
    id: "fa-2",
    subjectId: "fs-llm",
    paperId: "s1",
    when: "48 phút trước",
    unread: true,
    priority: "high",
    reason: "Tăng nhanh trong nhóm multilingual reasoning",
  },
  {
    id: "fa-3",
    subjectId: "fs-fl",
    paperId: "s7",
    when: "2 giờ trước",
    unread: true,
    priority: "medium",
    reason: "Khớp secure aggregation + differential privacy",
  },
  {
    id: "fa-4",
    subjectId: "fs-edge",
    paperId: "s5",
    when: "hôm nay, 08:40",
    unread: false,
    priority: "medium",
    reason: "Liên quan on-device và quantization",
  },
  {
    id: "fa-5",
    subjectId: "fs-llm",
    paperId: "s9",
    when: "hôm qua",
    unread: false,
    priority: "low",
    reason: "Khớp instruction tuning, mức ưu tiên thấp hơn vì preprint",
  },
  {
    id: "fa-6",
    subjectId: "fs-fl",
    paperId: "s12",
    when: "2 ngày trước",
    unread: false,
    priority: "high",
    reason: "Concept drift là tín hiệu nổi lên trong FL",
  },
  {
    id: "fa-7",
    subjectId: "fs-edge",
    paperId: "s10",
    when: "3 ngày trước",
    unread: false,
    priority: "low",
    reason: "Ứng dụng micro-drone, chưa vượt ngưỡng citation",
  },
];

export function makeFollowAlerts(
  subjects: FollowSubject[] = FOLLOW_SUBJECTS,
  alerts: FollowAlert[] = FOLLOW_ALERTS,
): FollowAlertEntry[] {
  return alerts.flatMap((alert) => {
    const subject = subjects.find((s) => s.id === alert.subjectId);
    const paper = PAPERS.find((p) => p.id === alert.paperId);
    return subject && paper ? [{ ...alert, subject, paper }] : [];
  });
}
