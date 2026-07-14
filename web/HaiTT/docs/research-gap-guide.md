# Research Gap — Tài Liệu Vận Hành Chi Tiết

> Tài liệu mô tả toàn bộ chức năng Research Gap của WDP: Corpus Gap, Live Gap, các ngưỡng, scoring, luồng API nguồn thứ 3, và ý nghĩa từng tham số UI.  
> Cập nhật theo code thực tế tại `web/backend` + `web/frontend` (tháng 07/2026).

---

## 1. Research Gap Là Gì?

Research Gap giúp người dùng trả lời câu hỏi:

> Trong một lĩnh vực nghiên cứu, chỗ nào đang được quan tâm nhiều nhưng công bố còn thưa / sự kết hợp chủ đề còn ít?

Hệ thống **không để AI tự bịa gap**. Thứ tự đúng:

1. Lấy metadata paper (từ corpus hoặc API ngoài)
2. Chuẩn hóa title / abstract / keyword / year / DOI / source
3. Tính thống kê mật độ, tăng trưởng, đồng xuất hiện
4. Tính điểm gap (`score` / `gapScore`)
5. AI chỉ dùng để **diễn giải / gợi ý đề tài** dựa trên evidence đã có

Trên UI trang Research Gap có **2 chế độ**:

| Tab | Tên | Nguồn dữ liệu | Khi nào dùng |
|---|---|---|---|
| Corpus Gap | Phân tích từ corpus nội bộ | MongoDB `Paper` + báo cáo `AnalysisReport` | Demo ổn định, dashboard, tái lập kết quả |
| Live Gap | Phân tích live theo topic | API thứ 3 (OpenAlex, Crossref, arXiv, …) | Topic mới, chưa sync đủ vào DB |

---

## 2. Kiến Trúc Tổng Quan

```text
┌─────────────────────── Frontend (GapPage) ───────────────────────┐
│  Tab: Corpus Gap                         Tab: Live Gap           │
│  - heatmap / scatter / ranking           - form topic + sources  │
│  - slider ngưỡng mật độ                  - ranking live gaps     │
│  - chi tiết ô + evidence corpus          - detail + evidence     │
└───────────────┬───────────────────────────────────┬──────────────┘
                │                                   │
                ▼                                   ▼
   GET /api/v1/analytics/gaps          POST /api/v1/analytics/gaps/live
                │                                   │
                ▼                                   ▼
   analytics.service.getGaps()         liveGap.service.getLiveGaps()
                │                                   │
                ▼                                   ▼
   AnalysisReport (ResearchGap)        Fetch OpenAlex/Crossref/arXiv/...
   (đã generate từ corpus)             Normalize → score in-memory
```

**Nguyên tắc quan trọng:**

- Frontend **không gọi trực tiếp** OpenAlex / Crossref / arXiv.
- Backend là nơi gọi API ngoài, giấu key, chuẩn hóa, scoring, cache.
- Live Gap **không bắt buộc import** toàn bộ paper vào MongoDB.

---

## 3. Các Khái Niệm Cốt Lõi

### 3.1 Field (Lĩnh vực)

Lĩnh vực nghiên cứu lớn, ví dụ:

- Large Language Models
- Federated Learning
- Computer Vision
- Graph Neural Networks

Trong Corpus Gap, field lấy từ `research_fields` của paper trong corpus (top 6 field phổ biến nhất).

### 3.2 Aspect (Khía cạnh)

Góc nhìn cắt ngang field, ví dụ:

- Lý thuyết
- Hiệu năng
- An toàn & Riêng tư
- Y sinh
- Bền vững

Một “ô” trên heatmap = cặp **Field × Aspect**.

### 3.3 Density (Mật độ công bố)

Đo mức độ “đã có nhiều paper chưa” trong ô Field × Aspect.

- Density **cao** → đã được nghiên cứu nhiều, khó gọi là gap.
- Density **thấp** → còn thưa công bố.

Trong Corpus Gap, density được chuẩn hóa về `[0, 1]`.

### 3.4 Interest (Mức quan tâm)

Đo tín hiệu quan tâm gần đây / sức hút của ô:

- Tỷ lệ paper mới (2 năm gần nhất)
- Mức citation trung bình

Interest **cao** + Density **thấp** = cơ hội gap tốt.

### 3.5 Opportunity Score / Gap Score

Điểm tổng hợp để xếp hạng khoảng trống.

- **Corpus Gap:**  
  `score = interest × (1 − density)`  
  → quan tâm cao và mật độ thấp sẽ có điểm cao.

- **Live Gap:**  
  `gapScore` là điểm 0–100 từ nhiều thành phần (scarcity, growth, adjacency, novelty, evidence). Chi tiết ở mục 7.

### 3.6 Evidence (Paper bằng chứng)

Các paper đại diện dùng để chứng minh gap không phải “ảo”:

- Corpus Gap: top paper trong ô (theo citation)
- Live Gap: top paper chứa cả 2 term của cặp gap

### 3.7 Confidence

Độ tin cậy của kết quả live:

| Confidence | Ý nghĩa |
|---|---|
| high | Fetch đủ nhiều + cặp có đủ paper trực tiếp |
| medium | Có tín hiệu nhưng dữ liệu vừa đủ |
| low | Ít paper / nguồn lỗi / topic quá hẹp |

---

## 4. Các Ngưỡng (Threshold) — Nghĩa Là Gì?

Đây là phần hay bị hiểu nhầm. Có **nhiều loại ngưỡng**, mỗi loại phục vụ mục đích khác nhau.

### 4.1 Ngưỡng mật độ (Density Threshold) — Corpus Gap

**UI:** thanh trượt “Ngưỡng mật độ ≤ X%” trên tab Corpus Gap.

**Giá trị mặc định trong code:** `0.35` (35%)

**Công thức phân loại ô là gap:**

```text
isGap = (density ≤ densityThreshold) AND (interest ≥ interestThreshold)
```

Với:

- `densityThreshold` mặc định = **0.35**
- `interestThreshold` mặc định = **0.55**

**Ý nghĩa thực tế:**

- Bạn đang nói: “Chỉ coi là khoảng trống nếu mật độ công bố ≤ 35% và mức quan tâm ≥ 55%.”
- Kéo ngưỡng mật độ **lên** (ví dụ 50%) → nhiều ô hơn bị đánh dấu là gap (nới lỏng).
- Kéo ngưỡng **xuống** (ví dụ 20%) → chỉ còn gap “thưa” thật sự (siết chặt).

**Lưu ý vận hành:**

- Slider chỉ tính lại trên frontend (không gọi lại API mỗi lần kéo).
- Backend `GET /analytics/gaps?densityThreshold=...` cũng có thể đánh dấu `isGap` theo threshold query, nhưng GapPage hiện ưu tiên tính `isGap` client-side để phản hồi mượt.

### 4.2 Ngưỡng interest (Interest Threshold)

**Không có slider riêng trên UI**, cố định trong code:

```text
interestThreshold = 0.55
```

**Vì sao cần?**

Nếu chỉ nhìn density thấp, nhiều ô “vắng paper” nhưng chẳng ai quan tâm cũng sẽ thành gap giả. Interest threshold loại các ô “thưa nhưng vô nghĩa”.

### 4.3 Ngưỡng phân loại Live Gap theo điểm

Sau khi có `gapScore` (0–100):

| Khoảng điểm | Level | Nhãn UI | Ý nghĩa |
|---|---|---|---|
| 80–100 | `strong` | Gap mạnh | Thiếu hụt rõ, tín hiệu tốt, evidence đủ |
| 60–79 | `potential` | Gap tiềm năng | Đáng xem, cần kiểm tra thêm |
| 40–59 | `needs_data` | Cần thêm dữ liệu | Tín hiệu yếu / sample còn mỏng |
| 0–39 | `unclear` | Không rõ | Không ưu tiên (thường bị lọc khỏi kết quả) |

Live Gap chỉ trả các gap có `gapScore ≥ 40`.

### 4.4 Ngưỡng kỹ thuật khác trong Live Gap

| Tham số | Giá trị | Vai trò |
|---|---|---|
| `EXPECTED_FACTOR` | 0.25 | Hệ số kỳ vọng khi tính scarcity |
| `STRONG_TOPIC_COUNT` | 100 | Chuẩn hóa “topic mạnh” cho adjacency |
| `minDirectCount` (logic) | ~2 | Cặp term quá hiếm thường bị loại |
| Cache TTL | 20 phút | Tránh spam API ngoài cho cùng query |
| `maxRecordsPerSource` | 10–100 (default 30–50) | Giới hạn paper lấy mỗi nguồn |
| `topK` | 3–30 (default 12) | Số gap trả về / hiển thị |

---

## 5. Corpus Gap — Hoạt Động Chi Tiết

### 5.1 Mục tiêu

Phân tích gap từ **dữ liệu đã nằm trong project** (MongoDB corpus), nhanh và ổn định.

### 5.2 Pipeline tạo báo cáo

File chính: `web/backend/src/services/report.service.js`

1. Lấy **top 6 research fields** từ corpus.
2. Lấy toàn bộ paper chưa archived.
3. Với mỗi Field × mỗi Aspect cố định:
   - Lọc paper thuộc field
   - Match aspect bằng keyword trong title/abstract/keywords/research_fields
   - Tính `density`, `interest`, `papers`, `score`, `trend` (6 năm)
   - Gắn `evidence` (top 3 paper)
   - Đánh dấu `gap` theo threshold mặc định
4. Lưu snapshot vào `AnalysisReport` với `report_type = 'ResearchGap'`.

### 5.3 Khi nào báo cáo được sinh?

- Scheduler: sau khi backend start (~10s) và định kỳ (~30 phút)
- Sau crawler job thành công
- Admin bấm **Refresh reports**
- Seed script gọi `generateAllReports()`

### 5.4 API đọc

```http
GET /api/v1/analytics/gaps?densityThreshold=0.35
Authorization: Bearer <token>
```

Response chính:

```json
{
  "hasReport": true,
  "generatedAt": "2026-07-13T10:52:21.894Z",
  "gapCount": 23,
  "fields": [...],
  "aspects": [...],
  "gaps": [...],
  "ai": {
    "summary": "...",
    "directions": [{ "topic": "...", "rationale": "..." }],
    "evidence": [{ "label": "Federated Learning", "papers": 120 }]
  }
}
```

### 5.5 UI Corpus Gap làm gì?

1. Gọi API lấy matrix Field × Aspect
2. Vẽ heatmap mật độ
3. Cho phép lọc field/aspect
4. Slider ngưỡng mật độ → cập nhật số gap + ranking
5. Click ô → hiện metrics, trend, keywords, evidence, AI gợi ý thêm
6. Nút refresh để tải lại báo cáo mới nhất

### 5.6 Ưu / nhược

**Ưu:** nhanh, ổn, tái lập được, phù hợp dashboard.  
**Nhược:** phụ thuộc corpus đã sync; topic mới chưa import thì gap dễ thiếu dữ liệu.

---

## 6. Live Gap — Hoạt Động Chi Tiết

### 6.1 Mục tiêu

User nhập một topic bất kỳ (ví dụ `federated learning medical imaging`), hệ thống:

1. Gọi API nguồn học thuật thứ 3
2. Chuẩn hóa paper tạm trong memory
3. Tìm cặp chủ đề (A × B) có tín hiệu gap
4. Trả ranking + evidence ngay, **không bắt buộc lưu toàn bộ paper vào DB**

### 6.2 Luồng vận hành từ Web → Backend → API ngoài

```text
User nhập topic trên tab Live Gap
        │
        ▼
Frontend POST /api/v1/analytics/gaps/live
{
  topic, sources, yearFrom, yearTo,
  maxRecordsPerSource, topK
}
        │
        ▼
Backend liveGap.service
  1) Check cache 20 phút
  2) Fetch song song từ các nguồn đã chọn
     - query full topic
     - + query từng phrase chính (để đo countA/countB tốt hơn)
  3) Normalize → LivePaper
  4) Dedupe theo DOI/title
  5) Extract terms + alias (LLM ≈ large language model, ...)
  6) Build cặp term A×B
  7) Score từng candidate
  8) Lọc gapScore ≥ 40, sort giảm dần, lấy topK
        │
        ▼
Frontend hiển thị:
  - summary (strong/potential/lowConfidence)
  - ranking top gaps
  - detail + reasons + evidence
  - warnings / sourceErrors
  - nút Lưu phân tích / AI gợi ý thêm
```

### 6.3 Nguồn API thứ 3 đang dùng

| Nguồn | Vai trò trong Live Gap | Ghi chú |
|---|---|---|
| OpenAlex | Mặc định | Public, ổn |
| Crossref | Mặc định | Public, ổn |
| arXiv | Mặc định | Public, preprint |
| Semantic Scholar | Tùy chọn | Cần key hợp lệ; dễ 403/429 |
| Exa | Tùy chọn | Cần `EXA_API_KEY` |
| ACM Digital Library | Không dùng làm live source chính | Không có public API key; trước đây chỉ proxy Crossref |

Mặc định UI/backend: **OpenAlex + Crossref + arXiv**.

### 6.4 Frontend không gọi API ngoài trực tiếp vì sao?

- Giấu API key
- Tránh CORS
- Kiểm soát timeout / rate limit
- Chuẩn hóa nhiều nguồn về 1 schema
- Scoring thống nhất
- Cache kết quả

### 6.5 Top Gaps dùng để làm gì?

`topK` / “Top gaps” là số lượng gap **được giữ lại và hiển thị** sau khi ranking.

Ví dụ `topK = 12`:

1. Hệ thống có thể tạo rất nhiều cặp candidate (A×B)
2. Tính `gapScore` cho từng cặp
3. Bỏ cặp điểm < 40
4. Sort điểm cao → thấp
5. Chỉ lấy **12 gap đầu** trả về UI

**Vì sao cần topK?**

- Tránh UI bị ngập hàng trăm cặp yếu
- Giảm nhiễu, tập trung gap đáng xem
- Giảm payload API
- Phù hợp tư vấn đề tài: user chỉ cần vài hướng tốt nhất

**Cách dùng thực tế:**

- Demo nhanh: `topK = 8~12`
- Phân tích sâu hơn: `topK = 20~30`
- Không nên đặt quá thấp (ví dụ 3) nếu topic rộng, dễ bỏ sót hướng phụ

### 6.6 Các tham số form Live Gap

| Tham số UI | Ý nghĩa | Gợi ý |
|---|---|---|
| Chủ đề nghiên cứu | Topic cần phân tích | Nên cụ thể: `federated learning medical imaging` |
| Từ năm / Đến năm | Cửa sổ thời gian fetch | Thường 2021–năm hiện tại |
| Paper / nguồn | `maxRecordsPerSource` | 20–50; cao hơn = chậm hơn nhưng tin cậy hơn |
| Top gaps | `topK` | 8–12 cho demo; 20+ để khảo sát rộng |
| Nguồn | Checkbox OpenAlex/Crossref/arXiv/... | Mặc định 3 nguồn ổn định |

### 6.7 API Live Gap

```http
POST /api/v1/analytics/gaps/live
Authorization: Bearer <token>
Content-Type: application/json
```

Body mẫu:

```json
{
  "topic": "federated learning medical imaging",
  "sources": ["OpenAlex", "Crossref", "arXiv"],
  "yearFrom": 2021,
  "yearTo": 2026,
  "maxRecordsPerSource": 30,
  "topK": 12
}
```

Response (rút gọn):

```json
{
  "topic": "federated learning medical imaging",
  "mode": "live",
  "sources": ["OpenAlex", "Crossref", "arXiv"],
  "totalFetched": 158,
  "generatedAt": "...",
  "summary": {
    "strongGaps": 0,
    "potentialGaps": 7,
    "lowConfidence": 2
  },
  "gaps": [
    {
      "id": "federated-learning__medical-imaging",
      "field": "Federated Learning",
      "aspect": "Medical Imaging",
      "gapScore": 74,
      "level": "potential",
      "confidence": "medium",
      "metrics": {
        "directCount": 5,
        "countA": 80,
        "countB": 60,
        "expectedCount": 17.3,
        "scarcityScore": 0.71,
        "growthScore": 0.45,
        "adjacencyScore": 0.69,
        "noveltyScore": 0.8,
        "evidenceScore": 0.95
      },
      "reasons": ["..."],
      "evidence": [{ "title": "...", "year": 2024, "source": "OpenAlex", "url": "..." }]
    }
  ],
  "sourceErrors": [],
  "warnings": [],
  "cached": false
}
```

### 6.8 Lưu phân tích live

```http
POST /api/v1/analytics/gaps/live/save
```

- Chỉ lưu khi user bấm **Lưu phân tích**
- Lưu vào `AnalysisReport` dạng `CustomSearch` với `criteria.mode = 'live'`
- Không tự lưu mọi request live để tránh phình DB

---

## 7. Công Thức Gap Score (Live Gap)

### 7.1 Ý tưởng

Gap tốt không chỉ là “A+B ít paper”.

Gap tốt là:

```text
A mạnh
B mạnh
A+B còn ít so với kỳ vọng
gần đây có tín hiệu tăng
có đủ dữ liệu để tin
```

### 7.2 Thành phần điểm

```text
gapScore =
  0.35 * scarcityScore
+ 0.25 * growthScore
+ 0.20 * adjacencyScore
+ 0.10 * noveltyScore
+ 0.10 * evidenceScore
```

Sau đó:

```text
gapScore = round(weighted * 100)   // 0..100
```

#### scarcityScore — độ thiếu nghiên cứu kết hợp

```text
expectedCount = sqrt(countA * countB) * 0.25
scarcityScore = 1 - min(directCount / expectedCount, 1)
```

- `directCount`: số paper chứa cả A và B
- `countA`, `countB`: số paper chứa từng term
- scarcity cao = A+B đang thiếu so với kỳ vọng

#### growthScore — tăng trưởng gần đây

Chia cửa sổ cũ / mới theo năm paper, rồi:

```text
growthRate = (recentDirectCount + 1) / (oldDirectCount + 1) - 1
growthScore = clamp(growthRate / 2, 0, 1)
```

#### adjacencyScore — A và B có đủ mạnh riêng lẻ không

```text
normA = min(countA / 100, 1)
normB = min(countB / 100, 1)
adjacencyScore = sqrt(normA * normB)
```

Nếu A và B đều yếu, “ít paper” chưa chắc là gap đáng theo.

#### noveltyScore — phần lớn paper kết hợp có mới không

```text
noveltyScore = recentDirectCount / max(directCount, 1)
```

#### evidenceScore — độ tin cậy theo lượng dữ liệu fetch

```text
evidenceScore =
  0.7 * min(totalFetched / 100, 1)
+ 0.3 * min(numberOfSourcesUsed / 3, 1)
```

Fetch càng nhiều + đa nguồn → tin cậy hơn.

---

## 8. Web Vận Hành Như Thế Nào Khi Chạy Live Gap?

### Bước 1 — User thao tác

1. Vào trang **Research Gap**
2. Chọn tab **Live Gap**
3. Nhập topic, chọn nguồn, năm, paper/nguồn, top gaps
4. Bấm **Phân tích live**

### Bước 2 — Frontend

- Hiện trạng thái “Đang phân tích live…”
- Gọi backend `POST /analytics/gaps/live`
- Không gọi OpenAlex/Crossref trực tiếp từ browser

### Bước 3 — Backend fetch

Với mỗi nguồn được chọn:

- Gọi API nguồn với topic
- Đồng thời gọi thêm một số phrase chính tách từ topic để đo độ mạnh từng nhánh
- Nếu 1 nguồn lỗi (403/429/timeout): **không fail toàn bộ**, ghi vào `sourceErrors`

### Bước 4 — Scoring in-memory

- Dedupe paper
- Tách term / alias
- Tạo cặp A×B
- Tính metrics + gapScore
- Cắt theo `topK`

### Bước 5 — Frontend render

- Summary: số gap mạnh / tiềm năng / low confidence
- Ranking top gaps
- Click 1 gap → reasons, metrics, evidence papers
- Có thể:
  - mở URL paper bằng chứng
  - bấm **AI gợi ý thêm** (AI chỉ diễn giải trên gap đã tính)
  - bấm **Lưu phân tích**

### Bước 6 — Cache

Cùng topic + sources + năm + maxRecords + topK trong 20 phút → trả cache (`cached: true`) để giảm gọi API ngoài.

---

## 9. So Sánh Corpus Gap vs Live Gap

| Tiêu chí | Corpus Gap | Live Gap |
|---|---|---|
| Nguồn | MongoDB corpus | API thứ 3 |
| Tốc độ | Nhanh | Chậm hơn (phụ thuộc mạng/API) |
| Độ ổn định | Cao | Phụ thuộc rate limit / key |
| Topic mới | Yếu nếu chưa sync | Mạnh hơn |
| Lưu DB | Có report cached | Chỉ lưu khi user chủ động |
| UI chính | Heatmap Field×Aspect | Ranking theo topic |
| Ngưỡng chính | Density/Interest threshold | gapScore level + topK |
| Phù hợp | Dashboard, demo ổn định | Khám phá hướng đề tài theo topic |

**Khuyến nghị sản phẩm:**

- Mặc định dùng **Corpus Gap**
- Dùng **Live Gap** khi cần phân tích topic mới / corpus mỏng

---

## 10. Cảnh Báo / Edge Cases

### Topic quá rộng

Ví dụ: `AI`, `ML`  
→ Warning: kết quả dễ nhiễu, nên nhập cụ thể hơn.

### Dữ liệu fetch quá ít (`totalFetched < 20`)

→ Confidence thấp, UI cảnh báo “chỉ mang tính tham khảo”.

### Một nguồn lỗi

→ Vẫn trả kết quả từ nguồn còn lại + `sourceErrors`.

### Semantic Scholar / Exa / IEEE

→ Có thể lỗi key/quota; không nên đặt làm nguồn mặc định.

### ACM

→ Không có public search API key chính thức. Không dùng như nguồn live chuẩn.

---

## 11. File Code Liên Quan

### Backend

- `web/backend/src/services/report.service.js` — generate Corpus Gap
- `web/backend/src/services/analytics.service.js` — đọc Corpus Gap + wrap Live Gap
- `web/backend/src/services/liveGap.service.js` — thuật toán Live Gap
- `web/backend/src/controllers/analytics.controller.js`
- `web/backend/src/routes/analytics.routes.js`
- `web/backend/src/validators/analytics.validator.js`
- `web/backend/test/liveGap.unit.test.js`

### Frontend

- `web/frontend/src/pages/GapPage.tsx` — tab Corpus/Live
- `web/frontend/src/components/LiveGapPanel.tsx` — UI Live Gap
- `web/frontend/src/components/GapMatrix.tsx` / `GapScatter.tsx`
- `web/frontend/src/lib/api.ts` — `analyticsApi.gaps`, `liveGaps`, `saveLiveGaps`
- `web/frontend/src/data/gapSample.ts` — `isGap()` và type `GapItem`

---

## 12. Checklist Hiểu Đúng Chức Năng

- [ ] Research Gap là phân tích dựa trên **dữ liệu**, AI chỉ diễn giải sau.
- [ ] Corpus Gap đọc báo cáo từ corpus nội bộ.
- [ ] Live Gap gọi API thứ 3 qua backend, tính tạm trong memory.
- [ ] Density threshold quyết định ô nào được coi là gap ở Corpus.
- [ ] Interest threshold tránh gap “thưa nhưng vô nghĩa”.
- [ ] `topK`/`Top gaps` giới hạn số gap tốt nhất đưa ra UI.
- [ ] `gapScore` Live Gap là điểm tổng hợp scarcity + growth + adjacency + novelty + evidence.
- [ ] Frontend không gọi trực tiếp OpenAlex/Crossref/arXiv.
- [ ] Live result chỉ lưu DB khi user bấm “Lưu phân tích”.

---

## 13. Kết Luận

Research Gap trong WDP gồm hai lớp:

1. **Corpus Gap** — phân tích ổn định trên dữ liệu project đã sync.  
2. **Live Gap** — phân tích tức thời theo topic bằng API học thuật bên ngoài.

Người dùng cần nắm rõ:

- **Ngưỡng mật độ / interest** để hiểu vì sao một ô được đánh dấu gap.
- **Top gaps** để hiểu hệ thống đang lọc “những hướng đáng xem nhất”, không phải liệt kê mọi cặp từ khóa.
- **Live Gap pipeline** để hiểu web chỉ gửi topic lên backend; backend mới gọi nguồn thứ 3, scoring, rồi trả evidence về UI.

Đây là nền tảng để demo, viết báo cáo đồ án, và mở rộng sau này (thêm nguồn, tinh chỉnh scoring, gắn paper evidence sâu hơn).
