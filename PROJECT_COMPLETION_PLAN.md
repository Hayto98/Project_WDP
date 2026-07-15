# Kế Hoạch Hoàn Tất Dự Án WDP

> Sản phẩm: Hệ thống theo dõi xu hướng nghiên cứu khoa học  
> Phạm vi: `web/backend` + `web/frontend` + kiểm thử/triển khai  
> Mốc audit hiện tại: `web/FIXLIST.md` và `Minh/docs/phare.md`, cập nhật 2026-07-11  
> Trạng thái hiện tại: khoảng **93% hoàn thành theo code/FIXLIST**, khoảng **88% sẵn sàng production**

## 1. Mục Tiêu

Hoàn tất các chức năng còn lại để project có thể demo, kiểm thử và triển khai một cách đáng tin cậy:

- Người dùng Student có thể tìm kiếm corpus thật, xem chi tiết bài báo, lưu paper, quản lý thư viện, theo dõi chủ đề, nhận thông báo và làm việc trong workspace.
- Admin có thể quản lý nguồn dữ liệu, batch job, health check, user, log, report và feedback.
- Backend có validation, auth, đồng bộ nguồn, cleaning pipeline, scheduler, AI, notification, logging và test.
- Frontend production không dùng dữ liệu ảo mặc định, có đầy đủ trạng thái loading/empty/error rõ ràng.

Định hướng giao diện giữ theo PRODUCT/DESIGN hiện tại: UI nghiêm túc, tiết chế, ưu tiên dữ liệu, dùng teal làm màu nhấn có kiểm soát, đặt sự rõ ràng và độ tin cậy cao hơn hiệu ứng.

## 2. Trạng Thái Hiện Tại

### Đã Hoàn Thành Hoặc Gần Hoàn Thành

- Joi validation và route validation cho các write endpoint chính.
- Auth login/register/refresh/change-password và frontend refresh token flow.
- Service layer cho workspace, notification, collaboration, feedback và saved search.
- Paper search, advanced query, pagination, sync request và luồng corpus-first.
- Importer/source support trong code: OpenAlex, Crossref, arXiv, IEEE Xplore, Semantic Scholar, ACM/Crossref, Exa.
- Paper cleaning/dedupe pipeline và unit test cho source mapper.
- System logger, scheduler, generated reports, notification service, follow email/digest.
- AI service dùng Gemini với fallback an toàn.
- Frontend API client cho auth, admin, search, AI, library, follow, notification, workspace, feedback.
- Frontend production strict mode không fallback sample data mặc định.
- Đã xác nhận gần nhất:
  - `cd web/backend && npm run test:unit` pass, 21/21.
  - `cd web/frontend && npm run build` pass.

### Chưa Đạt 100%

- Integration test cần MongoDB/Docker local để xác nhận runtime thật.
- Playwright E2E cần full stack đang chạy.
- Chưa chốt chính sách nguồn dữ liệu: code hiện vẫn có `ACM Digital Library`, trong khi trước đó từng có yêu cầu bỏ ACM.
- `web/FIXLIST.md` đã có snapshot mới ở đầu file, nhưng checklist chi tiết bên dưới vẫn là bản task gốc.
- Dev mode vẫn có sample fallback nếu không set `VITE_STRICT_API=true`.
- Cần kiểm tra lại root `package-lock.json` đang untracked để quyết định giữ hay xóa.

## 3. Roadmap Ưu Tiên

### P0 - Chốt Quyết Định Sản Phẩm Và Dọn Repo

Mục tiêu: xóa các điểm mơ hồ trước khi tiếp tục code.

1. **Chốt chính sách nguồn dữ liệu: giữ hay bỏ ACM**
   - Nếu giữ ACM:
     - Cập nhật tài liệu nói rõ ACM hiện là ACM/Crossref fallback, không phải ACM official API key.
     - Đổi nhãn nếu cần: `ACM Digital Library` -> `ACM/Crossref`.
   - Nếu bỏ ACM:
     - Remove khỏi:
       - `web/backend/src/models/Paper.js`
       - `web/backend/src/models/DataSource.js`
       - `web/backend/src/validators/admin.validator.js`
       - `web/backend/src/validators/paper.validator.js`
       - `web/backend/src/services/scheduler.service.js`
       - `web/backend/src/services/sourceHealth.service.js`
       - `web/backend/src/controllers/paper.controller.js`
       - `web/backend/src/seeds/seed.js`
       - source list phía frontend.
     - Delete hoặc ngừng dùng `web/backend/src/services/acm.service.js` nếu không còn cần.

2. **Dọn repository**
   - Kiểm tra `package-lock.json` ở root đang untracked.
   - Nếu không có root `package.json` cần thiết, xóa root lockfile.
   - Đảm bảo `.env` không bị track.
   - Chạy:
     ```bash
     git status --short
     git diff --check
     ```

Tiêu chí hoàn thành:

- Danh sách source thống nhất giữa docs, backend enum, seed và frontend UI.
- Không còn lockfile hoặc thay đổi thừa ngoài scope.

### P1 - Xác Minh Runtime Thật

Mục tiêu: chứng minh app chạy thật end-to-end.

1. **Ổn định dependency/test backend**
   - Đã sửa scripts sang `cross-env`.
   - Xác nhận lại sau clean install:
     ```bash
     cd web/backend
     npm install
     npm run test:unit
     ```

2. **Integration test**
   - Bật MongoDB local hoặc Docker.
   - Chạy:
     ```bash
     cd web/backend
     npm run test:integration
     ```
   - Nếu fail, ưu tiên fix theo thứ tự:
     - env test DB.
     - seed/test isolation.
     - auth token setup.
     - route contract mismatch.

3. **Full-stack smoke test**
   - Start backend + frontend + Mongo.
   - Chạy:
     ```bash
     cd web/frontend
     npm run test:e2e
     ```
   - Các flow smoke cần pass:
     - Login student.
     - Search paper.
     - Save paper vào collection.
     - Cập nhật trạng thái/ghi chú trong Library.
     - Thêm follow subject.
     - Kiểm tra Workspace permission UI.
     - Mở Admin source health page.

Tiêu chí hoàn thành:

- Unit, integration, frontend build và E2E smoke đều pass trong môi trường sạch.
- Lỗi external source key được hiển thị thành warning/health status, không làm app crash.

### P2 - Làm Cứng Backend Cho Production

Mục tiêu: backend ổn định hơn khi deploy/demo.

1. **Auth hardening**
   - Hiện logout v1 là client-side/best-effort.
   - Nên bổ sung refresh-token blacklist nếu cần production nghiêm túc:
     - model/token store hoặc Redis blacklist.
     - logout invalidates refresh token.
     - logout-all-devices optional.

2. **Rate limit và security**
   - Review `rateLimiter.middleware.js`:
     - dev có thể relax.
     - production cần chặt hơn theo endpoint.
   - Xác nhận `helmet`, CORS origin, JWT secrets, Mongo URI, SMTP và external API keys trong deploy env.

3. **Độ bền của external source**
   - Mỗi source service cần:
     - timeout.
     - error message rõ ràng.
     - params thân thiện với rate limit.
     - dedupe theo DOI/title.
     - update DataSource health an toàn.
   - Các case cần kiểm tra riêng:
     - IEEE key inactive phải hiện failed health, không crash.
     - Semantic Scholar 403 cần được document là vấn đề key/activation.

4. **An toàn scheduler**
   - Tránh start trùng scheduler trong production.
   - Xác nhận interval config có thể override bằng env.
   - Thêm log cho job start/success/failure.
   - Quyết định queued jobs có retry tự động hay không.

Tiêu chí hoàn thành:

- Backend restart sạch.
- Admin health check trả structured status cho mọi supported source.
- Source/job fail không làm hỏng search, dashboard hoặc admin page.

### P3 - Hoàn Thiện Frontend Production

Mục tiêu: UI dùng dữ liệu thật, không có mock data bất ngờ trong production, trạng thái và hành động rõ ràng.

1. **Strict API mode**
   - Production default:
     - `VITE_STRICT_API=true`
     - `VITE_USE_SAMPLE_FALLBACK=false`
   - Dev chỉ giữ sample fallback cho visual work.
   - Thêm phần này vào deployment docs và `.env.example`.

2. **Search page**
   - Giữ việc bỏ field filter.
   - Xác nhận:
     - keyword search.
     - filter source/type/year.
     - auto-load thêm dữ liệu khi gần cuối cửa sổ phân trang.
     - hiển thị DOI/link.
     - thông báo khi thiếu abstract.
     - abort stale request.
   - Thêm smoke case:
     - search `deep learning`, source OpenAlex, year 2025, bấm gần cuối trang thì trigger sync mà không nhảy về page 1.

3. **Admin page**
   - Admin không điều hướng sang các trang Student.
   - Admin source health dùng status API thật.
   - Admin jobs có thể create/run job.
   - Nút refresh report trả status thật.
   - Production không fallback local sample.

4. **Library và save paper**
   - Save paper yêu cầu chọn collection.
   - Empty state của Library hướng dẫn user lưu paper từ search.
   - Note/status update persist.

5. **Follow và notification**
   - Add/update/remove followed subject persist.
   - Thứ tự route read-all của alerts/notifications đã đúng.
   - Email toggles nên giải thích rõ yêu cầu SMTP nếu chưa cấu hình.

6. **Workspace**
   - Role-aware UI:
     - owner/editor có thể invite, create item, edit item.
     - viewer chỉ đọc.
   - Activity feed dùng `WorkspaceActivity`.
   - Invite flow hiển thị rõ pending/accepted/declined.

7. **Account và feedback**
   - Profile update persist.
   - Change password flow dùng backend endpoint.
   - Feedback create/list/update hoạt động đúng role.

Tiêu chí hoàn thành:

- `npm run build` pass.
- Khi `VITE_STRICT_API=true`, lỗi API hiển thị empty/error state hữu ích và không âm thầm show sample data.
- Các flow chính của Student và Admin có E2E smoke cover.

### P4 - Chất Lượng Dữ Liệu Và Reports

Mục tiêu: kết quả search/analytics đáng tin hơn.

1. **Chất lượng corpus**
   - Đảm bảo mọi importer đều gọi cleaning pipeline nhất quán.
   - Xác nhận abstract:
     - lấy abstract từ primary source.
     - lookup OpenAlex bằng DOI khi thiếu.
     - dùng strict Gemini original-abstract lookup/fallback message.
   - Tránh abstract AI suy đoán nếu không label rõ ràng.

2. **Deduplication**
   - DOI được normalize.
   - DOI rỗng không bị collide.
   - Có title normalized fallback.
   - Nếu paper đã tồn tại, source mới được append vào paper hiện có.

3. **Reports**
   - Trend/growth/cooccurrence/gap report generation chạy từ corpus thật.
   - Admin report refresh cập nhật `AnalysisReport`.
   - Dashboard/gap/trends pages map đúng data shape từ backend.

Tiêu chí hoàn thành:

- Imported papers làm tăng corpus count khi sync page tiến lên.
- Filter theo source/type/year hoạt động với dữ liệu mới import.
- Dashboard/trends/gap không crash khi corpus rỗng hoặc thưa dữ liệu.

### P5 - Sẵn Sàng Triển Khai

Mục tiêu: người khác có thể clone, cấu hình, chạy và deploy.

1. **Environment files**
   - Đảm bảo có:
     - `web/backend/.env.example`
     - `web/backend/.env.test.example`
     - `web/frontend/.env.example`
   - Document các biến bắt buộc:
     - MongoDB URI.
     - JWT secrets.
     - API base URL.
     - source API keys/mailto.
     - SMTP optional.
     - strict API flags.

2. **Docker và CI**
   - Verify:
     ```bash
     docker compose config
     docker compose up --build
     ```
   - CI nên chạy:
     - backend unit.
     - backend integration với Mongo service.
     - frontend build.

3. **Production checklist**
   - Rotate các API key đã lộ.
   - Dùng JWT secrets mạnh.
   - Restrict CORS.
   - Xác nhận MongoDB indexes.
   - Xác nhận backup.
   - Xác nhận logs/health endpoint.

Tiêu chí hoàn thành:

- Developer mới có thể chạy local app theo docs.
- CI bắt được lỗi backend/frontend trước khi merge.
- Deploy checklist không còn secret/config item chưa xử lý.

## 4. Thứ Tự Triển Khai Đề Xuất

1. Chốt ACM policy.
2. Dọn root/untracked files.
3. Chạy baseline backend unit/build.
4. Start Mongo/Docker và fix integration tests.
5. Start full stack và fix E2E smoke.
6. Hoàn thiện frontend strict-mode edge states.
7. Harden auth/logout và scheduler retry policy nếu cần.
8. Pass cuối cho docs: `FIXLIST.md`, `phare.md`, `PRODUCTION_CHECKLIST.md`, env examples.
9. Verify cuối:
   ```bash
   cd web/backend && npm run test:all
   cd web/frontend && npm run build
   cd web/frontend && npm run test:e2e
   git diff --check
   ```

## 5. Định Nghĩa Hoàn Thành

Project chỉ được xem là hoàn tất khi:

- Backend unit + integration tests pass.
- Frontend build + E2E smoke pass.
- Full-stack manual smoke pass cho Student và Admin.
- Production strict API mode không show sample fallback.
- Source list thống nhất và đúng với quyết định sản phẩm.
- Search/sync/load-more không bị stuck loading và không nhảy về page 1.
- Admin operations dùng API thật.
- Tất cả secrets nằm trong env, không nằm trong tracked files.
- Documentation khớp với code.

## 6. Câu Hỏi Còn Mở

1. Có giữ `ACM Digital Library` không?
   - Khuyến nghị: nếu không có API/key/endpoint chính thức đang dùng, đổi thành `ACM/Crossref` hoặc remove để tránh sai kỳ vọng.

2. Mức production của auth logout là gì?
   - Demo/MVP: client-side logout chấp nhận được.
   - Production nghiêm túc: cần refresh-token blacklist/session store.

3. Có bắt buộc email notification thật trong demo không?
   - Nếu có, cần SMTP env và test gửi mail.
   - Nếu không, UI nên ghi rõ email channel chưa cấu hình.

4. Deployment target là gì?
   - Local Docker, Render/Railway, VPS hay cloud riêng sẽ ảnh hưởng CORS, env, Mongo network và CI/CD.
