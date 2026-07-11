# 📋 DANH SÁCH NHIỆM VỤ CẦN FIX — WDP PROJECT

> **Dự án:** Hệ thống theo dõi xu hướng nghiên cứu khoa học  
> **Phạm vi:** Backend (Express/Mongoose) + Frontend (React/Vite/TypeScript)  
> **Ngày tạo:** 2026-07-10  
> **Trạng thái:** `[ ]` Chưa làm · `[/]` Đang làm · `[x]` Hoàn thành

---

## PHASE 1 — BẢO MẬT (Security) ⏱ ~2-3h

> Mức ưu tiên: 🔴 **NGHIÊM TRỌNG**  
> Ảnh hưởng: Toàn bộ API endpoints, bảo vệ dữ liệu người dùng

---

### 1.1 Tạo Joi Validation Schemas

**Vấn đề:** Dự án đã cài `joi` (package.json) và đã viết `validate.middleware.js` nhưng **KHÔNG route nào sử dụng validation**. Mọi dữ liệu từ client đều đi thẳng vào database mà không kiểm tra.

**Liên quan BR:** BR-038 (Quản lý tài khoản), BR-009 (Tìm kiếm), BR-001 (Thu thập dữ liệu)

#### Cần tạo mới — Thư mục `src/validators/`

---

##### `[x]` 1.1.1 — File: `src/validators/auth.validator.js`

```javascript
// registerSchema
{
  email:     Joi.string().email().required().max(255),
  password:  Joi.string().min(8).max(128).required(),
  full_name: Joi.string().trim().min(2).max(100).required()
}

// loginSchema
{
  email:    Joi.string().email().required(),
  password: Joi.string().required()
}

// changePasswordSchema (dùng cho endpoint mới ở Phase 2)
{
  currentPassword: Joi.string().required(),
  newPassword:     Joi.string().min(8).max(128).required()
              .disallow(Joi.ref('currentPassword'))  // không trùng mật khẩu cũ
}

// refreshTokenSchema
{
  refreshToken: Joi.string().required()
}
```

---

##### `[x]` 1.1.2 — File: `src/validators/paper.validator.js`

```javascript
// syncRequestSchema
{
  query:      Joi.string().trim().min(1).max(500).required(),
  sourceName: Joi.string().valid('OpenAlex', 'arXiv', 'Crossref').default('OpenAlex'),
  maxRecords: Joi.number().integer().min(1).max(50).default(25),
  yearFrom:   Joi.number().integer().min(1900).max(2030).optional(),
  yearTo:     Joi.number().integer().min(1900).max(2030).optional(),
  types:      Joi.string().optional()
}
```

Lưu ý: Hiện `paper.controller.js` validate thủ công `if (!query)` — cần xóa logic đó và dùng middleware.

---

##### `[x]` 1.1.3 — File: `src/validators/workspace.validator.js`

```javascript
// createWorkspaceSchema
{
  name:           Joi.string().trim().min(1).max(100).required(),
  description:    Joi.string().trim().max(500).default(''),
  owner_name:     Joi.string().trim().max(100).optional(),
  owner_initials: Joi.string().trim().max(2).optional()
}

// updateWorkspaceSchema
{
  name:        Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().max(500).optional(),
  active:      Joi.boolean().optional()
}

// createItemSchema
{
  kind:        Joi.string().valid('task', 'note', 'discussion').required(),
  title:       Joi.string().trim().min(1).max(300).required(),
  status:      Joi.string().valid('backlog', 'doing', 'done').default('backlog'),
  assignee_id: Joi.string().hex().length(24).optional(),  // MongoDB ObjectId
  paper_id:    Joi.string().hex().length(24).optional(),
  due:         Joi.string().max(20).default(''),
  note:        Joi.string().max(2000).default('')
}

// updateItemSchema
{
  title:       Joi.string().trim().min(1).max(300).optional(),
  status:      Joi.string().valid('backlog', 'doing', 'done').optional(),
  assignee_id: Joi.string().hex().length(24).optional().allow(null),
  paper_id:    Joi.string().hex().length(24).optional().allow(null),
  due:         Joi.string().max(20).optional(),
  note:        Joi.string().max(2000).optional()
}

// addMemberSchema
{
  user_id:  Joi.string().hex().length(24).required(),
  name:     Joi.string().trim().min(1).max(100).required(),
  initials: Joi.string().trim().min(1).max(2).required(),
  role:     Joi.string().valid('editor', 'viewer').default('viewer')
  // Không cho phép set 'owner' từ bên ngoài
}

// updateMemberSchema
{
  role: Joi.string().valid('editor', 'viewer').required()
}

// addCommentSchema
{
  content:     Joi.string().trim().min(1).max(2000).required(),
  author_name: Joi.string().trim().max(100).optional()
}
```

---

##### `[x]` 1.1.4 — File: `src/validators/library.validator.js`

```javascript
// createCollectionSchema
{
  collection_name: Joi.string().trim().min(1).max(100).required(),
  description:     Joi.string().trim().max(500).default('')
}

// updateCollectionSchema
{
  collection_name: Joi.string().trim().min(1).max(100).optional(),
  description:     Joi.string().trim().max(500).optional()
}

// savePaperSchema
{
  paper_id:      Joi.string().hex().length(24).required(),
  collection_id: Joi.string().hex().length(24).required()
}

// updateSavedPaperSchema
{
  status: Joi.string().valid('unread', 'reading', 'done').optional(),
  note:   Joi.string().max(2000).optional()
}
```

---

##### `[x]` 1.1.5 — File: `src/validators/follow.validator.js`

```javascript
// addSubjectSchema
{
  type:  Joi.string().valid('Keyword', 'Field', 'Author').required(),
  value: Joi.string().trim().min(1).max(200).required(),
  rule: Joi.object({
    frequency:  Joi.string().valid('instant', 'daily', 'weekly').default('daily'),
    threshold:  Joi.string().valid('all', 'highCitation', 'trustedSources').default('all'),
    email:      Joi.boolean().default(false),
    in_app:     Joi.boolean().default(true),
    exclude:    Joi.array().items(Joi.string().max(200)).max(20).default([])
  }).default({})
}

// updateSubjectSchema
{
  active: Joi.boolean().optional(),
  rule: Joi.object({
    frequency:  Joi.string().valid('instant', 'daily', 'weekly').optional(),
    threshold:  Joi.string().valid('all', 'highCitation', 'trustedSources').optional(),
    email:      Joi.boolean().optional(),
    in_app:     Joi.boolean().optional(),
    exclude:    Joi.array().items(Joi.string().max(200)).max(20).optional()
  }).optional()
}
```

---

##### `[x]` 1.1.6 — File: `src/validators/collaboration.validator.js`

```javascript
// createInviteSchema
{
  workspace_id:    Joi.string().hex().length(24).required(),
  invitee_email:   Joi.string().email().required(),
  invitee_name:    Joi.string().trim().max(100).default(''),
  invitee_user_id: Joi.string().hex().length(24).optional().allow(null),
  direction:       Joi.string().valid('incoming', 'outgoing').required(),
  topic:           Joi.string().trim().min(1).max(200).required(),
  message:         Joi.string().trim().max(1000).default('')
}

// respondInviteSchema
{
  status: Joi.string().valid('accepted', 'declined').required()
}
```

---

##### `[x]` 1.1.7 — File: `src/validators/feedback.validator.js`

```javascript
// createFeedbackSchema
{
  content: Joi.string().trim().min(5).max(2000).required()
}

// updateFeedbackSchema (Admin)
{
  status:     Joi.string().valid('Pending', 'Reviewed', 'Resolved').optional(),
  admin_note: Joi.string().trim().max(1000).optional().allow(null)
}
```

---

##### `[x]` 1.1.8 — File: `src/validators/admin.validator.js`

```javascript
// updateUserSchema
{
  status: Joi.string().valid('Active', 'Inactive', 'Banned').optional(),
  roles:  Joi.array().items(
            Joi.string().valid('Student', 'Admin')
          ).min(1).optional()
}

// createJobSchema
{
  name:        Joi.string().trim().min(1).max(200).required(),
  source_name: Joi.string().valid('OpenAlex', 'Semantic Scholar', 'Crossref', 'arXiv', 'IEEE Xplore').required(),
  query:       Joi.string().trim().min(1).max(500).required(),
  max_records: Joi.number().integer().min(1).max(50).default(25)
}

// updateDataSourceSchema
{
  enabled:       Joi.boolean().optional(),
  sync_schedule: Joi.string().max(50).optional(),
  api_endpoint:  Joi.string().uri().optional()
}
```

---

##### `[x]` 1.1.9 — File: `src/validators/search.validator.js`

```javascript
// createSavedSearchSchema
{
  name: Joi.string().trim().min(1).max(100).required(),
  criteria: Joi.object({
    keywords:        Joi.array().items(Joi.string().max(200)).max(20).optional(),
    year_gte:        Joi.number().integer().optional(),
    year_lte:        Joi.number().integer().optional(),
    authors:         Joi.array().items(Joi.string().max(200)).max(20).optional(),
    research_fields: Joi.array().items(Joi.string().max(200)).max(20).optional(),
    source_names:    Joi.array().items(Joi.string().max(100)).max(10).optional(),
    logic:           Joi.string().valid('AND', 'OR').default('AND')
  }).required()
}
```

---

##### `[x]` 1.1.10 — File: `src/validators/user.validator.js`

```javascript
// updateProfileSchema
{
  full_name: Joi.string().trim().min(2).max(100).optional(),
  email:     Joi.string().email().max(255).optional()
}

// updateDashboardLayoutSchema
{
  widgets: Joi.array().items(
    Joi.string().valid(
      'trend_chart', 'research_gap_heatmap', 'top_papers', 'ai_insights'
    )
  ).min(1).max(10).required()
}
```

---

##### `[x]` 1.1.11 — File: `src/validators/ai.validator.js`

```javascript
// summarizeSchema
{
  abstract: Joi.string().max(5000).optional().allow(''),
  title:    Joi.string().max(500).required()
}

// explainTermSchema
{
  term: Joi.string().trim().min(1).max(200).required()
}

// suggestDirectionsSchema
{
  field: Joi.string().max(200).optional(),
  gaps:  Joi.array().items(Joi.object()).optional()
}
```

---

### 1.2 Gắn Validation Middleware Vào Routes

Sau khi tạo xong các file validators, cần sửa **11 route files** để gắn `validate()`:

##### `[x]` 1.2.1 — File: `src/routes/auth.routes.js`

```diff
 const { authLimiter } = require('../middleware/rateLimiter.middleware');
+const { validate } = require('../middleware/validate.middleware');
+const { registerSchema, loginSchema } = require('../validators/auth.validator');

-router.post('/register', authLimiter, ctrl.register);
-router.post('/login', authLimiter, ctrl.login);
+router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
+router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
```

##### `[x]` 1.2.2 — File: `src/routes/paper.routes.js`

```diff
+const { validate } = require('../middleware/validate.middleware');
+const { syncRequestSchema } = require('../validators/paper.validator');

-router.post('/sync-request', optionalAuth, ctrl.requestCorpusSync);
+router.post('/sync-request', optionalAuth, validate(syncRequestSchema), ctrl.requestCorpusSync);
```

##### `[x]` 1.2.3 — File: `src/routes/workspace.routes.js`

```diff
+const { validate } = require('../middleware/validate.middleware');
+const {
+  createWorkspaceSchema, updateWorkspaceSchema,
+  createItemSchema, updateItemSchema,
+  addMemberSchema, updateMemberSchema,
+  addCommentSchema
+} = require('../validators/workspace.validator');

-router.post('/', ctrl.createWorkspace);
+router.post('/', validate(createWorkspaceSchema), ctrl.createWorkspace);

-router.put('/:id', ctrl.updateWorkspace);
+router.put('/:id', validate(updateWorkspaceSchema), ctrl.updateWorkspace);

-router.post('/:id/members', ctrl.addMember);
+router.post('/:id/members', validate(addMemberSchema), ctrl.addMember);

-router.put('/:id/members/:memberId', ctrl.updateMember);
+router.put('/:id/members/:memberId', validate(updateMemberSchema), ctrl.updateMember);

-router.post('/:id/items', ctrl.createItem);
+router.post('/:id/items', validate(createItemSchema), ctrl.createItem);

-router.put('/:id/items/:itemId', ctrl.updateItem);
+router.put('/:id/items/:itemId', validate(updateItemSchema), ctrl.updateItem);

-router.post('/:id/items/:itemId/comments', ctrl.addComment);
+router.post('/:id/items/:itemId/comments', validate(addCommentSchema), ctrl.addComment);
```

##### `[x]` 1.2.4 — File: `src/routes/library.routes.js`

```diff
+const { validate } = require('../middleware/validate.middleware');
+const {
+  createCollectionSchema, updateCollectionSchema,
+  savePaperSchema, updateSavedPaperSchema
+} = require('../validators/library.validator');

-router.post('/collections', ctrl.createCollection);
+router.post('/collections', validate(createCollectionSchema), ctrl.createCollection);

-router.put('/collections/:id', ctrl.updateCollection);
+router.put('/collections/:id', validate(updateCollectionSchema), ctrl.updateCollection);

-router.post('/papers', ctrl.savePaper);
+router.post('/papers', validate(savePaperSchema), ctrl.savePaper);

-router.put('/papers/:collectionId/:paperId', ctrl.updatePaper);
+router.put('/papers/:collectionId/:paperId', validate(updateSavedPaperSchema), ctrl.updatePaper);
```

##### `[x]` 1.2.5 — File: `src/routes/follow.routes.js`

```diff
+const { validate } = require('../middleware/validate.middleware');
+const { addSubjectSchema, updateSubjectSchema } = require('../validators/follow.validator');

-router.post('/subjects', ctrl.addSubject);
+router.post('/subjects', validate(addSubjectSchema), ctrl.addSubject);

-router.put('/subjects/:id', ctrl.updateSubject);
+router.put('/subjects/:id', validate(updateSubjectSchema), ctrl.updateSubject);
```

##### `[x]` 1.2.6 — File: `src/routes/collaboration.routes.js`

```diff
+const { validate } = require('../middleware/validate.middleware');
+const { createInviteSchema, respondInviteSchema } = require('../validators/collaboration.validator');

-router.post('/invites', ctrl.createInvite);
+router.post('/invites', validate(createInviteSchema), ctrl.createInvite);

-router.put('/invites/:id', ctrl.respondToInvite);
+router.put('/invites/:id', validate(respondInviteSchema), ctrl.respondToInvite);
```

##### `[x]` 1.2.7 — File: `src/routes/feedback.routes.js`

```diff
+const { validate } = require('../middleware/validate.middleware');
+const { createFeedbackSchema, updateFeedbackSchema } = require('../validators/feedback.validator');

-router.post('/', ctrl.create);
+router.post('/', validate(createFeedbackSchema), ctrl.create);

-router.put('/:id', rbac('Admin'), ctrl.update);
+router.put('/:id', rbac('Admin'), validate(updateFeedbackSchema), ctrl.update);
```

##### `[x]` 1.2.8 — File: `src/routes/admin.routes.js`

```diff
+const { validate } = require('../middleware/validate.middleware');
+const { updateUserSchema, createJobSchema, updateDataSourceSchema } = require('../validators/admin.validator');

-router.put('/users/:id', ctrl.updateUser);
+router.put('/users/:id', validate(updateUserSchema), ctrl.updateUser);

-router.post('/jobs', ctrl.createJob);
+router.post('/jobs', validate(createJobSchema), ctrl.createJob);

-router.put('/data-sources/:id', ctrl.updateDataSource);
+router.put('/data-sources/:id', validate(updateDataSourceSchema), ctrl.updateDataSource);
```

##### `[x]` 1.2.9 — File: `src/routes/search.routes.js`

```diff
+const { validate } = require('../middleware/validate.middleware');
+const { createSavedSearchSchema } = require('../validators/search.validator');

-router.post('/', ctrl.createSavedSearch);
+router.post('/', validate(createSavedSearchSchema), ctrl.createSavedSearch);
```

##### `[x]` 1.2.10 — File: `src/routes/user.routes.js`

```diff
+const { validate } = require('../middleware/validate.middleware');
+const { updateProfileSchema, updateDashboardLayoutSchema } = require('../validators/user.validator');

-router.put('/me', ctrl.updateProfile);
+router.put('/me', validate(updateProfileSchema), ctrl.updateProfile);

-router.put('/me/dashboard-layout', ctrl.updateDashboardLayout);
+router.put('/me/dashboard-layout', validate(updateDashboardLayoutSchema), ctrl.updateDashboardLayout);
```

##### `[x]` 1.2.11 — File: `src/routes/ai.routes.js`

```diff
+const { validate } = require('../middleware/validate.middleware');
+const { summarizeSchema, explainTermSchema, suggestDirectionsSchema } = require('../validators/ai.validator');

-router.post('/summarize', ctrl.summarize);
+router.post('/summarize', validate(summarizeSchema), ctrl.summarize);

-router.post('/explain-term', ctrl.explainTerm);
+router.post('/explain-term', validate(explainTermSchema), ctrl.explainTerm);

-router.post('/suggest-directions', ctrl.suggestDirections);
+router.post('/suggest-directions', validate(suggestDirectionsSchema), ctrl.suggestDirections);
```

---

### 1.3 Fix Mass Assignment Vulnerabilities

**Vấn đề:** Một số controller spread `req.body` trực tiếp vào `Model.create()`, cho phép client inject thêm fields tùy ý vào MongoDB document.

---

##### `[x]` 1.3.1 — File: `src/controllers/workspace.controller.js` — `createWorkspace()`

```diff
 async function createWorkspace(req, res) {
   try {
-    const ws = await Workspace.create({
-      ...req.body,
-      owner_id: req.user.id,
+    const { name, description } = req.body;
+    const ws = await Workspace.create({
+      name,
+      description: description || '',
+      owner_id: req.user.id,
       members: [{
         user_id: req.user.id,
         name: req.body.owner_name || 'Owner',
         initials: req.body.owner_initials || 'OW',
         role: 'owner',
       }],
     });
```

##### `[x]` 1.3.2 — File: `src/controllers/workspace.controller.js` — `createItem()`

```diff
 async function createItem(req, res) {
   try {
+    const { kind, title, status, assignee_id, paper_id, due, note } = req.body;
     const item = await WorkspaceItem.create({
-      ...req.body,
+      kind, title, status, assignee_id, paper_id, due, note,
       workspace_id: req.params.id,
     });
```

##### `[x]` 1.3.3 — File: `src/controllers/workspace.controller.js` — `updateItem()`

```diff
 async function updateItem(req, res) {
   try {
+    const allowed = {};
+    const pick = ['title', 'status', 'assignee_id', 'paper_id', 'due', 'note', 'kind'];
+    for (const key of pick) {
+      if (req.body[key] !== undefined) allowed[key] = req.body[key];
+    }
     const item = await WorkspaceItem.findOneAndUpdate(
       { _id: req.params.itemId, workspace_id: req.params.id },
-      req.body,
+      allowed,
       { new: true },
     );
```

##### `[x]` 1.3.4 — File: `src/controllers/admin.controller.js` — `createJob()`

```diff
 async function createJob(req, res) {
   try {
-    const job = await CrawlerJob.create(req.body);
+    const { name, source_name, query, max_records } = req.body;
+    const job = await CrawlerJob.create({
+      name,
+      source_name,
+      query,
+      max_records: max_records || 25,
+      status: 'queued',
+      progress: 0,
+      owner: req.user.email,
+      requested_by: req.user.id,
+    });
     return ApiResponse.created(res, job);
```

##### `[x]` 1.3.5 — File: `src/controllers/collaboration.controller.js` — `createInvite()`

```diff
 async function createInvite(req, res) {
   try {
+    const { workspace_id, invitee_email, invitee_name, invitee_user_id, direction, topic, message } = req.body;
     const invite = await CollaborationInvite.create({
-      ...req.body,
+      workspace_id,
+      invitee_email,
+      invitee_name: invitee_name || '',
+      invitee_user_id: invitee_user_id || null,
+      direction,
+      topic,
+      message: message || '',
       sender_id: req.user.id,
     });
```

---

## PHASE 2 — AUTH & ROUTE FIXES ⏱ ~1h

> Mức ưu tiên: 🔴 **NGHIÊM TRỌNG**  
> Ảnh hưởng: Luồng xác thực, UX khi token hết hạn

---

### 2.1 Thêm Refresh Token Endpoint

**Vấn đề:** Frontend lưu `refreshToken` vào localStorage (`wdp_refresh_token`) nhưng backend không có endpoint sử dụng nó. Khi access token hết hạn (7 ngày) → user bị đá ra phải login lại.

**Liên quan BR:** BR-038 (Quản lý tài khoản), BR-039 (RBAC)

---

##### `[x]` 2.1.1 — File: `src/services/auth.service.js`

Thêm function `refreshTokens()`:

```javascript
/**
 * Refresh access token using a valid refresh token.
 */
async function refreshTokens(refreshToken) {
  if (!refreshToken) {
    throw Object.assign(new Error('Refresh token is required'), { statusCode: 400 });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Refresh token expired, please login again'
      : 'Invalid refresh token';
    throw Object.assign(new Error(message), { statusCode: 401 });
  }

  const user = await User.findById(decoded.id).select('-password_hash');
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  if (user.status === 'Banned') {
    throw Object.assign(new Error('Account is banned'), { statusCode: 403 });
  }

  const tokens = generateTokens(user);
  return {
    user: {
      id: user._id,
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      status: user.status,
    },
    ...tokens,
  };
}
```

Thêm vào `module.exports`: `refreshTokens`

---

##### `[x]` 2.1.2 — File: `src/controllers/auth.controller.js`

Thêm function:

```javascript
async function refresh(req, res) {
  try {
    const result = await authService.refreshTokens(req.body.refreshToken);
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}
```

Thêm `refresh` vào `module.exports`

---

##### `[x]` 2.1.3 — File: `src/routes/auth.routes.js`

Thêm route (public, có rate limit):

```diff
+const { validate } = require('../middleware/validate.middleware');
+const { refreshTokenSchema } = require('../validators/auth.validator');

 // Public
 router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
 router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
+router.post('/refresh', authLimiter, validate(refreshTokenSchema), ctrl.refresh);
```

---

### 2.2 Thêm Change Password Endpoint

**Vấn đề:** Không có cách nào đổi mật khẩu ngoại trừ thao tác trực tiếp database.

**Liên quan BR:** BR-038 (Quản lý tài khoản)

---

##### `[x]` 2.2.1 — File: `src/services/auth.service.js`

Thêm function `changePassword()`:

```javascript
/**
 * Change password for authenticated user.
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });
  }

  const salt = await bcrypt.genSalt(10);
  user.password_hash = await bcrypt.hash(newPassword, salt);
  await user.save();

  return { message: 'Password changed successfully' };
}
```

Thêm vào `module.exports`: `changePassword`

---

##### `[x]` 2.2.2 — File: `src/controllers/auth.controller.js`

Thêm function:

```javascript
async function changePassword(req, res) {
  try {
    const result = await authService.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    return ApiResponse.success(res, result);
  } catch (err) {
    return ApiResponse.error(res, err.message, err.statusCode || 500);
  }
}
```

Thêm `changePassword` vào `module.exports`

---

##### `[x]` 2.2.3 — File: `src/routes/auth.routes.js`

Thêm protected route:

```diff
 // Protected
 router.post('/logout', authenticate, ctrl.logout);
 router.get('/me', authenticate, ctrl.getMe);
+router.put('/change-password', authenticate, validate(changePasswordSchema), ctrl.changePassword);
```

---

### 2.3 Fix Route Ordering (Potential Bug)

**Vấn đề:** Express match routes theo thứ tự khai báo. Khi parameterized route (`/:id/read`) đặt trước static route (`/read-all`), có thể gây conflict tùy version Express.

---

##### `[x]` 2.3.1 — File: `src/routes/notification.routes.js`

```diff
-router.put('/:id/read', ctrl.markRead);
-router.put('/read-all', ctrl.markAllRead);
+router.put('/read-all', ctrl.markAllRead);     // Static trước
+router.put('/:id/read', ctrl.markRead);         // Parameterized sau
```

##### `[x]` 2.3.2 — File: `src/routes/follow.routes.js`

```diff
-router.put('/alerts/:id/read', ctrl.markAlertRead);
-router.put('/alerts/read-all', ctrl.markAllRead);
+router.put('/alerts/read-all', ctrl.markAllRead);       // Static trước
+router.put('/alerts/:id/read', ctrl.markAlertRead);     // Parameterized sau
```

---

## PHASE 3 — KIẾN TRÚC (Architecture) ⏱ ~2-3h

> Mức ưu tiên: 🟡 **TRUNG BÌNH**  
> Ảnh hưởng: Code maintainability, testability, consistency

---

### 3.1 Tạo AsyncHandler Wrapper

**Vấn đề:** Mỗi controller function đều wrap try-catch thủ công (~50 lần lặp). Express 5 hỗ trợ async natively, nhưng nên có wrapper chuẩn.

---

##### `[x]` 3.1.1 — File mới: `src/utils/asyncHandler.js`

```javascript
/**
 * Wraps an async route handler to catch errors and forward to Express error handler.
 * Eliminates repetitive try-catch blocks in every controller.
 *
 * Usage:
 *   router.get('/foo', asyncHandler(async (req, res) => { ... }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
```

**Lưu ý:** Có thể áp dụng dần — không bắt buộc refactor tất cả controllers cùng lúc. Ưu tiên dùng cho controllers mới tạo.

---

### 3.2 Tách Service Layer Cho 5 Controller Thiếu

**Vấn đề:** 5 controller gọi Mongoose trực tiếp — không nhất quán với pattern Auth/Paper/Library/Follow/Dashboard/Analytics đã có service layer.

---

##### `[x]` 3.2.1 — File mới: `src/services/workspace.service.js`

Di chuyển logic từ `workspace.controller.js`:

| Function | Chức năng |
|----------|-----------|
| `getWorkspaces(userId)` | Query workspace theo owner + member |
| `createWorkspace(userId, data)` | Tạo workspace + thêm owner làm member |
| `getWorkspaceById(id)` | Tìm workspace theo ID |
| `updateWorkspace(id, userId, data)` | Cập nhật name/description/active |
| `deleteWorkspace(id, userId)` | Xóa workspace + cascade delete items |
| `addMember(workspaceId, userId, memberData)` | Kiểm tra owner rồi push member |
| `updateMember(workspaceId, userId, memberId, role)` | Cập nhật role |
| `removeMember(workspaceId, userId, memberId)` | Gỡ member |
| `getItems(workspaceId, filters)` | Lấy danh sách items theo filter |
| `createItem(workspaceId, data)` | Tạo work item |
| `updateItem(workspaceId, itemId, data)` | Cập nhật work item |
| `deleteItem(workspaceId, itemId)` | Xóa work item |
| `addComment(workspaceId, itemId, userId, commentData)` | Push comment |
| `getActivities(workspaceId)` | Derive từ recent item updates |

---

##### `[x]` 3.2.2 — File mới: `src/services/notification.service.js`

Di chuyển logic từ `notification.controller.js`:

| Function | Chức năng |
|----------|-----------|
| `getNotifications(userId, filters, pagination)` | Query + paginate |
| `markRead(notificationId, userId)` | Đánh dấu đã đọc |
| `markAllRead(userId)` | Đánh dấu tất cả |
| `getUnreadCount(userId)` | Đếm chưa đọc |
| `createNotification(userId, type, title, content, meta)` | **MỚI** — tạo notification (dùng ở Phase 4) |

---

##### `[x]` 3.2.3 — File mới: `src/services/collaboration.service.js`

Di chuyển logic từ `collaboration.controller.js`:

| Function | Chức năng |
|----------|-----------|
| `getResearchers(userId, query)` | Tìm researchers + tính match score |
| `getInvites(userId, filters)` | Query invites (sender/invitee) |
| `createInvite(userId, data)` | Tạo invite |
| `respondToInvite(inviteId, userId, status)` | Accept/decline |

---

##### `[x]` 3.2.4 — File mới: `src/services/feedback.service.js`

Di chuyển logic từ `feedback.controller.js`:

| Function | Chức năng |
|----------|-----------|
| `create(userId, content)` | Tạo feedback |
| `list(userId, roles, filters, pagination)` | Admin thấy tất cả, user thấy của mình |
| `update(feedbackId, status, adminNote)` | Admin cập nhật |

---

##### `[x]` 3.2.5 — File mới: `src/services/search.service.js`

Di chuyển logic từ `search.controller.js`:

| Function | Chức năng |
|----------|-----------|
| `getSavedSearches(userId)` | Lấy saved_searches từ User model |
| `createSavedSearch(userId, data)` | Push vào saved_searches array |
| `deleteSavedSearch(userId, searchId)` | Pull từ array |

---

##### `[x]` 3.2.6 — Sửa 5 controller tương ứng

Mỗi controller chỉ giữ lại logic xử lý req/res, gọi service function:

- `[x]` `workspace.controller.js` → import `workspace.service.js`
- `[x]` `notification.controller.js` → import `notification.service.js`
- `[x]` `collaboration.controller.js` → import `collaboration.service.js`
- `[x]` `feedback.controller.js` → import `feedback.service.js`
- `[x]` `search.controller.js` → import `search.service.js`

---

## PHASE 4 — OBSERVABILITY (Logging & Auto-Notifications) ⏱ ~2-3h

> Mức ưu tiên: 🟡 **TRUNG BÌNH**  
> Ảnh hưởng: Audit trail, quản trị hệ thống, trải nghiệm người dùng  
> Liên quan BR: BR-041 (Giám sát nhật ký), BR-030 (Thông báo cập nhật)

---

### 4.1 Tạo SystemLog Helper

**Vấn đề:** Model `SystemLog` đã định nghĩa đầy đủ (action types: Search, Login, ApiError, BatchJob, SystemError) nhưng **không nơi nào trong code thực sự ghi log** ngoài seed data.

---

##### `[x]` 4.1.1 — File mới: `src/utils/systemLogger.js`

```javascript
const SystemLog = require('../models/SystemLog');

/**
 * Write a structured log entry to the system_logs collection.
 * Fire-and-forget: does NOT throw on failure (non-blocking).
 *
 * @param {'Search'|'Login'|'ApiError'|'BatchJob'|'SystemError'} actionType
 * @param {string|null} userId       - ObjectId string hoặc null
 * @param {string|null} sourceName   - Tên nguồn dữ liệu hoặc null
 * @param {object}      details      - Object chứa thông tin chi tiết
 */
async function logAction(actionType, userId = null, sourceName = null, details = {}) {
  try {
    await SystemLog.create({
      timestamp: new Date(),
      meta: {
        action_type: actionType,
        user_id: userId,
        source_name: sourceName,
      },
      details,
    });
  } catch (err) {
    console.warn('⚠️ SystemLog write failed:', err.message);
  }
}

module.exports = { logAction };
```

---

### 4.2 Gắn Log Vào Các Luồng Chính

---

##### `[x]` 4.2.1 — File: `src/services/auth.service.js` — Log Login

```diff
 async function login({ email, password }) {
   const user = await User.findOne({ email: email.toLowerCase() });
   if (!user) {
+    logAction('Login', null, null, { success: false, email, reason: 'User not found' });
     throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
   }

   if (user.status === 'Banned') {
+    logAction('Login', user._id, null, { success: false, email, reason: 'Account banned' });
     throw Object.assign(new Error('Account is banned'), { statusCode: 403 });
   }

   const valid = await bcrypt.compare(password, user.password_hash);
   if (!valid) {
+    logAction('Login', user._id, null, { success: false, email, reason: 'Wrong password' });
     throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
   }

   const tokens = generateTokens(user);
+  logAction('Login', user._id, null, { success: true, email });
   return { user: { ... }, ...tokens };
 }
```

Import ở đầu file:
```javascript
const { logAction } = require('../utils/systemLogger');
```

---

##### `[x]` 4.2.2 — File: `src/services/paper.service.js` — Log Search

Trong function `searchPapers()`, thêm log sau khi query:

```javascript
const { logAction } = require('../utils/systemLogger');

// ... sau khi có kết quả
logAction('Search', userId || null, null, {
  query: query.q,
  filters: { fields: query.fields, sources: query.sources, yearFrom: query.yearFrom },
  resultsCount: total,
});
```

---

##### `[x]` 4.2.3 — File: `src/controllers/paper.controller.js` — Log Batch Job

Trong `requestCorpusSync()`, sau khi sync thành công:

```javascript
const { logAction } = require('../utils/systemLogger');

// ... sau job.save() thành công
logAction('BatchJob', req.user?.id, sourceName, {
  query,
  maxRecords,
  imported: result.imported,
  skipped: result.skipped,
  sourceTotal: result.sourceTotal,
});
```

---

##### `[x]` 4.2.4 — File: `src/app.js` — Log Unhandled Errors

Trong global error handler:

```diff
+const { logAction } = require('./utils/systemLogger');

 app.use((err, _req, res, _next) => {
   console.error('Unhandled error:', err);
+  logAction('SystemError', null, null, {
+    message: err.message,
+    stack: nodeEnv === 'production' ? undefined : err.stack,
+    statusCode: err.statusCode || 500,
+  });
   res.status(err.statusCode || 500).json({ ... });
 });
```

---

### 4.3 Tạo Hệ Thống Notification Tự Động

**Vấn đề:** Notification model hoàn chỉnh, có TTL 30 ngày (BR-030), nhưng backend không tự tạo notification cho bất kỳ event nào. Chỉ có dữ liệu từ seed.

---

##### `[x]` 4.3.1 — File: `src/services/notification.service.js`

Thêm các helper functions (sau khi tách service ở Phase 3):

```javascript
/**
 * Create a notification for a user. Fire-and-forget.
 */
async function createNotification(userId, type, title, content, extra = {}) {
  try {
    await Notification.create({
      user_id: userId,
      notification_type: type,
      title,
      content,
      priority: extra.priority || 'normal',
      source: extra.source || 'Hệ thống',
      actor: extra.actor || 'Research Corpus',
      target_label: extra.targetLabel || '',
      target_href: extra.targetHref || '',
      meta: extra.meta || [],
      follow_id: extra.followId || null,
      related_paper_ids: extra.relatedPaperIds || [],
    });
  } catch (err) {
    console.warn('⚠️ Notification creation failed:', err.message);
  }
}

/**
 * Notify when a new paper matches a user's followed subject.
 */
async function notifyNewPaperMatch(userId, followSubject, paper) {
  await createNotification(userId, 'paper',
    `Bài báo mới khớp: "${followSubject.value}"`,
    `"${paper.title}" (${paper.publication_year}) — ${paper.source_name || 'Unknown'}`,
    {
      source: `Theo dõi · ${followSubject.type}`,
      followId: followSubject.follow_id,
      relatedPaperIds: [paper._id],
      targetLabel: 'Xem bài báo',
      targetHref: `#search`,
    }
  );
}

/**
 * Notify when receiving a collaboration invite.
 */
async function notifyInviteReceived(userId, invite) {
  await createNotification(userId, 'invite',
    `Lời mời cộng tác mới`,
    `Bạn được mời tham gia chủ đề "${invite.topic}"`,
    {
      source: 'Cộng tác',
      actor: invite.invitee_name || invite.invitee_email,
      targetLabel: 'Xem lời mời',
      targetHref: '#workspace',
    }
  );
}

/**
 * Notify when someone comments on a workspace item.
 */
async function notifyCommentAdded(userId, workspaceItem, commentAuthor) {
  await createNotification(userId, 'comment',
    `Bình luận mới: "${workspaceItem.title}"`,
    `${commentAuthor} đã bình luận trên ${workspaceItem.kind}`,
    {
      source: 'Workspace',
      actor: commentAuthor,
      targetLabel: 'Xem bình luận',
      targetHref: '#workspace',
    }
  );
}

/**
 * Notify when a crawler job completes.
 */
async function notifyJobComplete(userId, job) {
  if (!userId) return;
  await createNotification(userId, 'system',
    `Job "${job.name}" hoàn thành`,
    `Đã import ${job.result?.imported || 0} bài báo từ ${job.source_name}`,
    {
      source: 'Hệ thống',
      actor: 'Crawler',
      priority: job.status === 'failed' ? 'high' : 'normal',
    }
  );
}
```

---

##### `[x]` 4.3.2 — Gắn auto-notification vào collaboration flow

File: `src/services/collaboration.service.js` (hoặc controller nếu chưa tách)

Khi `createInvite()`:
```javascript
const { notifyInviteReceived } = require('./notification.service');
// Sau khi create invite thành công:
if (invite.invitee_user_id) {
  notifyInviteReceived(invite.invitee_user_id, invite);
}
```

---

##### `[x]` 4.3.3 — Gắn auto-notification vào workspace comment

File: `src/services/workspace.service.js` (hoặc controller)

Khi `addComment()`:
```javascript
const { notifyCommentAdded } = require('./notification.service');
// Sau khi push comment thành công:
// Notify tất cả members trừ người comment
```

---

##### `[x]` 4.3.4 — Gắn auto-notification khi sync paper xong

File: `src/controllers/paper.controller.js`

Trong `requestCorpusSync()`, sau khi job thành công:
```javascript
const { notifyJobComplete } = require('../services/notification.service');
notifyJobComplete(req.user?.id, job);
```

---

## PHASE 5 — FRONTEND COMPATIBILITY FIXES ⏱ ~1h

> Mức ưu tiên: 🟢 **NHẸ**  
> Ảnh hưởng: UX nhỏ, code quality

---

### 5.1 Frontend Thiếu Refresh Token Flow

##### `[x]` 5.1.1 — File: `frontend/src/lib/api.ts`

Trong function `request()`, thêm logic auto-refresh khi nhận 401:

```typescript
// Trong request() function, sau khi nhận 401:
if (res.status === 401 && !init._isRetry) {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (refreshToken) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const refreshPayload = await refreshRes.json();
      if (refreshRes.ok && refreshPayload.success) {
        storeAuth(refreshPayload.data);
        // Retry original request
        return request(path, { ...init, _isRetry: true });
      }
    } catch {
      // Refresh failed, clear auth
    }
    clearAuth();
    window.location.hash = 'login';
  }
}
```

---

### 5.2 Frontend Không Gọi Logout API

##### `[x]` 5.2.1 — File: `frontend/src/lib/api.ts`

Thêm vào `authApi`:

```typescript
export const authApi = {
  // ... existing login, register ...
  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors — logout is best-effort
    } finally {
      clearAuth();
    }
  },
};
```

---

### 5.3 Frontend RecordView Dùng GET Gây Side-Effect

##### `[x]` 5.3.1 — File: `frontend/src/lib/api.ts`

Hiện tại `recordView` gọi `GET /papers/:id` — ổn vì backend đã handle ghi view trong `getById`. Không cần sửa nhưng nên document.

---

### 5.4 Frontend Chưa Gọi Saved Searches API

##### `[x]` 5.4.1 — File: `frontend/src/lib/api.ts`

Thêm `searchApi` object:

```typescript
export const searchApi = {
  async getSavedSearches() {
    return request<any[]>('/searches');
  },
  async createSavedSearch(name: string, criteria: Record<string, unknown>) {
    return request('/searches', {
      method: 'POST',
      body: JSON.stringify({ name, criteria }),
    });
  },
  async deleteSavedSearch(id: string) {
    return request(`/searches/${id}`, { method: 'DELETE' });
  },
};
```

---

### 5.5 Frontend Chưa Gọi AI API

##### `[x]` 5.5.1 — File: `frontend/src/lib/api.ts`

Thêm `aiApi` object:

```typescript
export const aiApi = {
  async summarize(title: string, abstract: string) {
    return request<{ summary: string }>('/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ title, abstract }),
    });
  },
  async explainTerm(term: string) {
    return request<{ term: string; explanation: string }>('/ai/explain-term', {
      method: 'POST',
      body: JSON.stringify({ term }),
    });
  },
  async suggestDirections(field: string, gaps?: unknown[]) {
    return request<{ directions: { topic: string; rationale: string }[] }>('/ai/suggest-directions', {
      method: 'POST',
      body: JSON.stringify({ field, gaps }),
    });
  },
  async getInsights() {
    return request<{ summary: string; directions: unknown[]; evidence: unknown[] }>('/ai/insights');
  },
};
```

---

## PHASE 6 — BACKEND FEATURE COMPLETION ⏱ ~3-4h

> Mức ưu tiên: 🟢 **NHẸ — khi có thời gian**  
> Liên quan: Hoàn thiện Business Rules chưa implement đầy đủ

---

### 6.1 Tích Hợp Gemini API (Thay Placeholder)

**Liên quan BR:** BR-033 (Tóm tắt AI), BR-035 (Giải thích thuật ngữ), BR-036 (Đề xuất hướng NC)

##### `[x]` 6.1.1 — File: `src/services/ai.service.js` (mới)

- Tạo service gọi Gemini API dùng config `llm.geminiApiKey` + `llm.geminiModel` từ `config/env.js`
- Implement `summarize(title, abstract)` — gọi Gemini API
- Implement `explainTerm(term)` — gọi Gemini API
- Implement `suggestDirections(field, gaps)` — gọi Gemini API với context gap analysis
- Implement `getInsights()` — gọi Gemini API với data tổng hợp

##### `[x]` 6.1.2 — Sửa `src/controllers/ai.controller.js`

- Import `ai.service.js` thay vì trả về hardcoded strings

---

### 6.2 Collaboration Match Score Thực

**Vấn đề:** Hiện dùng `Math.random() * 30 + 70` — luôn random 70-100%.

**Liên quan BR:** BR-017 (Đề xuất liên quan)

##### `[x]` 6.2.1 — File: `src/services/collaboration.service.js`

Implement tính match score thực dựa trên:
- Overlap giữa `followed_subjects` của current user và researcher
- Đếm số subjects trùng / tổng subjects
- Tính percentage thực

```javascript
function calculateMatchScore(mySubjects, theirSubjects) {
  const mySet = new Set(mySubjects.map(s => s.value.toLowerCase()));
  const theirSet = new Set(theirSubjects.map(s => s.value.toLowerCase()));
  const overlap = [...mySet].filter(s => theirSet.has(s)).length;
  const total = new Set([...mySet, ...theirSet]).size;
  return total === 0 ? 0 : Math.round((overlap / total) * 100);
}
```

---

### 6.3 Workspace Activities Chi Tiết

**Vấn đề:** Hiện chỉ derive từ `WorkspaceItem.updated_at` — không biết ai làm gì.

##### `[x]` 6.3.1 — Thêm `WorkspaceActivity` model hoặc log vào `SystemLog`

Ghi lại khi:
- Tạo/sửa/xóa item
- Thêm/gỡ member
- Thêm comment
- Cập nhật workspace settings

---

### 6.4 Xóa Logic Validate Thủ Công Sau Khi Có Joi

##### `[x]` 6.4.1 — File: `src/controllers/paper.controller.js`

Xóa validation thủ công trong `requestCorpusSync()` vì Joi đã handle:

```diff
-    const query = String(req.body.query || '').trim();
-    if (!query) {
-      return ApiResponse.validationError(res, 'Query is required');
-    }
+    const { query, sourceName, maxRecords, yearFrom, yearTo, types } = req.body;
```

---

## TÓM TẮT THỐNG KÊ

| Loại | Số file | Phase |
|------|---------|-------|
| **File mới tạo** | 20+ | P1: validators, P3/P4/P6 services, WorkspaceActivity, tests |
| **File backend sửa** | 30+ | Routes/controllers/services/models/config/app/test scripts |
| **File frontend sửa** | 8+ | api.ts + route pages + App lazy loading |
| **File xóa** | 0 | — |

| Phase | Effort | Ưu tiên |
|-------|--------|---------|
| P1 — Bảo mật | ~2-3h | 🔴 Nghiêm trọng |
| P2 — Auth & Routes | ~1h | 🔴 Nghiêm trọng |
| P3 — Kiến trúc | ~2-3h | 🟡 Trung bình |
| P4 — Observability | ~2-3h | 🟡 Trung bình |
| P5 — Frontend fixes | ~1h | 🟢 Nhẹ |
| P6 — Feature completion | ~3-4h | 🟢 Khi có thời gian |
| **TỔNG** | **Đã triển khai** | |

---

## BUSINESS RULES COVERAGE CHECK

| BR ID | Mô tả | Backend Status | Cần Fix? |
|-------|--------|----------------|----------|
| BR-001 | Liên kết nguồn học thuật | ✅ OpenAlex, Semantic Scholar, Crossref, arXiv, IEEE, ACM Digital Library, Exa có importer/sync path | Không |
| BR-002 | Chuẩn hóa dữ liệu | ✅ `paperCleaning.service.js` dùng chung cho importers | Không |
| BR-003 | Deduplication | ✅ DOI unique index + title_normalized + upsert/merge source | Không |
| BR-004 | Lập lịch cập nhật tự động | ✅ `scheduler.service.js` xử lý queued crawler jobs + report refresh định kỳ | Không |
| BR-005 | Data cleaning | ✅ Normalize/validate/dedupe/mark Cleaned-Rejected trong import pipeline | Không |
| BR-006 | Chính sách lưu giữ | ✅ Paper status `Archived` excluded from search | Không |
| BR-007 | Giám sát kết nối nguồn | ✅ `sourceHealth.service.js` + admin endpoint | Không |
| BR-009 | Tìm kiếm cơ bản | ✅ Text search index hoạt động | Không |
| BR-010 | Lọc theo thuộc tính | ✅ Filter bằng query params | Không |
| BR-011 | Tìm kiếm nâng cao AND/OR/NOT | ✅ Có trong paper.service.js | Không |
| BR-012 | Sắp xếp kết quả | ✅ Sort parameter | Không |
| BR-013 | Hiển thị metadata chi tiết | ✅ `GET /papers/:id` | Không |
| BR-014 | Lưu điều kiện tìm kiếm | ✅ saved_searches embedded trong User | Không |
| BR-015 | Phân tích xu hướng | ✅ analytics.service.js `getTrends()` | Không |
| BR-016 | Tốc độ tăng trưởng | ✅ analytics.service.js `getGrowth()` | Không |
| BR-017 | Từ khóa đồng xuất hiện | ✅ analytics.service.js `getCooccurrence()` | Không |
| BR-018 | Research Gap | ✅ analytics.service.js `getGaps()` | Không |
| BR-027 | Lưu tài liệu | ✅ Library service | Không |
| BR-028 | Quản lý bộ sưu tập | ✅ UserCollection model + CRUD | Không |
| BR-029 | Theo dõi chủ đề | ✅ followed_subjects trong User + follow service | Không |
| BR-030 | Thông báo cập nhật | ✅ Notification service + auto invite/comment/job notifications | Không |
| BR-033 | AI tóm tắt | ✅ Gemini service + fallback an toàn + FE actions | Không |
| BR-035 | AI giải thích thuật ngữ | ✅ Gemini service + fallback an toàn + FE actions | Không |
| BR-036 | AI đề xuất hướng NC | ✅ Gemini service + fallback an toàn + FE actions | Không |
| BR-038 | Quản lý tài khoản | ✅ Refresh token + change password + FE auto refresh | Không |
| BR-039 | RBAC | ✅ Middleware + Admin routes | Không |
| BR-041 | Giám sát nhật ký | ✅ systemLogger ghi login/search/batch/system errors | Không |
| BR-042 | Phản hồi người dùng | ✅ Feedback CRUD | Không |
| BR-043 | Unique Views | ✅ Redis-based dedup khi Redis bật, fallback an toàn khi tắt local | Không |
| BR-044 | Top bài báo thịnh hành | ✅ `getTrendingPapers()` | Không |
