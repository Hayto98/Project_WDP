# 📝 Tú sửa workspace và những cái đã làm và chưa làm dc 13/7/2026

## ✅ NHỮNG VIỆC ĐÃ LÀM (DONE)

### 1. Đồng bộ và chia sẻ tài liệu trong Workspace
- Khắc phục thành công lỗi thành viên (được mời) không xem được nội dung bài báo của người tạo. 
- Thay vì chỉ phụ thuộc vào thư viện cá nhân (`libraryPapers`), giờ đây hệ thống tự động nhận diện các tài liệu đã được gán vào Task và cấp quyền hiển thị cho tất cả mọi người trong Workspace đó.
- Cập nhật luồng dữ liệu ở `WorkspaceDetail` để dropdown "Bài liên kết" hiển thị chính xác tiêu đề bài báo cho tất cả thành viên.

### 2. Thêm tính năng "Bài báo đã lưu" (Workspace Papers)
- Thêm giao diện danh sách các bài báo có trong Workspace, giúp nhóm dễ dàng xem toàn bộ tài liệu nghiên cứu chung ở một nơi duy nhất.
- Bổ sung nút **"Bài báo đã lưu"** trên thanh công cụ của Workspace.
- Danh sách hiển thị đầy đủ tiêu đề, năm xuất bản, tác giả và **nội dung tóm tắt (Abstract)** để dễ dàng đọc trực tiếp.

### 3. Cấu hình kết nối API ở môi trường Local(này là máy Tú còn ae thì ko biết có vậy ko tại tú 5000 ở .env mới dùng dc)
- Cập nhật lại biến môi trường `.env` ở Frontend để gọi API về cổng `5000` thay vì cổng `5001` (khắc phục lỗi kết nối Backend trong quá trình kiểm thử cục bộ).


## ❌ NHỮNG VIỆC CHƯA LÀM (TO-DO / BUGS CẦN XỬ LÝ)

### 2. Cấu hình chống Spam cho Email
- Thư mời được gửi thành công nhưng đang **bị rơi vào thùng rác (Spam)**.
- **Giải pháp:** Cần cấu hình các bản ghi xác thực DNS (như SPF, DKIM, DMARC) cho domain dùng để gửi email nhằm tăng độ tin cậy.

### 3. Sửa Link Localhost trong nội dung Email 
- Link chấp nhận lời mời trong thư hiện tại đang bị hard-code hoặc sinh ra dưới dạng `localhost`. Nếu người nhận mở trên máy khác sẽ không truy cập được.
- **Giải pháp:** Cần sửa lại cách Backend sinh ra đường link, phải lấy URL Frontend thực tế từ biến môi trường (ví dụ `FRONTEND_URL`) thay vì dùng localhost cho môi trường Production.

### 4. Lỗi kết nối API trên bản Deploy (Vercel)
- Bản deploy web trên Vercel vẫn đang bị lỗi gọi nhầm về Backend ở cổng 5001 (hoặc localhost).
- **Giải pháp:** Không phải sửa code, mà cần truy cập vào Dashboard của Vercel, chỉnh sửa Environment Variable `VITE_API_BASE_URL` trỏ thẳng tới domain đã deploy của Backend.

### 5. Tính năng Search bài báo trực tiếp
- Hiện tại khi thêm bài báo vào hệ thống để tạo task, người dùng chỉ dùng được chức năng lấy từ "gợi ý". Chức năng tìm kiếm tự do (Search) chưa hoạt động hoàn chỉnh.
