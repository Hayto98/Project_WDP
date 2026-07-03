## 2. Chi tiết các Collection (BSON Schema)

---

### 2.1. Collection: `users`

- **Mục đích:** Quản lý thông tin tài khoản và nhúng toàn bộ các cấu hình/thiết lập riêng. Tránh gọi API hoặc thực hiện lệnh `$lookup` nhiều lần.
- **Pattern:** Embedded (nhúng `roles`, `saved_searches`, `followed_subjects` để tải Profile tức thì).

```jsonc
{
  "_id": ObjectId("64a1b2c..."),
  "email": "student@university.edu.vn",        // Unique
  "password_hash": "$2b$10$...",
  "full_name": "Nguyễn Văn A",
  "status": "Active",                           // Enum: Active | Inactive | Banned
  "created_at": ISODate("2026-07-03T00:00:00Z"),

  // ── Embedded Arrays (Các cài đặt cá nhân) ──
  "roles": ["Student"],                         // Enum: Student | Admin

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
      "type": "Keyword",                        // Enum: Keyword | Field
      "value": "Artificial Intelligence",
      "created_at": ISODate("2026-07-03T02:00:00Z")
    }
  ]
}
```

---

### 2.2. Collection: `papers` (Research Corpus Trung tâm)

- **Mục đích:** Kho lưu trữ metadata của hệ thống. Tác giả, Từ khóa, Lĩnh vực nghiên cứu được nhúng thẳng để tối ưu hóa Aggregation Pipeline.
- **Pattern:** Embedded (nhúng `authors`, `keywords`, `research_fields`).

```jsonc
{
  "_id": ObjectId("64d5e6f..."),
  "doi": "10.1109/TNNLS.2023.123456",           // Unique, Sparse
  "title": "A Survey on Deep Learning for Healthcare",   // Text Index
  "abstract": "This paper provides a comprehensive review of...",  // Text Index
  "publication_year": 2023,                      // Index
  "source_name": "IEEE Xplore",
  "original_url": "https://ieeexplore.ieee.org/document/123456",
  "status": "Cleaned",                          // Enum: Raw | Cleaned | Archived
  "created_at": ISODate("2026-07-01T00:00:00Z"),

  // ── Embedded Arrays ──
  "authors": [
    { "name": "John Doe", "is_primary": true },
    { "name": "Jane Smith", "is_primary": false }
  ],
  "keywords": ["Deep Learning", "Healthcare", "Survey"],       // Index
  "research_fields": ["Artificial Intelligence", "Medical Engineering"]  // Index
}
```

---

### 2.3. Collection: `user_collections`

- **Mục đích:** Thư viện cá nhân. Dùng Reference tới `papers` thay vì embed vào `users` để bảo vệ collection `users` khỏi việc vượt quá giới hạn 16 MB.
- **Pattern:** Reference (`user_id` → `users`, `paper_id` → `papers`).

```jsonc
{
  "_id": ObjectId("64f7a8b..."),
  "user_id": ObjectId("64a1b2c..."),             // Ref → users._id
  "collection_name": "Tài liệu Đồ án Tốt nghiệp",
  "created_at": ISODate("2026-07-03T10:00:00Z"),

  // ── Embedded Array (chứa tham chiếu tới bài báo) ──
  "saved_papers": [
    {
      "paper_id": ObjectId("64d5e6f..."),        // Ref → papers._id
      "saved_at": ISODate("2026-07-03T10:30:00Z")
    }
  ]
}
```

---

### 2.4. Collection: `system_logs` (Time Series Collection)

- **Mục đích:** Lưu Lịch sử Tìm kiếm, Unique Views, Logs hệ thống. Sử dụng Time Series Collection của MongoDB để tối ưu lưu trữ và truy vấn theo thời gian.
- **Time Series Config:** `timeField: "timestamp"`, `metaField: "user_id"`.

```jsonc
{
  "_id": ObjectId("651a2b3..."),
  "timestamp": ISODate("2026-07-03T16:39:26Z"),  // Time Series: timeField
  "user_id": ObjectId("64a1b2c..."),              // Time Series: metaField → Ref users._id
  "action_type": "View_Paper",                    // Enum: View_Paper | Search | Login | ...
  "details": {
    "paper_id": ObjectId("64d5e6f..."),           // Ref → papers._id (tùy action)
    "source": "Search_Result"
  }
}
```

---

### 2.5. Collection: `notifications`

- **Mục đích:** Gửi thông báo đến người dùng. Tự động xóa sau 30 ngày bằng TTL Index trên `created_at` để giải phóng dung lượng.
- **TTL Index:** `{ "created_at": 1 }`, `expireAfterSeconds: 2592000` (30 ngày).

```jsonc
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("64a1b2c..."),              // Ref → users._id
  "content": "Có 10 bài báo mới thuộc lĩnh vực 'Artificial Intelligence' hôm nay.",
  "is_read": false,
  "created_at": ISODate("2026-07-03T09:00:00Z")   // TTL Index
}
```

---

### 2.6. Collection: `feedbacks`

- **Mục đích:** Lưu phản hồi và yêu cầu cải thiện từ người dùng. Admin tổng hợp và xử lý.
- **Pattern:** Reference (`user_id` → `users`).

```jsonc
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("64a1b2c..."),              // Ref → users._id
  "content": "Tính năng tìm kiếm nâng cao rất hữu ích, mong có thêm bộ lọc theo số trích dẫn.",
  "status": "Pending",                            // Enum: Pending | Reviewed | Resolved
  "created_at": ISODate("2026-07-03T14:00:00Z")
}
```