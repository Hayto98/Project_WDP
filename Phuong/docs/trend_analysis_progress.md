# Báo cáo tiến độ: Tính năng Phân tích xu hướng (Trend Analysis)
**Người thực hiện/Quản lý task:** Phương

---

## 1. Mục tiêu Task
Tách và nâng cấp chức năng Phân tích xu hướng (Trend Analysis) thành 2 chế độ riêng biệt:
- **Corpus Trends**: Phân tích dữ liệu từ cơ sở dữ liệu nội bộ (Local Database) đã được import sẵn.
- **Live Trends**: Phân tích dữ liệu trong thời gian thực, trực tiếp gọi tới các nguồn học thuật bên thứ 3 (OpenAlex, Crossref, arXiv, Semantic Scholar, Exa).

## 2. Những công việc đã hoàn thành (Done)

### 2.1. Về mặt Backend (API & Services)
- [x] **Xây dựng module gọi API chung (`liveFetch.service.js`)**: Tập trung logic fetch dữ liệu từ các thư viện học thuật mở, giúp tái sử dụng cho cả tính năng Research Gap và Trend Analysis.
- [x] **Xây dựng service Live Trend (`liveTrend.service.js`)**: 
  - Lấy các bài báo từ nguồn mở theo từ khóa (`topic`).
  - Phân tích và trích xuất các thuật ngữ (terms) phổ biến nhất (Top 5).
  - Nhóm số lượng bài báo theo từng năm (từ `yearFrom` đến `yearTo`) để phục vụ vẽ biểu đồ xu hướng.
  - Tích hợp caching in-memory để tối ưu hóa tốc độ nếu người dùng search lại trùng từ khóa.
- [x] **Mở rộng API & Cấu hình Routes**:
  - Tạo thêm endpoint `POST /api/v1/analytics/trends/live` (Để fetch Live Trends).
  - Tạo thêm endpoint `POST /api/v1/analytics/trends/live/save` (Để lưu kết quả phân tích vào DB `AnalysisReport`).
  - Thêm validate data bằng Joi (`liveTrendSchema`, `saveLiveTrendSchema`).
- [x] **Cập nhật tài liệu Swagger (API Docs)**: Bổ sung mô tả schema, payloads và response chuẩn xác cho các API Live Trends và Live Gaps để dễ dàng test trên `/api-docs`.
- [x] **Xử lý triệt để lỗi CORS**: Đã fix lỗi Backend chặn kết nối từ Frontend/Swagger bằng cách điều chỉnh `CORS_ORIGIN=*` trong `.env`.

### 2.2. Về mặt Frontend (UI/UX)
- [x] **Tích hợp API Frontend (`api.ts`)**: Thêm các hàm gọi API tương ứng `liveTrends` và `saveLiveTrends`.
- [x] **Xây dựng Giao diện `LiveTrendPanel.tsx`**:
  - Form nhập từ khóa (Topic / Keywords).
  - Tùy chỉnh khoảng thời gian (Từ năm - Đến năm).
  - Cấu hình số bài quét tối đa (20/50/100 bài).
  - Chip toggle cho phép người dùng tick chọn các nguồn (OpenAlex, Crossref, arXiv...).
- [x] **Cập nhật Giao diện chính (`TrendsPage.tsx`)**:
  - Thêm cụm công cụ Toggle (Switch tab) giúp người dùng chuyển đổi mượt mà giữa chế độ **Corpus Trends** và **Live Trends**.
- [x] **Xử lý Bug Render**: Xử lý triệt để cảnh báo trùng lặp Key (`Encountered two children with the same key`) của thư viện Recharts bên trong `TrendChart.tsx`.

## 3. Những công việc chưa hoàn thành (Not Done / Next Steps)
- **Tối ưu tốc độ API**: Hiện tại việc gọi đồng thời (Promise.all) tới 3-5 nguồn thư viện học thuật mất khá nhiều thời gian (khoảng 3-5 giây cho mỗi request 20 bài). Cần tìm hiểu thêm về việc đưa các request này vào background queue hoặc stream dữ liệu về UI.
- **Unit Test / Integration Test**: Chưa có kịch bản test tự động cho service `liveTrend.service.js`.
- **Hiệu ứng UX (Skeleton Loading)**: Cần bổ sung Loading Skeleton cho bảng biểu đồ và danh sách khi đang chờ lấy dữ liệu Live để nâng cao trải nghiệm người dùng, thay vì chỉ hiện text "Đang phân tích...".
- **Xử lý Rate Limit**: Nếu người dùng nhấn phân tích liên tục, hệ thống chưa có phương án xử lý rate limit (HTTP 429) triệt để từ các nguồn API bên ngoài.

## 4. Trạng thái hiện tại
- **Tính năng Phân tích xu hướng (Corpus & Live) đã có thể hoạt động end-to-end hoàn chỉnh** từ Front-end gọi xuống Back-end và hiển thị biểu đồ lên màn hình UI. 
- Form thao tác thân thiện, API chạy ổn định và biểu đồ line chart hiển thị chính xác sự dịch chuyển xu hướng qua từng năm.

## 5. Báo cáo kết quả chạy thử (Test Results)
- **API `POST /api/v1/analytics/trends/live`**: 
  - Test lấy dữ liệu từ OpenAlex, Crossref, arXiv cho từ khóa *"federated learning medical imaging"*: Thành công.
  - Tốc độ phản hồi phụ thuộc vào API bên thứ 3 (trung bình 3-5 giây cho 20 bài/nguồn).
  - Dữ liệu trả về đúng cấu trúc, trích xuất chính xác Top 5 terms và map đúng vào các năm tương ứng.
- **Lỗi trùng lặp Key trên UI**: Đã fix thành công, không còn hiển thị warning `Encountered two children with the same key` trong console.
- **Lỗi CORS khi mở Swagger & Fetch API từ Vite**: Đã xử lý dứt điểm bằng cách mở CORS `*` trong Development, biểu đồ Line Chart render chuẩn xác và tooltip hiển thị số liệu không bị trùng lặp.
