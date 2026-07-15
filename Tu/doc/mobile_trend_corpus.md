# Phân tích xu hướng dựa trên dữ liệu (Mobile Trend Corpus)

## Mô tả chức năng
Chức năng **Trend Corpus** trên ứng dụng di động cho phép người dùng phân tích sự phát triển của các chủ đề nghiên cứu (Topics) trong tập dữ liệu theo thời gian, được tối ưu hoàn toàn cho màn hình cảm ứng.

## Các thành phần kỹ thuật & UI
1. **Header & Theme Toggle**:
   - Tiêu đề điều hướng và nút chuyển đổi giao diện Sáng/Tối (Light/Dark mode) đồng bộ với toàn hệ thống.
   
2. **KPIs & Sparklines**:
   - `KpiStrip`: Component hiển thị nhanh 3 thông số tổng quan: Tổng số Chủ đề, Tổng công bố (dựa trên toàn bộ dữ liệu), và % Tăng trưởng trung bình.
   - Kết hợp `Sparkline` (biểu đồ dạng line siêu nhỏ) để tạo cảm giác trực quan về biến động tăng trưởng.

3. **Bộ chọn Chủ đề (Topic Selector)**:
   - Một danh sách thẻ (Chips) có thể cuộn (ScrollView) chứa **Top 50 chủ đề nổi bật nhất** dựa trên số lượng công bố.
   - Hỗ trợ nhấn để Chọn/Bỏ chọn một hoặc nhiều chủ đề (Multi-selection), màu sắc của chip được mapping trực tiếp từ cấu hình màu token (`--c1`, `--c2`, v.v.) của dữ liệu trả về để khớp tuyệt đối với Web.

4. **Biểu đồ Xu hướng (Trend Chart)**:
   - Dùng thư viện biểu đồ di động (`react-native-gifted-charts` hoặc tương đương) vẽ biểu đồ Line Chart đa luồng.
   - Trục X là thời gian (Năm), trục Y là số lượng công bố. Các đường trên biểu đồ tương ứng với các chủ đề đang được kích hoạt.

5. **Biểu đồ Mạng lưới (Co-occurrence Network)**:
   - Tái hiện lại chức năng biểu diễn mối liên hệ đồng xuất hiện giữa các chủ đề.
   - Các Node được kết nối qua Edge, với màu sắc và kích cỡ Node tương ứng với độ lớn của chủ đề, hỗ trợ phóng to/thu nhỏ (Zoom) hoặc nhấn vào Node để xem tương tác.
