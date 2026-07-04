# Product

## Register

product

## Users

Hệ thống phục vụ ba nhóm persona học thuật, tất cả gộp vào role RBAC **Student**, cùng một nhóm **Admin** vận hành:

- **Sinh viên** — tìm tài liệu tham khảo chính thống nhanh, khám phá chủ đề phù hợp năng lực, theo dõi xu hướng phục vụ đồ án/luận văn. Bối cảnh: thường làm việc dưới áp lực thời gian, ít kinh nghiệm sàng lọc nguồn.
- **Giảng viên** — theo dõi sự phát triển tổng thể của lĩnh vực, định hướng đề tài tốt nghiệp cho sinh viên, đánh giá mức độ bão hòa của chủ đề.
- **Nhà nghiên cứu** — tìm hướng đi tiên phong, phân tích sự tiến hóa công nghệ cốt lõi, xác định Research Gap để làm đề tài cấp cơ sở/cấp bộ.
- **Quản trị viên (Admin)** — giám sát batch thu thập dữ liệu, xem log, cấu hình nguồn dữ liệu, vận hành Research Corpus, quản lý người dùng.

Công việc cần hoàn thành (job-to-be-done): **quyết định hướng nghiên cứu dựa trên dữ liệu thay vì cảm tính** — biết chủ đề nào đang tăng trưởng, đâu là khoảng trống, và tránh chọn đề tài đã bão hòa.

## Product Purpose

Hệ thống theo dõi xu hướng nghiên cứu khoa học (Scientific Research Trend Tracking System) là nền tảng tổng hợp metadata bài báo từ các nguồn học thuật uy tín (OpenAlex, Semantic Scholar, Crossref, arXiv, IEEE Xplore, ACM Digital Library) vào một Research Corpus trung tâm, rồi phân tích để chỉ ra xu hướng, chủ đề mới nổi và Research Gap.

Khác với công cụ tìm kiếm học thuật truyền thống chỉ trả về danh sách bài báo, sản phẩm tập trung vào **phân tích và trực quan hóa xu hướng**: thống kê công bố theo thời gian, phát hiện chủ đề tăng trưởng nóng, so sánh mật độ công bố để định vị khoảng trống, và hỗ trợ AI (tóm tắt abstract, giải thích thuật ngữ, gợi ý hướng nghiên cứu).

Thành công = người dùng giảm mạnh thời gian tìm kiếm thủ công, chọn được đề tài mới (novelty cao, tránh trùng lặp), và ra quyết định dựa trên số liệu thực tế.

## Brand Personality

**Đáng tin cậy · Nghiêm túc · Chuẩn xác.**

Giọng điệu học thuật, điềm tĩnh, tôn trọng chuyên môn người dùng. Giao diện phải toát lên cảm giác đây là một công cụ đáng tin để đưa ra quyết định nghiên cứu quan trọng — dữ liệu được trình bày minh bạch, có căn cứ, không phóng đại. Ưu tiên sự rõ ràng và độ tin cậy hơn là hào nhoáng.

Tham chiếu cảm giác & trải nghiệm: **Semantic Scholar** (độ tin cậy học thuật), **Connected Papers / Litmaps** (trực quan hóa liên kết dữ liệu), **Linear / Vercel** (dashboard tinh gọn, hiện đại, mật độ thông tin cao mà vẫn thoáng), **Notion** (tổ chức thư viện/nội dung linh hoạt).

## Anti-references

- **Không** vui nhộn/sặc sỡ: tránh bảng màu rực rỡ, minh họa nhí nhố, hiệu ứng làm mất tính nghiêm túc học thuật.
- **Không** doanh nghiệp cứng nhắc nhàm chán: tránh khuôn mẫu navy + vàng kim, corporate stock, cảm giác nặng nề khô khan.
- Tránh các tell SaaS chung chung (gradient text, hero-metric template, lưới card icon-heading-text lặp lại vô tận) và giao diện dày đặc dữ liệu kiểu trang tra cứu cũ.

## Design Principles

1. **Dữ liệu là nhân vật chính.** Mọi màn hình phục vụ việc đọc-hiểu số liệu và ra quyết định; trang trí không được lấn át tín hiệu. Biểu đồ, xu hướng và Research Gap phải dễ đọc trong vài giây.
2. **Tin cậy qua sự minh bạch.** Luôn thể hiện nguồn dữ liệu, thời điểm cập nhật và căn cứ phân tích (đặc biệt với kết quả AI). Người dùng học thuật tin vào thứ họ kiểm chứng được.
3. **Rõ ràng hơn hào nhoáng.** Ưu tiên phân cấp thông tin mạch lạc và mật độ hợp lý theo phong cách Linear/Vercel — thoáng nhưng hiệu quả — thay vì hiệu ứng gây chú ý.
4. **Tôn trọng thời gian người dùng.** Tìm kiếm, lọc và phân tích phải nhanh (mục tiêu ≤ 3s) và tối thiểu số bước; giảm ma sát ở luồng tìm → xem chi tiết → lưu thư viện → theo dõi.
5. **Phân biệt rõ Student và Admin.** Trải nghiệm khám phá/phân tích (Student) và trải nghiệm vận hành/giám sát (Admin) là hai ngữ cảnh khác nhau, thiết kế để không lẫn lộn.

## Accessibility & Inclusion

- **WCAG 2.1 AA**: tương phản text ≥ 4.5:1 (text lớn ≥ 3:1), trạng thái focus rõ ràng, thao tác đầy đủ bằng bàn phím.
- **Giao diện tiếng Việt** là ngôn ngữ chính (nhãn, điều hướng, thông báo); dữ liệu bài báo/abstract giữ nguyên tiếng Anh gốc.
- **Hỗ trợ Dark mode** song song với Light mode; cả hai đều đạt chuẩn tương phản.
- **Tôn trọng `prefers-reduced-motion`** (thay animation bằng crossfade/tức thời) và không dùng màu làm kênh thông tin duy nhất (an toàn cho người mù màu — quan trọng với heatmap Research Gap và biểu đồ xu hướng).
