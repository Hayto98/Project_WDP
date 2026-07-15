# Tong Ket Trien Khai Research Gap Theo Goc Nhin Backend

Cap nhat: 2026-07-15

Tai lieu nay tom tat chuc nang Research Gap da trien khai, cach backend dang xu ly, muc do khop voi ky vong ban dau, va nhung diem con lai neu dua len production that.

## 1. Ky vong ban dau

Research Gap duoc thiet ke theo huong:

- Backend la noi goi API nguon ngoai, frontend khong goi truc tiep OpenAlex/Crossref/arXiv/Semantic Scholar/Exa.
- Ket qua phai data-first, AI-second: lay metadata paper truoc, tinh thong ke/gap score truoc, AI chi dung de dien giai hoac goi y sau.
- Co 2 che do:
  - `Corpus Gap`: phan tich dua tren corpus da luu trong MongoDB.
  - `Live Gap`: goi nguon ngoai theo topic, tinh tam trong memory, khong bat buoc import toan bo paper vao database.
- Live Gap can co:
  - validate input.
  - chon source.
  - chuan hoa paper ve mot shape chung.
  - tinh candidate gap, score, confidence, evidence.
  - xu ly loi tung source rieng le, khong fail toan bo request.
  - cache ngan han.
  - co nut luu phan tich neu user can.

## 2. Trang thai da trien khai

### 2.1 Corpus Gap

Endpoint:

```http
GET /api/v1/analytics/gaps
```

Backend dang doc report moi nhat trong MongoDB:

- Collection: `analysis_reports`
- `report_type`: `ResearchGap`
- Service sinh report: `web/backend/src/services/report.service.js`
- Service doc report: `web/backend/src/services/analytics.service.js`

Ket qua tra ve gom:

- `fields`
- `aspects`
- `gaps`
- `gapCount`
- `ai`
- `thresholds`
- `generatedAt`

Corpus Gap phu hop cho dashboard on dinh vi khong phu thuoc API ngoai tai thoi diem user bam.

### 2.2 Live Gap

Endpoint:

```http
POST /api/v1/analytics/gaps/live
```

File backend chinh:

- `web/backend/src/routes/analytics.routes.js`
- `web/backend/src/controllers/analytics.controller.js`
- `web/backend/src/validators/analytics.validator.js`
- `web/backend/src/services/analytics.service.js`
- `web/backend/src/services/liveGap.service.js`
- `web/backend/src/services/liveFetch.service.js`

Payload chinh:

```json
{
  "topic": "federated learning medical imaging",
  "sources": ["OpenAlex", "Crossref", "arXiv"],
  "yearFrom": 2021,
  "yearTo": 2026,
  "maxRecordsPerSource": 20,
  "topK": 12
}
```

Validator hien tai:

- `topic`: bat buoc, 2-300 ky tu.
- `sources`: `OpenAlex`, `Crossref`, `arXiv`, `Semantic Scholar`, `Exa`.
- `yearFrom/yearTo`: 1900-2030, va `yearFrom <= yearTo`.
- `maxRecordsPerSource`: 10-100.
- `topK`: 3-30.

Luong xu ly backend:

1. Validate payload.
2. Tao cache key theo topic/source/year/limit/topK.
3. Neu co cache trong 20 phut thi tra ket qua voi `cached=true`.
4. Goi tung source qua service rieng.
5. Chuan hoa moi response thanh `LivePaper`.
6. Dedupe paper theo DOI/title.
7. Tach term/alias tu topic, title, abstract, keyword, field.
8. Lap thong ke term va pair.
9. Tao candidate gap.
10. Tinh `gapScore`, `level`, `confidence`, `metrics`, `reasons`, `evidence`.
11. Tra response co `summary`, `gaps`, `sourceErrors`, `warnings`.

### 2.3 Save Live Gap

Endpoint:

```http
POST /api/v1/analytics/gaps/live/save
```

Chuc nang nay luu snapshot ket qua Live Gap vao MongoDB:

- Collection: `analysis_reports`
- `report_type`: `CustomSearch`
- `criteria.mode`: `live`
- `criteria.topic`: topic da phan tich
- `criteria.sources`: danh sach source
- `criteria.yearFrom/yearTo`: khoang nam
- `criteria.requested_by`: user id neu co
- `result_snapshot`: toan bo response Live Gap
- `generated_at`: thoi diem luu
- `expires_at`: 7 ngay sau khi luu

Luu y quan trong:

- Save Live Gap khong cap nhat Corpus Gap matrix.
- Save Live Gap hien dung cho audit/demo/future saved analyses.
- Hien chua co man hinh/API rieng de list lai cac saved Live Gap report.

### 2.4 Frontend da noi API that

File frontend lien quan:

- `web/frontend/src/pages/GapPage.tsx`
- `web/frontend/src/components/LiveGapPanel.tsx`
- `web/frontend/src/lib/api.ts`
- `web/frontend/src/App.css`

UI hien co:

- Tab `Corpus Gap`.
- Tab `Live Gap`.
- Form nhap topic, source, year range, max records, topK.
- Nut `Phan tich Live`.
- Hien summary, cached flag, warning, source error, gap cards, detail panel, evidence papers.
- Nut `Luu phan tich`.
- Nut `AI goi y them`.
- Da co xu ly friendly warning de khong hien raw HTML/429/503 qua xau tren UI.

## 3. So sanh ky vong voi hien tai

| Hang muc | Ky vong | Hien tai | Trang thai |
| --- | --- | --- | --- |
| Backend goi source ngoai | Frontend khong goi truc tiep | Backend fetch qua source services | Done |
| Corpus Gap | Doc report tu corpus MongoDB | `GET /analytics/gaps` doc `ResearchGap` report | Done |
| Live Gap endpoint | `POST /analytics/gaps/live` | Da co route/controller/validator/service | Done |
| Validate input | Joi/schema ro rang | Da validate topic/source/year/limit/topK | Done |
| Chuan hoa LivePaper | Mot shape chung cho nhieu source | Da map qua `toLivePaper()` | Done |
| Partial source failure | Mot source loi khong fail all | Da catch theo source/query va tra warning | Done |
| Error/warning than thien | Khong show raw HTML/stack | Da clean 429/503/timeout/403/404 | Done |
| Gap scoring | Co cong thuc minh bach | Da co scarcity/growth/adjacency/novelty/evidence | Done |
| Evidence papers | Co paper lam bang chung | Da tra top evidence co title/year/source/doi/url | Done |
| Cache ngan han | Giam lap request external | In-memory `Map()` TTL 20 phut | Done cho demo |
| Save report | Luu khi user bam | Luu `CustomSearch` trong `analysis_reports` | Done |
| List saved live reports | User xem lai saved analysis | Chua co UI/API list rieng | Not done |
| Production cache | Redis/shared cache | Chua co, dang process-local Map | Optional |
| Monitoring source health | Quan sat loi/rate limit ngoai | Co warning UI, chua co dashboard rieng cho Live Gap | Optional |

## 4. Cong thuc va behavior chinh

Live Gap hien dung cac tin hieu:

- `scarcityScore`: cap chu de co it paper truc tiep hon muc ky vong.
- `growthScore`: tin hieu tang truong gan day.
- `adjacencyScore`: hai chu de rieng le co do manh nhat dinh.
- `noveltyScore`: ty le paper moi trong cap ket hop.
- `evidenceScore`: dua tren tong so paper lay duoc va do da dang source.

Trong so hien tai:

- scarcity: 35%
- growth: 25%
- adjacency: 20%
- novelty: 10%
- evidence: 10%

Phan loai:

- `strong`: `gapScore >= 80`
- `potential`: `gapScore >= 60`
- `needs_data`: `gapScore >= 40`
- `unclear`: duoi 40, khong tra trong danh sach final

Confidence:

- `high`: du lieu du lon va direct evidence du.
- `medium`: du lieu trung binh.
- `low`: tong fetched qua it hoac evidence yeu.

## 5. Test va smoke da xac nhan

Backend:

```bash
cd web/backend
node --test test/liveGap.unit.test.js
node --test test/liveGap.integration.test.js
npm run test:unit
```

Ket qua gan nhat:

- Live Gap unit: pass `5/5`.
- Live Gap integration: pass `25/25`.
- Backend unit suite: pass `21/21`.

Frontend:

```bash
cd web/frontend
npm run build
```

Ket qua gan nhat:

- Frontend build pass.

Smoke API that:

- Login seed user `lan.anh@uni.edu.vn / password123` pass.
- `POST /api/v1/analytics/gaps/live` voi source `OpenAlex` pass `200`.
- Topic: `federated learning medical imaging`.
- Range: `2021-2026`.
- `maxRecordsPerSource=20`.
- Ket qua:
  - `totalFetched=59`.
  - `gaps=8`.
  - top gap: `Federated Learning x Medical Segmentation`.
  - `gapScore=58`.
  - evidence: `3`.
- Save live report pass `201`.
- Goi lai cung payload tra `cached=true`.

Corpus smoke:

- `GET /api/v1/analytics/gaps?densityThreshold=0.35` pass.
- Co `hasReport=true`.
- Co fields/aspects/gaps tu `ResearchGap` report da seed/generate.

## 6. Gioi han hien tai

Nhung diem nay khong block demo, nhung can biet khi ban giao backend:

- Cache Live Gap la in-memory `Map()`, restart server se mat cache, multi-instance khong share cache.
- Save Live Gap chi luu snapshot, chua co UI/API list saved analyses.
- Live saved report dang dung `CustomSearch`, khong thay the `ResearchGap` corpus report.
- External API co the bi rate limit/503, nhat la Crossref/arXiv. He thong da hien warning than thien va van tra partial result.
- Chua co retry/backoff nang cao cho tung source.
- Chua co admin dashboard rieng cho Live Gap source error rate.
- AI suggestion hien la lop frontend/API hien co, can dam bao production chi gui metadata/abstract public neu tich hop AI that.

## 7. Goi y demo on dinh

Demo nen dung:

```json
{
  "topic": "federated learning medical imaging",
  "sources": ["OpenAlex"],
  "yearFrom": 2021,
  "yearTo": 2026,
  "maxRecordsPerSource": 20,
  "topK": 12
}
```

Ly do:

- OpenAlex on dinh hon cho demo.
- `maxRecordsPerSource=20` du nhanh va it nguy co timeout/rate limit.
- Neu can show warning handling, co the them `Crossref` hoac `arXiv`, nhung warning tu source ngoai la expected behavior, khong phai app crash.

## 8. Viec nen lam tiep neu nang production

Uu tien backend:

- Them API list/detail/delete saved Live Gap reports.
- Doi cache sang Redis neu deploy nhieu instance.
- Them retry/backoff/coalescing request cho source bi rate limit.
- Them admin observability cho Live Gap:
  - source success/fail count.
  - latency.
  - rate-limit count.
  - top failed topics.
- Them scheduled cleanup/report retention ro rang neu muon TTL khac 7 ngay.
- Viet e2e browser flow:
  - login.
  - mo Research Gap.
  - chay Live Gap.
  - xem evidence.
  - save analysis.
  - refresh va xem lai saved analysis khi co UI list.

## 9. Ket luan

So voi ky vong backend ban dau, Research Gap da dat muc demo chay that:

- Corpus Gap co report tu MongoDB.
- Live Gap goi nguon ngoai qua backend.
- Co scoring, evidence, warning, cache, save snapshot.
- Frontend da dung API that va khong goi external source truc tiep.

Phan chua hoan thien chu yeu nam o production extension:

- quan ly saved analyses.
- cache Redis/shared.
- observability/rate-limit dashboard.
- retry/backoff nang cao.

Vi vay co the demo chuc nang Research Gap that ngay, nhung neu goi la production day du thi nen lam tiep cac muc trong phan 8.
