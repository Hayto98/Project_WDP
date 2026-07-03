# TÀI LIỆU ĐẶC TẢ YÊU CẦU & THIẾT KẾ CƠ SỞ DỮ LIỆU
**Dự án:** Hệ thống theo dõi xu hướng nghiên cứu khoa học (Scientific Research Trend Tracking System)
**Công nghệ lưu trữ chính:** MongoDB (NoSQL)
**Công nghệ Cache:** Redis
**Phiên bản:** 2.0

---

## 1. DANH SÁCH YÊU CẦU NGHIỆP VỤ (BUSINESS REQUIREMENTS)

Bảng dưới đây tổng hợp toàn bộ các quy tắc nghiệp vụ cốt lõi của hệ thống, bao gồm cả các luồng xử lý dữ liệu và đo lường[cite: 1].

| ID | Danh mục | Yêu cầu | Mô tả | Độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- |
| **BR-001** | Thu thập & Quản lý dữ liệu | Liên kết cơ sở dữ liệu học thuật bên ngoài | Xây dựng cơ chế tự động lấy metadata (tiêu đề, tác giả, tóm tắt, năm xuất bản, v.v.) từ các nguồn học thuật bên ngoài như OpenAlex, Semantic Scholar, arXiv và nhập vào hệ thống.[cite: 1] | Cao |
| **BR-002** | Thu thập & Quản lý dữ liệu | Xử lý chuẩn hóa dữ liệu | Tích hợp định dạng dữ liệu (tên trường, format) từ các nguồn khác nhau, chuyển đổi sang schema chung có thể phân tích và lưu trữ.[cite: 1] | Cao |
| **BR-003** | Thu thập & Quản lý dữ liệu | Loại bỏ dữ liệu trùng lặp (Deduplication) | Khi cùng một bài báo được thu thập trùng lặp từ các nguồn khác nhau, sử dụng các chỉ số như DOI, tiêu đề để xác định tính đồng nhất, sau đó hợp nhất và sắp xếp bản ghi. Đảm bảo tính duy nhất của bài báo dựa trên DOI.[cite: 1] | Cao |
| **BR-004** | Thu thập & Quản lý dữ liệu | Lập lịch cập nhật dữ liệu tự động | Thực hiện tác vụ tự động thu thập thông tin bài báo học thuật mới nhất theo định kỳ, giữ Research Corpus luôn ở trạng thái mới nhất.[cite: 1] | Cao |
| **BR-005** | Thu thập & Quản lý dữ liệu | Quản lý chất lượng dữ liệu (Cleaning) | Phát hiện các giá trị thiếu hoặc thông tin không nhất quán trong dữ liệu đã thu thập, thực hiện bổ sung hoặc loại trừ.[cite: 1] | Trung bình |
| **BR-006** | Thu thập & Quản lý dữ liệu | Quản lý chính sách lưu giữ dữ liệu | Quy định thời hạn lưu giữ và điều kiện lưu trữ (archive) dữ liệu bài báo được quản lý trong hệ thống, quản lý các quy tắc vận hành. Dữ liệu trạng thái "Archived" không xuất hiện trong kết quả tìm kiếm tiêu chuẩn.[cite: 1] | Thấp |
| **BR-007** | Thu thập & Quản lý dữ liệu | Giám sát kết nối nguồn dữ liệu | Giám sát trạng thái kết nối đến các API bên ngoài và nguồn dữ liệu, thông báo cho quản trị viên khi xảy ra lỗi thu thập.[cite: 1] | Trung bình |
| **BR-008** | Thu thập & Quản lý dữ liệu | Quản lý bổ sung nguồn dữ liệu | Thiết lập cấu hình nhập dữ liệu có khả năng mở rộng để bổ sung các nguồn học thuật và cơ sở dữ liệu mới trong tương lai.[cite: 1] | Thấp |
| **BR-009** | Công cụ Tìm kiếm | Chức năng tìm kiếm từ khóa cơ bản | Dựa trên từ khóa người dùng nhập, tìm kiếm bài báo phù hợp từ tiêu đề, tóm tắt hoặc từ khóa trong Research Corpus và hiển thị danh sách kết quả.[cite: 1] | Cao |
| **BR-010** | Công cụ Tìm kiếm | Chức năng lọc theo thuộc tính | Thực hiện lọc kết quả tìm kiếm bằng cách chỉ định các thông tin thuộc tính như tên tác giả, năm xuất bản, lĩnh vực nghiên cứu, nguồn xuất bản.[cite: 1] | Cao |
| **BR-011** | Công cụ Tìm kiếm | Kết hợp điều kiện tìm kiếm nâng cao | Cho phép tìm kiếm bằng truy vấn phức tạp kết hợp nhiều điều kiện tìm kiếm (toán tử logic AND/OR/NOT, v.v.).[cite: 1] | Trung bình |
| **BR-012** | Công cụ Tìm kiếm | Sắp xếp kết quả tìm kiếm | Sắp xếp kết quả tìm kiếm dựa trên các chỉ số như mức độ liên quan, năm xuất bản (tăng dần/giảm dần), số lượt trích dẫn.[cite: 1] | Trung bình |
| **BR-013** | Công cụ Tìm kiếm | Hiển thị chi tiết metadata | Khi chọn một bài báo cụ thể từ danh sách kết quả tìm kiếm, hiển thị thông tin chi tiết bài báo bao gồm DOI và liên kết đến toàn văn.[cite: 1] | Cao |
| **BR-014** | Công cụ Tìm kiếm | Chức năng lưu điều kiện tìm kiếm | Lưu các điều kiện tìm kiếm và cài đặt bộ lọc thường xuyên sử dụng để có thể thực thi ngay trong các lần truy cập sau. Các cài đặt này phải được load ngay khi User đăng nhập.[cite: 1] | Thấp |
| **BR-015** | Công cụ Phân tích | Phân tích xu hướng nghiên cứu theo chuỗi thời gian | Quy trình nghiệp vụ tổng hợp số lượng bài báo theo năm hoặc tháng về lĩnh vực nghiên cứu hoặc từ khóa cụ thể từ Research Corpus đã tích lũy, lượng hóa sự thay đổi xu hướng.[cite: 1] | Cao |
| **BR-016** | Công cụ Phân tích | Tính toán tốc độ tăng trưởng lĩnh vực nghiên cứu | Quy trình nghiệp vụ tính toán tỷ lệ gia tăng bài báo công bố trong một khoảng thời gian nhất định theo từng lĩnh vực nghiên cứu, xác định lĩnh vực nào đang tăng trưởng nhanh hiện tại.[cite: 1] | Cao |
| **BR-017** | Công cụ Phân tích | Đề xuất từ khóa & chủ đề liên quan | Quy trình nghiệp vụ tự động trích xuất các từ liên quan có tần suất đồng xuất hiện cao trong bài báo hoặc các chủ đề học thuật ở lĩnh vực lân cận, dựa trên chủ đề nghiên cứu hoặc từ khóa tìm kiếm đã chọn.[cite: 1] | Trung bình |
| **BR-018** | Công cụ Phân tích | Phát hiện Research Gap (Vùng trống nghiên cứu) | Quy trình nghiệp vụ so sánh số lượng bài báo công bố giữa các lĩnh vực chính, xác định các khu vực có tầm quan trọng học thuật và tiềm năng cao nhưng số lượng bài báo hiện có ít (vùng trống nghiên cứu).[cite: 1] | Cao |
| **BR-019** | Công cụ Phân tích | Lập bản đồ mối liên hệ tiềm ẩn giữa các chủ đề nghiên cứu | Quy trình nghiệp vụ phân tích mối quan hệ trích dẫn và sự chồng chéo nhóm tác giả giữa các lĩnh vực nghiên cứu khác nhau, xác định sự kết nối và mở rộng của nghiên cứu liên ngành.[cite: 1] | Trung bình |
| **BR-020** | Công cụ Phân tích | Xử lý chuẩn hóa & tiêu chuẩn hóa dữ liệu học thuật | Quy trình nghiệp vụ tích hợp và chuẩn hóa metadata có định dạng khác nhau từ các nguồn thu thập sang định dạng có thể xử lý bởi công cụ phân tích.[cite: 1] | Cao |
| **BR-021** | Công cụ Phân tích | Tự động tạo và cập nhật báo cáo phân tích | Quy trình nghiệp vụ tự động tạo và cập nhật kết quả phân tích được thực hiện định kỳ dưới dạng mà người dùng có thể xem (báo cáo tóm tắt).[cite: 1] | Trung bình |
| **BR-022** | Trực quan hóa & Dashboard | Trực quan hóa xu hướng nghiên cứu | Hiển thị biến động số lượng công bố của các chủ đề học thuật và lĩnh vực công nghệ chính theo chuỗi thời gian bằng biểu đồ đường, v.v., giúp nắm bắt trực quan tốc độ tăng trưởng và sự thay đổi mức độ quan tâm.[cite: 1] | Cao |
| **BR-023** | Trực quan hóa & Dashboard | Trực quan hóa Research Gap | Hiển thị mật độ nghiên cứu theo từng chủ đề bằng heatmap hoặc biểu đồ bong bóng, giúp nhận diện các khu vực có ít bài báo và còn dư địa nghiên cứu.[cite: 1] | Cao |
| **BR-024** | Trực quan hóa & Dashboard | Hiển thị kết quả phân tích AI | Trình bày dễ hiểu trên dashboard các kết quả phân tích do AI engine tạo ra, như tóm tắt bài báo hoặc đề xuất chủ đề nghiên cứu.[cite: 1] | Trung bình |
| **BR-025** | Trực quan hóa & Dashboard | Xuất báo cáo thống kê | Chức năng hiển thị số liệu thống kê dữ liệu học thuật dựa trên điều kiện tìm kiếm dưới dạng báo cáo tóm tắt.[cite: 1] | Trung bình |
| **BR-026** | Trực quan hóa & Dashboard | Dashboard tùy chỉnh | Cho phép người dùng bố trí các chủ đề quan tâm và biểu đồ thống kê lên dashboard cá nhân, điều chỉnh các mục hiển thị phù hợp với nhu cầu nghiên cứu của mình.[cite: 1] | Thấp |
| **BR-027** | Quản lý Thư viện | Chức năng lưu tài liệu | Người dùng có thể chọn bài báo cụ thể từ kết quả tìm kiếm và lưu vào Thư viện cá nhân (My Library) dưới dạng tham chiếu (Reference).[cite: 1] | Cao |
| **BR-028** | Quản lý Thư viện | Quản lý Bộ sưu tập (Thư mục) | Cho phép tạo, chỉnh sửa, xóa thư mục hoặc bộ sưu tập để phân loại tài liệu. Đảm bảo tính toàn vẹn thư viện nếu bài báo gốc bị xóa.[cite: 1] | Trung bình |
| **BR-029** | Quản lý Thư viện | Cài đặt theo dõi chủ đề quan tâm | Người dùng thiết lập lĩnh vực nghiên cứu hoặc từ khóa cụ thể làm đối tượng theo dõi, có thể xem danh sách bất cứ lúc nào.[cite: 1] | Cao |
| **BR-030** | Quản lý Thư viện | Chức năng thông báo cập nhật | Chức năng gửi thông báo cho người dùng khi có bài báo mới liên quan đến chủ đề theo dõi. Thông báo sẽ tự động bị xóa sau 30 ngày.[cite: 1] | Trung bình |
| **BR-031** | Quản lý Thư viện | Tìm kiếm tài liệu trong thư viện | Người dùng có thể lọc và tìm kiếm tài liệu đã lưu bằng từ khóa hoặc ngày lưu.[cite: 1] | Trung bình |
| **BR-032** | Quản lý Thư viện | Chia sẻ & Xuất thông tin tài liệu | Cho phép chia sẻ danh sách tài liệu đã lưu hoặc xuất thông tin ở định dạng có thể sử dụng bởi phần mềm quản lý thư mục.[cite: 1] | Thấp |
| **BR-033** | Chức năng Hỗ trợ AI | Cung cấp tóm tắt bài báo tự động | AI trích xuất và trình bày ngắn gọn các luận điểm chính từ bài báo. Sinh ra tức thời, không lưu vĩnh viễn vào DB.[cite: 1] | Cao |
| **BR-034** | Chức năng Hỗ trợ AI | Gợi ý tài liệu liên quan động | Tự động đề xuất các bài báo có liên quan cao dựa trên bài báo đang xem hoặc lịch sử tìm kiếm.[cite: 1] | Cao |
| **BR-035** | Chức năng Hỗ trợ AI | Giải thích thuật ngữ chuyên môn | Khi chọn thuật ngữ chuyên môn, AI hiển thị định nghĩa ngắn gọn. Sinh ra tức thời, không lưu vĩnh viễn vào DB.[cite: 1] | Trung bình |
| **BR-036** | Chức năng Hỗ trợ AI | Đề xuất chủ đề & hướng nghiên cứu | Dựa trên lĩnh vực quan tâm và phân tích Research Gap, AI đề xuất các chủ đề nghiên cứu có tính mới cao.[cite: 1] | Cao |
| **BR-037** | Chức năng Hỗ trợ AI | Hiển thị căn cứ phân tích AI | Khi AI thực hiện tóm tắt/đề xuất, trình bày liên kết đến dữ liệu làm căn cứ để đảm bảo tính hợp lệ.[cite: 1] | Trung bình |
| **BR-038** | Quản lý Hệ thống | Quản lý tài khoản người dùng | Quy trình quản lý đăng ký, xác thực và thông tin hồ sơ cho mọi đối tượng sử dụng hệ thống.[cite: 1] | Cao |
| **BR-039** | Quản lý Hệ thống | Kiểm soát truy cập (RBAC) | Định nghĩa quyền hạn theo Role. Quản trị viên quản lý hệ thống, người dùng sử dụng thư viện/phân tích. Role load tức thì cùng Profile.[cite: 1] | Cao |
| **BR-040** | Quản lý Hệ thống | Vận hành & bảo trì hệ thống | Quy trình thay đổi cài đặt hệ thống, duy trì tính toàn vẹn cơ sở dữ liệu.[cite: 1] | Trung bình |
| **BR-041** | Quản lý Hệ thống | Giám sát nhật ký hệ thống | Quy trình ghi lại lịch sử thực thi tìm kiếm, tần suất truy cập (lượt xem, tìm kiếm) và lỗi hệ thống.[cite: 1] | Trung bình |
| **BR-042** | Quản lý Hệ thống | Thu thập phản hồi người dùng | Cơ chế gửi yêu cầu cải thiện hoặc phản hồi về chức năng, Admin tổng hợp và xử lý.[cite: 1] | Thấp |
| **BR-043** | Công cụ Phân tích | Đo lường Unique Views | Khi người dùng xem bài báo, hệ thống ghi nhận 1 lượt view. Mở lại trong vòng 30 phút KHÔNG ghi nhận thêm. Hết 30 phút tính là phiên mới.[cite: 1] | Cao |
| **BR-044** | Dashboard | Thống kê Top Bài báo thịnh hành | Truy xuất và hiển thị danh sách bài báo đọc nhiều nhất (VD: 30 ngày qua) dựa trên Unique Views phục vụ phân tích/AI.[cite: 1] | Cao |

---

## 2. THIẾT KẾ CƠ SỞ DỮ LIỆU (MONGODB DATA MODEL)

Thiết kế kiến trúc hướng Document (Document-Oriented Design), tận dụng triệt để Pattern **Embedded (Nhúng)** nhằm tăng tốc độ truy vấn cho hệ thống Read-Heavy, và sử dụng **Reference (Tham chiếu)** cho dữ liệu có nguy cơ phình to (Unbounded Growth).

### 2.1. Collection: `users`
- **Mục đích:** Quản lý thông tin tài khoản và nhúng toàn bộ các cấu hình/thiết lập riêng. Tránh gọi API hoặc thực hiện lệnh `$lookup` nhiều lần.

```json
{
  "_id": ObjectId("64a1b2c..."), 
  "email": "student@university.edu.vn",
  "password_hash": "$2b$10$...",
  "full_name": "Nguyễn Văn A",
  "status": "Active", // Enum: Active, Inactive, Banned
  "created_at": ISODate("2026-07-03T00:00:00Z"),
  
  // Embedded Arrays (Các cài đặt cá nhân)
  "roles": ["Student"], 
  "saved_searches": [
    {
      "search_id": UUID("..."), 
      "name": "Machine Learning Healthcare 2026",
      "criteria": { "year_gte": 2026, "keywords": ["ML", "Healthcare"] },
      "created_at": ISODate("2026-07-03T01:00:00Z")
    }
  ],
  "followed_subjects": [
    {
      "follow_id": UUID("..."),
      "type": "Keyword", // Enum: Keyword, Field
      "value": "Artificial Intelligence",
      "created_at": ISODate("2026-07-03T02:00:00Z")
    }
  ]
}