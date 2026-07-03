# THIẾT KẾ CƠ SỞ DỮ LIỆU (MONGODB DATA MODEL)

> Phiên bản: 2 | Ngày cập nhật: 2026/7/3

Thiết kế kiến trúc hướng Document (Document-Oriented Design), tận dụng Pattern **Embedded (Nhúng)** cho dữ liệu Read-Heavy và **Reference (Tham chiếu)** cho dữ liệu có nguy cơ phình to (Unbounded Growth).

**Lưu trữ:** MongoDB — 9 collections  
**Cache:** Redis — dedup views, cache trending & reports (chi tiết: `bsonSchema.md` §3)

---

## 1. Sơ đồ Mô hình Dữ liệu (PlantUML)

```plantuml
@startuml
hide circle
skinparam linetype ortho
skinparam nodesep 40
skinparam ranksep 50
skinparam classBackgroundColor #F9F9F9
skinparam classBorderColor #333333

class "users" as Users <<Collection>> {
  * _id : ObjectId [PK]
  --
  email : String [Unique]
  password_hash : String
  full_name : String
  status : String
  created_at / updated_at : Date
  == Embedded ==
  roles : [String]
  saved_searches : [{search_id, name, criteria, created_at}]
  followed_subjects : [{follow_id, type, value, created_at}]
  dashboard_layout : {widgets}
}

class "papers" as Papers <<Collection>> {
  * _id : ObjectId [PK]
  --
  doi : String [Unique, Sparse]
  title / title_normalized : String [TextIndex]
  abstract : String [TextIndex]
  publication_year / publication_month : Int
  source_name / original_url : String
  citation_count : Int [Index, Sparse]
  status : String
  created_at / updated_at : Date
  == Embedded ==
  authors : [{name, is_primary}]
  keywords / research_fields : [String]
  sources : [{source_name, external_id, fetched_at}]
}

class "data_sources" as DataSources <<Collection>> {
  * _id : ObjectId [PK]
  --
  name : String [Unique]
  api_endpoint : String
  enabled : Boolean
  sync_schedule : String
  last_sync_at / last_sync_status : Date / String
  last_error : String
}

class "user_collections" as UserCollections <<Collection>> {
  * _id : ObjectId [PK]
  --
  user_id : ObjectId [Ref: users]
  collection_name : String
  created_at / updated_at : Date
  == Embedded ==
  saved_papers : [{paper_id, saved_at, title_snapshot, availability}]
}

class "paper_views" as PaperViews <<Collection>> {
  * _id : ObjectId [PK]
  --
  user_id : ObjectId [Ref: users]
  paper_id : ObjectId [Ref: papers]
  viewed_at : Date [Index]
  source : String
}

class "system_logs" as Logs <<TimeSeries>> {
  * _id : ObjectId [PK]
  --
  timestamp : Date [timeField]
  meta : {action_type, user_id?, source_name?} [metaField]
  details : Object
}

class "analysis_reports" as Reports <<Collection>> {
  * _id : ObjectId [PK]
  --
  report_type : String
  criteria : Object
  result_snapshot : Object
  generated_at / expires_at : Date
}

class "notifications" as Notifs <<Collection>> {
  * _id : ObjectId [PK]
  --
  user_id : ObjectId [Ref: users]
  notification_type : String
  follow_id : UUID
  content : String
  related_paper_ids : [ObjectId]
  is_read : Boolean
  created_at : Date [TTL 30d]
}

class "feedbacks" as Feedbacks <<Collection>> {
  * _id : ObjectId [PK]
  --
  user_id : ObjectId [Ref: users]
  content / status : String
  created_at / updated_at : Date
}

cloud "Redis" as Redis <<Cache>> {
  view dedup (30 min)
  top_papers:30d
  report cache
}

' ── Relationships ──
Users "1" --> "0..*" UserCollections : user_id
UserCollections "0..*" --> "0..*" Papers : saved_papers.paper_id
Users "1" --> "0..*" PaperViews : user_id
Papers "1" --> "0..*" PaperViews : paper_id
Users "1" --> "0..*" Notifs : user_id
Users "1" --> "0..*" Feedbacks : user_id
Users "1" --> "0..*" Logs : meta.user_id
DataSources ..> Papers : sync metadata
Notifs "0..*" --> "0..*" Papers : related_paper_ids
Notifs ..> Users : follow_id → followed_subjects
PaperViews ..> Redis : dedup gate
Reports ..> Redis : hot cache

note right of Papers
  Research Corpus trung tâm.
  Embedded authors/keywords/fields
  + sources[] cho dedup đa nguồn.
  status Archived → ẩn khỏi search.
end note

note bottom of PaperViews
  Unique Views (BR-043):
  Redis dedup 30 phút
  rồi ghi MongoDB.
  Aggregate → Top trending (BR-044).
end note

note bottom of DataSources
  Admin cấu hình 6 nguồn
  READ.md §6. Giám sát BR-007.
end note

@enduml
```

---

## 2. Danh sách Collection & Mapping BR

| Collection | Pattern | BR/FR chính |
| --- | --- | --- |
| `users` | Embedded | BR-014, BR-026, BR-029, BR-038, BR-039 |
| `papers` | Embedded | BR-001~006, BR-009~013, BR-020, FR-002 |
| `data_sources` | Standalone | BR-004, BR-007, BR-008, FR-012 |
| `user_collections` | Reference | BR-027, BR-028, BR-031, FR-008 |
| `paper_views` | Reference | BR-043, BR-044, FR-004, FR-007 |
| `system_logs` | Time Series | BR-041, FR-012 |
| `analysis_reports` | Standalone | BR-021, BR-025, FR-013 |
| `notifications` | Reference | BR-030, FR-010 |
| `feedbacks` | Reference | BR-042 |

---

## 3. Nguyên tắc thiết kế

### Embedded vs Reference

| Dùng Embedded khi | Dùng Reference khi |
| --- | --- |
| Dữ liệu đọc cùng lúc (authors, keywords) | Mảng không giới hạn (saved_papers, views) |
| Không cần query độc lập | Document cha có nguy cơ > 16 MB |
| Profile/settings load một lần | Quan hệ N:N giữa user và papers |

### Phân tách log vs views

| Trước (v1) | Sau (v2) | Lý do |
| --- | --- | --- |
| `system_logs` ghi cả View_Paper | `paper_views` riêng | Aggregate Top trending theo `paper_id` |
| `metaField: user_id` | `metaField: meta` object | Hỗ trợ log hệ thống không có user |
| Dedup view trong app mơ hồ | Redis TTL 1800s + `paper_views` | Rõ ràng BR-043 |

### AI output

Theo BR-033, BR-035: tóm tắt AI và giải thích thuật ngữ **sinh tức thời, không lưu MongoDB**. Chỉ cache ngắn hạn trên Redis nếu cần (optional, không bắt buộc schema).

---

## 4. Chi tiết BSON

Xem file companion: **`bsonSchema.md`** — schema đầy đủ, indexes và Redis key patterns.
