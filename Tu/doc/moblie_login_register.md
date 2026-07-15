# Chức năng Đăng nhập và Đăng ký (Login & Register)

Tài liệu này mô tả các chức năng đã được xây dựng cho luồng xác thực người dùng trong ứng dụng.

## 1. Mục đích
Cung cấp khả năng định danh người dùng, bảo mật thông tin cá nhân và lưu trữ dữ liệu thư viện cá nhân hóa (bộ sưu tập, bài báo đã lưu). Ứng dụng hỗ trợ cả ứng dụng Web và Mobile (React Native Expo) dùng chung hệ thống Backend.

## 2. Các chức năng chính đã triển khai

### 2.1. Đăng ký (Register)
- **Giao diện:** Cung cấp biểu mẫu (Form) điền thông tin Đăng ký gồm: Tên hiển thị, Email, và Mật khẩu.
- **Xử lý:** 
  - Validate dữ liệu đầu vào.
  - Gửi request đến API `POST /auth/register` hoặc tương đương ở Backend.
  - Xử lý lỗi từ server (Email đã tồn tại, lỗi mạng).
  - Tự động chuyển hướng hoặc đăng nhập sau khi tạo tài khoản thành công.

### 2.2. Đăng nhập (Login)
- **Giao diện:** Form đăng nhập gồm Email và Mật khẩu.
- **Xử lý:** 
  - Gửi thông tin đến API `POST /auth/login`.
  - Backend trả về cặp `accessToken` và `refreshToken` cùng thông tin User.
  - **Lưu trữ bảo mật:** Trên Mobile, lưu trữ Token bằng `AsyncStorage` (hoặc `SecureStore`) để duy trì phiên đăng nhập sau khi tắt app. Trên Web lưu trong `localStorage` hoặc `cookies`.
  - Điều hướng người dùng vào màn hình chính (Dashboard) nếu thành công.

### 2.3. Đăng xuất (Logout)
- Cung cấp nút Đăng xuất trong màn hình Profile / Menu.
- Xóa bỏ `accessToken` và `refreshToken` khỏi bộ nhớ cục bộ.
- Xóa trạng thái người dùng trong state của ứng dụng.
- Đẩy người dùng về lại màn hình Đăng nhập.

### 2.4. Duy trì trạng thái (Session Management)
- Tự động kiểm tra token hợp lệ khi mở ứng dụng.
- Nếu token hết hạn, ứng dụng có thể xử lý việc refresh token (nếu cấu hình) hoặc yêu cầu người dùng đăng nhập lại, bảo vệ các endpoint cần xác thực như chức năng Thư viện.
