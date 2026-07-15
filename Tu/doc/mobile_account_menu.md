# Quản lý Tài khoản & Menu (Mobile Account Menu)

## Mô tả chức năng
Khu vực **Menu & Tài khoản** đóng vai trò là trung tâm điều hướng cá nhân và quản lý bảo mật của người dùng trên ứng dụng Mobile, được thiết kế đồng bộ với hệ thống dữ liệu Web.

## Các thành phần chính
1. **Giao diện Menu (`menu.tsx`)**:
   - **Profile Card**: Nằm ở vị trí trung tâm, hiển thị Avatar (chữ cái đầu của tên), Họ tên đầy đủ (`full_name`) và Email lấy từ Context Authentication.
   - **Tính năng**: Danh sách các phím tắt điều hướng nhanh tới Workspace, Danh sách Theo dõi (Follow), và Research Gap.
   - **Tài khoản & Đăng xuất**: Cung cấp nút để truy cập màn hình cài đặt tài khoản chi tiết, và phím Đăng xuất an toàn.

2. **Giao diện Tài khoản Chi tiết (`account.tsx`)**:
   - Chạy trên một màn hình độc lập (Stack Screen) có nút Back để quay về Menu.
   - **Cập nhật Profile**: 
     - Hiển thị Vai trò (Role) và Trạng thái hoạt động (Active/Banned) của người dùng ở dạng Text nổi bật.
     - Ô nhập Họ tên (cho phép chỉnh sửa) và ô Email (bị khóa để đảm bảo đồng nhất định danh). Nút "Lưu thông tin" gọi API `updateProfile`.
   - **Đổi mật khẩu bảo mật**:
     - Form đổi mật khẩu yêu cầu nhập Mật khẩu hiện tại, Mật khẩu mới và Nhập lại mật khẩu mới. Tích hợp validate chống lệch pass.
   - **Chat phản hồi với Admin (Feedback Chat)**:
     - Tối ưu hóa cho di động bằng cách dùng thanh cuộn ngang (Horizontal ScrollView) cho danh sách các luồng chat (Threads) kết hợp tag Trạng thái.
     - Khung hội thoại hiển thị tin nhắn dưới dạng Chat Bubbles. Cho phép gửi góp ý mới và nhận phản hồi trực tiếp từ hệ thống Admin API.
