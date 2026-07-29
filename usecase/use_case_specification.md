# Use Case Specification — WDP (Web of Data Papers)

> Tài liệu mô tả Use Case chuẩn cho hệ thống web, được trích xuất từ phân tích toàn bộ source code backend (routes, controllers, models, middleware).

---

## 1. Actors (Tác nhân)

| Actor | Mô tả | Xác thực |
|-------|--------|----------|
| **Guest** (Khách) | Người dùng chưa đăng nhập, có quyền truy cập hạn chế | Không yêu cầu |
| **Student** (Sinh viên / Nhà nghiên cứu) | Người dùng đã đăng ký và đăng nhập, role mặc định | JWT Bearer Token |
| **Admin** (Quản trị viên) | Người quản trị hệ thống, có toàn quyền quản lý | JWT Bearer Token + RBAC `Admin` |
| **System** (Hệ thống) | Các tác vụ tự động: crawler, scheduler, AI engine | Internal service |

---

## 2. Use Case Diagram (Mermaid)

```mermaid
graph TB
    subgraph Actors
        Guest["🧑 Guest"]
        Student["🎓 Student"]
        Admin["🔑 Admin"]
        System["⚙️ System"]
    end

    subgraph UC_Auth["Authentication & Account"]
        UC01["UC-01: Đăng ký tài khoản"]
        UC02["UC-02: Đăng nhập"]
        UC03["UC-03: Đăng xuất"]
        UC04["UC-04: Làm mới token"]
        UC05["UC-05: Đổi mật khẩu"]
        UC06["UC-06: Quên mật khẩu"]
        UC07["UC-07: Đặt lại mật khẩu"]
        UC08["UC-08: Xem thông tin cá nhân"]
        UC09["UC-09: Cập nhật hồ sơ"]
        UC10["UC-10: Tùy chỉnh layout Dashboard"]
    end

    subgraph UC_Paper["Paper Management"]
        UC11["UC-11: Tìm kiếm bài báo"]
        UC12["UC-12: Xem danh sách nguồn dữ liệu"]
        UC13["UC-13: Xem chi tiết bài báo"]
        UC14["UC-14: Xem bài báo thịnh hành"]
        UC15["UC-15: Yêu cầu đồng bộ corpus"]
        UC16["UC-16: Bắt đầu phiên đọc bài báo"]
        UC17["UC-17: Cập nhật phiên đọc"]
    end

    subgraph UC_Library["Personal Library"]
        UC18["UC-18: Xem danh sách bộ sưu tập"]
        UC19["UC-19: Tạo bộ sưu tập"]
        UC20["UC-20: Cập nhật bộ sưu tập"]
        UC21["UC-21: Xóa bộ sưu tập"]
        UC22["UC-22: Xem bài báo đã lưu"]
        UC23["UC-23: Lưu bài báo vào thư viện"]
        UC24["UC-24: Cập nhật bài báo đã lưu"]
        UC25["UC-25: Xóa bài báo khỏi thư viện"]
    end

    subgraph UC_Search["Saved Searches"]
        UC26["UC-26: Xem tìm kiếm đã lưu"]
        UC27["UC-27: Tạo tìm kiếm đã lưu"]
        UC28["UC-28: Xóa tìm kiếm đã lưu"]
    end

    subgraph UC_Follow["Follow & Alerts"]
        UC29["UC-29: Xem chủ đề đang theo dõi"]
        UC30["UC-30: Theo dõi chủ đề mới"]
        UC31["UC-31: Cập nhật chủ đề theo dõi"]
        UC32["UC-32: Hủy theo dõi chủ đề"]
        UC33["UC-33: Xem cảnh báo"]
        UC34["UC-34: Đánh dấu đã đọc cảnh báo"]
        UC35["UC-35: Đánh dấu tất cả cảnh báo đã đọc"]
    end

    subgraph UC_Collab["Collaboration"]
        UC36["UC-36: Tìm kiếm nhà nghiên cứu"]
        UC37["UC-37: Xem lời mời cộng tác"]
        UC38["UC-38: Gửi lời mời cộng tác"]
        UC39["UC-39: Phản hồi lời mời"]
        UC40["UC-40: Hủy lời mời"]
    end

    subgraph UC_Workspace["Workspace"]
        UC41["UC-41: Xem danh sách workspace"]
        UC42["UC-42: Tạo workspace"]
        UC43["UC-43: Xem chi tiết workspace"]
        UC44["UC-44: Cập nhật workspace"]
        UC45["UC-45: Xóa workspace"]
        UC46["UC-46: Thêm thành viên"]
        UC47["UC-47: Cập nhật vai trò thành viên"]
        UC48["UC-48: Xóa thành viên"]
        UC49["UC-49: Xem work items"]
        UC50["UC-50: Tạo work item"]
        UC51["UC-51: Cập nhật work item"]
        UC52["UC-52: Xóa work item"]
        UC53["UC-53: Thêm comment vào work item"]
        UC54["UC-54: Sửa comment"]
        UC55["UC-55: Xóa comment"]
        UC56["UC-56: Xem lịch sử hoạt động"]
    end

    subgraph UC_Analytics["Analytics & Insights"]
        UC57["UC-57: Xem xu hướng nghiên cứu"]
        UC58["UC-58: Xem tăng trưởng xu hướng"]
        UC59["UC-59: Xem co-occurrence từ khóa"]
        UC60["UC-60: Xem khoảng trống nghiên cứu"]
        UC61["UC-61: Phân tích gap trực tiếp (live)"]
        UC62["UC-62: Lưu báo cáo gap live"]
        UC63["UC-63: Phân tích trend trực tiếp (live)"]
        UC64["UC-64: Lưu báo cáo trend live"]
        UC65["UC-65: Xem báo cáo trend đã lưu"]
    end

    subgraph UC_AI["AI Features"]
        UC66["UC-66: Tóm tắt bài báo (AI)"]
        UC67["UC-67: Giải thích thuật ngữ (AI)"]
        UC68["UC-68: Gợi ý hướng nghiên cứu (AI)"]
        UC69["UC-69: Tìm bài báo liên quan (AI)"]
        UC70["UC-70: Xem AI insights"]
    end

    subgraph UC_Notification["Notifications"]
        UC71["UC-71: Xem thông báo"]
        UC72["UC-72: Xem số thông báo chưa đọc"]
        UC73["UC-73: Đánh dấu thông báo đã đọc"]
        UC74["UC-74: Đánh dấu tất cả đã đọc"]
    end

    subgraph UC_Feedback["Feedback"]
        UC75["UC-75: Gửi feedback"]
        UC76["UC-76: Xem danh sách feedback"]
        UC77["UC-77: Xem chi tiết feedback"]
        UC78["UC-78: Trả lời feedback"]
    end

    subgraph UC_Dashboard["Dashboard"]
        UC79["UC-79: Xem tổng quan dashboard"]
    end

    subgraph UC_Admin["Admin Management"]
        UC80["UC-80: Xem danh sách người dùng"]
        UC81["UC-81: Tạo người dùng mới"]
        UC82["UC-82: Cập nhật người dùng"]
        UC83["UC-83: Xem nguồn dữ liệu (Admin)"]
        UC84["UC-84: Cập nhật nguồn dữ liệu"]
        UC85["UC-85: Cập nhật credentials nguồn"]
        UC86["UC-86: Xóa credentials nguồn"]
        UC87["UC-87: Kiểm tra API nguồn"]
        UC88["UC-88: Test nguồn dữ liệu"]
        UC89["UC-89: Xem danh sách crawler jobs"]
        UC90["UC-90: Tạo crawler job"]
        UC91["UC-91: Chạy crawler job"]
        UC92["UC-92: Làm mới báo cáo phân tích"]
        UC93["UC-93: Xem audit logs"]
        UC94["UC-94: Xem paper read logs"]
        UC95["UC-95: Xem thống kê hệ thống"]
        UC96["UC-96: Phát sóng thông báo hệ thống"]
        UC97["UC-97: Cập nhật trạng thái feedback"]
        UC98["UC-98: Xem số feedback chờ xử lý"]
    end

    %% Actor → Use Case connections
    Guest --> UC01
    Guest --> UC02
    Guest --> UC06
    Guest --> UC07
    Guest --> UC11
    Guest --> UC12
    Guest --> UC13
    Guest --> UC15

    Student --> UC03
    Student --> UC04
    Student --> UC05
    Student --> UC08
    Student --> UC09
    Student --> UC10
    Student --> UC14
    Student --> UC16
    Student --> UC17
    Student --> UC18
    Student --> UC19
    Student --> UC20
    Student --> UC21
    Student --> UC22
    Student --> UC23
    Student --> UC24
    Student --> UC25
    Student --> UC26
    Student --> UC27
    Student --> UC28
    Student --> UC29
    Student --> UC30
    Student --> UC31
    Student --> UC32
    Student --> UC33
    Student --> UC34
    Student --> UC35
    Student --> UC36
    Student --> UC37
    Student --> UC38
    Student --> UC39
    Student --> UC40
    Student --> UC41
    Student --> UC42
    Student --> UC43
    Student --> UC44
    Student --> UC45
    Student --> UC46
    Student --> UC47
    Student --> UC48
    Student --> UC49
    Student --> UC50
    Student --> UC51
    Student --> UC52
    Student --> UC53
    Student --> UC54
    Student --> UC55
    Student --> UC56
    Student --> UC57
    Student --> UC58
    Student --> UC59
    Student --> UC60
    Student --> UC61
    Student --> UC62
    Student --> UC63
    Student --> UC64
    Student --> UC65
    Student --> UC66
    Student --> UC67
    Student --> UC68
    Student --> UC69
    Student --> UC70
    Student --> UC71
    Student --> UC72
    Student --> UC73
    Student --> UC74
    Student --> UC75
    Student --> UC76
    Student --> UC77
    Student --> UC78
    Student --> UC79

    Admin --> UC80
    Admin --> UC81
    Admin --> UC82
    Admin --> UC83
    Admin --> UC84
    Admin --> UC85
    Admin --> UC86
    Admin --> UC87
    Admin --> UC88
    Admin --> UC89
    Admin --> UC90
    Admin --> UC91
    Admin --> UC92
    Admin --> UC93
    Admin --> UC94
    Admin --> UC95
    Admin --> UC96
    Admin --> UC97
    Admin --> UC98

    System --> UC91
    System --> UC92
```

---

## 3. Use Case Descriptions (Chi tiết)

---

### 3.1. Authentication & Account Management

---

#### UC-01: Đăng ký tài khoản

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-01 |
| **Tên** | Đăng ký tài khoản |
| **Actor** | Guest |
| **Mô tả** | Người dùng mới tạo tài khoản trên hệ thống |
| **Tiền điều kiện** | Không có tài khoản với email đã nhập |
| **Luồng chính** | 1. Guest truy cập trang đăng ký<br>2. Nhập email, mật khẩu, họ tên đầy đủ<br>3. Hệ thống validate dữ liệu (registerSchema)<br>4. Hệ thống kiểm tra email chưa tồn tại<br>5. Hệ thống hash mật khẩu và tạo User mới với role `Student`<br>6. Trả về token và thông tin user |
| **Luồng thay thế** | 4a. Email đã tồn tại → trả lỗi 409 |
| **Hậu điều kiện** | Tài khoản được tạo, user có thể đăng nhập |
| **Rate Limit** | `authLimiter` |
| **API** | `POST /api/v1/auth/register` |

---

#### UC-02: Đăng nhập

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-02 |
| **Tên** | Đăng nhập |
| **Actor** | Guest |
| **Mô tả** | Người dùng xác thực để truy cập hệ thống |
| **Tiền điều kiện** | Đã có tài khoản hợp lệ |
| **Luồng chính** | 1. Guest nhập email và mật khẩu<br>2. Hệ thống validate (loginSchema)<br>3. Kiểm tra email tồn tại và mật khẩu khớp<br>4. Tạo cặp access token + refresh token<br>5. Trả về tokens và thông tin user |
| **Luồng thay thế** | 3a. Sai thông tin → trả lỗi 401 |
| **Hậu điều kiện** | User nhận JWT tokens, có thể truy cập các API cần xác thực |
| **Rate Limit** | `authLimiter` |
| **API** | `POST /api/v1/auth/login` |

---

#### UC-03: Đăng xuất

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-03 |
| **Tên** | Đăng xuất |
| **Actor** | Student, Admin |
| **Mô tả** | Người dùng kết thúc phiên làm việc |
| **Tiền điều kiện** | Đã đăng nhập |
| **Luồng chính** | 1. User gửi yêu cầu logout<br>2. Hệ thống vô hiệu hóa refresh token<br>3. Trả về thông báo thành công |
| **Hậu điều kiện** | Token bị thu hồi, không thể dùng lại |
| **API** | `POST /api/v1/auth/logout` |

---

#### UC-04: Làm mới token

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-04 |
| **Tên** | Làm mới access token |
| **Actor** | Student, Admin |
| **Mô tả** | Sử dụng refresh token để lấy access token mới khi hết hạn |
| **Tiền điều kiện** | Có refresh token hợp lệ |
| **Luồng chính** | 1. Client gửi refresh token<br>2. Hệ thống validate và xác minh token<br>3. Cấp access token mới |
| **Luồng thay thế** | 2a. Refresh token hết hạn/không hợp lệ → lỗi 401 |
| **API** | `POST /api/v1/auth/refresh` |

---

#### UC-05: Đổi mật khẩu

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-05 |
| **Tên** | Đổi mật khẩu |
| **Actor** | Student, Admin |
| **Mô tả** | Người dùng thay đổi mật khẩu hiện tại |
| **Tiền điều kiện** | Đã đăng nhập, biết mật khẩu hiện tại |
| **Luồng chính** | 1. User nhập mật khẩu hiện tại và mật khẩu mới<br>2. Hệ thống xác minh mật khẩu cũ<br>3. Hash mật khẩu mới và cập nhật |
| **Luồng thay thế** | 2a. Mật khẩu cũ sai → lỗi 400 |
| **API** | `PUT /api/v1/auth/change-password` |

---

#### UC-06: Quên mật khẩu

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-06 |
| **Tên** | Quên mật khẩu |
| **Actor** | Guest |
| **Mô tả** | Yêu cầu email đặt lại mật khẩu |
| **Tiền điều kiện** | Không |
| **Luồng chính** | 1. Guest nhập email<br>2. Hệ thống tạo reset token và lưu vào `password_reset_token`, `password_reset_expires`<br>3. Gửi email chứa link reset<br>4. Trả thông báo chung (không tiết lộ email có tồn tại không) |
| **Luồng thay thế** | 3a. Dịch vụ email không khả dụng → lỗi 503 |
| **API** | `POST /api/v1/auth/forgot-password` |

---

#### UC-07: Đặt lại mật khẩu

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-07 |
| **Tên** | Đặt lại mật khẩu |
| **Actor** | Guest |
| **Mô tả** | Đặt mật khẩu mới bằng token từ email |
| **Tiền điều kiện** | Có token hợp lệ từ UC-06 |
| **Luồng chính** | 1. Guest nhập token và mật khẩu mới<br>2. Hệ thống xác minh token chưa hết hạn<br>3. Hash mật khẩu mới, xóa reset token |
| **Luồng thay thế** | 2a. Token hết hạn/không hợp lệ → lỗi 400 |
| **API** | `POST /api/v1/auth/reset-password` |

---

#### UC-08: Xem thông tin cá nhân

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-08 |
| **Tên** | Xem thông tin cá nhân |
| **Actor** | Student, Admin |
| **Mô tả** | Xem profile hiện tại của mình |
| **Tiền điều kiện** | Đã đăng nhập |
| **Luồng chính** | 1. User gửi request<br>2. Hệ thống trả về thông tin user (loại bỏ password_hash) |
| **API** | `GET /api/v1/auth/me` |

---

#### UC-09: Cập nhật hồ sơ

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-09 |
| **Tên** | Cập nhật hồ sơ cá nhân |
| **Actor** | Student, Admin |
| **Mô tả** | Chỉnh sửa thông tin profile (tên, avatar, v.v.) |
| **Tiền điều kiện** | Đã đăng nhập |
| **Luồng chính** | 1. User gửi dữ liệu cập nhật<br>2. Hệ thống validate (updateProfileSchema)<br>3. Cập nhật và trả về profile mới |
| **API** | `PUT /api/v1/users/me` |

---

#### UC-10: Tùy chỉnh layout Dashboard

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-10 |
| **Tên** | Tùy chỉnh layout Dashboard |
| **Actor** | Student, Admin |
| **Mô tả** | Thay đổi bố cục widgets trên dashboard |
| **Tiền điều kiện** | Đã đăng nhập |
| **Luồng chính** | 1. User chọn widgets muốn hiển thị<br>2. Hệ thống validate (updateDashboardLayoutSchema)<br>3. Lưu vào `dashboard_layout.widgets` |
| **Widgets mặc định** | `trend_chart`, `research_gap_heatmap`, `top_papers`, `ai_insights` |
| **API** | `PUT /api/v1/users/me/dashboard-layout` |

---

### 3.2. Paper Management

---

#### UC-11: Tìm kiếm bài báo

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-11 |
| **Tên** | Tìm kiếm bài báo |
| **Actor** | Guest, Student, Admin |
| **Mô tả** | Tìm kiếm bài báo khoa học theo từ khóa, tác giả, lĩnh vực |
| **Tiền điều kiện** | Không (optionalAuth) |
| **Luồng chính** | 1. User nhập tiêu chí tìm kiếm<br>2. Hệ thống truy vấn database Paper<br>3. Trả về danh sách kết quả với phân trang |
| **API** | `GET /api/v1/papers/search` |

---

#### UC-12: Xem danh sách nguồn dữ liệu

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-12 |
| **Tên** | Xem danh sách nguồn dữ liệu |
| **Actor** | Guest, Student, Admin |
| **Mô tả** | Xem các nguồn dữ liệu có sẵn (OpenAlex, Crossref, arXiv, v.v.) |
| **API** | `GET /api/v1/papers/sources` |

---

#### UC-13: Xem chi tiết bài báo

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-13 |
| **Tên** | Xem chi tiết bài báo |
| **Actor** | Guest, Student, Admin |
| **Mô tả** | Xem đầy đủ thông tin một bài báo |
| **Tiền điều kiện** | Paper tồn tại |
| **Luồng chính** | 1. User truy cập paper theo ID<br>2. Hệ thống trả về chi tiết (title, abstract, authors, citations, v.v.) |
| **Luồng thay thế** | 1a. ID không tồn tại → 404 |
| **API** | `GET /api/v1/papers/:id` |

---

#### UC-14: Xem bài báo thịnh hành (Trending)

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-14 |
| **Tên** | Xem bài báo thịnh hành |
| **Actor** | Student, Admin |
| **Mô tả** | Xem danh sách bài báo đang trending dựa trên view count |
| **Tiền điều kiện** | Đã đăng nhập |
| **API** | `GET /api/v1/papers/trending` |

---

#### UC-15: Yêu cầu đồng bộ corpus

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-15 |
| **Tên** | Yêu cầu đồng bộ corpus |
| **Actor** | Guest, Student, Admin |
| **Mô tả** | Gửi yêu cầu crawl/sync dữ liệu từ nguồn bên ngoài |
| **Luồng chính** | 1. User nhập query và thông số<br>2. Hệ thống validate (syncRequestSchema)<br>3. Tạo request đồng bộ |
| **API** | `POST /api/v1/papers/sync-request` |

---

#### UC-16: Bắt đầu phiên đọc bài báo

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-16 |
| **Tên** | Bắt đầu phiên đọc (dwell-time tracking) |
| **Actor** | Student, Admin |
| **Mô tả** | Ghi nhận thời điểm bắt đầu đọc bài báo |
| **Tiền điều kiện** | Đã đăng nhập, Paper tồn tại |
| **Luồng chính** | 1. User mở trang chi tiết paper<br>2. Client gửi request tạo view session<br>3. Hệ thống tạo PaperView record |
| **API** | `POST /api/v1/papers/:id/view-session` |

---

#### UC-17: Cập nhật phiên đọc

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-17 |
| **Tên** | Cập nhật phiên đọc |
| **Actor** | Student, Admin |
| **Mô tả** | Cập nhật thời gian đọc (dwell time) khi user rời trang |
| **Tiền điều kiện** | Có view session đang mở (từ UC-16) |
| **API** | `PATCH /api/v1/papers/:id/view-session/:viewId` |

---

### 3.3. Personal Library

---

#### UC-18: Xem danh sách bộ sưu tập

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-18 |
| **Tên** | Xem danh sách bộ sưu tập |
| **Actor** | Student, Admin |
| **Mô tả** | Xem tất cả collections trong thư viện cá nhân |
| **Tiền điều kiện** | Đã đăng nhập |
| **API** | `GET /api/v1/library/collections` |

---

#### UC-19: Tạo bộ sưu tập

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-19 |
| **Tên** | Tạo bộ sưu tập mới |
| **Actor** | Student, Admin |
| **Mô tả** | Tạo collection mới để phân loại bài báo đã lưu |
| **Luồng chính** | 1. User nhập tên, mô tả collection<br>2. Validate (createCollectionSchema)<br>3. Tạo UserCollection mới |
| **API** | `POST /api/v1/library/collections` |

---

#### UC-20: Cập nhật bộ sưu tập

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-20 |
| **Tên** | Cập nhật bộ sưu tập |
| **Actor** | Student, Admin |
| **Mô tả** | Sửa tên, mô tả của collection |
| **Tiền điều kiện** | Collection thuộc sở hữu của user |
| **API** | `PUT /api/v1/library/collections/:id` |

---

#### UC-21: Xóa bộ sưu tập

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-21 |
| **Tên** | Xóa bộ sưu tập |
| **Actor** | Student, Admin |
| **Mô tả** | Xóa collection và tất cả bài báo đã lưu trong đó |
| **Tiền điều kiện** | Collection thuộc sở hữu của user |
| **API** | `DELETE /api/v1/library/collections/:id` |

---

#### UC-22: Xem bài báo đã lưu

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-22 |
| **Tên** | Xem bài báo đã lưu |
| **Actor** | Student, Admin |
| **Mô tả** | Xem danh sách papers đã lưu trong thư viện |
| **API** | `GET /api/v1/library/papers` |

---

#### UC-23: Lưu bài báo vào thư viện

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-23 |
| **Tên** | Lưu bài báo vào thư viện |
| **Actor** | Student, Admin |
| **Mô tả** | Thêm paper vào một collection |
| **Luồng chính** | 1. User chọn paper và collection đích<br>2. Validate (savePaperSchema)<br>3. Thêm paper vào `saved_papers` của collection |
| **API** | `POST /api/v1/library/papers` |

---

#### UC-24: Cập nhật bài báo đã lưu

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-24 |
| **Tên** | Cập nhật bài báo đã lưu |
| **Actor** | Student, Admin |
| **Mô tả** | Cập nhật ghi chú, tags cho paper đã lưu |
| **API** | `PUT /api/v1/library/papers/:collectionId/:paperId` |

---

#### UC-25: Xóa bài báo khỏi thư viện

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-25 |
| **Tên** | Xóa bài báo khỏi thư viện |
| **Actor** | Student, Admin |
| **Mô tả** | Xóa paper ra khỏi collection |
| **API** | `DELETE /api/v1/library/papers/:collectionId/:paperId` |

---

### 3.4. Saved Searches

---

#### UC-26: Xem tìm kiếm đã lưu

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-26 |
| **Tên** | Xem tìm kiếm đã lưu |
| **Actor** | Student, Admin |
| **Mô tả** | Xem danh sách các truy vấn tìm kiếm đã lưu |
| **Dữ liệu** | Mỗi saved search gồm: tên, criteria (keywords, year range, authors, fields, sources, logic AND/OR) |
| **API** | `GET /api/v1/searches` |

---

#### UC-27: Tạo tìm kiếm đã lưu

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-27 |
| **Tên** | Tạo tìm kiếm đã lưu |
| **Actor** | Student, Admin |
| **Mô tả** | Lưu một truy vấn tìm kiếm để tái sử dụng |
| **API** | `POST /api/v1/searches` |

---

#### UC-28: Xóa tìm kiếm đã lưu

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-28 |
| **Tên** | Xóa tìm kiếm đã lưu |
| **Actor** | Student, Admin |
| **API** | `DELETE /api/v1/searches/:id` |

---

### 3.5. Follow & Alerts

---

#### UC-29: Xem chủ đề đang theo dõi

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-29 |
| **Tên** | Xem chủ đề đang theo dõi |
| **Actor** | Student, Admin |
| **Mô tả** | Xem danh sách subjects đang follow (Keyword, Field, Author) |
| **API** | `GET /api/v1/follow/subjects` |

---

#### UC-30: Theo dõi chủ đề mới

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-30 |
| **Tên** | Theo dõi chủ đề mới |
| **Actor** | Student, Admin |
| **Mô tả** | Thêm subject mới vào danh sách theo dõi |
| **Luồng chính** | 1. User chọn loại (Keyword/Field/Author) và giá trị<br>2. Cấu hình rule: frequency (instant/daily/weekly), threshold, kênh thông báo<br>3. Hệ thống lưu vào `followed_subjects` |
| **API** | `POST /api/v1/follow/subjects` |

---

#### UC-31: Cập nhật chủ đề theo dõi

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-31 |
| **Tên** | Cập nhật cài đặt chủ đề theo dõi |
| **Actor** | Student, Admin |
| **Mô tả** | Thay đổi rule, tần suất, trạng thái active/inactive |
| **API** | `PUT /api/v1/follow/subjects/:id` |

---

#### UC-32: Hủy theo dõi chủ đề

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-32 |
| **Tên** | Hủy theo dõi chủ đề |
| **Actor** | Student, Admin |
| **API** | `DELETE /api/v1/follow/subjects/:id` |

---

#### UC-33: Xem cảnh báo

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-33 |
| **Tên** | Xem cảnh báo từ chủ đề theo dõi |
| **Actor** | Student, Admin |
| **Mô tả** | Xem alerts phát sinh khi có bài báo mới phù hợp subject đang follow |
| **API** | `GET /api/v1/follow/alerts` |

---

#### UC-34: Đánh dấu đã đọc cảnh báo

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-34 |
| **Tên** | Đánh dấu một cảnh báo đã đọc |
| **Actor** | Student, Admin |
| **API** | `PUT /api/v1/follow/alerts/:id/read` |

---

#### UC-35: Đánh dấu tất cả cảnh báo đã đọc

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-35 |
| **Tên** | Đánh dấu tất cả cảnh báo đã đọc |
| **Actor** | Student, Admin |
| **API** | `PUT /api/v1/follow/alerts/read-all` |

---

### 3.6. Collaboration

---

#### UC-36: Tìm kiếm nhà nghiên cứu

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-36 |
| **Tên** | Tìm kiếm nhà nghiên cứu |
| **Actor** | Student, Admin |
| **Mô tả** | Tìm các nhà nghiên cứu khác trên hệ thống để cộng tác |
| **API** | `GET /api/v1/collaboration/researchers` |

---

#### UC-37: Xem lời mời cộng tác

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-37 |
| **Tên** | Xem danh sách lời mời |
| **Actor** | Student, Admin |
| **Mô tả** | Xem các lời mời đã gửi và đã nhận |
| **API** | `GET /api/v1/collaboration/invites` |

---

#### UC-38: Gửi lời mời cộng tác

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-38 |
| **Tên** | Gửi lời mời cộng tác |
| **Actor** | Student, Admin |
| **Mô tả** | Mời nhà nghiên cứu khác vào workspace hoặc dự án |
| **Luồng chính** | 1. User chọn researcher và workspace<br>2. Validate (createInviteSchema)<br>3. Tạo CollaborationInvite<br>4. Gửi notification cho người được mời |
| **API** | `POST /api/v1/collaboration/invites` |

---

#### UC-39: Phản hồi lời mời

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-39 |
| **Tên** | Phản hồi lời mời cộng tác |
| **Actor** | Student, Admin |
| **Mô tả** | Chấp nhận hoặc từ chối lời mời |
| **API** | `PUT /api/v1/collaboration/invites/:id` |

---

#### UC-40: Hủy lời mời

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-40 |
| **Tên** | Hủy/xóa lời mời đã gửi |
| **Actor** | Student, Admin |
| **API** | `DELETE /api/v1/collaboration/invites/:id` |

---

### 3.7. Workspace Management

---

#### UC-41: Xem danh sách workspace

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-41 |
| **Tên** | Xem danh sách workspace |
| **Actor** | Student, Admin |
| **Mô tả** | Xem tất cả workspace mà user sở hữu hoặc là thành viên |
| **API** | `GET /api/v1/workspaces` |

---

#### UC-42: Tạo workspace

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-42 |
| **Tên** | Tạo workspace |
| **Actor** | Student, Admin |
| **Mô tả** | Tạo không gian làm việc nhóm mới |
| **Luồng chính** | 1. User nhập tên, mô tả<br>2. Validate (createWorkspaceSchema)<br>3. Tạo Workspace, user trở thành owner |
| **API** | `POST /api/v1/workspaces` |

---

#### UC-43: Xem chi tiết workspace

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-43 |
| **Tên** | Xem chi tiết workspace |
| **Actor** | Student, Admin |
| **Tiền điều kiện** | User là thành viên hoặc owner |
| **API** | `GET /api/v1/workspaces/:id` |

---

#### UC-44: Cập nhật workspace

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-44 |
| **Tên** | Cập nhật workspace |
| **Actor** | Student, Admin |
| **API** | `PUT /api/v1/workspaces/:id` |

---

#### UC-45: Xóa workspace

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-45 |
| **Tên** | Xóa workspace |
| **Actor** | Student, Admin (owner) |
| **API** | `DELETE /api/v1/workspaces/:id` |

---

#### UC-46: Thêm thành viên workspace

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-46 |
| **Tên** | Thêm thành viên |
| **Actor** | Student, Admin (owner/admin of workspace) |
| **API** | `POST /api/v1/workspaces/:id/members` |

---

#### UC-47: Cập nhật vai trò thành viên

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-47 |
| **Tên** | Cập nhật vai trò thành viên |
| **Actor** | Student, Admin (owner/admin of workspace) |
| **API** | `PUT /api/v1/workspaces/:id/members/:memberId` |

---

#### UC-48: Xóa thành viên

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-48 |
| **Tên** | Xóa thành viên khỏi workspace |
| **Actor** | Student, Admin (owner/admin of workspace) |
| **API** | `DELETE /api/v1/workspaces/:id/members/:memberId` |

---

#### UC-49 ~ UC-55: Work Items & Comments

| UC ID | Tên | API |
|-------|------|-----|
| UC-49 | Xem work items | `GET /api/v1/workspaces/:id/items` |
| UC-50 | Tạo work item | `POST /api/v1/workspaces/:id/items` |
| UC-51 | Cập nhật work item | `PUT /api/v1/workspaces/:id/items/:itemId` |
| UC-52 | Xóa work item | `DELETE /api/v1/workspaces/:id/items/:itemId` |
| UC-53 | Thêm comment | `POST /api/v1/workspaces/:id/items/:itemId/comments` |
| UC-54 | Sửa comment | `PUT /api/v1/workspaces/:id/items/:itemId/comments/:commentId` |
| UC-55 | Xóa comment | `DELETE /api/v1/workspaces/:id/items/:itemId/comments/:commentId` |

---

#### UC-56: Xem lịch sử hoạt động

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-56 |
| **Tên** | Xem lịch sử hoạt động workspace |
| **Actor** | Student, Admin |
| **Mô tả** | Xem WorkspaceActivity log: ai đã thêm/sửa/xóa gì |
| **API** | `GET /api/v1/workspaces/:id/activities` |

---

### 3.8. Analytics & Insights

---

#### UC-57 ~ UC-60: Analytics từ corpus nội bộ

| UC ID | Tên | Mô tả | API |
|-------|------|--------|-----|
| UC-57 | Xem xu hướng nghiên cứu | Biểu đồ trend theo thời gian | `GET /api/v1/analytics/trends` |
| UC-58 | Xem tăng trưởng | Growth rate theo lĩnh vực | `GET /api/v1/analytics/trends/growth` |
| UC-59 | Xem co-occurrence | Ma trận đồng xuất hiện từ khóa | `GET /api/v1/analytics/trends/cooccurrence` |
| UC-60 | Xem khoảng trống nghiên cứu | Research gaps từ corpus | `GET /api/v1/analytics/gaps` |

---

#### UC-61 ~ UC-65: Live Analytics (External Sources)

| UC ID | Tên | Mô tả | API |
|-------|------|--------|-----|
| UC-61 | Phân tích gap trực tiếp | Crawl & phân tích gaps từ nguồn ngoài (OpenAlex, Crossref, arXiv) | `POST /api/v1/analytics/gaps/live` |
| UC-62 | Lưu báo cáo gap live | Lưu kết quả phân tích vào AnalysisReport | `POST /api/v1/analytics/gaps/live/save` |
| UC-63 | Phân tích trend trực tiếp | Crawl & phân tích trends từ nguồn ngoài | `POST /api/v1/analytics/trends/live` |
| UC-64 | Lưu báo cáo trend live | Lưu kết quả trends analysis | `POST /api/v1/analytics/trends/live/save` |
| UC-65 | Xem báo cáo trend đã lưu | Xem lịch sử báo cáo đã lưu | `GET /api/v1/analytics/trends/live/saved` |

---

### 3.9. AI-Powered Features

---

#### UC-66 ~ UC-70: AI Features

| UC ID | Tên | Mô tả | Rate Limit | API |
|-------|------|--------|------------|-----|
| UC-66 | Tóm tắt bài báo | AI tạo bản tóm tắt nội dung paper | `aiLimiter` | `POST /api/v1/ai/summarize` |
| UC-67 | Giải thích thuật ngữ | AI giải thích term/concept kỹ thuật | `aiLimiter` | `POST /api/v1/ai/explain-term` |
| UC-68 | Gợi ý hướng nghiên cứu | AI đề xuất research directions | `aiLimiter` | `POST /api/v1/ai/suggest-directions` |
| UC-69 | Tìm bài báo liên quan | AI tìm papers có nội dung tương tự | `aiLimiter` | `POST /api/v1/ai/related-papers` |
| UC-70 | Xem AI insights | Xem tổng hợp insights do AI tạo | `aiLimiter` | `GET /api/v1/ai/insights` |

**Actor**: Student, Admin

---

### 3.10. Notifications

---

#### UC-71 ~ UC-74: Notifications

| UC ID | Tên | API |
|-------|------|-----|
| UC-71 | Xem thông báo | `GET /api/v1/notifications` |
| UC-72 | Xem số chưa đọc | `GET /api/v1/notifications/unread-count` |
| UC-73 | Đánh dấu thông báo đã đọc | `PUT /api/v1/notifications/:id/read` |
| UC-74 | Đánh dấu tất cả đã đọc | `PUT /api/v1/notifications/read-all` |

**Actor**: Student, Admin  
**Loại notification**: task, invite, comment, system broadcast

---

### 3.11. Feedback System

---

#### UC-75: Gửi feedback

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-75 |
| **Tên** | Gửi feedback |
| **Actor** | Student, Admin |
| **Mô tả** | Gửi phản hồi/góp ý về hệ thống |
| **API** | `POST /api/v1/feedbacks` |

---

#### UC-76: Xem danh sách feedback

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-76 |
| **Tên** | Xem danh sách feedback |
| **Actor** | Student (chỉ xem của mình), Admin (xem tất cả) |
| **API** | `GET /api/v1/feedbacks` |

---

#### UC-77: Xem chi tiết feedback

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-77 |
| **Tên** | Xem chi tiết feedback |
| **Actor** | Student, Admin |
| **API** | `GET /api/v1/feedbacks/:id` |

---

#### UC-78: Trả lời feedback

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-78 |
| **Tên** | Trả lời feedback (chat) |
| **Actor** | Student, Admin |
| **Mô tả** | Gửi tin nhắn trong thread feedback |
| **API** | `POST /api/v1/feedbacks/:id/messages` |

---

### 3.12. Dashboard

---

#### UC-79: Xem tổng quan Dashboard

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-79 |
| **Tên** | Xem tổng quan Dashboard |
| **Actor** | Student, Admin |
| **Mô tả** | Xem trang chủ với các widget: biểu đồ trend, heatmap gap, top papers, AI insights |
| **API** | `GET /api/v1/dashboard/overview` |

---

### 3.13. Admin Management

---

#### UC-80: Quản lý người dùng — Xem danh sách

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-80 |
| **Tên** | Xem danh sách người dùng |
| **Actor** | Admin |
| **Mô tả** | Xem danh sách tất cả users với filter, phân trang |
| **Luồng chính** | 1. Admin truy cập trang quản lý user<br>2. Có thể filter: tìm kiếm (q), status, role, ngày hoạt động, số bài đã lưu<br>3. Hệ thống aggregate User + UserCollection để tính `saved_papers_count`<br>4. Trả về danh sách phân trang |
| **API** | `GET /api/v1/admin/users` |

---

#### UC-81: Tạo người dùng mới

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-81 |
| **Tên** | Tạo người dùng mới |
| **Actor** | Admin |
| **Mô tả** | Admin tạo tài khoản cho user (không cần quy trình đăng ký) |
| **API** | `POST /api/v1/admin/users` |

---

#### UC-82: Cập nhật người dùng

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-82 |
| **Tên** | Cập nhật thông tin người dùng |
| **Actor** | Admin |
| **Mô tả** | Thay đổi status (Active/Inactive/Banned) hoặc roles |
| **API** | `PUT /api/v1/admin/users/:id` |

---

#### UC-83 ~ UC-88: Quản lý nguồn dữ liệu

| UC ID | Tên | Mô tả | API |
|-------|------|--------|-----|
| UC-83 | Xem nguồn dữ liệu | Xem tất cả DataSource (credentials được ẩn) | `GET /api/v1/admin/data-sources` |
| UC-84 | Cập nhật nguồn | Sửa enabled, sync_schedule, api_endpoint | `PUT /api/v1/admin/data-sources/:id` |
| UC-85 | Cập nhật credentials | Set API key hoặc mailto cho nguồn | `PUT /api/v1/admin/data-sources/:id/credentials` |
| UC-86 | Xóa credentials | Xóa API key/mailto khỏi nguồn | `DELETE /api/v1/admin/data-sources/:id/credentials` |
| UC-87 | Kiểm tra API nguồn | Kiểm tra health/status tất cả nguồn | `POST /api/v1/admin/data-sources/check` |
| UC-88 | Test nguồn dữ liệu | Test kết nối tới một nguồn cụ thể | `POST /api/v1/admin/data-sources/:id/test` |

---

#### UC-89 ~ UC-91: Quản lý Crawler Jobs

| UC ID | Tên | Mô tả | API |
|-------|------|--------|-----|
| UC-89 | Xem danh sách jobs | Xem 50 jobs gần nhất, filter theo status | `GET /api/v1/admin/jobs` |
| UC-90 | Tạo crawler job | Tạo job mới: source, query, max_records | `POST /api/v1/admin/jobs` |
| UC-91 | Chạy crawler job | Thực thi job (gọi scheduler service) | `POST /api/v1/admin/jobs/:id/run` |

---

#### UC-92: Làm mới báo cáo phân tích

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-92 |
| **Tên** | Làm mới báo cáo phân tích |
| **Actor** | Admin, System |
| **Mô tả** | Chạy lại tất cả AnalysisReport (trends, gaps, v.v.) |
| **API** | `POST /api/v1/admin/reports/refresh` |

---

#### UC-93 ~ UC-95: Monitoring & Audit

| UC ID | Tên | Mô tả | API |
|-------|------|--------|-----|
| UC-93 | Xem audit logs | Xem SystemLog: filter theo severity, actor | `GET /api/v1/admin/audit-logs` |
| UC-94 | Xem paper read logs | Xem PaperView records (ai đọc gì, khi nào) | `GET /api/v1/admin/paper-reads` |
| UC-95 | Xem thống kê hệ thống | Tổng papers, users, active jobs, data sources | `GET /api/v1/admin/stats` |

---

#### UC-96: Phát sóng thông báo hệ thống

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-96 |
| **Tên** | Phát sóng thông báo hệ thống |
| **Actor** | Admin |
| **Mô tả** | Gửi broadcast notification tới tất cả users đang Active |
| **Luồng chính** | 1. Admin nhập title, content, priority<br>2. Validate (broadcastNotificationSchema)<br>3. Hệ thống tạo Notification cho mỗi user active<br>4. Trả về số lượng đã gửi |
| **API** | `POST /api/v1/admin/notifications/broadcast` |

---

#### UC-97: Cập nhật trạng thái feedback

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-97 |
| **Tên** | Cập nhật trạng thái feedback |
| **Actor** | Admin |
| **Mô tả** | Thay đổi status feedback (pending → resolved, v.v.) |
| **API** | `PUT /api/v1/feedbacks/:id` |

---

#### UC-98: Xem số feedback chờ xử lý

| Thuộc tính | Mô tả |
|------------|--------|
| **Use Case ID** | UC-98 |
| **Tên** | Xem số feedback chờ xử lý |
| **Actor** | Admin |
| **API** | `GET /api/v1/feedbacks/pending-count` |

---

## 4. Ma trận Actor — Use Case

| Nhóm chức năng | Guest | Student | Admin |
|----------------|:-----:|:-------:|:-----:|
| **Đăng ký / Đăng nhập** | ✅ UC-01, 02, 06, 07 | ✅ UC-03, 04, 05, 08, 09, 10 | ✅ (kế thừa Student) |
| **Tìm kiếm & Xem Paper** | ✅ UC-11, 12, 13, 15 | ✅ UC-14, 16, 17 | ✅ (kế thừa Student) |
| **Thư viện cá nhân** | ❌ | ✅ UC-18 ~ 25 | ✅ (kế thừa) |
| **Tìm kiếm đã lưu** | ❌ | ✅ UC-26 ~ 28 | ✅ (kế thừa) |
| **Follow & Alerts** | ❌ | ✅ UC-29 ~ 35 | ✅ (kế thừa) |
| **Collaboration** | ❌ | ✅ UC-36 ~ 40 | ✅ (kế thừa) |
| **Workspace** | ❌ | ✅ UC-41 ~ 56 | ✅ (kế thừa) |
| **Analytics** | ❌ | ✅ UC-57 ~ 65 | ✅ (kế thừa) |
| **AI Features** | ❌ | ✅ UC-66 ~ 70 | ✅ (kế thừa) |
| **Notifications** | ❌ | ✅ UC-71 ~ 74 | ✅ (kế thừa) |
| **Feedback** | ❌ | ✅ UC-75 ~ 78 | ✅ UC-97, 98 |
| **Dashboard** | ❌ | ✅ UC-79 | ✅ (kế thừa) |
| **Admin Management** | ❌ | ❌ | ✅ UC-80 ~ 96 |

---

## 5. Non-Functional Requirements (được suy ra từ code)

| Yêu cầu | Chi tiết |
|----------|----------|
| **Authentication** | JWT Bearer Token (access + refresh) |
| **Authorization** | RBAC middleware, roles: `Student`, `Admin` |
| **Rate Limiting** | `authLimiter` cho auth endpoints, `aiLimiter` cho AI endpoints |
| **Validation** | Joi schemas cho tất cả write endpoints |
| **Password Security** | bcryptjs, salt rounds = 10 |
| **Data Deduplication** | viewDedup utility cho paper views |
| **Pagination** | Chuẩn hóa qua `parsePagination()`, trả format paginated response |
| **API Response** | Chuẩn hóa qua `ApiResponse` utility |

---

> **Ghi chú**: Tài liệu này được tạo tự động từ phân tích source code tại `web/backend/src/`. Tổng cộng **98 use cases** được trích xuất từ 14 route files, 13 controllers, và 14 models.
