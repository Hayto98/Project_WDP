# Phân tích xu hướng — Tài liệu hướng tiếp cận

> Mô tả Corpus Trends + Live Trends: kiến trúc, API, công thức CAGR, tham số UI, hạn chế và checklist kiểm thử.  
> Đồng bộ với code tại `web/backend` + `web/frontend` (07/2026).  
> Báo cáo tiến độ liên quan: [`Phuong/docs/trend_analysis_progress.md`](../../../Phuong/docs/trend_analysis_progress.md).

---

## 1. Mục tiêu sản phẩm

Trả lời câu hỏi:

> Chủ đề nào đang tăng / giảm công bố, và các từ khóa nào thường đi cùng nhau?

Business rules liên quan:

| BR | Nội dung |
|---|---|
| BR-015 | Phân tích xu hướng theo thời gian |
| BR-016 | Tốc độ tăng trưởng (CAGR) |
| BR-017 | Đồng xuất hiện từ khóa |
| BR-022 | Trực quan hóa (line chart, growth table, network) |

Hai chế độ trên `#trends`:

| Tab | Nguồn | Khi nào dùng |
|---|---|---|
| **Corpus Trends** | MongoDB `Paper` + báo cáo `Cooccurrence` | Demo ổn định, dashboard, tái lập kết quả |
| **Live Trends** | OpenAlex / Crossref / arXiv / … qua backend | Topic mới, chưa sync đủ vào corpus |

**Nguyên tắc:** Frontend **không** gọi API học thuật trực tiếp. Backend fetch, chuẩn hóa, cache, scoring.

Log import bài báo **không** vào Hộp thư user — theo dõi job ở Admin → Batch jobs.

---

## 2. Kiến trúc tổng quan

```text
┌────────────────────── Frontend (TrendsPage) ──────────────────────┐
│  Tab: Corpus Trends                    Tab: Live Trends           │
│  - range / granularity / topic chips   - form topic + sources     │
│  - TrendChart + Growth + CoocNetwork   - LiveTrendPanel + chart   │
└───────────────┬───────────────────────────────────┬───────────────┘
                │                                   │
                ▼                                   ▼
   GET /analytics/trends                 POST /analytics/trends/live
   GET /analytics/trends/growth          POST /analytics/trends/live/save
   GET /analytics/trends/cooccurrence
                │                                   │
                ▼                                   ▼
   analytics.service                     liveTrend.service
   Paper.aggregate (year/quarter)        liveFetch → top terms → yearly series
   AnalysisReport (Cooccurrence)         optional save → CustomSearch
```

File chính:

| Layer | Path |
|---|---|
| UI | `web/frontend/src/pages/TrendsPage.tsx`, `LiveTrendPanel.tsx` |
| Charts | `TrendChart.tsx`, `Sparkline.tsx`, `CoocNetwork.tsx` |
| API client | `web/frontend/src/lib/api.ts` → `analyticsApi` |
| Routes | `web/backend/src/routes/analytics.routes.js` |
| Corpus | `web/backend/src/services/analytics.service.js` |
| Live | `web/backend/src/services/liveTrend.service.js`, `liveFetch.service.js` |
| Reports | `web/backend/src/services/report.service.js` (TrendSummary, GrowthTable, Cooccurrence) |

---

## 3. Corpus Trends

### 3.1 Volume theo kỳ

- Lọc paper `status ≠ Archived`, `publication_year ≥ startYear` theo `range`.
- Nhóm theo **primary field** = `research_fields[0]` (fallback `"Other"`).
- Key ổn định = `slugify(label)` (chữ thường, khoảng trắng → `_`), dùng chung cho points / growth / co-occurrence `topic`.

| `range` | Cửa sổ năm (xấp xỉ) |
|---|---|
| `12m` | `currentYear - 1` → nay |
| `24m` | `currentYear - 2` → nay |
| `5y` | `currentYear - 6` → nay |

| `granularity` | `period` | Ghi chú |
|---|---|---|
| `year` | `"2024"` | Mặc định |
| `quarter` | `"2024-Q1"` | Quý từ `publication_month` (thiếu tháng → Q1) |

Response `GET /analytics/trends`:

```json
{
  "points": [{ "period": "2024", "large_language_models": 120, "...": 0 }],
  "series": [{ "key": "large_language_models", "label": "Large Language Models" }]
}
```

### 3.2 Growth (CAGR) — BR-016

\[
\mathrm{CAGR} = \left(\frac{\max(1, last)}{\max(1, first)}\right)^{1/(n-1)} - 1
\]

- `n` = số kỳ trong cửa sổ (`points.length`).
- Nhãn:
  - `emerging` nếu CAGR ≥ **18%**
  - `declining` nếu CAGR ≤ **−3%**
  - `stable` còn lại

`GET /analytics/trends/growth` trả về `{ key, label, latest, cagr, trend[], status }` — `key` = cùng slug với series.

### 3.3 Co-occurrence — BR-017

- Đọc `AnalysisReport` type `Cooccurrence` (generate từ top ~500 paper theo citation).
- Node: keyword slug; `topic` = slug của primary field paper.
- Edge: cặp keyword đồng xuất hiện trong cùng paper.
- Refresh: Admin `POST /admin/reports/refresh` hoặc scheduler (~30 phút / sau crawler).

Filter mạng trên UI: chỉ hiện node có `topic ∈ selected topic keys`.

---

## 4. Live Trends

Luồng:

1. User nhập topic + năm + sources + max records/source.
2. `POST /analytics/trends/live` → `liveFetch` song song các nguồn.
3. Trích top terms (~5), đếm theo năm → `trendPoints`.
4. Cache in-memory ~**20 phút** (cùng topic/params).
5. Tuỳ chọn `POST /analytics/trends/live/save` → `AnalysisReport` `CustomSearch` (snapshot; chưa có UI mở lại lịch sử).

Nguồn mặc định khuyến nghị: OpenAlex, Crossref, arXiv. Semantic Scholar / Exa cần key và dễ rate-limit.

---

## 5. Tham số UI

### Corpus

| Control | Giá trị | Ảnh hưởng |
|---|---|---|
| Range | 12 tháng / 24 tháng / 5 năm | Cửa sổ năm aggregate |
| Granularity | Năm / Quý | Shape của `period` |
| Topic chips | multi-select | Lọc series chart, growth rows, co-occurrence |

### Live

| Control | Ý nghĩa |
|---|---|
| Topic | Query tìm paper |
| yearFrom / yearTo | Cửa sổ năm chart |
| maxRecordsPerSource | 20 / 50 / 100 — tốc độ vs độ phủ |
| Sources | Chip bật/tắt nguồn |

---

## 6. Hạn chế đã biết

| Hạng mục | Chi tiết |
|---|---|
| Live latency | ~3–5s với 20 bài/nguồn (phụ thuộc API ngoài) |
| Live cache | 20 phút in-memory; restart process mất cache |
| Co-occurrence sample | Top 500 paper khi generate report |
| CAGR quý | Dùng số kỳ quý làm mũ — xếp hạng tương đối, không phải CAGR lịch năm |
| Saved live | Có API save, chưa có inbox “mở lại phân tích đã lưu” |
| Sample fallback | Dev có thể bật `USE_SAMPLE_FALLBACK`; production nên tắt |

---

## 7. Empty / error

| Tình huống | UI Corpus |
|---|---|
| API lỗi | Widget `error` + nút Thử lại |
| Corpus trống / 0 điểm | Widget `empty` — khác với lỗi mạng |
| Không chọn topic | Empty “Chọn ít nhất một chủ đề…” |

Live: skeleton khi loading; message rõ nếu 429 / timeout / không có dữ liệu.

---

## 8. Checklist kiểm thử thủ công

**Corpus**

1. Login student → `#trends` → Corpus Trends.
2. Đổi range 12m / 24m / 5y — chart cập nhật.
3. Bật **Quý** — `period` dạng `YYYY-Qn`, không còn chỉ năm.
4. Bỏ/chọn topic chips — chart, growth, co-occurrence cùng filter theo slug.
5. Tắt sample fallback: corpus rỗng hiện empty; tắt backend hiện error + retry.

**Live**

1. Topic `federated learning`, sources OpenAlex+Crossref+arXiv, 20 bài.
2. Có line chart + meta `totalFetched`; lần 2 trong 20 phút có thể `cached`.
3. Lưu kết quả — notice có id; lỗi mạng hiện message dễ đọc.
4. (Tuỳ chọn) bỏ key / spam request — thấy cảnh báo rate-limit nếu nguồn trả 429.

**Admin**

1. `POST /admin/reports/refresh` — Cooccurrence / TrendSummary cập nhật.
2. Job sync paper **không** tạo notification Hộp thư user.

---

## 9. Hướng phát triển (ngoài scope hiện tại)

- Background queue / streaming cho Live
- Unit/integration test `liveTrend.service`
- UI lịch sử CustomSearch đã lưu
- Metric bổ sung (citation velocity, venue share) — chỉ khi product yêu cầu
