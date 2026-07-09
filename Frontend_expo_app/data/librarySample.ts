import { PAPERS, type PaperResult } from "./searchSample";

export type ReadingStatus = "unread" | "reading" | "done";

export interface LibraryCollection {
  id: string;
  name: string;
  description: string;
}

export interface LibraryItem {
  id: string;
  paperId: string;
  savedAt: string;
  status: ReadingStatus;
  collectionIds: string[];
  note: string;
}

export interface LibraryEntry extends LibraryItem {
  paper: PaperResult;
}

export const COLLECTIONS: LibraryCollection[] = [
  { id: "read-later", name: "Đọc sau", description: "Các bài cần xem kỹ trong tuần này" },
  { id: "thesis", name: "Luận văn", description: "Nguồn nền cho đề tài và chương tổng quan" },
  { id: "fl", name: "Federated Learning", description: "Riêng tư, bảo mật và triển khai phân tán" },
  { id: "llm-safety", name: "LLM Safety", description: "An toàn, đánh giá và giảm hallucination" },
  { id: "edge", name: "Edge AI", description: "Mô hình nhỏ gọn, on-device, TinyML" },
];

export const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: "l1",
    paperId: "s1",
    savedAt: "2026-07-04",
    status: "reading",
    collectionIds: ["read-later", "thesis", "llm-safety"],
    note: "Đọc kỹ phần routing entropy; có thể dùng làm nền cho mục đánh giá mô hình đa ngôn ngữ.",
  },
  {
    id: "l2",
    paperId: "s2",
    savedAt: "2026-07-03",
    status: "unread",
    collectionIds: ["fl", "edge"],
    note: "Liên quan trực tiếp đến giảm chi phí truyền thông trong FL trên thiết bị không đồng nhất.",
  },
  {
    id: "l3",
    paperId: "s3",
    savedAt: "2026-07-02",
    status: "done",
    collectionIds: ["thesis"],
    note: "Benchmark tốt, trích trong phần phương pháp so sánh GNN.",
  },
  {
    id: "l4",
    paperId: "s6",
    savedAt: "2026-07-01",
    status: "reading",
    collectionIds: ["llm-safety", "thesis"],
    note: "Ví dụ hay về RAG cho dữ liệu lâm sàng ít tài nguyên; chú ý metric hallucination.",
  },
  {
    id: "l5",
    paperId: "s7",
    savedAt: "2026-06-29",
    status: "done",
    collectionIds: ["fl"],
    note: "Có thể dùng làm tài liệu tham khảo cho secure aggregation + DP.",
  },
  {
    id: "l6",
    paperId: "s9",
    savedAt: "2026-06-28",
    status: "unread",
    collectionIds: ["read-later", "llm-safety"],
    note: "Cần kiểm tra setup synthetic preference data, so với RLHF trong survey.",
  },
  {
    id: "l7",
    paperId: "s10",
    savedAt: "2026-06-26",
    status: "reading",
    collectionIds: ["edge"],
    note: "Phù hợp mục ứng dụng micro-drone; xem phần latency và năng lượng.",
  },
  {
    id: "l8",
    paperId: "s12",
    savedAt: "2026-06-24",
    status: "unread",
    collectionIds: ["fl", "read-later"],
    note: "Concept drift trong FL, có thể nối với hướng nghiên cứu dữ liệu thay đổi theo thời gian.",
  },
];

export function makeLibraryEntries(items = LIBRARY_ITEMS): LibraryEntry[] {
  return items.flatMap((item) => {
    const paper = PAPERS.find((p) => p.id === item.paperId);
    return paper ? [{ ...item, paper }] : [];
  });
}
