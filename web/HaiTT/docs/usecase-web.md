# Use Case Diagram — WDP Web (ResearchTrends)

> Tài liệu mô tả các **use case** của hệ thống web WDP: Scientific Research Trend Tracking System.  
> Cập nhật theo code thực tế tại `web/frontend` + `web/backend` (tháng 07/2026).

---

## 1. Actors

| Actor | Vai trò hệ thống | Mô tả |
|---|---|---|
| **Guest** | Khách | Chưa đăng nhập. Chỉ xem landing + auth. |
| **Student** | `User.roles = Student` | Người dùng nghiên cứu mặc định sau đăng ký. Dùng toàn bộ app shell. |
| **Admin** | `User.roles = Admin` | Quản trị viên. Bị khóa vào `#admin`, không vào Student shell. |
| **Workspace Owner / Editor / Viewer** | Role trong workspace | Vai trò phụ của Student trong không gian cộng tác. |
| **Hệ thống nguồn ngoài** | Secondary actor | OpenAlex, Crossref, arXiv, IEEE, Semantic Scholar, Exa, … |

**Ghi chú phân quyền UI:**

- Guest → `#home`, `#login`, `#register`, `#forgot-password`, `#reset-password`
- Student → toàn bộ sidebar (`#overview` … `#account`)
- Admin → chỉ `#admin` (redirect mọi route khác về admin)

---

## 2. Use Case Diagram Tổng Quan

![Use Case Diagram — WDP Web](./images/usecase-web-diagram.png)

> File ảnh: `web/HaiTT/docs/images/usecase-web-diagram.png` (bản đủ 30 UC, nhóm Xác thực / Nghiên cứu / Quản trị)

```mermaid
flowchart LR
  Guest((Guest))
  Student((Student))
  Admin((Admin))
  Ext[[Nguồn ngoài<br/>OpenAlex / Crossref / …]]

  subgraph UC_Auth["Xác thực"]
    UC01[Xem trang chủ]
    UC02[Đăng ký tài khoản]
    UC03[Đăng nhập]
    UC04[Quên / đặt lại mật khẩu]
    UC05[Đăng xuất]
  end

  subgraph UC_Student["Nghiên cứu (Student)"]
    UC10[Xem Dashboard]
    UC11[Tìm kiếm bài báo]
    UC12[Xem chi tiết bài báo]
    UC13[Theo dõi thời gian đọc]
    UC14[Lưu bài vào Library]
    UC15[Phân tích Trends]
    UC16[Phân tích Research Gap]
    UC17[AI tóm tắt / gợi ý]
    UC18[Theo dõi chủ đề Follow]
    UC19[Quản lý Workspace]
    UC20[Cộng tác / mời nghiên cứu]
    UC21[Quản lý thông báo]
    UC22[Cập nhật hồ sơ / feedback]
  end

  subgraph UC_Admin["Quản trị (Admin)"]
    UC30[Xem thống kê hệ thống]
    UC31[Quản lý batch / crawler]
    UC32[Quản lý nguồn dữ liệu]
    UC33[Quản lý người dùng]
    UC34[Xử lý feedback]
    UC35[Broadcast thông báo]
    UC36[Xem reading analytics]
    UC37[Xem audit log]
  end

  Guest --> UC01
  Guest --> UC02
  Guest --> UC03
  Guest --> UC04

  Student --> UC03
  Student --> UC05
  Student --> UC10
  Student --> UC11
  Student --> UC12
  Student --> UC13
  Student --> UC14
  Student --> UC15
  Student --> UC16
  Student --> UC17
  Student --> UC18
  Student --> UC19
  Student --> UC20
  Student --> UC21
  Student --> UC22

  Admin --> UC03
  Admin --> UC05
  Admin --> UC30
  Admin --> UC31
  Admin --> UC32
  Admin --> UC33
  Admin --> UC34
  Admin --> UC35
  Admin --> UC36
  Admin --> UC37

  UC11 -.-> Ext
  UC15 -.-> Ext
  UC16 -.-> Ext
  UC31 -.-> Ext
  UC32 -.-> Ext
```

---

## 3. Use Case theo nhóm chức năng

### 3.1 Xác thực & tài khoản

```mermaid
flowchart TB
  Guest((Guest))
  Student((Student))
  Admin((Admin))

  UC01[UC-01 Xem trang chủ]
  UC02[UC-02 Đăng ký]
  UC03[UC-03 Đăng nhập]
  UC04[UC-04 Quên / Reset mật khẩu]
  UC05[UC-05 Đăng xuất]
  UC06[UC-06 Xem / cập nhật hồ sơ]
  UC07[UC-07 Đổi mật khẩu]

  Guest --> UC01
  Guest --> UC02
  Guest --> UC03
  Guest --> UC04
  Student --> UC05
  Student --> UC06
  Student --> UC07
  Admin --> UC05
  Admin --> UC06
```

| ID | Use case | Actor | Route / API | Auth |
|---|---|---|---|---|
| UC-01 | Xem trang chủ marketing | Guest | `#home` | Public |
| UC-02 | Đăng ký tài khoản (→ Student) | Guest | `#register` / `POST /auth/register` | Public |
| UC-03 | Đăng nhập | Guest | `#login` / `POST /auth/login` | Public |
| UC-04 | Quên / đặt lại mật khẩu | Guest | `#forgot-password`, `#reset-password` | Public |
| UC-05 | Đăng xuất | Student, Admin | Clear token | Auth |
| UC-06 | Xem / cập nhật hồ sơ | Student, Admin | `#account` / `users` | Auth |
| UC-07 | Đổi mật khẩu | Student, Admin | `#account` | Auth |

---

### 3.2 Dashboard & thông báo

```mermaid
flowchart TB
  Student((Student))

  UC10[UC-10 Xem Overview Dashboard]
  UC10a[Xem KPI / trend chart]
  UC10b[Xem Research Gap heatmap]
  UC10c[Xem trending papers]
  UC10d[Xem AI insights]
  UC21[UC-21 Quản lý thông báo]
  UC21a[Đánh dấu đã đọc]
  UC21b[Xem badge chưa đọc]

  Student --> UC10
  UC10 --> UC10a
  UC10 --> UC10b
  UC10 --> UC10c
  UC10 --> UC10d
  Student --> UC21
  UC21 --> UC21a
  UC21 --> UC21b
```

| ID | Use case | Route | Ghi chú |
|---|---|---|---|
| UC-10 | Xem Dashboard tổng quan | `#overview` | KPI, chart, heatmap, trending, AI |
| UC-21 | Quản lý hộp thư thông báo | `#notifications` | Mark read / unread badge |

---

### 3.3 Tìm kiếm & bài báo

```mermaid
flowchart TB
  Student((Student))
  Ext[[Nguồn ngoài]]

  UC11[UC-11 Tìm kiếm bài báo]
  UC11a[Lọc nguồn / năm / loại]
  UC11b[AND / OR / NOT terms]
  UC11c[Lưu saved search]
  UC11d[Yêu cầu sync corpus]
  UC12[UC-12 Xem chi tiết bài báo]
  UC13[UC-13 Theo dõi reading session]
  UC14[UC-14 Lưu vào Library]
  UC17[UC-17 AI tóm tắt / related]

  Student --> UC11
  UC11 --> UC11a
  UC11 --> UC11b
  UC11 --> UC11c
  UC11 --> UC11d
  Student --> UC12
  Student --> UC13
  Student --> UC14
  Student --> UC17
  UC11d -.-> Ext
  UC17 -.-> Ext
```

| ID | Use case | Route / API | Include |
|---|---|---|---|
| UC-11 | Tìm kiếm đa nguồn + facet | `#search` / `GET /papers` | Filter, Boolean, saved search, sync |
| UC-12 | Xem chi tiết paper | `#paper/:id` | Metadata, abstract, sources |
| UC-13 | Bắt đầu / cập nhật reading session | `papers/.../reading` | Dwell time ≥ 2 phút → stored |
| UC-14 | Lưu / quản lý Library | `#library` | Collection, notes, read status |
| UC-17 | AI summarize + related papers | AI APIs | Chỉ diễn giải từ evidence |

---

### 3.4 Trends & Research Gap

```mermaid
flowchart TB
  Student((Student))
  Ext[[Nguồn ngoài]]

  UC15[UC-15 Phân tích Trends]
  UC15a[Corpus Trends]
  UC15b[Live Trends]
  UC15c[Lưu live trend]
  UC16[UC-16 Phân tích Research Gap]
  UC16a[Corpus Gap]
  UC16b[Live Gap]
  UC16c[AI giải thích / gợi ý đề tài]
  UC16d[Lưu live gap]

  Student --> UC15
  UC15 --> UC15a
  UC15 --> UC15b
  UC15 --> UC15c
  Student --> UC16
  UC16 --> UC16a
  UC16 --> UC16b
  UC16 --> UC16c
  UC16 --> UC16d
  UC15b -.-> Ext
  UC16b -.-> Ext
```

| ID | Use case | Route | Nguồn dữ liệu |
|---|---|---|---|
| UC-15a | Corpus Trends | `#trends` | MongoDB + AnalysisReport |
| UC-15b | Live Trends | `#trends` | API ngoài theo topic |
| UC-16a | Corpus Gap | `#gap` | Heatmap / scatter / ranking nội bộ |
| UC-16b | Live Gap | `#gap` | Fetch + score in-memory |
| UC-16c | AI explain term / suggest directions | AI APIs | Không tự bịa gap |

---

### 3.5 Follow & Workspace

```mermaid
flowchart TB
  Student((Student))
  Owner((Owner))
  Editor((Editor))
  Viewer((Viewer))

  UC18[UC-18 Theo dõi chủ đề]
  UC18a[Thêm / sửa / xóa follow]
  UC18b[Cấu hình alert]
  UC18c[Xem follow alerts]

  UC19[UC-19 Quản lý Workspace]
  UC19a[CRUD workspace]
  UC19b[CRUD board items]
  UC19c[Comment / activity]
  UC19d[Quản lý thành viên]

  UC20[UC-20 Cộng tác]
  UC20a[Gửi lời mời]
  UC20b[Accept / Decline invite]

  Student --> UC18
  UC18 --> UC18a
  UC18 --> UC18b
  UC18 --> UC18c

  Student --> UC19
  Owner --> UC19a
  Owner --> UC19d
  Owner --> UC19b
  Editor --> UC19b
  Editor --> UC19c
  Viewer --> UC19c
  Owner --> UC19c

  Student --> UC20
  UC20 --> UC20a
  UC20 --> UC20b
```

| Role workspace | Quyền chính |
|---|---|
| **Owner** | Full: CRUD workspace, đổi role member, xóa workspace |
| **Editor** | Tạo/sửa items, comment |
| **Viewer** | Xem + comment (read-oriented) |

---

### 3.6 Admin Console

```mermaid
flowchart TB
  Admin((Admin))
  Ext[[Nguồn ngoài]]

  UC30[UC-30 Xem Overview Admin]
  UC31[UC-31 Quản lý batch jobs]
  UC32[UC-32 Quản lý data sources]
  UC33[UC-33 Quản lý users]
  UC34[UC-34 Xử lý feedback]
  UC35[UC-35 Broadcast hệ thống]
  UC36[UC-36 Reading analytics]
  UC37[UC-37 Audit log]
  UC38[UC-38 Refresh analysis reports]

  Admin --> UC30
  Admin --> UC31
  Admin --> UC32
  Admin --> UC33
  Admin --> UC34
  Admin --> UC35
  Admin --> UC36
  Admin --> UC37
  Admin --> UC38
  UC31 -.-> Ext
  UC32 -.-> Ext
```

| ID | Use case | Admin tab | API group |
|---|---|---|---|
| UC-30 | Xem thống kê hệ thống | Overview | `/admin` |
| UC-31 | List / tạo / chạy crawler batch | Batch jobs | `/admin/jobs` |
| UC-32 | Bật/tắt nguồn, credentials, health check | Data sources | `/admin/sources` |
| UC-33 | CRUD user, role, status | Users | `/admin/users` |
| UC-34 | Duyệt / trả lời feedback | Feedback | `/feedbacks` |
| UC-35 | Broadcast signal toàn hệ thống | Broadcast | `/admin` |
| UC-36 | Thống kê thời gian đọc | Reading stats | `/admin/analytics` |
| UC-37 | Xem audit / system log | Audit log | `/admin/logs` |
| UC-38 | Refresh báo cáo phân tích | Reports | `/admin/reports` |

---

## 4. Ma trận Actor × Use Case

| Use case | Guest | Student | Admin | Nguồn ngoài |
|---|:---:|:---:|:---:|:---:|
| Xem trang chủ | ● | ○ | ○ | |
| Đăng ký / Đăng nhập / Reset MK | ● | | | |
| Đăng xuất / Hồ sơ | | ● | ● | |
| Dashboard Overview | | ● | | |
| Thông báo | | ● | | |
| Tìm kiếm / Chi tiết paper | | ● | | ◐ |
| Reading session | | ● | | |
| Library | | ● | | |
| Trends (Corpus / Live) | | ● | | ◐ |
| Research Gap (Corpus / Live) | | ● | | ◐ |
| AI tóm tắt / gợi ý | | ● | | ◐ |
| Follow subjects | | ● | | |
| Workspace & Collaboration | | ● | | |
| Feedback | | ● | ● | |
| Admin console (toàn bộ) | | | ● | ◐ |

**Chú thích:** `●` primary · `○` có thể sau login nhưng UI redirect · `◐` phụ thuộc / gọi gián tiếp qua backend

---

## 5. Quan hệ Include / Extend (tóm tắt)

```text
UC-11 Tìm kiếm bài báo
  ├── «include» Lọc facet (nguồn, năm, type)
  ├── «include» Boolean AND/OR/NOT
  ├── «extend»  Lưu saved search          [khi user bấm Save]
  └── «extend»  Request corpus sync       [khi kết quả thiếu / user yêu cầu]

UC-12 Xem chi tiết bài báo
  ├── «include» Ghi nhận view (dedup Redis)
  ├── «extend»  Reading session           [khi mở detail đủ lâu]
  ├── «extend»  AI summarize              [khi user bấm AI]
  └── «extend»  Lưu Library               [khi user Save]

UC-16 Phân tích Research Gap
  ├── «include» Tính score từ evidence
  ├── «extend»  Live fetch nguồn ngoài    [tab Live Gap]
  └── «extend»  AI diễn giải / gợi ý đề tài

UC-19 Quản lý Workspace
  ├── «include» Phân quyền Owner/Editor/Viewer
  └── «extend»  Realtime comment (socket) [khi có thành viên online]
```

---

## 6. Map Route Frontend ↔ Use Case

| Hash route | Page | Use case chính |
|---|---|---|
| `#home` | HomePage | UC-01 |
| `#login` / `#register` / `#forgot-password` / `#reset-password` | Auth pages | UC-02 → UC-04 |
| `#overview` | OverviewPage | UC-10 |
| `#notifications` | NotificationPage | UC-21 |
| `#search` | SearchPage | UC-11 |
| `#paper/:id` | PaperDetailPage | UC-12, UC-13, UC-17 |
| `#trends` | TrendsPage | UC-15 |
| `#gap` | GapPage | UC-16 |
| `#library` | LibraryPage | UC-14 |
| `#follow` | FollowPage | UC-18 |
| `#workspace` | WorkspacePage | UC-19, UC-20 |
| `#account` | AccountPage | UC-06, UC-07, feedback |
| `#admin` | AdminPage | UC-30 → UC-38 |

---

## 7. Ghi chú thiết kế

1. **Admin không dùng Student shell** — `App.tsx` redirect Admin về `#admin`.
2. **Guest không vào app** — mọi route ngoài auth/home yêu cầu login.
3. **Live Trends / Live Gap** không bắt buộc import full paper vào MongoDB; backend gọi API ngoài, chuẩn hóa, score in-memory.
4. **AI không tự bịa gap/trend** — chỉ diễn giải / gợi ý trên evidence đã tính.
5. Tài liệu chi tiết từng feature: xem `research-gap-guide.md`, `trend-analysis-guide.md`.
