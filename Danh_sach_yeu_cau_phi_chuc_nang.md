# Danh sách yêu cầu phi chức năng

| id | Danh mục | Yêu cầu | Giá trị mục tiêu | Độ ưu tiên | Liên quan |
| --- | --- | --- | --- | --- | --- |
| NFR-001 | Hiệu năng | Thời gian phản hồi tìm kiếm & phân tích | Hiển thị kết quả tìm kiếm và vẽ biểu đồ phân tích trong **≤ 3 giây** (P95). ※Cần xác nhận: ngưỡng theo quy mô Research Corpus | Cao | FR-003, FR-005, FR-007; Redis cache |
| NFR-002 | Khả dụng | Tỷ lệ uptime hệ thống | **99.9%** (không tính thời gian bảo trì đã thông báo) | Trung bình | READ.md §7 |
| NFR-003 | Bảo mật | Xác thực & phân quyền | Đăng ký/đăng nhập bằng **email + mật khẩu** (hash bcrypt), kiểm soát truy cập **RBAC** (Student \| Admin). Phiên đăng nhập an toàn (JWT hoặc session server-side). ※Cần xác nhận: OAuth2/OIDC/SSO — **chưa nằm trong phạm vi hiện tại** (READ.md §5.9: không tích hợp LMS/SIS) | Cao | FR-011, BR-038, BR-039; `users` |
| NFR-004 | Vận hành | Giám sát batch thu thập dữ liệu | Khi thu thập từ API bên ngoài **thất bại**, gửi cảnh báo cho Admin qua dashboard/log. Ghi nhận trạng thái sync trên `data_sources`. ※Cần xác nhận: thời gian trễ thu thập cho phép | Trung bình | FR-001, FR-012, BR-007; `data_sources`, `system_logs` |
| NFR-005 | Khả năng mở rộng dữ liệu | Thêm/sửa nguồn dữ liệu | Bổ sung nguồn học thuật mới chủ yếu qua **cấu hình** (`data_sources`), không cần sửa core schema `papers`. ※Cần xác nhận: lộ trình nguồn mới ngoài 6 nguồn READ.md §6 | Trung bình | FR-012, BR-008; READ.md §6 |
| NFR-006 | Khả mở rộng | Scalability | Thiết kế **scale ngang** cho tải đồng thời khi số người dùng tăng (hàng nghìn → hàng chục nghìn). MongoDB + Redis, tách read-heavy (search/dashboard) khỏi batch write. ※Cần xác nhận: số user mục tiêu cụ thể | Cao | MongoDB, Redis; READ.md §3 |
| NFR-007 | Hiệu năng | Thời gian hoàn thành batch | Batch đêm cập nhật **incremental** toàn bộ 6 nguồn dữ liệu trong **≤ 8 giờ**. ※Cần xác nhận: tần suất sync từng nguồn | Trung bình | FR-001, BR-004; `data_sources` |
| NFR-008 | Bảo mật | Mã hóa truyền tải | Toàn bộ giao tiếp client–server và server–API bên ngoài dùng **TLS 1.2 trở lên** (khuyến nghị TLS 1.3). | Cao | — |
| NFR-009 | Vận hành | Sao lưu & phục hồi | MongoDB sao lưu **hàng ngày**. Mục tiêu **RPO ≤ 24 giờ**, **RTO ≤ 4 giờ**. ※Cần xác nhận: mức mất dữ liệu chấp nhận được | Trung bình | MongoDB |
| NFR-010 | Bảo mật | Bảo vệ dữ liệu khi dùng AI | Chỉ gửi **abstract/metadata công khai** tới LLM; **không** gửi email, mật khẩu, nội dung thư viện riêng tư. Mask/loại trừ PII trước khi gọi API. ※Cần xác nhận: chính sách huấn luyện/lưu log của LLM | Cao | FR-009, BR-033~037; READ.md §5.8 |
| NFR-011 | Hiệu năng | Cache tầng Redis | Top bài thịnh hành, dedup Unique Views (30 phút), báo cáo phân tích hot: phản hồi từ cache **≤ 500 ms** (P95). | Trung bình | BR-043, BR-044; bsonSchema.md §3 |
| NFR-012 | Ràng buộc kiến trúc | Không Public API | Giai đoạn hiện tại **không** expose REST/GraphQL công khai cho bên thứ ba (READ.md §5.9). | Cao | READ.md §5.9 |

---
