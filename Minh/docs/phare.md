# Phare Implementation Log

Cap nhat lan dau: 2026-07-10 18:18 +07

File nay dung de ghi lai nhung thay doi da lam trong phien chat va se duoc cap nhat tiep moi khi co task/phare moi.

## Quy uoc cap nhat

- Moi lan tiep tuc fixlist/sprint, can cap nhat file nay.
- Ghi ro: muc tieu, file da sua/them, API/behavior thay doi, cach da test, viec con lai.
- Khong ghi secret/API key vao file nay.

## Tong quan tu dau chat toi hien tai

### 1. Doc du an va doi chieu yeu cau

Da doc cac tai lieu/chuc nang chinh:

- `Danh_sach_yeu_cau_chuc_nang.md`
- `FIXLIST.md`
- Code hien tai cua backend/frontend trong `web/backend` va `web/frontend`

Ket luan chinh:

- Project da co skeleton tot cho paper search, library, analytics, dashboard, admin, notification, workspace.
- Thieu/ho nhieu phan de dat muc san pham:
  - Security validation va auth refresh/change password.
  - Frontend write actions con dung sample/local state.
  - AI service that su.
  - Auto notification.
  - Scheduler/crawler/report generation.
  - Service layer/async handler/refactor kien truc.

## Cac thay doi da lam

### Port/CORS/API base

Van de ban dau:

- Frontend goi `http://localhost:5000/api/v1/...` bi CORS/403.
- Port `5000` tren macOS bi service he thong chiem, nen backend khong nen chay o port nay.

Da xu ly:

- Chuyen frontend API fallback sang backend `http://localhost:5001/api/v1`.
- Backend cau hinh CORS cho `http://localhost:5173`.
- Backend chay o `http://localhost:5001`.
- Xac nhan CORS tu `http://localhost:5173` sang backend `5001` tra header:
  - `Access-Control-Allow-Origin: http://localhost:5173`

File lien quan:

- `web/frontend/src/lib/api.ts`
- `web/backend/.env`
- `web/backend/.env.example`

### Cap nhat env/source keys

Da cap nhat env cho cac nguon external API theo yeu cau, gom:

- OpenAlex mailto
- Semantic Scholar API URL/key
- Crossref API URL/mailto
- IEEE API URL/key
- Exa API URL/key
- External API timeout

Luu y:

- Khong ghi lai gia tri secret trong file docs nay.
- `.env` co the dang bi gitignore, con `.env.example` chi nen giu placeholder/an toan.

### Them Exa vao search/source model

Da bo sung `Exa` vao enum source de backend chap nhan source nay.

File lien quan:

- `web/backend/src/models/DataSource.js`
- `web/backend/src/models/Paper.js`
- `web/backend/src/config/env.js`

Trang search da duoc yeu cau them Exa. Phan backend model/env da co nen source khong bi reject. Neu can search Exa that su, van can them `exa.service.js` va importer/search provider rieng.

## Sprint 2 - Core UX

Muc tieu:

- Noi frontend core thao tac that sang API thay vi sample/local state.

Da lam:

- `libraryApi`:
  - Create/update/delete collection.
  - Save paper.
  - Update saved paper.
  - Remove paper.
- `searchApi`:
  - Get/create/delete saved searches.
- Search page:
  - Nut `Luu` goi API luu paper that vao thu vien.
  - Tu dung collection dau tien.
  - Neu chua co collection thi tao `Doc sau`.
  - Them `Luu tim kiem` goi `/searches`.
  - Them `Chi tiet` inline cho paper theo FR-004.
- Library page:
  - Tao collection that qua API.
  - Doi ten collection that qua API.
  - Xoa collection that qua API.
  - Doi trang thai doc that qua API.
  - Luu ghi chu khi blur textarea.
  - Xoa saved paper that qua API.
- CSS:
  - Them style nho cho inline detail va form sua collection.

Trang thai:

- Da noi cac write actions chinh cua Search/Library sang API.
- Neu can hoan thien tiep: paper detail modal/full page, saved search management day du hon, error/toast UX dep hon.

## Sprint 3 - Notification + Observability

Muc tieu:

- Tao logging he thong.
- Tao notification service.
- Auto notification cho cac event chinh.

Da them file:

- `web/backend/src/utils/systemLogger.js`
- `web/backend/src/services/notification.service.js`

Da sua file:

- `web/backend/src/services/auth.service.js`
- `web/backend/src/services/paper.service.js`
- `web/backend/src/controllers/paper.controller.js`
- `web/backend/src/controllers/collaboration.controller.js`
- `web/backend/src/controllers/workspace.controller.js`
- `web/backend/src/app.js`

Da lam:

- `systemLogger.logAction()` ghi log vao `SystemLog`.
- Log cac event:
  - Login thanh cong/that bai.
  - Search.
  - Batch job.
  - System/global error.
- `notification.service` tao notification dung model hien co.
- Auto notification:
  - Invite collaboration.
  - Comment moi trong workspace.
  - Batch job complete/fail.
- Global error handler ghi `SystemError`.

Da smoke test:

- Login/search log duoc tao.
- Invite notification tao duoc notification.
- Comment notification tao duoc notification.
- Backend restart thanh cong tren port `5001`.

## Sprint 4 - Batch/Scheduler/Reports

Muc tieu:

- Them scheduler dinh ky cho crawler jobs.
- Sinh/cap nhat `AnalysisReport` that:
  - `TrendSummary`
  - `GrowthTable`
  - `Cooccurrence`
  - `ResearchGap`
- Them endpoint refresh reports thu cong cho admin.

Da them file:

- `web/backend/src/services/report.service.js`
- `web/backend/src/services/scheduler.service.js`

Da sua file:

- `web/backend/src/controllers/admin.controller.js`
- `web/backend/src/routes/admin.routes.js`
- `web/backend/src/app.js`

Chi tiet `report.service.js`:

- Sinh `TrendSummary` tu papers theo nam va top research fields.
- Sinh `GrowthTable` tu trend summary.
- Sinh `Cooccurrence` tu keywords/research fields, tra shape frontend dang dung:
  - `nodes`
  - `edges`
- Sinh `ResearchGap` theo fields/aspects:
  - fields
  - aspects
  - gaps
  - gapCount
  - ai summary/directions/evidence
- Luu snapshot vao `analysis_reports` bang upsert theo `report_type`.

Chi tiet `scheduler.service.js`:

- `runCrawlerJob(jobOrId)` chay import theo source:
  - OpenAlex
  - arXiv
  - Crossref
  - IEEE Xplore
- Cap nhat status/progress/result/error cua `CrawlerJob`.
- Log `BatchJob`.
- Gui notification job complete/fail.
- Cap nhat `DataSource` sync status.
- Sau khi job xong thi refresh reports bat dong bo.
- `runQueuedCrawlerJobs()` xu ly cac job dang `queued`.
- `startScheduler()`:
  - Crawler queue moi 15 phut.
  - Reports refresh moi 30 phut.
  - Initial report refresh sau khi server start.

Admin API moi:

- `POST /api/v1/admin/reports/refresh`

Fix kem theo:

- `admin.controller.createJob()` khong con create truc tiep tu `req.body`; chi lay cac field cho phep va gan `requested_by/owner` tu user hien tai.

Da test:

- Syntax/service load:
  - `report service ok`
  - `scheduler service ok`
  - `admin controller ok`
- Backend restart thanh cong:
  - `http://localhost:5001`
  - Scheduler active.
- CORS:
  - `Origin: http://localhost:5173` duoc allow.
- Admin refresh reports:
  - Tao du 4 report:
    - `TrendSummary`
    - `GrowthTable`
    - `Cooccurrence`
    - `ResearchGap`
- Analytics/dashboard smoke:
  - Cooccurrence: 24 nodes, 48 edges.
  - Gaps: 6 fields, 5 aspects, 30 gaps.
  - Dashboard overview co trend/gaps/KPI.

Luu y runtime:

- Redis hien khong available, backend van chay khong cache.
- Mongoose co warning duplicate index o mot so model. Chua xu ly vi khong nam trong scope Sprint 4.

## Trang thai backend/frontend hien tai

- Backend dang chay tren `http://localhost:5001`.
- Frontend nen chay tren `http://localhost:5173`.
- Khong dung backend port `5000` vi bi macOS service chiem.

## Viec con lai theo fixlist/sprint

## Plan cap nhat frontend routes/pages dung API that

Cap nhat: 2026-07-10 18:45 +07

Muc tieu:

- Cac page frontend khong con phu thuoc sample/demo cho workflow chinh.
- Moi route/page trong `App.tsx` dung API client that khi backend co endpoint.
- Cac write action tren FE goi API thay vi chi update local state.
- Sample data chi con dung lam fallback co chu dich cho demo/offline, hoac bo han neu can che do product.

Hien trang route FE:

- Frontend dang dung hash route qua `useHashRoute`, khong dung `react-router`.
- Routes/page hien co:
  - `#home` -> `HomePage`
  - `#login` -> `LoginPage`
  - `#register` -> `RegisterPage`
  - `#overview` -> `OverviewPage`
  - `#search` -> `SearchPage`
  - `#notifications` -> `NotificationPage`
  - `#trends` -> `TrendsPage`
  - `#gap` -> `GapPage`
  - `#library` -> `LibraryPage`
  - `#follow` -> `FollowPage`
  - `#workspace` -> `WorkspacePage`
  - `#admin` -> `AdminPage`
- `App.tsx` hien redirect admin kha manh:
  - Admin user bi dua thang ve `#admin`.
  - Non-admin vao `#admin` bi dua ve `#overview` hoac `#login`.

Backend routes san co de noi FE:

- Auth:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/auth/me`
- User:
  - `PUT /api/v1/users/me`
  - `PUT /api/v1/users/me/dashboard-layout`
- Papers:
  - `GET /api/v1/papers/search`
  - `GET /api/v1/papers/trending`
  - `POST /api/v1/papers/sync-request`
  - `GET /api/v1/papers/:id`
- Library:
  - `GET/POST/PUT/DELETE /api/v1/library/collections`
  - `GET/POST/PUT/DELETE /api/v1/library/papers`
- Saved searches:
  - `GET/POST/DELETE /api/v1/searches`
- Follow:
  - `GET/POST/PUT/DELETE /api/v1/follow/subjects`
  - `GET /api/v1/follow/alerts`
  - `PUT /api/v1/follow/alerts/:id/read`
  - `PUT /api/v1/follow/alerts/read-all`
- Notifications:
  - `GET /api/v1/notifications`
  - `GET /api/v1/notifications/unread-count`
  - `PUT /api/v1/notifications/:id/read`
  - `PUT /api/v1/notifications/read-all`
- Analytics/dashboard:
  - `GET /api/v1/dashboard/overview`
  - `GET /api/v1/analytics/trends`
  - `GET /api/v1/analytics/trends/growth`
  - `GET /api/v1/analytics/trends/cooccurrence`
  - `GET /api/v1/analytics/gaps`
- AI:
  - `POST /api/v1/ai/summarize`
  - `POST /api/v1/ai/explain-term`
  - `POST /api/v1/ai/suggest-directions`
  - `GET /api/v1/ai/insights`
- Workspace/collaboration:
  - `GET/POST/PUT/DELETE /api/v1/workspaces`
  - `POST/PUT/DELETE /api/v1/workspaces/:id/members`
  - `GET/POST/PUT/DELETE /api/v1/workspaces/:id/items`
  - `POST /api/v1/workspaces/:id/items/:itemId/comments`
  - `GET /api/v1/workspaces/:id/activities`
  - `GET /api/v1/collaboration/researchers`
  - `GET/POST/PUT /api/v1/collaboration/invites`
- Admin:
  - `GET /api/v1/admin/stats`
  - `GET/PUT /api/v1/admin/users`
  - `GET/PUT/POST /api/v1/admin/data-sources`
  - `GET/POST /api/v1/admin/jobs`
  - `POST /api/v1/admin/jobs/:id/run`
  - `POST /api/v1/admin/reports/refresh`
  - `GET /api/v1/admin/audit-logs`
  - `GET /api/v1/admin/paper-reads`
- Feedback:
  - `GET/POST /api/v1/feedbacks`
  - `PUT /api/v1/feedbacks/:id`

Checklist implement de FE dung API that:

### FE API client

- Them/bo sung method con thieu trong `web/frontend/src/lib/api.ts`:
  - `authApi.me()`
  - `authApi.logout()` neu chua dung o UI.
  - `userApi.updateProfile()`
  - `userApi.updateDashboardLayout()`
  - `adminApi.updateUser()`
  - `adminApi.updateDataSource()`
  - `adminApi.createJob()`
  - `adminApi.refreshReports()`
  - `followApi.addSubject()`
  - `followApi.updateSubject()`
  - `followApi.removeSubject()`
  - `followApi.markAlertRead()`
  - `followApi.markAllAlertsRead()`
  - `notificationApi.unreadCount()`
  - `workspaceApi.createWorkspace()`
  - `workspaceApi.updateWorkspace()`
  - `workspaceApi.deleteWorkspace()`
  - `workspaceApi.addMember()`
  - `workspaceApi.updateMember()`
  - `workspaceApi.removeMember()`
  - `workspaceApi.createItem()`
  - `workspaceApi.updateItem()`
  - `workspaceApi.deleteItem()`
  - `workspaceApi.addComment()`
  - `workspaceApi.researchers()`
  - `workspaceApi.createInvite()`
  - `workspaceApi.respondInvite()`
  - `feedbackApi.create()`
  - `feedbackApi.list()`
  - `feedbackApi.update()`

### App/auth route guard

- Kiem tra lai `App.tsx`:
  - Neu user chua login ma vao route protected thi nen redirect `#login`.
  - Sau login dua ve route phu hop:
    - Admin -> `#admin`
    - Student -> `#overview`
  - Can can nhac admin co duoc xem cac page student hay khong. Hien tai admin bi lock vao `AdminPage`.
- Dung `authApi.me()` khi app boot de refresh user tu backend, tranh localStorage stale.
- Logout UI can goi API logout, clear token, redirect `#login`.

### SearchPage

- Da co search/save paper/save search/sync request API.
- Can bo sung:
  - Load saved searches de hien danh sach/quan ly.
  - Delete saved search tren UI.
  - Paper detail nen goi `GET /papers/:id` khi expand/detail, thay vi chi dung result snapshot.
  - AI summarize button trong detail goi `aiApi.summarize`.
  - Record view nen goi khi mo detail/source va handle error im lang.

### LibraryPage

- Da co collection CRUD, saved paper CRUD/status/note API.
- Can bo sung:
  - Bo sample fallback hoac hien error state ro rang khi API fail.
  - Neu mot paper nam nhieu collection, FE hien/ghi dung multi collection thay vi chi `collectionIds[0]`.
  - Paper detail trong library co the goi `aiApi.summarize`.
  - Sau create/update/delete nen refetch hoac reconcile state tu API de tranh local drift.

### FollowPage

- Hien co load subjects/alerts API, nhung write actions con chu yeu local state.
- Can noi:
  - Add subject -> `POST /follow/subjects`.
  - Toggle active/rule -> `PUT /follow/subjects/:id`.
  - Delete subject -> `DELETE /follow/subjects/:id`.
  - Mark alert read -> `PUT /follow/alerts/:id/read`.
  - Mark all read -> `PUT /follow/alerts/read-all`.
- Sau moi write action, cap nhat state tu API response hoac refetch.

### NotificationPage

- Da co list/mark read/mark all read.
- Can bo sung:
  - Unread count API neu sidebar/topbar can badge.
  - Khi click target href, mark read truoc roi navigate.
  - Bo sample fallback neu user da login va API fail; hien error/retry.

### TrendsPage

- Da co trends/growth/cooccurrence API.
- Can bo sung:
  - Refresh report trigger cho admin hoac hidden action neu user co role Admin.
  - UI phan biet empty corpus vs API error.
  - Neu selected topics thay doi sau remote series, giu selection stable.

### GapPage

- Da co gaps API.
- Can bo sung:
  - Nut AI suggest directions cho gap/field goi `aiApi.suggestDirections`.
  - Detail gap co explain term/keywords goi `aiApi.explainTerm`.
  - Empty/error state dung API-first.

### OverviewPage

- Da co dashboard overview va AI insights API.
- Can bo sung:
  - Layout widgets update neu co UI keo tha/an hien -> `PUT /users/me/dashboard-layout`.
  - Theo doi subject tu rail/empty action -> route sang `#follow` hoac call follow API.
  - Bo sample fallback trong mode product, hoac gan nhan demo ro rang.

### WorkspacePage

- Hien co load API nhung nhieu write actions con local/sample.
- Can noi:
  - Create/update/delete workspace.
  - Add/update/remove member.
  - Create/update/delete item.
  - Add comment.
  - Load researchers from `/collaboration/researchers`.
  - Create invite.
  - Respond invite accept/decline.
  - Activities refetch sau item/comment changes.
- Can map lai comments dung object tu backend thay vi chi string neu UI can author/time.

### AdminPage

- Da co stats/jobs/sources/users/logs/reads/run job/check sources.
- Can noi:
  - Update user status/roles -> `PUT /admin/users/:id`.
  - Toggle/update data source -> `PUT /admin/data-sources/:id`.
  - Create crawler job -> `POST /admin/jobs`.
  - Refresh reports -> `POST /admin/reports/refresh`.
  - Feedback moderation neu them tab feedback -> `GET/PUT /feedbacks`.
- Sau run job/refresh reports, refetch stats/sources/jobs/dashboard data.

### Feedback UI

- Hien chua thay page rieng trong `App.tsx`.
- Can quyet dinh:
  - Them feedback form trong Settings/Home/Sidebar modal.
  - Hoac them route moi `#feedback`.
- Noi:
  - Student create/list feedback.
  - Admin list/update feedback trong AdminPage.

Thu tu implement de it rui ro:

1. Hoan thien `lib/api.ts` missing methods.
2. Fix route guard/auth boot/logout trong `App.tsx`.
3. FollowPage write APIs.
4. WorkspacePage write APIs + collaboration researchers/invites.
5. AdminPage write APIs: user/source/job/report refresh.
6. Search/Library AI detail actions.
7. Gap/Overview AI actions va dashboard layout.
8. Feedback UI/API.
9. Xoa/giam sample fallback, them empty/error/retry state API-first.

Tieu chi verify:

- `npm run build` frontend pass.
- Backend chay `http://localhost:5001`.
- CORS `http://localhost:5173` OK.
- Smoke theo route:
  - Login/register/logout/me.
  - Search/save paper/save search/delete saved search.
  - Library CRUD.
  - Follow CRUD + alert read.
  - Notifications read/read all.
  - Workspace CRUD/item/comment/invite.
  - Admin update user/source/create job/refresh reports.
  - AI summarize/explain/suggest/insights fallback hoac Gemini.

## Audit trang thai FIXLIST

Cap nhat: 2026-07-10 18:50 +07

Ket luan ngan:

- FIXLIST chua xong het.
- Da lam xong mot phan lon Sprint/Phase ve core UX, observability, reports/scheduler, AI service, service-layer refactor.
- Con ho nhat la Phase 1 validation/Joi, Phase 2 auth refresh/change-password route, va frontend route/page write actions dung API that.

Da xong hoac gan xong:

- Core UX Search/Library API write actions.
- Saved searches API client co get/create/delete.
- Paper detail inline co tren Search.
- System logger.
- Log login/search/batch/system error.
- Notification service.
- Auto notification cho invite/comment/job complete.
- Scheduler crawler queue va report refresh.
- AnalysisReport generation:
  - TrendSummary
  - GrowthTable
  - Cooccurrence
  - ResearchGap
- AI service thay placeholder:
  - summarize
  - explain term
  - suggest directions
  - insights
- Gemini key da nap nhung provider quota exceeded nen dang fallback.
- Service layer:
  - collaboration
  - workspace
  - search
  - feedback
- Collaboration match score khong con random.
- Them `asyncHandler`, nhung chua ap dung toan app.

Chua xong / can lam tiep:

- Tao `src/validators/*.validator.js`.
- Gan `validate()` vao 11 route files.
- Auth routes con thieu:
  - `POST /api/v1/auth/refresh`
  - `PUT /api/v1/auth/change-password`
- Frontend auto refresh token can kiem tra/implement lai theo endpoint refresh.
- Frontend logout API can noi UI hoan chinh.
- Notification route ordering can kiem tra lai vi `/:id/read` dang dung truoc `/read-all`, co nguy co bat nham `read-all`.
- FollowPage write actions chua noi API day du.
- WorkspacePage write actions chua noi API day du.
- AdminPage write actions chua noi API day du:
  - update user
  - update data source
  - create job
  - refresh reports
- AI UI actions tren Search/Library/Gap chua gan day du.
- Workspace activities chi tiet chua co model/log that.
- Data cleaning pipeline Raw/Cleaned/Rejected chua hoan thien.
- Exa da them config/model enum, nhung chua co `exa.service.js` importer/search provider that.

## Master Plan lam het FIXLIST con lai

Cap nhat: 2026-07-10 20:11 +07

Muc tieu:

- Dua FIXLIST ve trang thai complete theo code that, khong chi tick checkbox.
- Moi batch phai co test/smoke ro rang.
- Uu tien security/auth truoc vi anh huong toan bo API.

### Batch 1 - Security validation Joi

Pham vi:

- Tao folder/file:
  - `web/backend/src/validators/auth.validator.js`
  - `web/backend/src/validators/paper.validator.js`
  - `web/backend/src/validators/workspace.validator.js`
  - `web/backend/src/validators/library.validator.js`
  - `web/backend/src/validators/follow.validator.js`
  - `web/backend/src/validators/collaboration.validator.js`
  - `web/backend/src/validators/feedback.validator.js`
  - `web/backend/src/validators/admin.validator.js`
  - `web/backend/src/validators/search.validator.js`
  - `web/backend/src/validators/user.validator.js`
  - `web/backend/src/validators/ai.validator.js`
- Kiem tra middleware hien co `validate.middleware.js`.
- Gan `validate()` vao routes:
  - auth
  - paper
  - workspace
  - library
  - follow
  - collaboration
  - feedback
  - admin
  - search
  - user
  - ai

Luu y implement:

- Validators phai match payload FE hien co.
- `library.savePaperSchema` can chap nhan `collection_ids` array vi FE dang gui array, khong chi `collection_id`.
- `admin.createJobSchema` can chap nhan `Exa` neu backend da them source enum.
- Route `/notifications/read-all` phai dat truoc `/:id/read`.
- Route `/follow/alerts/read-all` da dung truoc `/:id/read`, can giu dung.

Test:

- `node -e` require all validators/routes.
- Bad payload returns 400.
- Good payload login/search/saved-search still works.
- Frontend `npm run build`.

### Batch 2 - Auth refresh/change-password + FE auth flow

Pham vi backend:

- Them service/controller:
  - `POST /api/v1/auth/refresh`
  - `PUT /api/v1/auth/change-password`
- `refresh` verify refresh token bang `jwt.refreshSecret`, tra access/refresh token moi.
- `change-password` yeu cau auth, verify current password, hash password moi.
- Validation Joi cho 2 endpoint tren.

Pham vi frontend:

- `authApi.refresh()`
- `authApi.logout()`
- `authApi.me()`
- `request()` auto refresh khi 401 mot lan.
- Neu refresh fail:
  - clear token
  - redirect `#login`
- App boot:
  - neu co token thi goi `/auth/me` de sync user.
  - guard protected routes.

Test:

- Login lay access/refresh.
- Call `/auth/refresh` success.
- Fake/expired refresh returns 401.
- Change password test bang user tam hoac doi roi doi lai neu can.
- FE build.

### Batch 3 - Hoan thien FE API client missing methods

Pham vi `web/frontend/src/lib/api.ts`:

- `userApi.updateProfile()`
- `userApi.updateDashboardLayout()`
- `adminApi.updateUser()`
- `adminApi.updateDataSource()`
- `adminApi.createJob()`
- `adminApi.refreshReports()`
- `followApi.addSubject()`
- `followApi.updateSubject()`
- `followApi.removeSubject()`
- `followApi.markAlertRead()`
- `followApi.markAllAlertsRead()`
- `notificationApi.unreadCount()`
- `workspaceApi.createWorkspace()`
- `workspaceApi.updateWorkspace()`
- `workspaceApi.deleteWorkspace()`
- `workspaceApi.addMember()`
- `workspaceApi.updateMember()`
- `workspaceApi.removeMember()`
- `workspaceApi.createItem()`
- `workspaceApi.updateItem()`
- `workspaceApi.deleteItem()`
- `workspaceApi.addComment()`
- `workspaceApi.researchers()`
- `workspaceApi.createInvite()`
- `workspaceApi.respondInvite()`
- `feedbackApi.create()`
- `feedbackApi.list()`
- `feedbackApi.update()`

Test:

- TypeScript build.
- Smoke API method mapping bang curl/API client route tuong ung.

### FE API-first detailed checklist

Cap nhat: 2026-07-10 20:23 +07

Muc tieu gan nhat:

- Hoan thien `web/frontend/src/lib/api.ts` lam nen cho tat ca page goi API that.
- Sau do moi noi tung page, tranh viet fetch truc tiep rai rac.

#### FE-1 - `lib/api.ts` missing methods

Can them:

- Auth/user:
  - `[x]` `authApi.me()`
  - `[x]` `authApi.logout()`
  - `[x]` `authApi.changePassword()`
  - `[ ]` `userApi.updateProfile()`
  - `[ ]` `userApi.updateDashboardLayout()`
- Admin:
  - `[ ]` `adminApi.updateUser(id, patch)`
  - `[ ]` `adminApi.updateDataSource(id, patch)`
  - `[ ]` `adminApi.createJob(payload)`
  - `[ ]` `adminApi.refreshReports()`
- Follow:
  - `[ ]` `followApi.addSubject(payload)`
  - `[ ]` `followApi.updateSubject(id, patch)`
  - `[ ]` `followApi.removeSubject(id)`
  - `[ ]` `followApi.markAlertRead(id)`
  - `[ ]` `followApi.markAllAlertsRead()`
- Notifications:
  - `[ ]` `notificationApi.unreadCount()`
- Workspace:
  - `[ ]` `workspaceApi.createWorkspace(payload)`
  - `[ ]` `workspaceApi.updateWorkspace(id, patch)`
  - `[ ]` `workspaceApi.deleteWorkspace(id)`
  - `[ ]` `workspaceApi.addMember(workspaceId, payload)`
  - `[ ]` `workspaceApi.updateMember(workspaceId, memberId, patch)`
  - `[ ]` `workspaceApi.removeMember(workspaceId, memberId)`
  - `[ ]` `workspaceApi.createItem(workspaceId, payload)`
  - `[ ]` `workspaceApi.updateItem(workspaceId, itemId, patch)`
  - `[ ]` `workspaceApi.deleteItem(workspaceId, itemId)`
  - `[ ]` `workspaceApi.addComment(workspaceId, itemId, payload)`
  - `[ ]` `workspaceApi.researchers(query?)`
  - `[ ]` `workspaceApi.createInvite(payload)`
  - `[ ]` `workspaceApi.respondInvite(id, status)`
- Feedback:
  - `[ ]` `feedbackApi.create(content)`
  - `[ ]` `feedbackApi.list(query?)`
  - `[ ]` `feedbackApi.update(id, patch)`

Verify FE-1:

- `npm run build`.
- Import `api.ts` khong loi type.
- Smoke bang UI/API sau khi page noi.

#### FE-2 - App auth/route guard

Da lam:

- `[x]` Boot sync user bang `/auth/me`.
- `[x]` Protected routes redirect login neu chua co user.
- `[x]` Auto refresh token khi 401 trong request layer.

Can lam tiep:

- `[ ]` Them UI logout goi `authApi.logout()` neu sidebar/topbar co nut logout.
- `[ ]` Them UI change password neu co profile/settings.
- `[ ]` Xem lai admin routing:
  - Hien admin bi force vao `#admin`.
  - Can quyet dinh admin co duoc vao routes student hay khong.

Verify FE-2:

- Chua login vao `#overview` -> login.
- Login student -> overview.
- Login admin -> admin.
- Logout -> clear token + login.

#### FE-3 - FollowPage API-first

File:

- `web/frontend/src/pages/FollowPage.tsx`

Can noi:

- `[ ]` Add subject -> `followApi.addSubject`.
- `[ ]` Toggle active -> `followApi.updateSubject`.
- `[ ]` Update rule -> `followApi.updateSubject`.
- `[ ]` Delete subject -> `followApi.removeSubject`.
- `[ ]` Mark alert read -> `followApi.markAlertRead`.
- `[ ]` Mark all alerts read -> `followApi.markAllAlertsRead`.
- `[ ]` Sau write action refetch subjects/alerts hoac update tu response.
- `[ ]` API fail -> hien notice/retry, khong silently mutate local state.

Verify FE-3:

- Tao subject tam, update active/rule, delete.
- Alerts read/read-all neu co alert.
- Build pass.

#### FE-4 - WorkspacePage + Collaboration API-first

File:

- `web/frontend/src/pages/WorkspacePage.tsx`

Can noi:

- `[ ]` Researchers -> `workspaceApi.researchers`.
- `[ ]` Create workspace -> `workspaceApi.createWorkspace`.
- `[ ]` Update workspace -> `workspaceApi.updateWorkspace`.
- `[ ]` Delete workspace -> `workspaceApi.deleteWorkspace`.
- `[ ]` Add member -> `workspaceApi.addMember`.
- `[ ]` Update member -> `workspaceApi.updateMember`.
- `[ ]` Remove member -> `workspaceApi.removeMember`.
- `[ ]` Create item -> `workspaceApi.createItem`.
- `[ ]` Update item -> `workspaceApi.updateItem`.
- `[ ]` Delete item -> `workspaceApi.deleteItem`.
- `[ ]` Add comment -> `workspaceApi.addComment`.
- `[ ]` Create invite -> `workspaceApi.createInvite`.
- `[ ]` Respond invite -> `workspaceApi.respondInvite`.
- `[ ]` Refetch activities sau mutations.
- `[ ]` Map comments object neu UI can author/time.

Verify FE-4:

- Tao workspace tam -> item -> comment -> xoa item -> xoa workspace.
- Invite flow khong loi.
- Build pass.

#### FE-5 - AdminPage write actions

File:

- `web/frontend/src/pages/AdminPage.tsx`

Can noi:

- `[ ]` Update user status/roles -> `adminApi.updateUser`.
- `[ ]` Toggle/update data source -> `adminApi.updateDataSource`.
- `[ ]` Create crawler job -> `adminApi.createJob`.
- `[ ]` Refresh reports -> `adminApi.refreshReports`.
- `[ ]` Sau run job/refresh reports refetch jobs/stats/sources.
- `[ ]` Them feedback moderation tab neu can:
  - list feedback
  - update status/admin note

Verify FE-5:

- Toggle source va revert.
- Refresh reports success.
- Create queued job tam.
- Build pass.

#### FE-6 - Search/Library AI + detail

Files:

- `web/frontend/src/pages/SearchPage.tsx`
- `web/frontend/src/pages/LibraryPage.tsx`

Can noi:

- `[ ]` Search detail expand goi `paperApi.getById()` neu can metadata day du.
- `[ ]` Search detail AI summarize -> `aiApi.summarize`.
- `[ ]` Library detail AI summarize -> `aiApi.summarize`.
- `[ ]` Keyword explain neu UI co chip -> `aiApi.explainTerm`.
- `[ ]` Saved searches UI:
  - load list
  - delete saved search
  - apply saved search vao filters

Verify FE-6:

- Gemini quota exceeded van render fallback summary.
- Save/delete saved search UI that.
- Build pass.

#### FE-7 - Gap/Overview AI/dashboard layout

Files:

- `web/frontend/src/pages/GapPage.tsx`
- `web/frontend/src/pages/OverviewPage.tsx`

Can noi:

- `[ ]` Gap suggest directions -> `aiApi.suggestDirections`.
- `[ ]` Gap explain term/keyword -> `aiApi.explainTerm`.
- `[ ]` Overview layout widgets neu co UI -> `userApi.updateDashboardLayout`.
- `[ ]` Empty action theo doi subject -> route `#follow` hoac call follow API.

Verify FE-7:

- Gap AI fallback render.
- Layout update neu UI co.
- Build pass.

#### FE-8 - Feedback UI

Can quyet dinh vi hien chua co route page rieng:

- Option A: add feedback form/modal trong Home/Sidebar.
- Option B: them route `#feedback`.
- Option C: add feedback tab trong Admin cho moderation va form user trong settings/profile.

Can noi:

- `[ ]` Student create feedback -> `feedbackApi.create`.
- `[ ]` Student list own feedback -> `feedbackApi.list`.
- `[ ]` Admin list all feedback -> `feedbackApi.list`.
- `[ ]` Admin update feedback -> `feedbackApi.update`.

Verify FE-8:

- Create feedback success.
- Admin mark reviewed/resolved success.
- Build pass.

#### FE Definition of Done

- Tat ca page co endpoint backend tuong ung phai dung API method trong `lib/api.ts`.
- Khong fetch truc tiep trong page tru khi co ly do ro.
- Write action khong chi mutate local state khi API fail.
- FE build pass sau moi batch.
- Backend `5001` + FE `5173` CORS OK.

### Batch 4 - FollowPage API-first

Pham vi:

- Add subject goi `followApi.addSubject`.
- Toggle active/rule goi `followApi.updateSubject`.
- Delete subject goi `followApi.removeSubject`.
- Mark alert read/read-all goi API.
- Bo local-only mutation neu API fail; hien notice/error.
- Refetch subjects/alerts sau write hoac reconcile tu response.

Test:

- Tao follow subject tam, update, delete.
- Mark alert read/read-all neu co alert.
- FE build.

### Batch 5 - WorkspacePage + Collaboration API-first

Pham vi:

- Load researchers tu `/collaboration/researchers`.
- Create/update/delete workspace goi API.
- Add/update/remove member goi API.
- Create/update/delete item goi API.
- Add comment goi API.
- Create invite goi API.
- Respond invite accept/decline goi API.
- Refetch workspaces/items/members/activities sau mutations.
- Map comment object tot hon thay vi chi string neu UI can author/time.

Test:

- Tao workspace tam -> tao item -> add comment -> xoa item -> xoa workspace.
- Create invite tam neu co invitee user/email.
- FE build.

### Batch 6 - AdminPage write actions + reports

Pham vi:

- Update user status/roles -> `adminApi.updateUser`.
- Update data source enabled/schedule/api endpoint -> `adminApi.updateDataSource`.
- Create crawler job -> `adminApi.createJob`.
- Run job da co, giu va refetch after run.
- Refresh analysis reports -> `adminApi.refreshReports`.
- Neu them feedback tab:
  - list feedback
  - update feedback status/admin note

Test:

- Update data source enabled toggle va revert.
- Refresh reports success du 4 report.
- Create job tam status queued.
- FE build.

### Batch 7 - AI UI actions tren Search/Library/Gap

Pham vi:

- Search detail:
  - Go `GET /papers/:id` khi expand detail neu can metadata day du.
  - Nut AI summarize goi `aiApi.summarize`.
- Library detail:
  - Nut AI summarize saved paper.
  - Explain keyword/term neu UI co keyword chips.
- Gap page:
  - Suggest directions goi `aiApi.suggestDirections`.
  - Explain term goi `aiApi.explainTerm`.
- Hien provider/fallback nho neu can debug, khong show raw provider error.

Test:

- Vi Gemini key dang quota exceeded, verify fallback response van render.
- FE build.

### Batch 8 - Exa source service that

Pham vi:

- Tao `web/backend/src/services/exa.service.js`.
- Dung `EXA_API_URL`, `EXA_API_KEY`, `EXTERNAL_API_TIMEOUT_MS`.
- Implement search/import tu Exa neu API key hop le.
- Map result ve Paper schema:
  - title
  - abstract/snippet neu co
  - publication_year fallback
  - original_url
  - source_name `Exa`
  - keywords/research_fields suy tu query neu thieu metadata
  - sources external id/url
- Them Exa vao:
  - `paper.service` external source search neu co luong source search.
  - `paper.controller.requestCorpusSync`.
  - `scheduler.service` importer map.
  - admin create job validator/source enum.
- Neu Exa khong tra academic metadata day du, document gioi han.

Test:

- Source health neu can.
- Sync request Exa voi maxRecords nho.
- Search page source Exa khong loi.

### Batch 9 - Data cleaning pipeline

Pham vi:

- Tao `dataCleaning.service.js`.
- Ham chinh:
  - normalize title
  - normalize DOI
  - normalize keywords/research_fields
  - reject invalid paper thieu title/year
  - mark `Cleaned` sau khi clean
  - dedupe theo DOI hoac `title_normalized + publication_year`
- Goi cleaning trong import services:
  - OpenAlex
  - Crossref
  - arXiv
  - IEEE
  - Exa neu co
- Them admin/scheduler cleanup job neu can.

Test:

- Unit-ish node script voi paper sample.
- Import nho khong tao duplicate obvious.
- Search van exclude `Archived`, khong exclude `Cleaned`.

### Batch 10 - WorkspaceActivity chi tiet

Pham vi:

- Chon 1 trong 2:
  - Them model rieng `WorkspaceActivity`, hoac
  - Mo rong `SystemLog` enum/action de log workspace events.
- Khuyen nghi: model rieng de query theo workspace nhanh.
- Ghi activity khi:
  - create/update/delete workspace
  - add/update/remove member
  - create/update/delete item
  - add comment
- `GET /workspaces/:id/activities` doc tu activity store that.

Test:

- Tao item/comment sinh activity co actor/action/time.
- FE Workspace activity hien dung.

### Batch 11 - Remove demo/sample fallback co kiem soat

Pham vi:

- Quyet dinh mode:
  - Product mode: API fail -> error/retry, khong sample.
  - Demo mode: sample fallback co label ro.
- Uu tien product mode cho cac route da co API:
  - Overview
  - Search
  - Library
  - Follow
  - Notifications
  - Trends
  - Gap
  - Workspace
  - Admin
- Giu HomePage static neu khong can API.

Test:

- Tat backend -> FE hien error/retry.
- Bat backend -> data API that render.

### Batch 12 - Final audit + tick FIXLIST

Pham vi:

- Chay:
  - backend require smoke
  - frontend `npm run build`
  - curl smoke routes chinh
- Cap nhat `FIXLIST.md` checkbox theo code da lam.
- Cap nhat `Minh/docs/phare.md` final status.
- Tao cau commit git cho user.

Definition of Done:

- Khong con TODO bat buoc trong FIXLIST.
- Cac endpoint security/auth pass smoke.
- FE route/page workflow chinh dung API that.
- Docs da cap nhat.

## Implementation update - Batch 1 va Batch 2

Cap nhat: 2026-07-10 20:22 +07

### Batch 1 - Security validation Joi da trien khai

Da them validators:

- `web/backend/src/validators/auth.validator.js`
- `web/backend/src/validators/paper.validator.js`
- `web/backend/src/validators/workspace.validator.js`
- `web/backend/src/validators/library.validator.js`
- `web/backend/src/validators/follow.validator.js`
- `web/backend/src/validators/collaboration.validator.js`
- `web/backend/src/validators/feedback.validator.js`
- `web/backend/src/validators/admin.validator.js`
- `web/backend/src/validators/search.validator.js`
- `web/backend/src/validators/user.validator.js`
- `web/backend/src/validators/ai.validator.js`

Da gan `validate()` vao routes:

- `auth.routes.js`
- `paper.routes.js`
- `workspace.routes.js`
- `library.routes.js`
- `follow.routes.js`
- `collaboration.routes.js`
- `feedback.routes.js`
- `admin.routes.js`
- `search.routes.js`
- `user.routes.js`
- `ai.routes.js`

Da sua route ordering:

- `notification.routes.js`: dat `/read-all` truoc `/:id/read` de tranh bat nham route.

Luu y tuong thich:

- `library.savePaperSchema` chap nhan `collection_ids` array theo FE/backend hien tai.
- Source validators chap nhan them `Semantic Scholar`, `IEEE Xplore`, `Exa`.
- Validators strip unknown fields.

Da test:

- Require all validators OK.
- Require all routes OK.
- Frontend `npm run build` pass.
- Backend restart tren `http://localhost:5001`.
- Bad login email tra `VALIDATION_ERROR`.
- Good login van success va tra token.
- Bad saved search payload tra `VALIDATION_ERROR`.
- Good saved search tao/xoa duoc, unknown field bi strip.
- `PUT /api/v1/notifications/read-all` success.

### Batch 2 - Auth refresh/change-password + FE auth flow da trien khai mot phan lon

Da sua backend:

- `web/backend/src/services/auth.service.js`
  - them `refreshSession()`
  - them `changePassword()`
- `web/backend/src/controllers/auth.controller.js`
  - them `refresh()`
  - them `changePassword()`
- `web/backend/src/routes/auth.routes.js`
  - them `POST /api/v1/auth/refresh`
  - them `PUT /api/v1/auth/change-password`
  - gan validator cho 2 endpoint moi.

Da sua frontend:

- `web/frontend/src/lib/api.ts`
  - them `authApi.me()`
  - them `authApi.logout()`
  - them `authApi.changePassword()`
  - them internal `refreshAuthTokens()`
  - `request()` auto refresh khi gap 401 va retry 1 lan.
  - `requestWithMeta()` auto refresh khi gap 401 va retry 1 lan.
  - them `storeCurrentUser()`.
- `web/frontend/src/App.tsx`
  - boot sync user bang `/auth/me` neu co token.
  - protected routes redirect ve login khi chua co user.

Da test:

- Backend auth route/service require OK.
- Frontend `npm run build` pass.
- Backend restart OK.
- `POST /api/v1/auth/refresh` voi refresh token hop le tra access/refresh moi.
- `POST /api/v1/auth/refresh` voi token sai bi chan.
- `PUT /api/v1/auth/change-password` voi current password sai bi chan.
- `PUT /api/v1/auth/change-password` voi new password trung current password bi Joi chan.

- Can them UI nut logout/change password neu chua co trong FE.
- Can tiep tuc Batch 3: hoan thien FE API client missing methods.

Polish da lam them:

- Invalid refresh token hien tra:
  - `success: false`
  - `code: UNAUTHORIZED`
  - `message: Invalid refresh token`
- Wrong current password trong change-password tra `VALIDATION_ERROR`.

## Sprint 5 - AI that

Cap nhat: 2026-07-10 18:24 +07

Muc tieu:

- Bo placeholder AI endpoints.
- Tao service goi Gemini that qua REST `generateContent`.
- Chi gui metadata/abstract/gap data cong khai, khong gui PII.
- Frontend goi API AI that cho dashboard insights.

Da them file:

- `web/backend/src/services/ai.service.js`

Da sua file:

- `web/backend/src/controllers/ai.controller.js`
- `web/frontend/src/lib/api.ts`

Chi tiet backend:

- Them `ai.service.js` gom:
  - `summarizePaper()`
  - `explainTerm()`
  - `suggestDirections()`
  - `getInsights()`
- Dung Gemini REST endpoint `generateContent` neu co:
  - `LLM_PROVIDER=gemini`
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
- Co timeout theo `EXTERNAL_API_TIMEOUT_MS`, toi da 90000ms.
- Co fallback an toan khi:
  - Chua cau hinh key.
  - Gemini loi/timeout.
  - Response rong/khong parse duoc JSON.
- Prompt guard:
  - Chi dung title/abstract/year/source/keywords/gap data cong khai.
  - Khong gui user email/token/PII.
  - Khong bịa paper/so lieu ngoai input.

Chi tiet API:

- `POST /api/v1/ai/summarize`
- `POST /api/v1/ai/explain-term`
- `POST /api/v1/ai/suggest-directions`
- `GET /api/v1/ai/insights`

Chi tiet frontend:

- Them `aiApi` trong `web/frontend/src/lib/api.ts`.
- `dashboardApi.overview()` se thu goi `/ai/insights`.
- Neu AI endpoint loi/cham/thieu key thi dashboard fallback ve AI snapshot san co tu report.

Da test:

- Backend service/controller load thanh cong:
  - `ai service/controller ok`
- Frontend build thanh cong:
  - `npm run build`
- Backend restart thanh cong tren `http://localhost:5001`.
- CORS tu `http://localhost:5173` van OK.
- Smoke test AI endpoints:
  - `/api/v1/ai/explain-term` tra `success: true`, co explanation.
  - `/api/v1/ai/insights` tra `success: true`, co summary, 3 directions, 6 evidence.

Luu y quan trong:

- `.env` hien tai dang de `GEMINI_API_KEY=` trong.
- Vi vay smoke test tra `provider: fallback`.
- Khi them Gemini key that vao `web/backend/.env`, service se tu goi Gemini va tra `provider: gemini`.
- Khong ghi Gemini key vao docs nay.

Cap nhat tiep: 2026-07-10 18:30 +07

- Da nhan key Gemini tu user va cap nhat vao `web/backend/.env`.
- Da restart backend de nap key moi.
- Da xac nhan backend doc duoc key:
  - `hasGeminiKey=true`
  - model: `gemini-2.0-flash`
- Da smoke test `/api/v1/ai/explain-term`.
- Gemini endpoint co duoc goi that, nhung provider tra quota exceeded.
- Ket qua API hien tai:
  - `success: true`
  - `provider: fallback`
  - `reason: LLM_QUOTA_EXCEEDED`
- Da harden `ai.service.js` de khong tra raw provider error/billing/quota message dai ve frontend; chi tra reason code ngan.
- Frontend build lai thanh cong sau thay doi.

### Sprint 5 - Con lai

Can lam tiep:

- Them `GEMINI_API_KEY` that vao `.env` de verify provider `gemini`.
- Neu muon AI report snapshot duoc cache, co the them nut/admin job refresh AI insights rieng.
- Co the them UI rieng cho:
  - Tom tat paper trong Search/Library detail.
  - Explain term khi chon keyword.
  - Suggest directions trong Gap page.

### Sprint 6 - Refactor kien truc

Cap nhat: 2026-07-10 18:43 +07

Muc tieu:

- Tach service layer cho cac controller con logic database truc tiep.
- Them `asyncHandler`.
- Thay collaboration match random bang score dua tren overlap `followed_subjects`.
- Giam mass assignment o cac write action bang whitelist field.

Da them file:

- `web/backend/src/utils/asyncHandler.js`
- `web/backend/src/services/collaboration.service.js`
- `web/backend/src/services/workspace.service.js`
- `web/backend/src/services/search.service.js`
- `web/backend/src/services/feedback.service.js`

Da sua file:

- `web/backend/src/controllers/collaboration.controller.js`
- `web/backend/src/controllers/workspace.controller.js`
- `web/backend/src/controllers/search.controller.js`
- `web/backend/src/controllers/feedback.controller.js`

Chi tiet:

- `asyncHandler` boc async route handler va day loi ve global error handler.
- Collaboration:
  - Controller chi con goi service va tra response.
  - `getResearchers` khong con dung `Math.random()`.
  - Match score tinh theo overlap subject user dang follow:
    - active followed subjects cua current user
    - active followed subjects cua researcher
    - jaccard/coverage score
  - Invite creation van auto notification cho invitee.
- Search saved searches:
  - Tach service.
  - Whitelist `name` va `criteria`.
  - Normalize `criteria.logic`, arrays, year filters.
- Feedback:
  - Tach service.
  - List feedback giu logic admin/user filter va pagination trong service.
  - Update chi set `status`, `admin_note`.
- Workspace:
  - Tach CRUD workspace/member/item/comment/activity vao service.
  - Controller giu nguyen handler name va route behavior cu.
  - Whitelist field khi create/update workspace, member, item.
  - Comment van auto notify cac member khac trong workspace.

Da test:

- Load service/controller:
  - `new services ok`
  - `refactored controllers ok`
- Frontend build:
  - `npm run build` pass.
- Backend restart tren `http://localhost:5001`.
- Smoke read APIs:
  - `GET /api/v1/collaboration/researchers` success, tra researcher list va match score.
  - `GET /api/v1/searches` success.
  - `GET /api/v1/feedbacks` success.
  - `GET /api/v1/workspaces` success.
- Smoke write API:
  - Tao saved search tam qua `POST /api/v1/searches` success.
  - Xoa saved search tam qua `DELETE /api/v1/searches/:id` success.

Con lai:

- Workspace activities hien van computed tu item updates; neu can audit chi tiet hon nen them model rieng `WorkspaceActivity` hoac mo rong `SystemLog` enum/action metadata.
- Chua refactor toan bo controller trong app sang `asyncHandler`, moi lam cac module trong Sprint 6 scope.

### No ky thuat con nen xu ly

- Kiem tra lai Sprint 1 neu code hien tai da bi revert/mat:
  - Joi validators.
  - `/auth/refresh`.
  - `/auth/change-password`.
  - Frontend auto refresh token/logout API.
  - Route ordering notification/follow.
- Them Exa service/search provider that su neu FR bat buoc.
- Lam data cleaning pipeline ro hon:
  - normalize title/doi/keywords.
  - dedupe source records.
  - reject invalid papers.
  - mark `Cleaned`.
- Them test tu dong cho service/report/scheduler.

## Lenh commit goi y

Neu muon commit nhom thay doi hien tai:

```bash
git add FIXLIST.md Minh/docs/phare.md web/backend/.env.example web/backend/src web/backend/package-lock.json
git commit -m "feat: add observability notifications and report scheduler"
```

Kiem tra ky truoc khi commit neu `package-lock.json` hoac file env example co thay doi ngoai y muon.

## Cap nhat 2026-07-11 - FE route dung API that

Muc tieu:

- Tiep tuc phan "cap nhat cac route cho FE su dung API that".
- Giam demo-only action tren cac page chinh.
- Them AI action that cho Search, Gap, Library.
- Cap nhat docs sau moi dot sua theo yeu cau.

Da sua file:

- `web/frontend/src/lib/api.ts`
- `web/frontend/src/pages/FollowPage.tsx`
- `web/frontend/src/pages/WorkspacePage.tsx`
- `web/frontend/src/pages/AdminPage.tsx`
- `web/frontend/src/pages/SearchPage.tsx`
- `web/frontend/src/pages/GapPage.tsx`
- `web/frontend/src/pages/LibraryPage.tsx`

Chi tiet API client:

- Them mapper/normalizer cho admin job, data source, follow subject/alert, workspace, workspace item, invite.
- Them `asObjectId()` de tranh gui id demo/fallback len backend khi route Joi yeu cau Mongo ObjectId.
- Them `userApi`:
  - update profile.
  - update dashboard layout.
- Them `paperApi.getById`.
- Mo rong `adminApi`:
  - create job.
  - update user.
  - update data source.
  - refresh reports.
  - map jobs/data sources ve type FE.
- Mo rong `followApi`:
  - add/update/remove subject.
  - mark alert read.
  - mark all alerts read.
- Mo rong `notificationApi`:
  - unread count.
- Mo rong `workspaceApi`:
  - create/update/delete workspace.
  - add/update/remove member.
  - create/update/delete item.
  - add comment.
  - load researchers.
  - create/respond invite.
- Mo rong `feedbackApi`:
  - create/list/update feedback.

Chi tiet page:

- Follow page:
  - Load subject/alert tu API.
  - Add subject goi `followApi.addSubject`.
  - Update subject/rule goi `followApi.updateSubject`.
  - Remove subject goi `followApi.removeSubject`.
  - Mark alert read goi `followApi.markAlertRead`.
  - Them notice khi API loi va rollback optimistic update.
- Workspace page:
  - Load researchers tu `/collaboration/researchers`.
  - Tao workspace goi API.
  - Tao/sua/xoa item goi API.
  - Comment goi API.
  - Doi role member goi API.
  - Tao invite va accept/decline invite goi API.
  - Them reload detail sau mutation de dong bo state.
- Admin page:
  - Toggle data source goi `adminApi.updateDataSource`.
  - Lock/unlock user goi `adminApi.updateUser`.
  - Nut refresh reports goi `adminApi.refreshReports`.
  - Logout goi `authApi.logout`.
- Search page:
  - Detail paper da co nut `AI tom tat`, goi `/ai/summarize`.
- Gap page:
  - Nut `AI goi y them` goi `/ai/suggest-directions`.
  - Click keyword goi `/ai/explain-term`.
- Library page:
  - Detail saved paper co nut `AI tom tat`, goi `/ai/summarize`.

Da test:

- Frontend build:
  - `npm run build` pass.
  - Vite canh bao chunk lon hon 500 kB, chua phai loi build.
- Backend health:
  - `GET http://localhost:5001/api/health` -> `200`.
- Auth smoke:
  - Login seed admin `minh.thanh@uni.edu.vn` thanh cong, access token hop le.
- FE-backed API smoke:
  - `GET /api/v1/collaboration/researchers` -> `200`, tra 3 researchers.
  - `POST /api/v1/admin/reports/refresh` -> `200`.
  - `POST /api/v1/ai/explain-term` -> `200`, provider fallback vi Gemini quota `LLM_QUOTA_EXCEEDED`.

Trang thai fixlist gan nhat:

- Da xong nhom lon:
  - Security validation/Joi va mass assignment guard.
  - Auth refresh/change-password va FE auto refresh.
  - Notification route ordering.
  - Core UX Search/Library/Saved Search/Paper detail.
  - System logger va notification service.
  - Scheduler/report generation.
  - AI service + FE AI action.
  - Service layer refactor cho collaboration/workspace/search/feedback.
  - FE routes chinh da noi API that cho Follow/Workspace/Admin/Search/Gap/Library.
- Con nen lam tiep:
  - Exa provider trong backend search pipeline, hien FE da co source filter Exa nhung can verify backend provider service that.
  - Data cleaning pipeline ro hon: normalize, dedupe, validate, mark cleaned.
  - Workspace activity audit chi tiet hon bang model rieng hoac SystemLog metadata.
  - Test tu dong cho validators/auth/search/workspace/admin/report/AI.
  - Code splitting frontend de giam chunk build.

Lenh commit goi y cho dot FE route/API nay:

```bash
git add Minh/docs/phare.md web/frontend/src/lib/api.ts web/frontend/src/pages/AdminPage.tsx web/frontend/src/pages/FollowPage.tsx web/frontend/src/pages/GapPage.tsx web/frontend/src/pages/LibraryPage.tsx web/frontend/src/pages/SearchPage.tsx web/frontend/src/pages/WorkspacePage.tsx
git commit -m "feat: connect frontend routes to real APIs"
```

## Cap nhat 2026-07-11 - Exa provider va cleaning pipeline buoc 1

Muc tieu:

- Hoan thien nguon `Exa` that cho backend search/sync pipeline.
- Dam bao Search page chon source `Exa` co du lieu tu API that, khong chi la filter tren FE.
- Tao buoc dau cho data cleaning pipeline: normalize, validate, dedupe, merge source.
- Cap nhat `.env` cac nguon con thieu theo thong tin da cung cap.

Da tham chieu tai lieu:

- Exa official docs: `POST https://api.exa.ai/search`, header `x-api-key`, body co `query`, `numResults`, `contents`.

Da them file:

- `web/backend/src/services/exa.service.js`
- `web/backend/src/services/paperCleaning.service.js`

Da sua file:

- `web/backend/src/controllers/paper.controller.js`
- `web/backend/src/services/scheduler.service.js`
- `web/backend/src/services/sourceHealth.service.js`
- `web/backend/src/seeds/seed.js`
- `web/backend/.env.example`
- `web/backend/.env`

Chi tiet Exa:

- Them `importExaByQuery(query, maxRecords, options)`.
- Goi Exa bang `POST /search`.
- Map result Exa ve model `Paper`:
  - title.
  - abstract/text/highlights.
  - publication year/month.
  - original URL.
  - author neu co.
  - keywords suy ra tu title/result.
  - source `Exa`.
- Gan `Exa` vao immediate sync source:
  - `POST /api/v1/papers/sync-request`.
- Gan `Exa` vao scheduler queued jobs:
  - `runCrawlerJob`.
- Gan `Exa` vao source health check:
  - `POST /api/v1/admin/data-sources/check`.
- Them seed DataSource `Exa`.
- Neu database cu chua co DataSource `Exa`, sync/source-health se upsert de Admin page hien nguon nay.

Chi tiet cleaning pipeline buoc 1:

- `normalizeTitle()`:
  - lowercase.
  - bo punctuation.
  - collapse whitespace.
- `normalizeDoi()`:
  - bo prefix `doi:` va `https://doi.org/`.
- `cleanText()`:
  - strip HTML entity/tag co ban.
  - collapse whitespace.
  - cap length.
- `uniqueStrings()`:
  - dedupe keywords/research fields.
- `preparePaper()`:
  - normalize title, DOI, abstract, URL, author, keyword.
  - mark `Cleaned` neu record hop le.
  - mark `Rejected` neu thieu title/normalized title.
- `upsertCleanPaper()`:
  - reject record thieu title/url.
  - dedupe theo DOI hoac `title_normalized + publication_year`.
  - neu paper da ton tai va chua co source Exa thi merge source/keywords/fields.

Da cap nhat env:

- `EXTERNAL_API_TIMEOUT_MS`
- `SEMANTIC_SCHOLAR_API_URL`
- `SEMANTIC_SCHOLAR_API_KEY`
- `CROSSREF_API_URL`
- `CROSSREF_MAILTO`
- `IEEE_API_URL`
- `IEEE_API_KEY`
- `IEEE_XPLORE_API_KEY`
- `EXA_API_URL`
- `EXA_API_KEY`

Da test:

- Module load:
  - `exa modules ok`
  - `patched modules ok`
- Backend restart tren `http://localhost:5001`.
- Exa sync smoke:
  - `POST /api/v1/papers/sync-request`
  - payload sourceName `Exa`, maxRecords `1`
  - ket qua `201`, job `success`, imported `1`.
- Exa search smoke:
  - `GET /api/v1/papers/search?q=ai harness&sources=Exa&limit=3`
  - ket qua `200`, co record source `Exa`.
- Admin DataSource smoke:
  - `GET /api/v1/admin/data-sources`
  - ket qua `200`, co `Exa`, endpoint `https://api.exa.ai`, enabled `true`.

Trang thai fixlist sau dot nay:

- Exa provider backend: da xong buoc chay that.
- Data cleaning pipeline: da co service buoc 1 va Exa dung service nay.
- Con nen lam tiep:
  - Mo rong `paperCleaning.service.js` de OpenAlex/Crossref/arXiv/IEEE cung dung chung cleaning/upsert.
  - Them WorkspaceActivity model hoac SystemLog metadata chi tiet cho workspace audit.
  - Them automated tests cho Exa importer, cleaning service, auth validators, workspace mutation.
  - Code splitting frontend de giam chunk build.

Lenh commit goi y cho dot Exa/cleaning:

```bash
git add Minh/docs/phare.md web/backend/.env.example web/backend/src/controllers/paper.controller.js web/backend/src/seeds/seed.js web/backend/src/services/exa.service.js web/backend/src/services/paperCleaning.service.js web/backend/src/services/scheduler.service.js web/backend/src/services/sourceHealth.service.js
git commit -m "feat: add exa source sync and paper cleaning pipeline"
```

## Cap nhat 2026-07-11 - Workspace activity audit that

Muc tieu:

- Thay activity tam suy ra tu `WorkspaceItem.updated_at` bang audit log that.
- Ghi lai hanh dong workspace/member/item/comment tai service layer.
- Giu API response cu de frontend khong can doi.

Da them file:

- `web/backend/src/models/WorkspaceActivity.js`

Da sua file:

- `web/backend/src/models/index.js`
- `web/backend/src/services/workspace.service.js`
- `web/backend/src/controllers/workspace.controller.js`

Chi tiet:

- Them collection `workspace_activities`.
- Moi activity co:
  - `workspace_id`
  - `actor_id`
  - `actor_name`
  - `action`
  - `target_type`
  - `target_id`
  - `target_title`
  - `details`
  - `created_at`
- Cac action dang ghi:
  - `workspace_created`
  - `workspace_updated`
  - `workspace_deleted`
  - `member_added`
  - `member_updated`
  - `member_removed`
  - `item_created`
  - `item_updated`
  - `item_deleted`
  - `comment_added`
- `GET /api/v1/workspaces/:id/activities` bay gio doc tu `WorkspaceActivity`.
- Response van map ve format FE dang dung:
  - `id`
  - `workspace_id`
  - `actor`
  - `action`
  - `when`
  - them `type`, `target_type`, `target_id`, `details`.

Da test:

- Module load:
  - `workspace audit modules ok`.
- Backend restart tren `http://localhost:5001`.
- Smoke workspace audit:
  - tao workspace tam.
  - tao item tam.
  - them comment.
  - `GET /api/v1/workspaces/:id/activities` -> `200`.
  - tra 3 activities:
    - `comment_added`
    - `item_created`
    - `workspace_created`
  - actor hien `minh.thanh@uni.edu.vn`.
  - da cleanup workspace tam bang `DELETE /api/v1/workspaces/:id`.

Trang thai fixlist sau dot nay:

- Workspace activity chi tiet: da co model rieng va API doc du lieu audit that.
- Con nen lam tiep:
  - Refactor OpenAlex/Crossref/arXiv/IEEE sang dung chung `paperCleaning.service.js`.
  - Them automated tests cho Exa importer, cleaning service, auth validators, workspace activity.
  - Code splitting frontend de giam chunk build.

Lenh commit goi y cho dot workspace audit:

```bash
git add Minh/docs/phare.md web/backend/src/controllers/workspace.controller.js web/backend/src/models/WorkspaceActivity.js web/backend/src/models/index.js web/backend/src/services/workspace.service.js
git commit -m "feat: add workspace activity audit log"
```

## Cap nhat 2026-07-11 - Backend tests cho Exa/cleaning

Muc tieu:

- Bien `npm test` backend tu script fail mac dinh thanh test runner that.
- Them regression tests cho Exa mapper va cleaning pipeline buoc 1.
- Khong them dependency moi.

Da sua file:

- `web/backend/package.json`

Da them file:

- `web/backend/test/paperCleaning.test.js`
- `web/backend/test/exa.service.test.js`

Chi tiet:

- Doi script:
  - tu `echo "Error: no test specified" && exit 1`
  - sang `node --test`.
- Test `paperCleaning.service.js`:
  - normalize title.
  - normalize DOI tu URL va prefix `doi:`.
  - clean HTML/entity text.
  - dedupe keyword case-insensitive.
  - prepare valid paper thanh `Cleaned`.
  - mark paper thieu title thanh `Rejected`.
- Test `exa.service.js`:
  - map Exa result ve payload `Paper`.
  - extract DOI tu URL.
  - map year/month.
  - infer type Journal/Preprint.
  - map author/source/keywords.

Da test:

- `npm test` trong `web/backend` pass.
- Ket qua:
  - tests: 8
  - pass: 8
  - fail: 0

Trang thai fixlist sau dot nay:

- Automated tests: da bat dau co coverage cho Exa va cleaning.
- Con nen lam tiep:
  - Them API/integration tests cho auth refresh/change-password, workspace activity, admin reports.
  - Refactor OpenAlex/Crossref/arXiv/IEEE sang dung chung `paperCleaning.service.js`.
  - Code splitting frontend de giam chunk build.

Lenh commit goi y cho dot test:

```bash
git add Minh/docs/phare.md web/backend/package.json web/backend/test/exa.service.test.js web/backend/test/paperCleaning.test.js
git commit -m "test: cover exa mapping and paper cleaning"
```

## Cap nhat 2026-07-11 - Dung chung cleaning pipeline cho cac source

Muc tieu:

- Mo rong `paperCleaning.service.js` ra ngoai Exa.
- Giam duplicate logic dedupe/upsert trong OpenAlex, Crossref, arXiv, IEEE.
- Them test cho mapper cua tat ca source chinh.

Da sua file:

- `web/backend/src/services/openalex.service.js`
- `web/backend/src/services/crossref.service.js`
- `web/backend/src/services/arxiv.service.js`
- `web/backend/src/services/ieee.service.js`

Da them file:

- `web/backend/test/sourceMappers.test.js`

Chi tiet:

- OpenAlex importer:
  - dung `normalizeDoi`, `normalizeTitle`, `upsertCleanPaper`.
  - export `mapWorkToPaper` de test.
- Crossref importer:
  - dung `cleanText`, `normalizeTitle`, `upsertCleanPaper`.
  - export `mapItemToPaper` de test.
- arXiv importer:
  - dung `normalizeTitle`, `upsertCleanPaper`.
  - export `mapEntryToPaper` de test.
- IEEE importer:
  - dung `normalizeTitle`, `upsertCleanPaper`.
  - export `mapArticleToPaper` de test.
- Ket qua la cac source deu cung dedupe theo:
  - DOI neu co.
  - hoac `title_normalized + publication_year`.
  - merge source/keywords/fields neu paper da ton tai nhung chua co source do.

Da test:

- Module load:
  - `importer modules ok`.
- Backend tests:
  - `npm test` pass.
  - tests: 12
  - pass: 12
  - fail: 0
- Backend restart tren `http://localhost:5001`.
- Smoke API:
  - `GET /api/health` -> `200`.
  - `POST /api/v1/papers/sync-request` voi source `OpenAlex`, maxRecords `1` -> `201`.
  - job `success`, result co imported/skipped/source_total.

Trang thai fixlist sau dot nay:

- Data cleaning pipeline: da dung chung cho Exa/OpenAlex/Crossref/arXiv/IEEE o tang import.
- Con nen lam tiep:
  - Fix warning duplicate Mongoose indexes khi start backend.
  - Them integration tests cho auth/workspace/admin.
  - Code splitting frontend de giam chunk build.

Lenh commit goi y cho dot cleaning refactor:

```bash
git add Minh/docs/phare.md web/backend/src/services/openalex.service.js web/backend/src/services/crossref.service.js web/backend/src/services/arxiv.service.js web/backend/src/services/ieee.service.js web/backend/test/sourceMappers.test.js
git commit -m "refactor: share paper cleaning across source importers"
```

## Cap nhat 2026-07-11 - Don warning backend va code splitting frontend

Muc tieu:

- Don warning duplicate Mongoose indexes khi start backend.
- Giam bundle frontend de het canh bao Vite chunk > 500 kB.

Da sua file backend:

- `web/backend/src/models/User.js`
- `web/backend/src/models/DataSource.js`
- `web/backend/src/models/Paper.js`

Chi tiet backend:

- Xoa duplicate `userSchema.index({ email: 1 }, { unique: true })` vi field `email` da co `unique: true`.
- Xoa duplicate `dataSourceSchema.index({ name: 1 }, { unique: true })` vi field `name` da co `unique: true`.
- Bo `sparse: true` tren field `doi`, giu explicit index:
  - `paperSchema.index({ doi: 1 }, { unique: true, sparse: true })`.
- Restart backend khong con warning duplicate index.
- Redis warning van con neu Redis local khong chay, app van degrade sang khong cache.

Da sua file frontend:

- `web/frontend/src/App.tsx`

Chi tiet frontend:

- Doi page imports sang `React.lazy`.
- Them `Suspense` wrapper cho route rendering.
- Giu hash route behavior cu.
- Them fallback nhe khi dang load page.

Da test:

- Backend:
  - `npm test` pass.
  - tests: 12
  - pass: 12
  - restart backend thanh cong.
  - startup log khong con duplicate index warning.
- Frontend:
  - `npm run build` pass.
  - Khong con warning chunk > 500 kB.
  - Main JS chunk sau split: khoang `216.58 kB`.
  - Chart chunk rieng: khoang `349.08 kB`.

Trang thai fixlist sau dot nay:

- Duplicate Mongoose index warnings: da fix.
- Frontend chunk warning: da fix bang route-level lazy loading.
- Con nen lam tiep:
  - Them integration tests cho auth refresh/change-password, workspace activity, admin reports.
  - Xem lai `.env` truoc commit vi file nay co secret that va khong nen commit.

Lenh commit goi y cho dot nay:

```bash
git add Minh/docs/phare.md web/backend/src/models/User.js web/backend/src/models/DataSource.js web/backend/src/models/Paper.js web/frontend/src/App.tsx
git commit -m "chore: clean backend indexes and split frontend routes"
```

## Cap nhat 2026-07-11 - Integration tests va don Mongoose update warnings

Muc tieu:

- Them integration tests cho auth, workspace activity, admin reports.
- Lam `src/app.js` testable ma khong tu dong listen khi duoc `require`.
- Don warning Mongoose deprecated `{ new: true }`.

Da sua file:

- `web/backend/src/app.js`
- `web/backend/package.json`
- `web/backend/src/controllers/admin.controller.js`
- `web/backend/src/controllers/paper.controller.js`
- `web/backend/src/services/auth.service.js`
- `web/backend/src/services/collaboration.service.js`
- `web/backend/src/services/feedback.service.js`
- `web/backend/src/services/follow.service.js`
- `web/backend/src/services/library.service.js`
- `web/backend/src/services/report.service.js`
- `web/backend/src/services/search.service.js`
- `web/backend/src/services/workspace.service.js`

Da them file:

- `web/backend/test/api.integration.test.js`

Chi tiet:

- `app.js`:
  - export `{ app, start }`.
  - chi goi `start()` khi file duoc chay truc tiep bang `node src/app.js`.
  - khi test `require('../src/app')` se khong tu listen/connect/scheduler nua.
- `package.json`:
  - `npm test` chay `NODE_ENV=test node --test`.
- Integration tests:
  - tu start Express app tren port random.
  - connect Mongo bang `mongodbUri` hien co.
  - tao du lieu test voi email domain `@wdp-test.example.com`.
  - cleanup user/workspace/item/activity test sau khi chay.
- Test coverage moi:
  - Auth:
    - register.
    - login.
    - refresh token.
    - change password fail khi current password sai.
    - change password success.
    - old password bi reject.
    - new password login duoc.
  - Workspace:
    - create workspace.
    - create item.
    - add comment.
    - get activities.
    - verify activity types `comment_added`, `item_created`, `workspace_created`.
  - Admin:
    - create admin test user truc tiep trong DB.
    - login admin.
    - `POST /api/v1/admin/reports/refresh` success.
- Don Mongoose update warning:
  - thay `{ new: true }` bang `{ returnDocument: 'after' }` trong services/controllers.

Da test:

- `npm test` pass.
- Ket qua:
  - tests: 15
  - pass: 15
  - fail: 0
- Backend restart tren `http://localhost:5001`.
- Startup log khong con duplicate index warning va khong con `new` option warning.
- Redis warning van con neu Redis local khong chay; app van fallback khong cache.

Trang thai fixlist sau dot nay:

- Integration tests cho auth/workspace/admin: da co.
- App testability: da co.
- Mongoose warnings: da don.
- Con nen lam tiep:
  - Neu muon log that su sach 100%, cai/chay Redis local hoac tat Redis connect trong development khi khong can cache.
  - Co the them CI script rieng `test:unit`/`test:integration`.

Lenh commit goi y cho dot nay:

```bash
git add Minh/docs/phare.md web/backend/package.json web/backend/src/app.js web/backend/src/controllers/admin.controller.js web/backend/src/controllers/paper.controller.js web/backend/src/services/auth.service.js web/backend/src/services/collaboration.service.js web/backend/src/services/feedback.service.js web/backend/src/services/follow.service.js web/backend/src/services/library.service.js web/backend/src/services/report.service.js web/backend/src/services/search.service.js web/backend/src/services/workspace.service.js web/backend/test/api.integration.test.js
git commit -m "test: add backend integration coverage"
```

## Cap nhat 2026-07-11 - Redis optional flag

Muc tieu:

- Don Redis warning khi local/dev khong chay Redis.
- Giu kha nang bat Redis lai bang env khi can cache.

Da sua file:

- `web/backend/src/config/env.js`
- `web/backend/src/config/redis.js`
- `web/backend/src/app.js`
- `web/backend/.env.example`
- `web/backend/.env`

Chi tiet:

- Them `REDIS_ENABLED`.
- Default logic:
  - Neu `REDIS_ENABLED=false`, app khong tao Redis client va khong connect Redis.
  - Cac code dang dung Redis da co guard `if (redis)`, nen fallback khong cache.
- Local `.env` da set:
  - `REDIS_ENABLED=false`
- `.env.example` da them:
  - `REDIS_ENABLED=false`

Da test:

- Module load:
  - `redis flag modules ok`.
- Backend tests:
  - `npm test` pass.
  - tests: 15
  - pass: 15
  - fail: 0
- Backend restart tren `http://localhost:5001`.
- Startup log sach:
  - MongoDB connected.
  - Backend running.
  - Khong con Redis warning.
  - Khong con Mongoose index/update warning.

Trang thai fixlist sau dot nay:

- Local backend startup log: sach.
- Redis: optional theo env.
- Con nen lam tiep:
  - Tach `test:unit` va `test:integration` neu muon CI nhanh hon.
  - Review lai git diff mot lan truoc khi commit vi scope da lon.

Lenh commit goi y cho dot Redis:

```bash
git add Minh/docs/phare.md web/backend/.env.example web/backend/src/app.js web/backend/src/config/env.js web/backend/src/config/redis.js
git commit -m "chore: make redis optional in local development"
```

## Cap nhat 2026-07-11 - Tach test scripts unit/integration

Muc tieu:

- Cho phep chay unit test nhanh rieng.
- Cho phep chay integration test rieng.
- Giu `npm test` chay full suite.
- Don warning `MongoDB disconnected` trong test output.

Da sua file:

- `web/backend/package.json`
- `web/backend/src/config/database.js`

Chi tiet:

- Them scripts:
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm test`
- `test:unit` chay:
  - `test/exa.service.test.js`
  - `test/paperCleaning.test.js`
  - `test/sourceMappers.test.js`
- `test:integration` chay:
  - `test/api.integration.test.js`
- `database.js` khong log `MongoDB disconnected` khi `NODE_ENV=test`.

Da test:

- `npm run test:unit` pass:
  - tests: 12
  - pass: 12
- `npm run test:integration` pass:
  - tests: 3
  - pass: 3
- `npm test` pass:
  - tests: 15
  - pass: 15
  - fail: 0

Trang thai fixlist sau dot nay:

- Test scripts tach ro: da xong.
- Test output sach hon.
- Con nen lam tiep:
  - Review/tong hop diff de chia commit hop ly.
  - Cap nhat `FIXLIST.md` checkbox neu ban muon no phan anh trang thai da implement.

Lenh commit goi y cho dot nay:

```bash
git add Minh/docs/phare.md web/backend/package.json web/backend/src/config/database.js
git commit -m "chore: split backend test scripts"
```

## Cap nhat 2026-07-11 - Hoan tat FIXLIST checkbox

Muc tieu:

- Xu ly cac checkbox con ho trong `FIXLIST.md`.
- Refactor notification controller sang service layer dung nhu plan.
- Xoa validation thu cong con sot trong paper sync controller.
- Tick FIXLIST theo trang thai code da verify.

Da sua file:

- `FIXLIST.md`
- `web/backend/src/controllers/notification.controller.js`
- `web/backend/src/services/notification.service.js`
- `web/backend/src/controllers/paper.controller.js`

Chi tiet:

- `notification.service.js` them read/mark APIs:
  - `listNotifications`
  - `markNotificationRead`
  - `markAllNotificationsRead`
  - `countUnreadNotifications`
- `notification.controller.js` khong query model truc tiep nua, chuyen sang service.
- `paper.controller.js` trong `requestCorpusSync()` khong con block validate thu cong `if (!query)`.
- Joi validator hien la nguon validate cho sync request.
- `FIXLIST.md`:
  - Tick tat ca task checkbox `[x]`.
  - Cap nhat bang Business Rules Coverage:
    - Exa/IEEE/importers.
    - Scheduler.
    - Cleaning pipeline.
    - Notification auto-create.
    - AI Gemini/fallback.
    - Auth refresh/change password.
    - System logger.
    - Redis optional fallback.

Da test:

- Module load:
  - `notification refactor modules ok`.
- Backend:
  - `npm test` pass.
  - tests: 15
  - pass: 15
  - fail: 0
- Frontend:
  - `npm run build` pass.
- FIXLIST check:
  - `rg '\\[ \\]|\\[/\\]' FIXLIST.md` chi con dong legend trang thai.
- Backend restart tren `http://localhost:5001`, startup log sach.

Trang thai fixlist sau dot nay:

- `FIXLIST.md` da duoc cap nhat theo code hien tai.
- Khong con checkbox task chua tick.
- Can luu y truoc commit:
  - Khong add `web/backend/.env` vi co secret that.
  - Nen review diff/commit theo nhom vi scope lon.

Lenh commit goi y cho dot nay:

```bash
git add FIXLIST.md Minh/docs/phare.md web/backend/src/controllers/notification.controller.js web/backend/src/services/notification.service.js web/backend/src/controllers/paper.controller.js
git commit -m "chore: complete fixlist checklist"
```

## Cap nhat 2026-07-11 - Audit Mongo update operators

Muc tieu:

- Audit cac thay doi sau khi tick FIXLIST de bat bug runtime con sot.
- Sua cac Mongo update object bi mix operator va field truc tiep.
- Dam bao source health endpoint chay that sau khi them Exa/upsert.

Da sua file:

- `web/backend/src/services/sourceHealth.service.js`
- `web/backend/src/services/ieee.service.js`
- `web/backend/src/services/scheduler.service.js`

Chi tiet:

- `sourceHealth.service.js`:
  - Sua `DataSource.updateOne()` tu mix `$setOnInsert` voi field truc tiep sang:
    - `$setOnInsert`
    - `$set`
  - Tranh loi Mongo khi chay `POST /api/v1/admin/data-sources/check`.
- `ieee.service.js`:
  - Sua `DataSource.updateOne()` tu mix `$inc` voi field truc tiep sang:
    - `$set`
    - `$inc`
- `scheduler.service.js`:
  - Doi `last_sync_status` tu lowercase `success/failed` sang enum dung schema:
    - `Success`
    - `Failed`

Da test:

- Module load:
  - `data source update modules ok`.
  - `source health module ok`.
- Backend:
  - `npm test` pass.
  - tests: 15
  - pass: 15
  - fail: 0
- Backend restart tren `http://localhost:5001`.
- Health:
  - `GET /api/health` -> `200`.
- Source health smoke:
  - `POST /api/v1/admin/data-sources/check` -> `200`.
  - Tra 6 source.
  - OpenAlex/Semantic Scholar/Crossref/arXiv/Exa ok.
  - IEEE Xplore fail health theo response nguon/API, nhung endpoint va DB update thanh cong.

Lenh commit goi y cho dot audit nay:

```bash
git add Minh/docs/phare.md web/backend/src/services/sourceHealth.service.js web/backend/src/services/ieee.service.js web/backend/src/services/scheduler.service.js
git commit -m "fix: harden data source status updates"
```

## Cap nhat 2026-07-11 - Git ignore va secret audit

Muc tieu:

- Giam rui ro commit nham `.env` co secret that.
- Kiem tra nhanh repository co lo key that ngoai `.env` khong.

Da them file:

- `.gitignore`

Chi tiet:

- Them root `.gitignore` de ignore:
  - `.env`
  - `.env.local`
  - `.env.*.local`
  - `**/.env`
  - `node_modules`
  - `dist/build`
  - logs/coverage/temp/editor files.
- Van allow `.env.example`:
  - `!.env.example`
  - `!**/.env.example`

Da test/kiem tra:

- `git ls-files` chi thay:
  - `web/backend/.env.example`
- `git check-ignore`:
  - `web/backend/.env` bi ignore boi `web/backend/.gitignore`.
  - `web/frontend/.env` va root `.env` bi ignore boi root `.gitignore`.
- Secret scan nhanh voi pattern key:
  - khong thay key that trong file tracked/khong-bi-ignore.
- `git diff --check` pass.

Lenh commit goi y cho dot nay:

```bash
git add .gitignore Minh/docs/phare.md
git commit -m "chore: add root gitignore for env safety"
```

## Cap nhat 2026-07-11 - Hoan thien FR-001 sources Semantic Scholar va ACM

Muc tieu:

- Hoan thien cac source con thieu trong yeu cau FR-001.
- Dam bao batch/sync support day du:
  - OpenAlex
  - Semantic Scholar
  - Crossref
  - arXiv
  - IEEE Xplore
  - ACM Digital Library
  - Exa

Nguon tai lieu/API da tham chieu:

- Semantic Scholar Academic Graph API official docs:
  - REST API cho paper search, auth qua `x-api-key`, endpoint Graph API.
- ACM Digital Library:
  - Khong co public REST API on dinh mien phi nhu cac nguon con lai.
  - Backend dung Crossref metadata fallback de lay ban ghi ACM-indexed va gan source label `ACM Digital Library`.

Da them file:

- `web/backend/src/services/semanticScholar.service.js`
- `web/backend/src/services/acm.service.js`

Da sua file:

- `web/backend/src/models/DataSource.js`
- `web/backend/src/models/Paper.js`
- `web/backend/src/validators/paper.validator.js`
- `web/backend/src/validators/admin.validator.js`
- `web/backend/src/seeds/seed.js`
- `web/backend/src/controllers/paper.controller.js`
- `web/backend/src/services/scheduler.service.js`
- `web/backend/src/services/sourceHealth.service.js`
- `web/backend/test/sourceMappers.test.js`
- `web/frontend/src/data/searchSample.ts`
- `web/frontend/src/data/adminSample.ts`
- `web/frontend/src/pages/SearchPage.tsx`
- `FIXLIST.md`

Chi tiet backend:

- Them enum source `ACM Digital Library`.
- Them `semanticScholar.service.js`:
  - `fetchSemanticScholarPapers`
  - `importSemanticScholarByQuery`
  - `mapSemanticPaperToPaper`
  - Goi Graph API `/paper/search`.
  - Map title, abstract, year, authors, citationCount, venue, fields, DOI.
  - Dung `upsertCleanPaper`.
- Them `acm.service.js`:
  - `fetchAcmWorks`
  - `importAcmByQuery`
  - `mapAcmItemToPaper`
  - Dung Crossref query fallback.
  - Chi import item co dau hieu ACM:
    - publisher ACM.
    - container/title/URL ACM.
    - DOI `10.1145/*`.
  - Gan source_name `ACM Digital Library`.
- Gan Semantic Scholar va ACM vao:
  - `POST /api/v1/papers/sync-request`.
  - scheduler `IMPORTERS`.
  - source health check.
- Source health hien tra 7 nguon.

Chi tiet frontend:

- Search source filters them:
  - `ACM Digital Library`.
- Search syncable sources them:
  - `Semantic Scholar`
  - `ACM Digital Library`
  - `Exa`
- Bo note cu noi Exa chi filter corpus.
- Admin sample data co them ACM/Exa fallback rows.

Da test:

- Module load:
  - `semantic/acm modules ok`.
- Backend tests:
  - `npm test` pass.
  - tests: 17
  - pass: 17
  - fail: 0
- Frontend:
  - `npm run build` pass.
- Backend restart tren `http://localhost:5001`.
- Smoke sync:
  - `POST /api/v1/papers/sync-request` source `Semantic Scholar`, maxRecords `1` -> `201`, job `success`, imported `1`.
  - `POST /api/v1/papers/sync-request` source `ACM Digital Library`, maxRecords `1` -> `201`, job `success`; query smoke skip 1 item vi ket qua dau khong qua ACM filter, endpoint/importer van chay dung.
- Source health:
  - `POST /api/v1/admin/data-sources/check` -> `200`.
  - count `7`.
  - OpenAlex/Semantic Scholar/Crossref/arXiv/ACM Digital Library/Exa ok.
  - IEEE Xplore fail health theo response nguon/API, khong phai loi endpoint.

Trang thai sau dot nay:

- FR-001 source coverage da day du theo danh sach yeu cau, voi ACM duoc implement bang Crossref metadata fallback.
- `FIXLIST.md` BR-001 da cap nhat day du source list.

Lenh commit goi y:

```bash
git add FIXLIST.md Minh/docs/phare.md web/backend/src/models/DataSource.js web/backend/src/models/Paper.js web/backend/src/validators/paper.validator.js web/backend/src/validators/admin.validator.js web/backend/src/seeds/seed.js web/backend/src/controllers/paper.controller.js web/backend/src/services/scheduler.service.js web/backend/src/services/sourceHealth.service.js web/backend/src/services/semanticScholar.service.js web/backend/src/services/acm.service.js web/backend/test/sourceMappers.test.js web/frontend/src/data/searchSample.ts web/frontend/src/data/adminSample.ts web/frontend/src/pages/SearchPage.tsx
git commit -m "feat: add semantic scholar and acm source sync"
```

## Cap nhat 2026-07-11 - Hoan thien FR-009/FR-010 con ho

Muc tieu:

- Hoan thien hanh vi notification khi paper moi khop subject dang follow.
- Hoan thien phan AI/corpus goi y paper lien quan trong FR-009.

Da sua file:

- `web/backend/src/services/follow.service.js`
- `web/backend/src/services/paperCleaning.service.js`
- `web/backend/src/services/ai.service.js`
- `web/backend/src/controllers/ai.controller.js`
- `web/backend/src/validators/ai.validator.js`
- `web/backend/src/routes/ai.routes.js`
- `web/backend/test/follow.service.test.js`
- `web/backend/test/api.integration.test.js`
- `web/backend/package.json`
- `web/frontend/src/lib/api.ts`
- `web/frontend/src/pages/SearchPage.tsx`
- `web/frontend/src/App.css`

Chi tiet FR-010:

- Them matcher follow subject:
  - Keyword khop title/abstract/keywords/fields.
  - Field khop `research_fields`.
  - Author khop authors.
- Them `notifyFollowersForPaper(paper)`.
- `paperCleaning.service.js` goi notify sau khi:
  - tao paper moi.
  - merge source moi vao paper da ton tai.
- Tranh duplicate notification theo:
  - user.
  - follow_id.
  - related paper id.
- Notification tao ra co type `paper`, link ve `#search`, source/metadata/citation priority.

Chi tiet FR-009:

- Them endpoint:
  - `POST /api/v1/ai/related-papers`
- Endpoint lay paper lien quan tu corpus theo:
  - title text.
  - keywords.
  - fields.
  - optional paperId exclude.
- Tra provider `corpus`, khong can gui PII/abstract ra LLM.
- Frontend `aiApi.relatedPapers()`.
- Search detail co nut:
  - `Paper lien quan`
- UI hien danh sach paper lien quan voi title/year/source.

Da test:

- Backend tests:
  - `npm test` pass.
  - tests: 21
  - pass: 21
  - fail: 0
- Frontend:
  - `npm run build` pass.
- Smoke DB follow notification:
  - tao user test co followed subject.
  - upsert paper khop keyword.
  - notification `paper` duoc tao.
  - da cleanup user/paper/notification test.
- Backend restart tren `http://localhost:5001`.
- Smoke API:
  - `POST /api/v1/ai/related-papers` -> `200`.
  - tra 3 paper, provider `corpus`.

Trang thai:

- FR-009: bo sung goi y paper lien quan da xong.
- FR-010: auto notification cho followed subject match da xong.

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/backend/package.json web/backend/src/services/follow.service.js web/backend/src/services/paperCleaning.service.js web/backend/src/services/ai.service.js web/backend/src/controllers/ai.controller.js web/backend/src/validators/ai.validator.js web/backend/src/routes/ai.routes.js web/backend/test/follow.service.test.js web/backend/test/api.integration.test.js web/frontend/src/lib/api.ts web/frontend/src/pages/SearchPage.tsx web/frontend/src/App.css
git commit -m "feat: add follow match notifications and related paper recommendations"
```

## Cap nhat 2026-07-11 - Hoan thien FE account/feedback theo fixlist

Muc tieu:

- Noi not chuc nang FE con ho cho `change-password`.
- Noi feedback flow that tu user den admin.
- Bo sung coverage test cho feedback API.

Da sua file:

- `web/frontend/src/components/icons.tsx`
- `web/frontend/src/components/Sidebar.tsx`
- `web/frontend/src/App.tsx`
- `web/frontend/src/pages/AccountPage.tsx`
- `web/frontend/src/pages/AdminPage.tsx`
- `web/frontend/src/App.css`
- `web/backend/src/services/feedback.service.js`
- `web/backend/test/api.integration.test.js`

Chi tiet frontend:

- Them route sidebar:
  - `#account` / `Tai khoan`
- Them `AccountPage` cho user:
  - hien thong tin tai khoan hien tai.
  - form doi mat khau goi `PUT /auth/change-password`.
  - form gui feedback goi `POST /feedbacks`.
  - danh sach feedback cua user goi `GET /feedbacks`.
  - hien status `Pending`, `Reviewed`, `Resolved` va admin note neu co.
- Them Admin tab:
  - `Phan hoi`
  - doc feedback that tu `GET /feedbacks`.
  - admin cap nhat status qua `PUT /feedbacks/:id`.
  - admin cap nhat `admin_note` khi blur textarea.

Chi tiet backend:

- `feedback.service.js` populate user khi admin list feedback:
  - `full_name`
  - `email`
  - `roles`
  - `status`
- User thuong van chi xem feedback cua chinh minh.

Da test:

- Backend:
  - `npm test` pass.
  - tests: 22
  - pass: 22
  - fail: 0
- Frontend:
  - `npm run build` pass.
- Integration test moi:
  - user submit feedback.
  - user list feedback cua minh.
  - admin list feedback thay thong tin user.
  - admin update status `Resolved` va `admin_note`.

Trang thai:

- Sprint 1 auth/change-password da co UI that.
- Feedback flow da co UI that cho user va admin.
- Them mot phan con ho cua "frontend route su dung API that" da hoan thien.

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/backend/src/services/feedback.service.js web/backend/test/api.integration.test.js web/frontend/src/components/icons.tsx web/frontend/src/components/Sidebar.tsx web/frontend/src/App.tsx web/frontend/src/pages/AccountPage.tsx web/frontend/src/pages/AdminPage.tsx web/frontend/src/App.css
git commit -m "feat: add account and feedback management UI"
```

## Cap nhat 2026-07-11 - Fix crash ResearchGapHeatmap

Loi user bao:

- `ResearchGapHeatmap.tsx:43 Uncaught TypeError: Cannot read properties of undefined (reading 'gap')`

Nguyen nhan:

- Component overview cu gia dinh moi cap `field + aspect` luon co san mot cell trong `gaps`.
- Khi du lieu API that bi thieu mot to hop field/aspect, `gaps.find(...)` tra `undefined`.
- Code dung non-null assertion `!` nen runtime van crash khi doc `c.gap`.

Da sua file:

- `web/frontend/src/components/ResearchGapHeatmap.tsx`

Chi tiet:

- Them fallback cell an toan khi khong tim thay data:
  - `density: 0`
  - `papers: 0`
  - `gap: false`
- Heatmap tiep tuc render o trong thay vi crash trang overview.

Da test:

- Frontend:
  - `npm run build` pass.

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/frontend/src/components/ResearchGapHeatmap.tsx
git commit -m "fix: guard missing research gap heatmap cells"
```

## Cap nhat 2026-07-11 - Fix object fields trong ResearchGapHeatmap

Loi user bao:

- `Encountered two children with the same key, [object Object]`
- `Objects are not valid as a React child (found: object with keys {key, label, token})`

Nguyen nhan:

- `ResearchGapHeatmap` type cu khai bao `fields: string[]`.
- Du lieu sample/overview co the truyen `gapFields` la object:
  - `{ key, label, token }`
- React dung object lam key/render child nen thanh `[object Object]` va crash.

Da sua file:

- `web/frontend/src/components/ResearchGapHeatmap.tsx`

Chi tiet:

- Cho phep `fields` va `aspects` nhan ca string lan object.
- Normalize axis item ve:
  - `key`
  - `label`
- Render label thay vi render object.
- Key tung cell thanh `${field.key}-${aspect.key}` de tranh duplicate key.
- Matcher cell ho tro so sanh string/object.

Da test:

- Frontend:
  - `npm run build` pass.

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/frontend/src/components/ResearchGapHeatmap.tsx
git commit -m "fix: normalize research gap heatmap axes"
```

## Cap nhat 2026-07-11 - Chuan hoa dashboard/gap data shape

Muc tieu:

- Tiep tuc hoan thien chuc nang Overview/Research Gap de chay on voi du lieu API that.
- Khong chi chong crash trong component, ma chuan hoa data shape o type va API mapper.

Da sua file:

- `web/frontend/src/data/types.ts`
- `web/frontend/src/data/sample.ts`
- `web/frontend/src/lib/api.ts`
- `web/frontend/src/components/ResearchGapHeatmap.tsx`

Chi tiet:

- Them type `AxisOption`:
  - `key`
  - `label`
  - `token?`
- `DashboardData.gapFields` va `gapAspects` chuyen sang `AxisOption[]`.
- `dashboardApi.overview()` normalize:
  - `trendSeries`
  - `gapFields`
  - `gapAspects`
  - `gaps`
- `normalizeGapCells()` chong data thieu/sai:
  - field/aspect co the la string hoac object.
  - density clamp ve `0..1`.
  - papers ve so nguyen >= 0.
- Sample dashboard cung chuyen sang axis object de khong lech voi type moi.

Da test:

- Frontend:
  - `npm run build` pass.

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/frontend/src/data/types.ts web/frontend/src/data/sample.ts web/frontend/src/lib/api.ts web/frontend/src/components/ResearchGapHeatmap.tsx
git commit -m "fix: normalize dashboard gap data"
```

## Cap nhat 2026-07-11 - Chuan hoa Analytics Gap page mapper

Muc tieu:

- Tiep tuc hoan thien chuc nang Research Gap khi backend/API tra `fields` va `aspects` dang string hoac object.
- Giam loi runtime sau khi noi API that.

Da sua file:

- `web/frontend/src/lib/api.ts`

Chi tiet:

- `analyticsApi.gaps()` khong con gia dinh `fields/aspects` la `string[]`.
- Dung lai `normalizeAxisOptions()` de map du lieu ve axis object.
- `fieldLabel` va `aspect` dung `axisLabel()` de doc duoc ca string/object.
- Them fallback field/aspect an toan khi backend thieu data.
- Giu token mau cho field tu `GAP_FIELDS` khi API khong tra token.

Da test:

- Frontend:
  - `npm run build` pass.
- Backend:
  - `npm test` pass.
  - tests: 22
  - pass: 22
  - fail: 0

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/frontend/src/lib/api.ts
git commit -m "fix: normalize analytics gap api data"
```

## Cap nhat 2026-07-11 - Hoan thien Account profile update

Muc tieu:

- Hoan thien chuc nang quan ly tai khoan theo fixlist.
- FE khong chi doi mat khau, ma sua duoc ho ten/email bang API that.
- Backend tra loi dung khi email moi bi trung.

Da sua file:

- `web/frontend/src/pages/AccountPage.tsx`
- `web/backend/src/services/auth.service.js`
- `web/backend/src/controllers/auth.controller.js`
- `web/backend/test/api.integration.test.js`

Chi tiet frontend:

- `AccountPage` them form sua thong tin:
  - ho ten.
  - email.
- Goi `userApi.updateProfile()` toi `PUT /api/v1/users/me`.
- Cap nhat local current user va localStorage sau khi luu thanh cong.
- Hien notice thanh cong/loi tren UI.

Chi tiet backend:

- `auth.service.updateProfile()` check email trung truoc khi update.
- Neu email da ton tai o user khac:
  - HTTP `409`.
  - code `CONFLICT`.
  - message `Email already registered`.
- `auth.controller.updateProfile()` giu lai `err.code` thay vi luon tra `INTERNAL_ERROR`.

Da test:

- Frontend:
  - `npm run build` pass.
- Backend:
  - `npm test` pass.
  - tests: 23
  - pass: 23
  - fail: 0
- Integration test moi:
  - user update `full_name/email` thanh cong.
  - user update sang email da ton tai bi reject `409 CONFLICT`.

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/frontend/src/pages/AccountPage.tsx web/backend/src/services/auth.service.js web/backend/src/controllers/auth.controller.js web/backend/test/api.integration.test.js
git commit -m "feat: add profile update flow"
```

## Cap nhat 2026-07-11 - Trien khai fix login UX va save paper theo collection

Muc tieu:

- Tiep tuc hoan thien code that theo fixlist.
- Cai thien loi login de user hieu dung nguyen nhan.
- Search page cho chon collection khi luu paper thay vi tu dong dung collection dau tien.
- Backend tranh duplicate saved paper trong cung collection.

Da sua file:

- `web/frontend/src/pages/LoginPage.tsx`
- `web/frontend/src/pages/SearchPage.tsx`
- `web/frontend/src/App.css`
- `web/backend/src/services/library.service.js`

Chi tiet login:

- Map loi login thanh thong bao than thien:
  - email sai format.
  - sai email/mat khau.
  - tai khoan bi khoa.
  - thu qua nhieu lan.
- Giam hien thi raw Joi/backend message tren UI dang nhap.

Chi tiet Search/Library:

- `SearchPage` load collection that tu `libraryApi.collections()`.
- Them dropdown `Luu vao` tren thanh ket qua.
- Khi luu paper:
  - dung collection user dang chon.
  - neu user chua co collection thi tao `Doc sau`.
  - cap nhat notice theo collection da luu.
- CSS responsive cho selector collection trong results bar.

Chi tiet backend:

- `library.service.savePaper()` kiem tra paper da ton tai trong collection truoc khi `$push`.
- Neu da ton tai thi skip, tranh trung lap saved paper khi user bam lai/retry.

Da test:

- Frontend:
  - `npm run build` pass.
- Backend:
  - `npm test` pass.
  - tests: 23
  - pass: 23
  - fail: 0

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/frontend/src/pages/LoginPage.tsx web/frontend/src/pages/SearchPage.tsx web/frontend/src/App.css web/backend/src/services/library.service.js
git commit -m "feat: improve login errors and save paper collection flow"
```

## Cap nhat 2026-07-11 - Enforce Workspace permissions

Muc tieu:

- Tiep tuc hoan thien fixlist theo huong production/security.
- Dong lo workspace: user biet workspace id khong duoc doc/ghi item/activity neu khong phai member.
- Phan quyen owner/editor/viewer dung hon.

Da sua file:

- `web/backend/src/services/workspace.service.js`
- `web/backend/src/controllers/workspace.controller.js`
- `web/backend/test/api.integration.test.js`

Chi tiet backend:

- Them helper `getMemberRole(userId, workspaceId)`.
- Role behavior:
  - `owner`: quan ly workspace/member/item.
  - `editor`: doc workspace, tao/sua/xoa item, comment.
  - `viewer`: doc item/activity va comment, khong tao/sua/xoa item.
  - non-member: bi chan doc item/activity.
- `getWorkspaceById()` chi tra workspace neu user la member.
- `listItems()` yeu cau user la member.
- `createItem/updateItem/deleteItem()` yeu cau owner/editor.
- `addComment()` yeu cau user la member.
- `listActivities()` yeu cau user la member.

Integration test moi:

- owner tao workspace.
- owner them viewer/editor.
- viewer doc item duoc.
- viewer tao item bi `403`.
- viewer comment duoc.
- editor update item duoc.
- outsider doc item bi `403`.

Da test:

- Backend:
  - `npm test` pass.
  - tests: 24
  - pass: 24
  - fail: 0

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/backend/src/services/workspace.service.js web/backend/src/controllers/workspace.controller.js web/backend/test/api.integration.test.js
git commit -m "fix: enforce workspace member permissions"
```

## Cap nhat 2026-07-11 - Workspace role-aware UI va invite permission

Muc tieu:

- Tiep tuc trien khai het cac phan con ho theo fixlist.
- Sau khi backend enforce workspace role, FE cung phai disable/hide action theo role.
- Backend collaboration invite khong cho non-member/viewer moi nguoi vao workspace.

Da sua file:

- `web/frontend/src/pages/WorkspacePage.tsx`
- `web/backend/src/services/collaboration.service.js`
- `web/backend/src/controllers/collaboration.controller.js`
- `web/backend/test/api.integration.test.js`

Chi tiet frontend:

- `WorkspacePage` lay current user tu localStorage.
- Tim current member trong workspace hien tai.
- Tinh quyen:
  - `canEditWorkspace`: owner/editor.
  - `canManageMembers`: owner.
- Disable nut:
  - `Them task` neu viewer.
  - `Loi moi nghien cuu chung` neu viewer.
- `WorkspaceDetail` nhan props:
  - `canEdit`
  - `canManageMembers`
- Viewer:
  - khong thay nut xoa item.
  - khong sua status/assignee/deadline/paper/note.
  - van comment duoc.
- Owner moi sua role thanh vien.
- Owner role bi lock, khong bi doi qua select.

Chi tiet backend:

- `collaboration.service.createInvite()` check workspace membership role.
- Chi `owner/editor` moi tao invite cho workspace.
- Viewer/non-member tao invite bi `403 FORBIDDEN`.
- Controller preserve error code tu service.

Integration test cap nhat:

- Viewer tao invite bi `403`.
- Editor tao invite thanh cong `201`.
- Cac test workspace permission cu van pass.

Da test:

- Backend:
  - `npm test` pass.
  - tests: 24
  - pass: 24
  - fail: 0
- Frontend:
  - `npm run build` pass.

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/frontend/src/pages/WorkspacePage.tsx web/backend/src/services/collaboration.service.js web/backend/src/controllers/collaboration.controller.js web/backend/test/api.integration.test.js
git commit -m "fix: align workspace UI with member permissions"
```

## Cap nhat 2026-07-11 - AI hardening va an demo controls production

Muc tieu:

- Trien khai tiep cac phase production hardening.
- Bao ve AI endpoints vi co the ton chi phi/tai nguyen.
- Giam nguy co gui PII sang LLM.
- An cac control demo `Xem trang thai` khi build production.

Da sua file:

- `web/backend/src/middleware/rateLimiter.middleware.js`
- `web/backend/src/routes/ai.routes.js`
- `web/backend/src/services/ai.service.js`
- `web/backend/test/ai.service.test.js`
- `web/frontend/src/lib/flags.ts`
- `web/frontend/src/pages/OverviewPage.tsx`
- `web/frontend/src/pages/TrendsPage.tsx`
- `web/frontend/src/pages/GapPage.tsx`
- `web/frontend/src/pages/LibraryPage.tsx`
- `web/frontend/src/pages/FollowPage.tsx`
- `web/frontend/src/pages/WorkspacePage.tsx`

Chi tiet backend AI:

- Them `aiLimiter` rieng:
  - dev: 120 requests / 15 phut.
  - production: 40 requests / 15 phut.
  - tra code `RATE_LIMITED`.
- Gan `aiLimiter` cho tat ca route `/api/v1/ai/*`.
- Them in-memory TTL cache cho AI:
  - TTL 10 phut.
  - gioi han map khoang 500 entries.
  - response cached co flag `cached: true`.
- Them redaction truoc khi tao prompt:
  - email -> `[redacted-email]`
  - phone-like value -> `[redacted-phone]`
- Ap dung redaction/cleaning cho:
  - summarize title/abstract/source/keywords.
  - explain term/context.
  - suggest directions field/gaps/keywords.
  - fallback summary.
- Export `_private` helper cho unit test.

Chi tiet frontend production UI:

- Them `web/frontend/src/lib/flags.ts`.
- `SHOW_DEMO_CONTROLS` chi true khi:
  - `import.meta.env.DEV`
  - hoac `VITE_SHOW_DEMO_CONTROLS=true`.
- Boc state demo controls trong cac page:
  - Overview.
  - Trends.
  - Gap.
  - Library.
  - Follow.
  - Workspace.
- Production build mac dinh khong hien `Xem trang thai`.

Da test:

- Backend:
  - `npm test` pass.
  - tests: 25
  - pass: 25
  - fail: 0
- Frontend:
  - `npm run build` pass.

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/backend/src/middleware/rateLimiter.middleware.js web/backend/src/routes/ai.routes.js web/backend/src/services/ai.service.js web/backend/test/ai.service.test.js web/frontend/src/lib/flags.ts web/frontend/src/pages/OverviewPage.tsx web/frontend/src/pages/TrendsPage.tsx web/frontend/src/pages/GapPage.tsx web/frontend/src/pages/LibraryPage.tsx web/frontend/src/pages/FollowPage.tsx web/frontend/src/pages/WorkspacePage.tsx
git commit -m "fix: harden ai endpoints and hide demo controls"
```

## Cap nhat 2026-07-11 - Email notification that cho Follow instant

Muc tieu:

- Trien khai chuc nang that cho kenh Email trong Follow rule.
- Neu user bat `rule.email=true` va `frequency=instant`, he thong gui email khi paper moi match followed subject.
- Neu SMTP chua cau hinh, pipeline crawler/notification khong bi fail.

Da sua file:

- `web/backend/package.json`
- `web/backend/package-lock.json`
- `web/backend/.env.example`
- `web/backend/src/config/env.js`
- `web/backend/src/services/email.service.js`
- `web/backend/src/services/follow.service.js`
- `web/backend/test/email.service.test.js`
- `web/backend/package.json` script `test:unit`

Dependency moi:

- `nodemailer`

Chi tiet backend:

- Them SMTP config:
  - `EMAIL_ENABLED`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `EMAIL_FROM`
- Them `email.service.js`:
  - `isConfigured()`
  - `sendMail()`
  - `sendFollowPaperEmail()`
- Khi SMTP chua cau hinh:
  - `sendMail()` tra `{ sent:false, skipped:true, reason:'EMAIL_NOT_CONFIGURED' }`.
  - Khong throw, khong lam fail job.
- `follow.service.notifyFollowersForPaper()`:
  - Van tao in-app notification neu `rule.in_app !== false`.
  - Gui email neu:
    - `rule.email === true`
    - `rule.frequency === 'instant'`
  - Daily/weekly email chua gui ngay tung paper de tranh sai semantics; can digest scheduler rieng o phase sau.
- Return them `emailed` count.

Da test:

- Frontend:
  - `npm run build` pass.
- Backend unit:
  - `npm run test:unit` pass.
  - tests: 19
  - pass: 19
  - fail: 0
- Backend full integration:
  - `npm test` dang bi chan vi MongoDB local khong listen tai `localhost:27017`.
  - Loi moi truong: `connect ECONNREFUSED ::1:27017, 127.0.0.1:27017`.
  - `lsof -iTCP:27017` khong thay process.
  - `mongod` khong co trong PATH.

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/backend/package.json web/backend/package-lock.json web/backend/.env.example web/backend/src/config/env.js web/backend/src/services/email.service.js web/backend/src/services/follow.service.js web/backend/test/email.service.test.js
git commit -m "feat: send instant follow email notifications"
```

## Cap nhat 2026-07-11 - Daily/weekly Follow email digest

Muc tieu:

- Hoan thanh not phan Follow email frequency.
- `instant` gui tung email khi paper match.
- `daily/weekly` gom thanh digest thay vi gui tung paper.

Da sua file:

- `web/backend/src/services/email.service.js`
- `web/backend/src/services/followDigest.service.js`
- `web/backend/src/services/scheduler.service.js`
- `web/backend/test/followDigest.service.test.js`
- `web/backend/package.json`

Chi tiet:

- Them `sendFollowDigestEmail(user, frequency, items)`.
- Them service `followDigest.service.js`:
  - `sinceForFrequency(frequency)`.
  - `digestSubjects(user, frequency)`.
  - `buildDigestItems(user, frequency, now)`.
  - `sendFollowDigests(frequency, now)`.
- Digest lay notification `paper` gan voi `follow_id` cua subject:
  - daily: 24h gan nhat.
  - weekly: 7 ngay gan nhat.
- Scheduler them:
  - daily digest moi 24h.
  - weekly digest moi 7 ngay.
  - initial daily digest sau khi app start.
- `follow.service.notifyFollowersForPaper()` chi gui email truc tiep khi:
  - `rule.email=true`
  - `rule.frequency='instant'`
- Daily/weekly khong spam tung paper, se gui digest.

Da test:

- Backend unit:
  - `npm run test:unit` pass.
  - tests: 21
  - pass: 21
  - fail: 0
- Frontend:
  - `npm run build` pass.

Ghi chu:

- Full `npm test` integration van can MongoDB local chay lai tai `localhost:27017`.

Lenh commit goi y:

```bash
git add Minh/docs/phare.md web/backend/src/services/email.service.js web/backend/src/services/followDigest.service.js web/backend/src/services/follow.service.js web/backend/src/services/scheduler.service.js web/backend/test/followDigest.service.test.js web/backend/package.json
git commit -m "feat: add follow email digests"
```

## Cap nhat 2026-07-11 - Production-ready hardening, Docker, CI, E2E

Muc tieu:

- Trien khai plan production-ready con lai sau khi `FIXLIST.md` khong con task bat buoc dang `[ ]`/`[/]`.
- Bo sung moi truong chay that bang Docker, test script, CI, Playwright smoke E2E, env test va checklist deploy.
- Giu repo khong commit secret that.

Da them/sua file:

- `docker-compose.yml`
- `web/backend/Dockerfile`
- `web/backend/.dockerignore`
- `web/backend/.env.test.example`
- `web/backend/package.json`
- `web/frontend/Dockerfile`
- `web/frontend/.dockerignore`
- `web/frontend/nginx.conf`
- `web/frontend/package.json`
- `web/frontend/package-lock.json`
- `web/frontend/playwright.config.ts`
- `web/frontend/e2e/smoke.spec.ts`
- `.github/workflows/ci.yml`
- `PRODUCTION_CHECKLIST.md`

Chi tiet:

- Root Docker compose co 3 service:
  - MongoDB `mongo:7`, expose `27017`, healthcheck bang `mongosh`.
  - Backend expose `5001`, connect `mongodb://mongo:27017/wdp_research`, seed du lieu truoc khi start cho local smoke.
  - Frontend build static bang Vite va serve qua nginx tai `5173`.
- Backend:
  - Them Dockerfile runtime Node 24 Alpine.
  - Them `.env.test.example` dung DB test rieng `wdp_research_test`.
  - Them script `test:all = test:unit + test:integration`.
- Frontend:
  - Cai `@playwright/test`.
  - Them script `test:e2e` va `test:e2e:ui`.
  - Them Playwright config mac dinh base URL `http://127.0.0.1:5173`.
  - Them smoke E2E:
    - Student login.
    - Search paper.
    - Save paper neu co ket qua.
    - Library note/status smoke.
    - Account page load.
    - Follow subject add smoke.
    - Workspace permission UI smoke.
    - Admin source health page load.
- CI:
  - Backend unit job.
  - Backend integration job voi Mongo service.
  - Frontend build job.
- Production checklist:
  - Rotate API keys da lo.
  - Set JWT secret manh.
  - Set SMTP/CORS/Mongo/academic source configs.
  - Verify IEEE/source health.
  - Ghi ro logout v1 hien tai la client-side; refresh-token blacklist/logout-all-devices la hardening tiep theo.

Da test:

- Backend unit:
  - `cd web/backend && npm run test:unit` pass.
  - tests: 21
  - pass: 21
  - fail: 0
- Frontend:
  - `cd web/frontend && npm run build` pass.
- Docker compose config:
  - `docker compose config` pass.
- Playwright:
  - `cd web/frontend && npx playwright --version` -> `Version 1.61.1`.
  - `cd web/frontend && npm run test:e2e -- --list` pass, list duoc 2 smoke tests.
- Backend integration:
  - `cd web/backend && npm run test:integration` van bi chan boi moi truong vi MongoDB local khong chay.
  - Loi: `connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017`.
  - Docker daemon cung chua chay nen chua the `docker compose up -d mongo` trong phien nay.
  - Loi Docker: khong connect duoc `unix:///Users/blaosak/.docker/run/docker.sock`.

Trang thai:

- Code/config production hardening da trien khai.
- Unit/build/config/E2E compile-list da pass.
- Integration/E2E runtime can chay lai sau khi bat Docker Desktop hoac MongoDB local.

Lenh chay tiep khi Docker Desktop da bat:

```bash
docker compose up --build
```

```bash
cd web/backend && npm run test:integration
```

```bash
cd web/frontend && npm run test:e2e
```

Lenh commit goi y:

```bash
git add .github/workflows/ci.yml PRODUCTION_CHECKLIST.md docker-compose.yml Minh/docs/phare.md web/backend/.dockerignore web/backend/.env.test.example web/backend/Dockerfile web/backend/package.json web/frontend/.dockerignore web/frontend/Dockerfile web/frontend/e2e/smoke.spec.ts web/frontend/nginx.conf web/frontend/package.json web/frontend/package-lock.json web/frontend/playwright.config.ts
git commit -m "chore: add production docker ci and e2e smoke setup"
```

## Cap nhat 2026-07-11 - FE strict API mode, bo sample fallback o production

Muc tieu:

- Xu ly fixlist FE API that con lai.
- Production khong tu fallback ve sample data khi API rong/loi.
- Dev van co sample fallback de lam UI nhanh, co the tat bang `VITE_STRICT_API=true`.

Da sua/them file:

- `web/frontend/src/lib/flags.ts`
- `web/frontend/src/pages/OverviewPage.tsx`
- `web/frontend/src/pages/TrendsPage.tsx`
- `web/frontend/src/pages/GapPage.tsx`
- `web/frontend/src/pages/LibraryPage.tsx`
- `web/frontend/src/pages/FollowPage.tsx`
- `web/frontend/src/pages/WorkspacePage.tsx`
- `web/frontend/src/pages/NotificationPage.tsx`
- `web/frontend/.env.example`
- `PRODUCTION_CHECKLIST.md`

Chi tiet:

- Them flag `USE_SAMPLE_FALLBACK`:
  - Dev mac dinh van co fallback sample neu khong set `VITE_STRICT_API=true`.
  - Production mac dinh khong fallback sample.
  - Co escape hatch `VITE_USE_SAMPLE_FALLBACK=true` cho visual UI work, khong dung production.
- Library:
  - Production khoi tao rong, API tra rong thi hien empty that.
  - API loi thi hien notice, khong giu sample library.
- Follow:
  - Production khoi tao subjects/alerts rong.
  - API loi thi clear data va hien notice.
- Workspace:
  - Production khoi tao workspace/member/item/invite/researcher/activity rong.
  - API rong/loi khong giu sample workspace.
  - Activity khong fallback ve sample trong production.
- Notification:
  - Production khoi tao inbox rong.
  - API rong/loi khong giu sample notification.
- Overview:
  - Production dung empty dashboard khi chua co API data.
  - API loi hien error state thay vi sample dashboard.
- Trends:
  - Production khong fallback trend points/growth/network sang sample.
  - API loi hien error state.
- Gap:
  - Production khong fallback gap matrix sang sample.
  - API loi hien error state.
- Checklist production them bien frontend:
  - `VITE_API_BASE_URL`
  - `VITE_STRICT_API`
  - `VITE_USE_SAMPLE_FALLBACK`

Da test:

- Frontend:
  - `cd web/frontend && npm run build` pass.

Lenh commit goi y:

```bash
git add Minh/docs/phare.md PRODUCTION_CHECKLIST.md web/frontend/.env.example web/frontend/src/lib/flags.ts web/frontend/src/pages/OverviewPage.tsx web/frontend/src/pages/TrendsPage.tsx web/frontend/src/pages/GapPage.tsx web/frontend/src/pages/LibraryPage.tsx web/frontend/src/pages/FollowPage.tsx web/frontend/src/pages/WorkspacePage.tsx web/frontend/src/pages/NotificationPage.tsx
git commit -m "fix: disable frontend sample fallback in production"
```

## Cap nhat 2026-07-11 - Tai lieu ban giao code

Muc tieu:

- Ghi ro phan con lai can lam de dua code cho nguoi khac.
- Tao mot tai lieu handoff ngan gon, de nguoi nhan code biet cach chay, test, va deploy tiep.

Da them/sua file:

- `HANDOFF.md`
- `PRODUCTION_CHECKLIST.md`
- `Minh/docs/phare.md`

Trang thai hien tai:

- `FIXLIST.md` khong con task bat buoc dang `[ ]` hoac `[/]`.
- FE production da API-only, khong fallback sample mac dinh.
- Backend unit pass.
- Frontend build pass.
- Docker compose config pass.
- E2E spec compile/list pass.

Phan con lai can nguoi nhan code lam:

- Bat Docker Desktop hoac MongoDB local.
- Chay lai integration:
  - `cd web/backend && npm run test:integration`
- Chay E2E runtime:
  - `docker compose up --build`
  - `cd web/frontend && npm run test:e2e`
- Tao `.env` that tu file example:
  - `web/backend/.env.example`
  - `web/backend/.env.test.example`
  - `web/frontend/.env.example`
- Rotate toan bo API keys/token da tung lo trong chat/env local.
- Set production `CORS_ORIGIN` va frontend `VITE_API_BASE_URL`.
- Cau hinh SMTP staging/production va smoke test:
  - follow instant email.
  - daily/weekly digest email.
- Kiem tra Admin source health voi key that:
  - OpenAlex/Crossref/Semantic Scholar/IEEE/Exa.
- Quyet dinh co can refresh-token blacklist/logout-all-devices cho production security hay khong.
- Cau hinh Mongo backup/monitoring/restore drill.
- Xac nhan CI pass tren branch ban giao.

Ghi chu blocker moi truong:

- Lan chay integration gan nhat fail vi MongoDB local khong chay o `localhost:27017`.
- Docker Desktop trong phien nay cung chua active nen khong start duoc `mongo:7`.
- Day la blocker runtime/moi truong, khong phai loi assertion da biet trong code.

Lenh commit goi y:

```bash
git add .
git commit -m "feat: complete fixlist production handoff"
```
