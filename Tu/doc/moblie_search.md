# Chức năng Tìm kiếm (Search)

Tài liệu này mô tả chức năng Tìm kiếm bài báo khoa học, phân tích AI và công cụ lưu trữ nhanh.

## 1. Mục đích
Là công cụ cốt lõi giúp người dùng tìm kiếm, tra cứu tài liệu khoa học và nhận được các phân tích sâu từ AI dựa trên kết quả tìm kiếm.

## 2. Các chức năng chính đã triển khai

### 2.1. Tìm kiếm và Phân trang (Search & Pagination)
- **Thanh tìm kiếm:** Cho phép nhập từ khóa, tên bài báo hoặc tác giả.
- **Hiển thị kết quả:** Danh sách các bài báo chi tiết bao gồm: Tiêu đề, Tác giả, Năm xuất bản, Lĩnh vực, Từ khóa, DOI (link gốc), và Loại bài báo (Type badge).
- **Phân trang:** (Đang được yêu cầu và lên kế hoạch triển khai) Cho phép duyệt qua hàng ngàn kết quả bằng cách sang trang (Next/Prev) kết nối trực tiếp với API backend.

### 2.2. Trợ lý AI (AI Integration)
Trong mỗi thẻ bài báo ở kết quả tìm kiếm, cung cấp các nút tương tác AI:
- **Tóm tắt AI (AI Summary):** Gửi ID bài báo lên Backend để gọi API của mô hình AI (như Gemini/OpenAI) trả về bản tóm tắt nội dung bài báo một cách ngắn gọn, giúp người dùng đọc hiểu nhanh chóng mà không cần mở toàn văn.
- **Bài báo liên quan (Related Papers):** AI phân tích nội dung, từ khóa của bài báo hiện tại và gợi ý danh sách các bài báo có nội dung tương đồng. Danh sách này được hiển thị ngay bên dưới bài báo gốc, mở rộng luồng khám phá tri thức.

### 2.3. Lưu bài báo nhanh (Save to Library)
- Cung cấp nút `Lưu` hoặc biểu tượng Bookmark trên mỗi bài báo.
- **Xử lý:** Khi bấm lưu, hệ thống tự động kiểm tra xem người dùng đã có Bộ sưu tập mặc định (VD: "Đọc sau") chưa. Nếu chưa có, hệ thống tự động tạo và lưu bài báo vào đó, sau đó hiển thị trạng thái "Đã lưu".
- Dữ liệu được đồng bộ ngay lập tức sang tab Thư viện.
