# Danh sách yêu cầu chức năng


| id | Tên chức năng | Mô tả | Yêu cầu liên quan | Độ ưu tiên |
| --- | --- | --- | --- | --- |
| FR-001 | Xử lý batch thu thập dữ liệu bên ngoài | Chức năng tự động thực thi để định kỳ lấy metadata bài báo từ các API học thuật (OpenAlex, Semantic Scholar, Crossref, arXiv, IEEE Xplore, ACM Digital Library) và đưa vào Research Corpus. Chỉ thu thập metadata, không lưu toàn văn. ※Cần xác nhận: Tần suất thực thi | BR-001, BR-004 | Cao |
| FR-002 | Chuẩn hóa dữ liệu bài báo & loại bỏ trùng lặp | Xử lý backend chuyển đổi dữ liệu thu thập sang schema chung (tiêu đề, abstract, từ khóa, tác giả, năm, nguồn, DOI), làm sạch dữ liệu thiếu/không nhất quán, và hợp nhất bản trùng dựa trên DOI (và tiêu đề khi thiếu DOI). | BR-002, BR-003, BR-005, BR-020 | Cao |
| FR-003 | Công cụ tìm kiếm bài báo | Cung cấp tìm kiếm theo từ khóa, tiêu đề, tác giả, lĩnh vực, năm xuất bản; lọc theo thuộc tính; truy vấn nâng cao (AND/OR/NOT); sắp xếp kết quả theo mức độ liên quan, năm, số trích dẫn. | BR-009, BR-010, BR-011, BR-012 | Cao |
| FR-004 | Màn hình hiển thị chi tiết bài báo | Hiển thị metadata bài báo, abstract từ nguồn gốc và liên kết ra bản gốc bên ngoài (publisher/arXiv). Ghi nhận lượt xem (Unique Views) khi người dùng mở chi tiết. | BR-013, BR-043 | Cao |
| FR-005 | Công cụ phân tích xu hướng | Xử lý backend thống kê số lượng bài báo theo thời gian, tính tốc độ tăng trưởng và gợi ý từ khóa/chủ đề liên quan dựa trên cấu trúc liên kết trong Research Corpus. | BR-015, BR-016, BR-017 | Cao |
| FR-006 | Xử lý phát hiện Research Gap | Phân tích so sánh mật độ công bố giữa các chủ đề để xác định lĩnh vực có tiềm năng nhưng ít bài báo (Research Gap). | BR-018 | Cao |
| FR-007 | Dashboard trực quan hóa | Frontend hiển thị biểu đồ xu hướng theo thời gian, heatmap Research Gap, Top bài báo thịnh hành và kết quả phân tích AI trên dashboard tổng quan. | BR-022, BR-023, BR-024, BR-044 | Cao |
| FR-008 | Chức năng quản lý Thư viện cá nhân | CRUD lưu bài báo dưới dạng tham chiếu, tạo/sửa/xóa thư mục phân loại, tìm kiếm trong thư viện. Đảm bảo toàn vẹn thư viện khi bài gốc bị xóa hoặc archive. | BR-027, BR-028, BR-031 | Cao |
| FR-009 | Chức năng hỗ trợ & tóm tắt bài báo bằng AI | AI tóm tắt dựa trên abstract/metadata, gợi ý tài liệu liên quan, giải thích thuật ngữ, đề xuất hướng nghiên cứu từ Research Gap và hiển thị căn cứ phân tích. Không phân tích toàn văn. ※Cần xác nhận: LLM API sử dụng | BR-033, BR-034, BR-035, BR-036, BR-037 | Cao |
| FR-010 | Theo dõi chủ đề & thông báo | Người dùng thiết lập từ khóa/lĩnh vực theo dõi, xem danh sách bất cứ lúc nào; hệ thống thông báo khi có bài mới liên quan (thông báo tự xóa sau 30 ngày). ※Cần xác nhận: Kênh thông báo | BR-029, BR-030 | Cao |
| FR-011 | Chức năng quản lý người dùng | Đăng ký, đăng nhập, quản lý hồ sơ và kiểm soát quyền truy cập theo RBAC. | BR-038, BR-039 | Cao |
| FR-012 | Dashboard quản trị | Màn hình Admin giám sát lỗi thu thập/kết nối API, xem log hệ thống, cấu hình và mở rộng nguồn dữ liệu, vận hành Research Corpus. | BR-007, BR-008, BR-040, BR-041 | Trung bình |
| FR-013 | Hiển thị báo cáo phân tích | Hiển thị số liệu thống kê theo điều kiện tìm kiếm/phân tích dưới dạng báo cáo tóm tắt trên giao diện; tự động tạo/cập nhật báo cáo định kỳ. | BR-021, BR-025 | Trung bình |
