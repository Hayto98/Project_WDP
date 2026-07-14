# 📊 BÁO CÁO KẾT QUẢ KIỂM THỬ (TEST workspace)
**Tính năng:** Workspace & Task Management

### 1. Chức năng Mời thành viên & Gửi Email (Workspace Invitation)
**Trạng thái:** ⚠️ Hoạt động nhưng cần cải thiện
**Chi tiết test:**
* **[✅ PASS]** Hệ thống đã gửi email thành công khi mời người mới.
* **[✅ PASS]** Luồng (Flow) tham gia hoạt động đúng: Người được mời nhận email ➔ Click link ➔ Đăng nhập ➔ Vào workspace ➔ Chấp nhận lời mời.
* **[🐛 BUG/ISSUE] Email vào thẳng thùng rác (Spam):** Cần cấu hình lại dịch vụ gửi mail (ví dụ: thiết lập thêm các bản ghi DNS như SPF, DKIM, DMARC cho domain gửi thư) để tăng độ tin cậy.
* **[🐛 BUG/ISSUE] Link trong email là Localhost:** Hệ thống đang gửi link chứa localhost. Dẫn đến việc người ở máy tính khác (không chạy code backend/frontend) khi click vào link sẽ báo lỗi không truy cập được. Cần cấu hình linh động URL frontend dựa trên môi trường (Dev thì dùng localhost, Prod thì dùng domain thật).

### 2. Vấn đề Triển khai (Deployment - Vercel & Môi trường)
**Trạng thái:** ❌ Lỗi cấu hình môi trường
**Chi tiết test:**
* **[🐛 BUG/ISSUE] Vercel không gọi được API Backend:** Bản deploy trên Vercel hiện tại vẫn đang cố gọi API về cổng 5001 (hoặc localhost).
* **💡 Giải pháp:** Lỗi này không phải do code sai, mà do cấu hình biến môi trường trên Vercel chưa đúng. Bạn cần vào Dashboard của Vercel ➔ Chọn Project Frontend ➔ Settings ➔ Environment Variables ➔ Sửa lại biến VITE_API_BASE_URL trỏ về đường dẫn URL thật của Backend sau khi đã deploy (ví dụ: https://api-backend-cuaban.com/api/v1), tuyệt đối không để là http://localhost... trên Vercel.

### 3. Quản lý Task & Quản lý Bài báo (Task Management)
**Trạng thái:** ⚠️ Hoạt động nhưng có lỗi Logic về chia sẻ dữ liệu
**Chi tiết test:**
* **[✅ PASS]** Chức năng Tạo Task cơ bản hoạt động thành công.
* **[⚠️ HẠN CHẾ] Chức năng Search bài báo chưa hoạt động:** Hiện tại, người dùng chỉ có thể thêm bài báo vào task thông qua danh sách bài báo "gợi ý", chưa thể tự search tự do.
* **[🐛 BUG NGHIÊM TRỌNG] Không đồng bộ dữ liệu bài báo trong Workspace:**
  * **Mô tả lỗi:** Do bài báo gắn vào task được lấy từ "Thư viện cá nhân" của người tạo. Nên khi một thành viên khác (được mời) vào xem task này, họ chỉ nhìn thấy tiêu đề chứ không thấy nội dung bài báo (vì thư viện cá nhân của thành viên đó không có sẵn bài báo này).
  * **Hướng khắc phục (Đề xuất cho Dev):** Khi một bài báo được thêm vào Task thuộc Workspace, bài báo đó phải được sao chép hoặc cấp quyền truy cập chung cho toàn bộ Workspace, thay vì chỉ phụ thuộc vào thư viện cá nhân của người tạo.

### 4. Phân quyền (Roles & Permissions)
**Trạng thái:** ✅ Hoạt động đúng thiết kế
**Chi tiết test:**
* **[✅ PASS]** Owner (Người tạo Workspace): Được phân quyền Owner chính xác, có toàn quyền quản trị, bao gồm cả quyền xóa Workspace/Task.
* **[✅ PASS]** Member (Người được mời): Bị giới hạn quyền chính xác theo vai trò Editor/Member. Không thể xóa, chỉ có quyền thao tác trên task (thoát task, giao lại task...).

---

# 📊 BÁO CÁO KIỂM THỬ — THƯ VIỆN & BỘ SƯU TẬP (Library) — 14/7/2026

### 5. Quản lý Bộ sưu tập & Bài báo đã lưu (Library Collections)
**Trạng thái:** ✅ Đã sửa xong các lỗi chính
**Chi tiết test:**
* **[✅ FIXED] Đổi bộ sưu tập của bài báo không lưu:** Trước đây đổi bộ sưu tập không lưu xuống backend (chỉ đổi trên giao diện). Đã sửa `updateItem` để gọi `savePaper`/`removePaper` + tải lại danh sách → lưu đúng.
* **[✅ DONE] Một bài thuộc nhiều bộ sưu tập cùng lúc:** `papers()` gộp các bản ghi cùng `paperId` thành 1 dòng mang đủ `collectionIds`; picker trở lại kiểu "chọn nhiều" (toggle thêm/bỏ từng bộ). Trạng thái đọc & ghi chú là cấp bài báo → đổi sẽ áp cho tất cả bộ chứa bài.
* **[✅ FIXED] Không xóa được bài trong bộ sưu tập:** Trước là hệ quả của state `collectionIds` lệch. Nay nút "Bỏ lưu" gỡ bài khỏi **tất cả** bộ sưu tập chứa nó.
* **[✅ PASS] Giữ trạng thái đọc khi thêm vào bộ mới:** Trạng thái `reading`/`done` được khôi phục sau khi thêm bài vào bộ sưu tập mới (vì `savePaper` mặc định tạo "chưa đọc").
* **[ℹ️ GHI CHÚ] Mô hình dữ liệu:** Backend/DB vốn đã hỗ trợ một bài ở nhiều bộ sưu tập (`savePaper` nhận mảng `collection_ids`; model `UserCollection.saved_papers[]` không có ràng buộc duy nhất). Việc "1 bài nhiều bộ" nay đã bật ở cả frontend.
