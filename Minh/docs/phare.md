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
