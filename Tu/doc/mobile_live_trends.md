# Phân tích xu hướng trực tuyến (Mobile Live Trends)

## Mô tả chức năng
**Live Trends** là tính năng song song với Trend Corpus, giúp người dùng nắm bắt và phân tích xu hướng nghiên cứu đang diễn ra trong thời gian thực thông qua các nguồn dữ liệu trực tuyến.

## Cơ chế hoạt động & UI
1. **Nút Toggle (Corpus / Live)**:
   - Sử dụng một thanh Segmented Control trên Header để người dùng có thể chuyển đổi mượt mà giữa hai chế độ phân tích dữ liệu lịch sử (Corpus) và dữ liệu mới nhất (Live).

2. **Giao diện phân tích (LiveTrendPanel)**:
   - Khi ở chế độ Live, toàn bộ biểu đồ Corpus sẽ được thay thế bằng Component `LiveTrendPanel`.
   - **Thanh tìm kiếm (Search Bar)**: Cho phép nhập các từ khóa xu hướng, hashtag, hoặc lĩnh vực cần theo dõi.
   - **Hệ thống lọc trực tuyến**: Truy vấn API thời gian thực (`liveTrends`) để lấy về những diễn biến mới nhất trên nền tảng.
   - **Hiển thị thông tin**: Kết quả được trả về dưới dạng danh sách hoặc card thông tin, báo cáo mức độ phủ sóng của chủ đề đó trong vòng 24h hoặc 7 ngày qua.

3. **Trải nghiệm thao tác (UX)**:
   - Cung cấp tính năng tải (Loading ActivityIndicator) rõ ràng để người dùng nhận biết hệ thống đang crawl/lấy dữ liệu.
   - Hỗ trợ cuộn dọc mượt mà để duyệt tin tức, công bố trực tuyến mà không bị giật lag.
