# THIẾT KẾ CƠ SỞ DỮ LIỆU (MONGODB DATA MODEL)

Thiết kế kiến trúc hướng Document (Document-Oriented Design), tận dụng triệt để Pattern **Embedded (Nhúng)** nhằm tăng tốc độ truy vấn cho hệ thống Read-Heavy, và sử dụng **Reference (Tham chiếu)** cho dữ liệu có nguy cơ phình to (Unbounded Growth).

## 1. Sơ đồ Mô hình Dữ liệu (PlantUML)

Sử dụng đoạn mã PlantUML dưới đây để render sơ đồ cấu trúc các Collection và các mối quan hệ (Tham chiếu / Nhúng).

```plantuml
@startuml
hide circle
skinparam linetype ortho
skinparam nodesep 50
skinparam ranksep 60
skinparam classBackgroundColor #F9F9F9
skinparam classBorderColor #333333

class "users" as Users << Collection >> {
  * _id : ObjectId [PK]
  --
  email : String [Unique]
  password_hash : String
  full_name : String
  status : String
  created_at : Date
  == Embedded Arrays ==
  roles : [String]
  saved_searches : [{search_id, name, criteria, created_at}]
  followed_subjects : [{follow_id, type, value, created_at}]
}

class "papers" as Papers << Collection >> {
  * _id : ObjectId [PK]
  --
  doi : String [Unique, Sparse]
  title : String [TextIndex]
  abstract : String [TextIndex]
  publication_year : Int32 [Index]
  source_name : String
  original_url : String
  status : String
  created_at : Date
  == Embedded Arrays ==
  authors : [{name, is_primary}]
  keywords : [String] [Index]
  research_fields : [String] [Index]
}

class "user_collections" as UserCollections << Collection >> {
  * _id : ObjectId [PK]
  --
  user_id : ObjectId [Ref: users]
  collection_name : String
  created_at : Date
  == Embedded Array ==
  saved_papers : [{paper_id: ObjectId [Ref: papers], saved_at: Date}]
}

class "system_logs" as Logs << TimeSeries >> {
  * _id : ObjectId [PK]
  --
  timestamp : Date [MetaTime]
  user_id : ObjectId [Ref: users, MetaData]
  action_type : String
  details : Object
}

class "notifications" as Notifs << Collection >> {
  * _id : ObjectId [PK]
  --
  user_id : ObjectId [Ref: users]
  content : String
  is_read : Boolean
  created_at : Date [TTL Index]
}

class "feedbacks" as Feedbacks << Collection >> {
  * _id : ObjectId [PK]
  --
  user_id : ObjectId [Ref: users]
  content : String
  status : String
  created_at : Date
}

Users "1" --> "0..*" UserCollections : "references by user_id"
UserCollections "0..*" --> "0..*" Papers : "array of paper_id refs"
Users "1" --> "0..*" Notifs : "references by user_id"
Users "1" --> "0..*" Feedbacks : "references by user_id"
Users "1" --> "0..*" Logs : "references by user_id"
Logs "0..*" --> "0..1" Papers : "paper_id in details"

note right of Papers
  Bảng trung tâm. Tác giả, Từ khóa, 
  Lĩnh vực được nhúng trực tiếp 
  để tối ưu hóa Aggregation Pipeline.
end note

note bottom of Users
  Cài đặt cá nhân, vai trò và tìm kiếm
  được nhúng để tải Profile tức thì.
end note

@enduml