# Đặc Tả Chức Năng Live Research Gap

> Mục tiêu: phân tích Research Gap trực tiếp từ nguồn ngoài như OpenAlex, Crossref, arXiv, Semantic Scholar, Exa mà **không bắt buộc import toàn bộ paper vào database corpus**.  
> Hướng thiết kế: backend gọi nguồn ngoài, chuẩn hóa dữ liệu tạm thời trong memory, tính gap score, trả kết quả cho frontend. Frontend không gọi trực tiếp API nguồn ngoài.

---

## 1. Bài Toán Cần Giải

Người dùng muốn biết một chủ đề nghiên cứu có những khoảng trống nào đáng khai thác.

Ví dụ:

- `federated learning medical imaging`
- `large language models education`
- `graph neural networks cybersecurity`
- `retrieval augmented generation healthcare`

Thay vì chỉ search danh sách paper, hệ thống cần trả lời:

- Chủ đề con nào đang tăng trưởng?
- Cặp chủ đề nào riêng lẻ đều mạnh nhưng kết hợp còn ít paper?
- Khoảng trống nào có bằng chứng dữ liệu đủ tốt?
- Paper nào là bằng chứng đại diện?
- Có thể gợi ý hướng nghiên cứu nào từ khoảng trống đó?

---

## 2. Nguyên Tắc Thiết Kế

### 2.1 Data-first, AI-second

Research Gap không nên do AI tự bịa ra. AI chỉ nên dùng sau khi có số liệu.

Thứ tự đúng:

1. Lấy metadata paper từ nguồn học thuật.
2. Chuẩn hóa title, abstract, keyword, year, DOI, source.
3. Tính thống kê: số paper, tăng trưởng, đồng xuất hiện keyword, độ thiếu nghiên cứu.
4. Tính `gapScore`.
5. Dùng AI để diễn giải kết quả hoặc gợi ý đề tài, nhưng phải dựa trên evidence.

### 2.2 Không lưu toàn bộ paper nếu user chỉ muốn phân tích live

Live Research Gap có thể không import paper vào `Paper` collection.

Nên lưu nhẹ:

- query/topic đã chạy.
- nguồn đã dùng.
- timestamp.
- kết quả summary.
- cache ngắn hạn.

Không cần lưu:

- toàn bộ raw response.
- toàn bộ paper metadata nếu user không yêu cầu lưu report.

### 2.3 Backend là nơi gọi API ngoài

Không để frontend gọi OpenAlex/Crossref/arXiv trực tiếp vì:

- cần giấu API key.
- tránh CORS.
- kiểm soát timeout/rate limit.
- chuẩn hóa dữ liệu từ nhiều nguồn.
- thống nhất công thức scoring.
- có thể cache kết quả.

---

## 3. Hai Chế Độ Research Gap

### 3.1 Corpus Gap

Dùng dữ liệu đã có trong MongoDB corpus.

API hiện tại:

```http
GET /api/v1/analytics/gaps
```

Ưu điểm:

- nhanh.
- ổn định.
- dễ tái lập kết quả.
- không phụ thuộc API ngoài tại thời điểm user bấm.

Nhược điểm:

- phụ thuộc corpus đã sync đủ hay chưa.
- nếu topic mới chưa import thì gap dễ bị thiếu dữ liệu.

### 3.2 Live Gap

Gọi nguồn ngoài theo request, tính tạm trong memory.

API đề xuất:

```http
POST /api/v1/analytics/gaps/live
```

Ưu điểm:

- không cần chờ admin import corpus.
- phù hợp khi user muốn phân tích nhanh topic mới.
- có thể lấy dữ liệu mới nhất từ OpenAlex/arXiv/Crossref.

Nhược điểm:

- chậm hơn.
- phụ thuộc external API.
- dễ bị rate limit.
- kết quả có thể thay đổi theo thời điểm.

---

## 4. Luồng Người Dùng

### Bước 1: Nhập topic

User vào trang `Research Gap`, chọn mode `Live Gap`, nhập:

```text
federated learning medical imaging
```

User có thể chọn:

- nguồn: OpenAlex, Crossref, arXiv, Semantic Scholar, Exa.
- khoảng năm: 2021-2025.
- max records per source: 25, 50, 100.
- loại tài liệu: Journal, Conference, Preprint nếu source hỗ trợ.

### Bước 2: Frontend gọi backend

```http
POST /api/v1/analytics/gaps/live
Content-Type: application/json
Authorization: Bearer <token>
```

Body:

```json
{
  "topic": "federated learning medical imaging",
  "sources": ["OpenAlex", "Crossref", "arXiv"],
  "yearFrom": 2021,
  "yearTo": 2025,
  "maxRecordsPerSource": 50,
  "topK": 12
}
```

### Bước 3: Backend fetch dữ liệu ngoài

Backend gọi từng source theo query:

- OpenAlex: works search.
- Crossref: works search.
- arXiv: query search.
- Semantic Scholar: paper search.
- Exa: research/web search nếu được bật.

Sau đó chuẩn hóa về cùng một dạng `LivePaper`.

### Bước 4: Backend tính gap

Backend:

1. Tách keyword/topic.
2. Tính số paper theo keyword.
3. Tính số paper theo cặp keyword.
4. Tính tăng trưởng theo thời gian.
5. Tính độ thiếu nghiên cứu.
6. Tính độ tin cậy dữ liệu.
7. Trả danh sách gap có evidence.

### Bước 5: Frontend hiển thị

Frontend hiển thị:

- danh sách gap.
- `gapScore`.
- lý do vì sao gap được gợi ý.
- paper đại diện.
- biểu đồ trend nhỏ.
- nguồn dữ liệu và thời điểm lấy dữ liệu.
- nút `Lưu phân tích` nếu user muốn lưu vào `AnalysisReport`.

---

## 5. Data Model Tạm Thời

### 5.1 LivePaper

Dữ liệu chuẩn hóa trong memory:

```ts
interface LivePaper {
  id: string;
  title: string;
  abstract: string;
  year: number | null;
  source: "OpenAlex" | "Crossref" | "arXiv" | "Semantic Scholar" | "Exa";
  doi?: string;
  url?: string;
  authors: string[];
  keywords: string[];
  fields: string[];
  citationCount?: number;
  type?: "Journal" | "Conference" | "Preprint" | "Other";
}
```

### 5.2 GapCandidate

Một gap candidate là một cặp hoặc cụm chủ đề:

```ts
interface GapCandidate {
  field: string;
  aspect: string;
  directCount: number;
  countA: number;
  countB: number;
  expectedCount: number;
  recentDirectCount: number;
  oldDirectCount: number;
  growthRate: number;
  gapScore: number;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  evidence: LivePaper[];
}
```

Ví dụ:

```json
{
  "field": "Federated Learning",
  "aspect": "Medical Imaging",
  "directCount": 12,
  "countA": 500,
  "countB": 300,
  "expectedCount": 80,
  "recentDirectCount": 8,
  "oldDirectCount": 4,
  "growthRate": 0.7,
  "gapScore": 82,
  "confidence": "high"
}
```

---

## 6. Cách Tạo Candidate Gap

### 6.1 Tách keyword

Mỗi paper tạo danh sách term từ:

- title.
- abstract.
- keywords.
- fields.
- concepts nếu OpenAlex có.

Cần normalize:

- lowercase.
- trim.
- bỏ dấu câu.
- bỏ stop words.
- gộp alias.

Ví dụ alias:

```js
{
  "large language model": ["llm", "large language models", "language model", "gpt"],
  "retrieval augmented generation": ["rag", "retrieval-augmented generation"],
  "federated learning": ["fl", "federated optimization"],
  "medical imaging": ["radiology", "medical image", "mri", "ct imaging"]
}
```

### 6.2 Tạo cặp candidate

Từ mỗi paper, lấy các term quan trọng, tạo cặp:

```text
federated learning + privacy
federated learning + medical imaging
medical imaging + domain adaptation
large language model + education
```

Chỉ giữ cặp:

- xuất hiện trong ít nhất `minDirectCount`, ví dụ 2 paper.
- hoặc có một term trùng topic user nhập.
- hoặc có count riêng lẻ đủ mạnh.

### 6.3 Loại candidate yếu

Loại các candidate nếu:

- cả hai term đều quá hiếm.
- term quá chung: `model`, `system`, `data`, `method`.
- directCount quá thấp và evidence quá ít.
- không có paper đại diện đáng tin.

---

## 7. Công Thức Gap Score

### 7.1 Ý tưởng

Gap tốt không chỉ là `A + B` ít paper.

Gap tốt là:

```text
A mạnh
B mạnh
A+B còn ít
topic gần đây có tín hiệu tăng
có đủ dữ liệu để tin
```

Do đó `gapScore` nên là điểm tổng hợp:

```text
gapScore =
  0.35 * scarcityScore
+ 0.25 * growthScore
+ 0.20 * adjacencyScore
+ 0.10 * noveltyScore
+ 0.10 * evidenceScore
```

Sau đó nhân 100 và làm tròn:

```text
gapScore = round(weightedScore * 100)
```

---

## 8. Thành Phần Điểm

### 8.1 scarcityScore

Đo độ thiếu nghiên cứu trực tiếp giữa `A + B`.

```text
scarcityScore = 1 - min(directCount / expectedCount, 1)
```

Trong đó:

- `directCount`: số paper chứa cả A và B.
- `expectedCount`: số paper kỳ vọng nếu A và B kết hợp bình thường.

Cách tính `expectedCount` đơn giản:

```text
expectedCount = sqrt(countA * countB) * expectedFactor
```

Gợi ý:

```text
expectedFactor = 0.25
```

Ví dụ:

```text
countA = 500
countB = 300
directCount = 12

expectedCount = sqrt(500 * 300) * 0.25
              = 387.3 * 0.25
              = 96.8

scarcityScore = 1 - 12 / 96.8
              = 0.876
```

Ý nghĩa:

- `scarcityScore` cao: A+B đang thiếu paper so với kỳ vọng.
- `scarcityScore` thấp: A+B đã được nghiên cứu nhiều, không phải gap mạnh.

### 8.2 growthScore

Đo tín hiệu tăng trưởng gần đây.

Chia dữ liệu thành hai giai đoạn:

- `oldWindow`: ví dụ 2021-2022.
- `recentWindow`: ví dụ 2024-2025.

```text
growthRate = (recentCount + 1) / (oldCount + 1) - 1
growthScore = clamp(growthRate / 2, 0, 1)
```

Nếu tăng 200% trở lên thì score đạt gần 1.

Ví dụ:

```text
oldCount = 5
recentCount = 15

growthRate = (15 + 1) / (5 + 1) - 1
           = 1.667

growthScore = 1.667 / 2
            = 0.833
```

### 8.3 adjacencyScore

Đo xem hai chủ đề riêng lẻ có đủ mạnh không.

```text
normA = min(countA / strongTopicCount, 1)
normB = min(countB / strongTopicCount, 1)
adjacencyScore = sqrt(normA * normB)
```

Gợi ý:

```text
strongTopicCount = 100
```

Ý nghĩa:

- Nếu A mạnh và B mạnh nhưng A+B ít, đây là gap đáng chú ý.
- Nếu A và B đều yếu, ít paper chưa chắc là gap.

### 8.4 noveltyScore

Đo xem gap này có mới nổi gần đây không.

```text
noveltyScore = recentDirectCount / max(directCount, 1)
```

Ví dụ:

```text
directCount = 12
recentDirectCount = 8

noveltyScore = 8 / 12 = 0.667
```

Nếu đa số paper A+B nằm ở 1-2 năm gần đây, candidate này có tín hiệu mới.

### 8.5 evidenceScore

Đo độ tin cậy dựa trên lượng dữ liệu đã fetch.

```text
evidenceScore = min(totalFetched / 100, 1)
```

Nếu chỉ fetch được 10 paper thì không nên quá tự tin.

Có thể phạt thêm nếu nguồn quá ít:

```text
sourceDiversityScore = min(numberOfSourcesUsed / 3, 1)
evidenceScore = 0.7 * min(totalFetched / 100, 1) + 0.3 * sourceDiversityScore
```

---

## 9. Ví Dụ Tính Gap Score

Topic:

```text
federated learning medical imaging
```

Candidate:

```text
A = federated learning
B = medical imaging
```

Dữ liệu:

```text
totalFetched = 150
countA = 500
countB = 300
directCount = 12
expectedCount = 80
oldDirectCount = 4
recentDirectCount = 8
```

Điểm:

```text
scarcityScore = 1 - 12 / 80 = 0.85
growthScore = 0.70
adjacencyScore = 0.90
noveltyScore = 8 / 12 = 0.67
evidenceScore = 1.00
```

Tổng:

```text
gapScore =
  0.35 * 0.85
+ 0.25 * 0.70
+ 0.20 * 0.90
+ 0.10 * 0.67
+ 0.10 * 1.00

= 0.8195
= 82 / 100
```

Kết luận:

```text
82 điểm = Gap mạnh
```

---

## 10. Phân Loại Gap

```text
80-100: Gap mạnh
60-79:  Gap tiềm năng
40-59:  Cần thêm dữ liệu
0-39:   Không rõ là gap
```

Mapping UI:

| Khoảng điểm | Label | Ý nghĩa |
|---|---|---|
| 80-100 | Gap mạnh | Có thiếu hụt rõ, tín hiệu liên quan mạnh, đủ evidence |
| 60-79 | Gap tiềm năng | Có tín hiệu tốt nhưng cần kiểm tra thêm |
| 40-59 | Cần thêm dữ liệu | Chưa đủ dữ liệu hoặc tín hiệu chưa rõ |
| 0-39 | Không rõ là gap | Không nên ưu tiên |

---

## 11. Response API Đề Xuất

```json
{
  "topic": "federated learning medical imaging",
  "mode": "live",
  "sources": ["OpenAlex", "Crossref", "arXiv"],
  "yearFrom": 2021,
  "yearTo": 2025,
  "totalFetched": 143,
  "generatedAt": "2026-07-11T09:00:00.000Z",
  "summary": {
    "strongGaps": 3,
    "potentialGaps": 7,
    "lowConfidence": 2
  },
  "gaps": [
    {
      "id": "federated-learning__medical-imaging",
      "field": "Federated Learning",
      "aspect": "Medical Imaging",
      "gapScore": 82,
      "level": "strong",
      "confidence": "high",
      "metrics": {
        "directCount": 12,
        "countA": 500,
        "countB": 300,
        "expectedCount": 80,
        "recentDirectCount": 8,
        "oldDirectCount": 4,
        "growthRate": 0.7,
        "scarcityScore": 0.85,
        "growthScore": 0.7,
        "adjacencyScore": 0.9,
        "noveltyScore": 0.67,
        "evidenceScore": 1
      },
      "reasons": [
        "Federated Learning và Medical Imaging đều có tín hiệu nghiên cứu mạnh.",
        "Số paper kết hợp trực tiếp thấp hơn kỳ vọng.",
        "Đa số paper kết hợp xuất hiện trong giai đoạn gần đây."
      ],
      "evidence": [
        {
          "title": "Federated Learning for Privacy-Preserving Medical Image Analysis",
          "year": 2024,
          "source": "OpenAlex",
          "doi": "10.xxxx/example",
          "url": "https://doi.org/10.xxxx/example"
        }
      ]
    }
  ]
}
```

---

## 12. API Backend Cần Thêm

### 12.1 Route

File:

```text
web/backend/src/routes/analytics.routes.js
```

Thêm:

```js
router.post('/gaps/live', ctrl.getLiveGaps);
```

### 12.2 Controller

File:

```text
web/backend/src/controllers/analytics.controller.js
```

Thêm function:

```js
async function getLiveGaps(req, res) {
  const result = await analyticsService.getLiveGaps(req.body, req.user);
  return ApiResponse.success(res, result);
}
```

### 12.3 Validator

Nên tạo hoặc mở rộng validator:

```text
web/backend/src/validators/analytics.validator.js
```

Schema:

```js
const liveGapSchema = Joi.object({
  topic: Joi.string().trim().min(2).max(300).required(),
  sources: Joi.array()
    .items(Joi.string().valid('OpenAlex', 'Crossref', 'arXiv', 'Semantic Scholar', 'Exa'))
    .min(1)
    .max(5)
    .default(['OpenAlex', 'Crossref', 'arXiv']),
  yearFrom: Joi.number().integer().min(1900).max(2030).default(2021),
  yearTo: Joi.number().integer().min(1900).max(2030).default(new Date().getFullYear()),
  maxRecordsPerSource: Joi.number().integer().min(10).max(100).default(50),
  topK: Joi.number().integer().min(3).max(30).default(12),
});
```

### 12.4 Service

Có thể thêm vào:

```text
web/backend/src/services/analytics.service.js
```

Hoặc tách riêng:

```text
web/backend/src/services/liveGap.service.js
```

Khuyến nghị tách riêng vì logic sẽ dài:

```js
async function getLiveGaps(payload, user) {
  const papers = await fetchLivePapers(payload);
  const normalized = normalizeLivePapers(papers);
  const candidates = buildGapCandidates(normalized, payload.topic);
  const scored = scoreGapCandidates(candidates, normalized);
  return buildLiveGapResponse(scored, normalized, payload);
}
```

---

## 13. Pseudocode Thuật Toán

```js
async function getLiveGaps(input) {
  const sources = input.sources || ['OpenAlex', 'Crossref', 'arXiv'];
  const rawResults = [];

  for (const source of sources) {
    const papers = await fetchFromSource(source, {
      topic: input.topic,
      yearFrom: input.yearFrom,
      yearTo: input.yearTo,
      limit: input.maxRecordsPerSource,
    });
    rawResults.push(...papers);
  }

  const papers = dedupeLivePapers(rawResults);
  const termStats = buildTermStats(papers);
  const pairStats = buildPairStats(papers, termStats);
  const candidates = buildCandidates(pairStats, termStats, input.topic);

  const gaps = candidates
    .map((candidate) => scoreCandidate(candidate, papers))
    .filter((gap) => gap.gapScore >= 40)
    .sort((a, b) => b.gapScore - a.gapScore)
    .slice(0, input.topK);

  return {
    topic: input.topic,
    mode: 'live',
    sources,
    totalFetched: papers.length,
    generatedAt: new Date().toISOString(),
    gaps,
  };
}
```

---

## 14. Chi Tiết Hàm Score

```js
function scoreCandidate(candidate, context) {
  const {
    directCount,
    countA,
    countB,
    recentDirectCount,
    oldDirectCount,
  } = candidate;

  const expectedCount = Math.max(
    1,
    Math.sqrt(countA * countB) * 0.25,
  );

  const scarcityScore = clamp01(1 - Math.min(directCount / expectedCount, 1));

  const growthRate = ((recentDirectCount + 1) / (oldDirectCount + 1)) - 1;
  const growthScore = clamp01(growthRate / 2);

  const normA = clamp01(countA / 100);
  const normB = clamp01(countB / 100);
  const adjacencyScore = Math.sqrt(normA * normB);

  const noveltyScore = clamp01(recentDirectCount / Math.max(directCount, 1));

  const sourceDiversityScore = clamp01(context.sourceCount / 3);
  const fetchedScore = clamp01(context.totalFetched / 100);
  const evidenceScore = 0.7 * fetchedScore + 0.3 * sourceDiversityScore;

  const weighted =
    0.35 * scarcityScore +
    0.25 * growthScore +
    0.20 * adjacencyScore +
    0.10 * noveltyScore +
    0.10 * evidenceScore;

  return {
    ...candidate,
    expectedCount,
    growthRate,
    gapScore: Math.round(weighted * 100),
    metrics: {
      scarcityScore,
      growthScore,
      adjacencyScore,
      noveltyScore,
      evidenceScore,
    },
  };
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
```

---

## 15. Frontend UI Đề Xuất

Trang `Research Gap` nên có hai tab:

```text
Corpus Gap | Live Gap
```

### 15.1 Corpus Gap

Giữ API hiện tại:

```http
GET /api/v1/analytics/gaps
```

Dùng khi user muốn phân tích từ dữ liệu đã import vào DB.

### 15.2 Live Gap

Gọi API mới:

```http
POST /api/v1/analytics/gaps/live
```

UI cần có:

- input topic.
- chọn nguồn dữ liệu.
- chọn khoảng năm.
- chọn số paper mỗi nguồn.
- nút `Phân tích live`.
- loading state rõ ràng vì API ngoài có thể chậm.
- error state nếu nguồn ngoài lỗi/rate limit.
- result summary.
- danh sách gap.
- detail panel cho từng gap.

### 15.3 Card kết quả gap

Mỗi card nên hiển thị:

- tên gap: `Federated Learning × Medical Imaging`.
- `gapScore`.
- label: Gap mạnh / Gap tiềm năng / Cần thêm dữ liệu.
- directCount / expectedCount.
- growth signal.
- confidence.
- reasons.
- evidence papers.
- CTA:
  - `Xem paper bằng chứng`.
  - `Lưu phân tích`.
  - `Gợi ý đề tài bằng AI`.

---

## 16. Cách Dùng AI

AI không tạo gap từ con số 0. AI chỉ nhận các gap đã được scoring.

Prompt nên có:

- topic user nhập.
- danh sách gap đã tính.
- metrics.
- evidence paper.
- yêu cầu không bịa paper/DOI.

Ví dụ prompt:

```text
Bạn là trợ lý nghiên cứu. Dựa trên dữ liệu gap đã được tính bên dưới,
hãy giải thích vì sao gap này đáng nghiên cứu và gợi ý 3 hướng đề tài.

Không được bịa paper, DOI, số liệu hoặc nguồn.
Nếu evidence chưa đủ, phải nói rõ "cần thêm dữ liệu".
```

AI output:

```json
{
  "explanation": "...",
  "researchQuestions": ["...", "..."],
  "suggestedTitles": ["...", "..."],
  "limitations": "..."
}
```

---

## 17. Cache Và Lưu Report

### 17.1 Cache ngắn hạn

Nên cache theo key:

```text
topic + sources + yearFrom + yearTo + maxRecordsPerSource
```

TTL đề xuất:

```text
10-30 phút
```

Nếu chưa có Redis, có thể dùng in-memory cache trước.

### 17.2 Lưu report khi user yêu cầu

Nếu user bấm `Lưu phân tích`, lưu vào `AnalysisReport`:

```js
{
  report_type: 'ResearchGap',
  generated_at: new Date(),
  parameters: {
    mode: 'live',
    topic,
    sources,
    yearFrom,
    yearTo,
  },
  result_snapshot: response
}
```

Không tự động lưu mọi live request để tránh DB phình.

---

## 18. Edge Cases

### 18.1 Không đủ dữ liệu

Nếu `totalFetched < 20`:

- vẫn trả kết quả nếu có.
- set `confidence = low`.
- UI hiển thị cảnh báo:

```text
Dữ liệu còn ít, kết quả gap chỉ mang tính tham khảo.
```

### 18.2 Một source lỗi

Không fail toàn bộ request nếu chỉ một source lỗi.

Response nên có:

```json
{
  "sourceErrors": [
    {
      "source": "Semantic Scholar",
      "message": "403 Forbidden"
    }
  ]
}
```

### 18.3 Rate limit

Nếu source bị rate limit:

- giảm `maxRecordsPerSource`.
- dùng cache nếu có.
- trả warning rõ ràng.

### 18.4 Topic quá rộng

Ví dụ:

```text
AI
```

Backend nên trả validation warning:

```text
Topic quá rộng. Hãy nhập cụ thể hơn, ví dụ "large language models in education".
```

### 18.5 Topic quá hẹp

Nếu quá ít paper:

```text
Không đủ dữ liệu để tính gap đáng tin. Hãy mở rộng keyword hoặc tăng khoảng năm.
```

---

## 19. Test Cases Cần Có

### 19.1 Unit test

- normalize term.
- alias mapping.
- dedupe live paper.
- build term stats.
- build pair stats.
- calculate scarcityScore.
- calculate growthScore.
- calculate full gapScore.
- confidence mapping.

### 19.2 Integration test

- `POST /analytics/gaps/live` với mock source response.
- một source lỗi nhưng API vẫn trả partial result.
- topic thiếu -> validation error.
- maxRecordsPerSource quá cao -> validation error.

### 19.3 Frontend test

- nhập topic và bấm phân tích.
- loading state.
- empty state.
- error state.
- hiển thị card gap.
- click evidence paper.
- save report.

---

## 20. Checklist Triển Khai

### Backend

- [ ] Tạo `liveGap.service.js`.
- [ ] Tạo `analytics.validator.js`.
- [ ] Thêm route `POST /api/v1/analytics/gaps/live`.
- [ ] Thêm controller `getLiveGaps`.
- [ ] Reuse hoặc wrap các service OpenAlex/Crossref/arXiv/Semantic Scholar/Exa ở chế độ fetch-only.
- [ ] Chuẩn hóa `LivePaper`.
- [ ] Tạo thuật toán term extraction.
- [ ] Tạo alias map.
- [ ] Tạo candidate pair.
- [ ] Tính `gapScore`.
- [ ] Trả source warnings nếu một nguồn lỗi.
- [ ] Cache kết quả theo query.
- [ ] Thêm optional save report.
- [ ] Thêm unit tests.
- [ ] Thêm integration tests.

### Frontend

- [ ] Thêm tab `Corpus Gap` và `Live Gap`.
- [ ] Thêm form Live Gap.
- [ ] Thêm API client `analyticsApi.getLiveGaps`.
- [ ] Thêm loading state riêng cho live analysis.
- [ ] Thêm warning nếu source lỗi một phần.
- [ ] Hiển thị gap cards.
- [ ] Hiển thị detail panel.
- [ ] Hiển thị evidence papers.
- [ ] Thêm nút `Lưu phân tích`.
- [ ] Thêm nút `Gợi ý đề tài bằng AI`.
- [ ] Bảo đảm production không fallback sample cho Live Gap.

---

## 21. Kết Luận

Live Research Gap làm được và phù hợp với yêu cầu không phụ thuộc dữ liệu trong DB.

Kiến trúc nên là:

```text
Frontend -> Backend /analytics/gaps/live -> External Sources -> In-memory scoring -> Response
```

Không nên:

- gọi API nguồn ngoài trực tiếp từ frontend.
- để AI tự tạo gap không có số liệu.
- lưu toàn bộ raw paper vào DB cho mọi request live.

Nên:

- backend fetch và chuẩn hóa.
- tính gap score bằng công thức rõ ràng.
- trả evidence cụ thể.
- cache ngắn hạn.
- chỉ lưu report khi user yêu cầu.

Đây là hướng cân bằng giữa tốc độ demo, tính đúng đắn học thuật và khả năng mở rộng sau này.
