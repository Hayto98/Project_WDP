import { PAPERS } from "./searchSample";

export type NotificationKind = "task" | "invite" | "comment" | "paper" | "trend" | "system";
export type NotificationPriority = "high" | "normal" | "low";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  source: string;
  actor: string;
  time: string;
  unread: boolean;
  priority: NotificationPriority;
  targetLabel: string;
  targetHref: string;
  meta: string[];
}

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "nt-task-1",
    kind: "task",
    title: "Lan Anh giao task đọc paper nền",
    body: "Bạn được phân công tổng hợp câu hỏi nghiên cứu và ghi chú điểm mạnh/yếu của paper liên kết trong workspace AI Lab.",
    source: "Workspace · AI Lab",
    actor: "Lan Anh",
    time: "5 phút trước",
    unread: true,
    priority: "high",
    targetLabel: "Mở workspace",
    targetHref: "#workspace",
    meta: ["Deadline 18/07", "Trạng thái: Cần làm", PAPERS[0]?.source ?? "Paper liên kết"],
  },
  {
    id: "nt-invite-1",
    kind: "invite",
    title: "Ngọc Vũ phản hồi lời mời nghiên cứu chung",
    body: "Ngọc đã chấp nhận tham gia workspace biomedical RAG qua link email xác nhận.",
    source: "Lời mời nghiên cứu chung",
    actor: "Ngọc Vũ",
    time: "18 phút trước",
    unread: true,
    priority: "normal",
    targetLabel: "Xem lời mời",
    targetHref: "#workspace",
    meta: ["Đã chấp nhận", "ngoc.vu@hust.edu.vn", "Workspace AI Lab"],
  },
  {
    id: "nt-comment-1",
    kind: "comment",
    title: "Khoa Nguyễn bình luận trong task",
    body: "Khoa đề xuất bổ sung nhóm paper về retrieval-augmented generation trong y sinh trước khi chốt research gap.",
    source: "Workspace · AI Lab",
    actor: "Khoa Nguyễn",
    time: "42 phút trước",
    unread: true,
    priority: "normal",
    targetLabel: "Xem thảo luận",
    targetHref: "#workspace",
    meta: ["3 bình luận mới", "Liên quan Research Gap", "Cần phản hồi"],
  },
  {
    id: "nt-paper-1",
    kind: "paper",
    title: "Có paper mới khớp chủ đề bạn theo dõi",
    body: `${PAPERS[1]?.title ?? "Một paper mới"} vừa xuất hiện trong nguồn dữ liệu theo dõi của bạn.`,
    source: "Theo dõi chủ đề",
    actor: "Research Corpus",
    time: "1 giờ trước",
    unread: false,
    priority: "normal",
    targetLabel: "Mở theo dõi",
    targetHref: "#follow",
    meta: [PAPERS[1]?.source ?? "Nguồn học thuật", "Citation đang tăng", "Khớp từ khóa 86%"],
  },
  {
    id: "nt-trend-1",
    kind: "trend",
    title: "Xu hướng Federated Learning tăng bất thường",
    body: "Số bài công bố trong 30 ngày gần nhất vượt ngưỡng cảnh báo so với trung bình 6 tháng.",
    source: "Phân tích xu hướng",
    actor: "Trend Engine",
    time: "2 giờ trước",
    unread: false,
    priority: "high",
    targetLabel: "Xem xu hướng",
    targetHref: "#trends",
    meta: ["+24% trong 30 ngày", "Nguồn: OpenAlex, arXiv", "Cần kiểm tra chủ đề con"],
  },
  {
    id: "nt-system-1",
    kind: "system",
    title: "Batch cập nhật corpus đã hoàn tất",
    body: "Hệ thống đã đồng bộ metadata mới từ OpenAlex và Crossref. Dữ liệu phân tích đã sẵn sàng.",
    source: "Hệ thống",
    actor: "Crawler Service",
    time: "Hôm qua",
    unread: false,
    priority: "low",
    targetLabel: "Xem tổng quan",
    targetHref: "#overview",
    meta: ["1.248 bản ghi mới", "Không có lỗi nghiêm trọng", "Cập nhật lúc 22:10"],
  },
];
