# THIẾT KẾ BSON SCHEMA (MongoDB + Redis)

> Phiên bản: 2 | Ngày cập nhật: 2026/7/3  
> Căn cứ: READ.md, businessRules.md, Danh_sach_yeu_cau_chuc_nang.md

**Lưu trữ chính:** MongoDB (Document-Oriented)  
**Cache & session:** Redis (dedup Unique Views, cache Top trending, hot search)

---

## 1. Tổng quan Collection

| Collection | Pattern | BR/FR chính |
| --- | --- | --- |
| `users` | Embedded | BR-014, BR-026, BR-029, BR-038, BR-039 |
| `papers` | Embedded | BR-001~006, BR-009~013, BR-020 |
| `data_sources` | Standalone | BR-007, BR-008, FR-012 |
| `user_collections` | Reference | BR-027, BR-028, BR-031 |
| `paper_views` | Reference | BR-043, BR-044, FR-004 |
| `system_logs` | Time Series | BR-041, FR-012 |
| `analysis_reports` | Standalone | BR-021, BR-025, FR-013 |
| `notifications` | Reference | BR-030, FR-010 |
| `feedbacks` | Reference | BR-042 |

---

## 2. Chi tiết các Collection (BSON Schema)

---

### 2.1. Collection: `users`

- **Mục đích:** Quản lý tài khoản và nhúng cấu hình cá nhân. Tránh `$lookup` khi load Profile (BR-039: Role load tức thì cùng Profile).
- **Pattern:** Embedded (`roles`, `saved_searches`, `followed_subjects`, `dashboard_layout`).

```jsonc
{
  "_id": ObjectId("64a1b2c..."),
  "email": "student@university.edu.vn",        // Unique Index
  "password_hash": "$2b$10$...",
  "full_name": "Nguyễn Văn A",
  "status": "Active",                           // Enum: Active | Inactive | Banned
  "created_at": ISODate("2026-07-03T00:00:00Z"),
  "updated_at": ISODate("2026-07-03T00:00:00Z"),

  // ── Embedded Arrays ──
  "roles": ["Student"],                         // Enum: Student | Admin

  "saved_searches": [                           // BR-014
    {
      "search_id": UUID("..."),
      "name": "Machine Learning Healthcare 2026",
      "criteria": {
        "keywords": ["ML", "Healthcare"],
        "year_gte": 2026,
        "year_lte": null,
        "authors": [],
        "research_fields": [],
        "source_names": [],
        "logic": "AND"                          // Enum: AND | OR (BR-011)
      },
      "created_at": ISODate("2026-07-03T01:00:00Z")
    }
  ],

  "followed_subjects": [                        // BR-029
    {
      "follow_id": UUID("..."),
      "type": "Keyword",                        // Enum: Keyword | Field
      "value": "Artificial Intelligence",
      "created_at": ISODate("2026-07-03T02:00:00Z")
    }
  ],

  "dashboard_layout": {                         // BR-026 (ưu tiên thấp)
    "widgets": ["trend_chart", "research_gap_heatmap", "top_papers", "ai_insights"]
  }
}
```

**Indexes:** `{ email: 1 }` unique

---

### 2.2. Collection: `papers` (Research Corpus Trung tâm)

- **Mục đích:** Kho metadata trung tâm. Nhúng `authors`, `keywords`, `research_fields`, `sources` để tối ưu Aggregation (FR-005, FR-006).
- **Pattern:** Embedded.
- **Lưu ý:** Chỉ metadata — không lưu toàn văn (READ.md §5.1). `status: Archived` bị loại khỏi tìm kiếm tiêu chuẩn (BR-006).

```jsonc
{
  "_id": ObjectId("64d5e6f..."),
  "doi": "10.1109/TNNLS.2023.123456",           // Unique Index, Sparse
  "title": "A Survey on Deep Learning for Healthcare",   // Text Index
  "title_normalized": "a survey on deep learning for healthcare",  // Index — dedup khi thiếu DOI (BR-003)
  "abstract": "This paper provides a comprehensive review of...",  // Text Index
  "publication_year": 2023,                      // Index
  "publication_month": 6,                        // 1–12, nullable — hỗ trợ BR-015 theo tháng
  "source_name": "IEEE Xplore",                  // Nguồn chính (denormalized, lấy từ sources[0])
  "original_url": "https://ieeexplore.ieee.org/document/123456",
  "citation_count": 142,                         // Index — sort BR-012; nullable nếu nguồn không cung cấp
  "citation_updated_at": ISODate("2026-07-01T00:00:00Z"),
  "status": "Cleaned",                          // Enum: Raw | Cleaned | Rejected | Archived
  "created_at": ISODate("2026-07-01T00:00:00Z"),
  "updated_at": ISODate("2026-07-03T00:00:00Z"),

  // ── Embedded Arrays ──
  "authors": [
    { "name": "John Doe", "is_primary": true },
    { "name": "Jane Smith", "is_primary": false }
  ],
  "keywords": ["Deep Learning", "Healthcare", "Survey"],       // Index
  "research_fields": ["Artificial Intelligence", "Medical Engineering"],  // Index

  "sources": [                                   // BR-003 — dedup đa nguồn
    {
      "source_name": "OpenAlex",                 // Enum: OpenAlex | Semantic Scholar | Crossref | arXiv | IEEE Xplore | ACM Digital Library
      "external_id": "W1234567890",
      "fetched_at": ISODate("2026-07-01T00:00:00Z")
    },
    {
      "source_name": "IEEE Xplore",
      "external_id": "123456",
      "fetched_at": ISODate("2026-07-02T00:00:00Z")
    }
  ]
}
```

**Indexes:**
- `{ doi: 1 }` unique, sparse
- `{ title_normalized: 1, publication_year: 1 }` — dedup fallback
- `{ status: 1, publication_year: -1 }` — tìm kiếm tiêu chuẩn (loại Archived)
- `{ citation_count: -1 }` sparse
- Text index: `{ title: "text", abstract: "text", keywords: "text" }`

---

### 2.3. Collection: `data_sources`

- **Mục đích:** Cấu hình và giám sát nguồn thu thập dữ liệu (BR-007, BR-008, FR-012).
- **Pattern:** Standalone (Admin quản lý).

```jsonc
{
  "_id": ObjectId("64e8f9a..."),
  "name": "OpenAlex",                           // Unique — 6 nguồn READ.md §6
  "api_endpoint": "https://api.openalex.org",
  "enabled": true,
  "sync_schedule": "0 2 * * *",                 // Cron expression (BR-004)
  "last_sync_at": ISODate("2026-07-03T02:00:00Z"),
  "last_sync_status": "Success",                // Enum: Success | Failed | Partial | Running
  "last_error": null,                           // String — message lỗi gần nhất
  "papers_synced_count": 1520,
  "created_at": ISODate("2026-07-01T00:00:00Z"),
  "updated_at": ISODate("2026-07-03T02:00:00Z")
}
```

**Indexes:** `{ name: 1 }` unique, `{ enabled: 1, last_sync_status: 1 }`

---

### 2.4. Collection: `user_collections`

- **Mục đích:** Thư viện cá nhân — thư mục/bộ sưu tập (BR-027, BR-028, BR-031).
- **Pattern:** Reference (`user_id` → `users`, `paper_id` → `papers`).
- **Toàn vẹn:** Snapshot metadata khi bài gốc archive/xóa (BR-028, FR-008).

```jsonc
{
  "_id": ObjectId("64f7a8b..."),
  "user_id": ObjectId("64a1b2c..."),             // Ref → users._id, Index
  "collection_name": "Tài liệu Đồ án Tốt nghiệp",
  "created_at": ISODate("2026-07-03T10:00:00Z"),
  "updated_at": ISODate("2026-07-03T10:00:00Z"),

  "saved_papers": [
    {
      "paper_id": ObjectId("64d5e6f..."),        // Ref → papers._id (nullable nếu Unavailable)
      "saved_at": ISODate("2026-07-03T10:30:00Z"),
      "title_snapshot": "A Survey on Deep Learning for Healthcare",
      "availability": "Available"                 // Enum: Available | Archived | Unavailable
    }
  ]
}
```

**Indexes:** `{ user_id: 1 }`, `{ user_id: 1, "saved_papers.saved_at": -1 }`

---

### 2.5. Collection: `paper_views`

- **Mục đích:** Ghi nhận Unique Views đã dedup (BR-043, BR-044). Mỗi bản ghi = 1 lượt xem hợp lệ (phiên mới sau 30 phút).
- **Pattern:** Reference (`user_id` → `users`, `paper_id` → `papers`).
- **Luồng:** Redis kiểm tra dedup 30 phút → nếu hợp lệ thì ghi MongoDB (xem §3).

```jsonc
{
  "_id": ObjectId("651a2b3..."),
  "user_id": ObjectId("64a1b2c..."),             // Ref → users._id
  "paper_id": ObjectId("64d5e6f..."),            // Ref → papers._id
  "viewed_at": ISODate("2026-07-03T16:39:26Z"), // Index
  "source": "Search_Result"                      // Enum: Search_Result | Library | Recommendation | Dashboard
}
```

**Indexes:**
- `{ paper_id: 1, viewed_at: -1 }` — Top trending BR-044
- `{ user_id: 1, paper_id: 1, viewed_at: -1 }`

---

### 2.6. Collection: `system_logs` (Time Series Collection)

- **Mục đích:** Lịch sử tìm kiếm, đăng nhập, lỗi API/batch — **không** lưu View_Paper (dùng `paper_views`).
- **Time Series Config:** `timeField: "timestamp"`, `metaField: "meta"`.

```jsonc
{
  "_id": ObjectId("651b3c4..."),
  "timestamp": ISODate("2026-07-03T16:39:26Z"),

  "meta": {                                     // Time Series: metaField (object)
    "action_type": "Search",                    // Enum: Search | Login | ApiError | BatchJob | SystemError
    "user_id": ObjectId("64a1b2c..."),          // Nullable — null cho sự kiện hệ thống
    "source_name": null                         // Bắt buộc khi action_type = ApiError | BatchJob
  },

  "details": {
    // Search
    "query": "deep learning healthcare",
    "filters": { "year_gte": 2020 },
    "result_count": 42,

    // ApiError / BatchJob / SystemError
    // "error_code": "TIMEOUT",
    // "error_message": "OpenAlex API timeout after 30s",
    // "job_id": "batch-20260703-0200"
  }
}
```

**Indexes (Time Series tự quản lý theo timestamp + meta)**

---

### 2.7. Collection: `analysis_reports`

- **Mục đích:** Lưu snapshot báo cáo phân tích tự sinh/cập nhật định kỳ (BR-021, BR-025, FR-013).
- **Pattern:** Standalone (có thể cache hot report trên Redis).

```jsonc
{
  "_id": ObjectId("652c4d5..."),
  "report_type": "TrendSummary",                // Enum: TrendSummary | ResearchGap | TopPapers | CustomSearch
  "criteria": {
    "research_field": "Artificial Intelligence",
    "keywords": ["Deep Learning"],
    "year_range": [2020, 2026]
  },
  "result_snapshot": {
    "total_papers": 8420,
    "yearly_counts": [{ "year": 2024, "count": 1520 }],
    "growth_rate": 0.23,
    "top_keywords": ["Transformer", "LLM"]
  },
  "generated_at": ISODate("2026-07-03T03:00:00Z"),
  "expires_at": ISODate("2026-07-04T03:00:00Z") // TTL hoặc ghi đè khi regenerate
}
```

**Indexes:** `{ report_type: 1, generated_at: -1 }`, `{ expires_at: 1 }` TTL optional

---

### 2.8. Collection: `notifications`

- **Mục đích:** Thông báo bài mới theo chủ đề theo dõi (BR-030, FR-010). TTL 30 ngày.
- **TTL Index:** `{ "created_at": 1 }`, `expireAfterSeconds: 2592000`

```jsonc
{
  "_id": ObjectId("653d5e6..."),
  "user_id": ObjectId("64a1b2c..."),             // Ref → users._id, Index
  "notification_type": "NewPapers",             // Enum: NewPapers | System
  "follow_id": UUID("..."),                     // Ref → users.followed_subjects.follow_id
  "content": "Có 10 bài báo mới thuộc lĩnh vực 'Artificial Intelligence' hôm nay.",
  "related_paper_ids": [                        // Ref → papers._id
    ObjectId("64d5e6f..."),
    ObjectId("64d5e70...")
  ],
  "is_read": false,
  "created_at": ISODate("2026-07-03T09:00:00Z")
}
```

**Indexes:** `{ user_id: 1, created_at: -1 }`, `{ user_id: 1, is_read: 1 }`

---

### 2.9. Collection: `feedbacks`

- **Mục đích:** Phản hồi người dùng (BR-042, ưu tiên thấp).
- **Pattern:** Reference (`user_id` → `users`).

```jsonc
{
  "_id": ObjectId("654e6f7..."),
  "user_id": ObjectId("64a1b2c..."),             // Ref → users._id
  "content": "Tính năng tìm kiếm nâng cao rất hữu ích, mong có thêm bộ lọc theo số trích dẫn.",
  "status": "Pending",                            // Enum: Pending | Reviewed | Resolved
  "admin_note": null,
  "created_at": ISODate("2026-07-03T14:00:00Z"),
  "updated_at": ISODate("2026-07-03T14:00:00Z")
}
```

**Indexes:** `{ status: 1, created_at: -1 }`

---

## 3. Redis Cache Schema

Redis bổ sung MongoDB cho dedup realtime và cache đọc nặng (businessRules: Redis).

| Key Pattern | TTL | Mục đích | BR |
| --- | --- | --- | --- |
| `view:{user_id}:{paper_id}` | 1800s (30 phút) | Dedup Unique View trước khi ghi `paper_views` | BR-043 |
| `top_papers:30d` | 3600s | Cache danh sách Top bài báo thịnh hành | BR-044 |
| `report:{report_type}:{hash}` | theo `expires_at` | Cache báo cáo phân tích hot | BR-021 |
| `search_history:{user_id}` | 7 ngày | Lịch sử tìm kiếm gần đây (gợi ý BR-034) | BR-034 |
| `data_source:status:{name}` | 300s | Cache trạng thái kết nối nguồn dữ liệu | BR-007 |

### Luồng Unique View (BR-043)

```
User mở chi tiết bài báo
  → EXISTS view:{user_id}:{paper_id}?
      Có  → bỏ qua (không ghi thêm)
      Không → SET key TTL 1800s
             → INSERT paper_views { user_id, paper_id, viewed_at, source }
             → (async) invalidate top_papers:30d
```

### Luồng Top Trending (BR-044)

```
Aggregate paper_views WHERE viewed_at >= now - 30 days
  GROUP BY paper_id ORDER BY count DESC LIMIT N
  → SET top_papers:30d (TTL 1h)
  → Dashboard đọc từ Redis, fallback MongoDB aggregate
```

---

## 4. Quy tắc nghiệp vụ ↔ Schema (tóm tắt)

| Quy tắc | Schema liên quan |
| --- | --- |
| BR-003 Dedup DOI/tiêu đề | `papers.doi`, `papers.title_normalized`, `papers.sources[]` |
| BR-006 Archive ẩn khỏi search | `papers.status`, index `{ status: 1, ... }` |
| BR-012 Sort trích dẫn | `papers.citation_count` |
| BR-014 Lưu điều kiện tìm kiếm | `users.saved_searches[]` |
| BR-028 Toàn vẹn thư viện | `user_collections.saved_papers.title_snapshot`, `.availability` |
| BR-033/035 AI không lưu DB | Không có collection AI output |
| BR-043 Unique Views 30 phút | Redis dedup + `paper_views` |
| BR-044 Top trending | Aggregate `paper_views` + Redis cache |
