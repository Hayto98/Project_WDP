# Chức năng Thư viện (Library)

Tài liệu này mô tả các chức năng quản lý tài liệu cá nhân trong màn hình Thư viện của ứng dụng.

## 1. Mục đích
Là nơi lưu trữ, phân loại và quản lý quá trình đọc các bài báo khoa học. Giao diện được tối ưu hóa cho di động (Mobile) nhưng vẫn mang lại trải nghiệm đầy đủ như trên Web.

## 2. Các chức năng chính đã triển khai

### 2.1. Thống kê tổng quan (Stats)
- Hiển thị số liệu trực quan ở đầu màn hình: Tổng số bài báo đã lưu, Số bài báo Đã đọc, và Số lượng bài báo có đính kèm Ghi chú cá nhân.

### 2.2. Quản lý Bộ sưu tập (Collections)
- **Danh sách Bộ sưu tập:** Hiển thị dạng thanh cuộn ngang (Horizontal Scroll) gồm "Tất cả" và các bộ sưu tập do người dùng tạo.
- **Tạo mới:** Cung cấp ô nhập liệu và nút `+` ngay dưới danh sách để tạo nhanh một bộ sưu tập mới (VD: "Survey 2026").
- **Sửa / Xóa:** Khi bấm vào một bộ sưu tập cụ thể, thanh công cụ Sửa tên và Xóa bộ sưu tập sẽ xuất hiện. Nếu bộ sưu tập bị xóa, các bài báo bên trong sẽ bị gỡ nhãn (nhưng không bị xóa hoàn toàn nếu vẫn nằm ở bộ sưu tập khác).

### 2.3. Tìm kiếm và Lọc (Search & Filters)
- **Lọc cục bộ:** Ô tìm kiếm cho phép gõ tiêu đề hoặc tên tác giả để lọc nhanh bài báo đang có trong thư viện.
- **Trạng thái đọc:** Các nhãn (chips) để lọc danh sách theo trạng thái: Tất cả, Chưa đọc, Đang đọc, Đã đọc.

### 2.4. Danh sách và Chi tiết bài báo (Paper Detail Modal)
- **Thẻ bài báo (Card UI):** Liệt kê danh sách bài báo với các thông tin tóm tắt và huy hiệu (badge) hiển thị trạng thái đọc hiện tại.
- **Cửa sổ chi tiết (Bottom Sheet / Modal):** Khi bấm vào một bài báo, một cửa sổ sẽ hiện lên cung cấp các tính năng quản lý chuyên sâu:
  - **Trạng thái đọc:** Thay đổi qua lại giữa `Chưa đọc` / `Đang đọc` / `Đã đọc`.
  - **Quản lý Bộ sưu tập:** Liệt kê toàn bộ bộ sưu tập hiện có. Người dùng có thể chạm vào từng nhãn để thêm hoặc gỡ bài báo khỏi bộ sưu tập đó (nhãn đổi màu đậm khi được chọn).
  - **Ghi chú cá nhân:** Khung nhập liệu (Textarea) để viết và lưu ghi chú cá nhân về bài báo.
  - **Tóm tắt (Abstract):** Hiển thị nội dung tóm tắt gốc của bài báo.
  - **Liên kết ngoài:** Nút "Mở link gốc" dẫn đến trang xuất bản của bài báo.
  - **Xóa bài báo:** Tùy chọn gỡ bỏ hoàn toàn bài báo khỏi thư viện.

> Toàn bộ thao tác trong Thư viện đều gọi trực tiếp tới `libraryApi` để đồng bộ dữ liệu thời gian thực giữa Web và Mobile.
