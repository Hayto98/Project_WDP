# Chức năng Bảng điều khiển (Dashboard)

Tài liệu này mô tả các chức năng được hiển thị trên trang chủ / bảng điều khiển (Dashboard) của ứng dụng.

## 1. Mục đích
Cung cấp cái nhìn tổng quan về các hoạt động, xu hướng và dữ liệu quan trọng nhất đối với người dùng ngay khi vừa truy cập ứng dụng.

## 2. Các chức năng chính đã triển khai

### 2.1. Hiển thị Chỉ số Tổng quan (KPIs / Stats)
- **Thiết kế:** Hiển thị các ô thông tin nhanh (Cards) chứa các chỉ số quan trọng, ví dụ như số lượng bài báo mới trong lĩnh vực quan tâm, số lượng trích dẫn, hoặc các báo cáo thống kê khác.
- **Dữ liệu:** Lấy từ API backend (ví dụ: `api.dashboard()` / `api.overview()`), hiển thị động theo người dùng.

### 2.2. Biểu đồ Xu hướng (Trend Charts)
- **Mục tiêu:** Trực quan hóa dữ liệu nghiên cứu, số lượng bài báo công bố theo năm hoặc theo lĩnh vực.
- **Tính năng:** Có thể có các bộ lọc thời gian (1 năm, 5 năm...) để người dùng dễ dàng theo dõi sự biến động của dữ liệu.

### 2.3. Bảng xếp hạng / Bài báo thịnh hành (Trending Papers)
- Hiển thị danh sách các bài báo có lượt xem/trích dẫn cao hoặc đang được quan tâm nhiều nhất trong thời gian gần đây.
- Cho phép người dùng bấm vào bài báo để xem chi tiết hoặc lưu nhanh vào Thư viện.

### 2.4. Thông báo và Gợi ý AI (AI Insights & Notifications)
- Hiển thị các phân tích hoặc tóm tắt xu hướng nghiên cứu được tạo ra bởi AI.
- Cập nhật thông báo về các chủ đề hoặc từ khóa mà người dùng đang theo dõi (Followed Subjects).
